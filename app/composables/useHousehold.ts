import type { Database, Household, TablesUpdate } from '~/types/database.types'
import {
  canEditInventory as roleCanEditInventory,
  canManageHouseholdSettings,
  isCollaboratorOnPlan,
  isReadOnlyCollaborator
} from '#shared/household-roles'

type HouseholdRow = Household
type MemberRole = Database['public']['Enums']['member_role']

const COLLABORATOR_ROLES: MemberRole[] = ['maintainer', 'member', 'shopper', 'watcher']

export function useHousehold() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  const household = useState<HouseholdRow | null>('household', () => null)
  const membershipRole = useState<MemberRole | null>('household-membership-role', () => null)
  const pending = useState('household-pending', () => false)
  const error = useState<string | null>('household-error', () => null)

  const isHouseholdOwner = computed(() => membershipRole.value === 'owner')
  const isHouseholdGuest = computed(() => isCollaboratorOnPlan(membershipRole.value))
  const isInventoryKeeper = computed(() =>
    membershipRole.value === 'maintainer' || membershipRole.value === 'member'
  )
  const isShopper = computed(() => membershipRole.value === 'shopper')
  const isWatcher = computed(() => membershipRole.value === 'watcher')
  const isReadOnlyOnPlan = computed(() => isReadOnlyCollaborator(membershipRole.value))
  const canEditInventory = computed(() => roleCanEditInventory(membershipRole.value))
  const canManageSettings = computed(() => canManageHouseholdSettings(membershipRole.value))

  function clearHousehold() {
    household.value = null
    membershipRole.value = null
    error.value = null
  }

  async function fetchHousehold() {
    const userId = user.value?.sub
    if (!userId) {
      clearHousehold()
      return null
    }

    pending.value = true
    error.value = null

    const { data: ownerRow, error: ownerError } = await supabase
      .from('household_members')
      .select('role, households(*)')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle()

    if (ownerError) {
      pending.value = false
      error.value = ownerError.message
      return null
    }

    if (ownerRow?.households) {
      membershipRole.value = 'owner'
      household.value = ownerRow.households as HouseholdRow
      pending.value = false
      return household.value
    }

    const { data: collaboratorRows, error: collaboratorError } = await supabase
      .from('household_members')
      .select('role, households(*)')
      .eq('user_id', userId)
      .in('role', COLLABORATOR_ROLES)
      .order('created_at', { ascending: true })
      .limit(1)

    pending.value = false

    if (collaboratorError) {
      error.value = collaboratorError.message
      return null
    }

    const collaboratorRow = collaboratorRows?.[0]
    if (collaboratorRow?.households) {
      membershipRole.value = collaboratorRow.role
      household.value = collaboratorRow.households as HouseholdRow
      return household.value
    }

    membershipRole.value = null
    household.value = null
    return null
  }

  async function ensureHousehold() {
    const existing = await fetchHousehold()
    if (existing) {
      return existing
    }

    const userId = user.value?.sub
    if (!userId) {
      return null
    }

    if (error.value) {
      return null
    }

    pending.value = true
    error.value = null

    const { data: created, error: createError } = await supabase.rpc('bootstrap_household', {
      p_name: 'My Household'
    })

    pending.value = false

    if (createError) {
      error.value = createError.message
      return null
    }

    membershipRole.value = 'owner'
    household.value = created
    return created
  }

  async function updateHousehold(updates: TablesUpdate<'households'>) {
    if (!household.value?.id || !canManageSettings.value) {
      return { data: null, error: new Error('Only the plan owner can update household settings') }
    }

    const { data, error: updateError } = await supabase
      .from('households')
      .update(updates)
      .eq('id', household.value.id)
      .select()
      .single()

    if (updateError) {
      return { data: null, error: updateError }
    }

    household.value = data
    return { data, error: null }
  }

  return {
    household,
    membershipRole,
    isHouseholdOwner,
    isHouseholdGuest,
    isInventoryKeeper,
    isShopper,
    isWatcher,
    isReadOnlyOnPlan,
    canEditInventory,
    canManageSettings,
    pending,
    error,
    fetchHousehold,
    ensureHousehold,
    updateHousehold,
    clearHousehold
  }
}
