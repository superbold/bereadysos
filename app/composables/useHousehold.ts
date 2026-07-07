import type { Database, Household, TablesUpdate } from '~/types/database.types'
import {
  canEditInventory as roleCanEditInventory,
  canManageHouseholdSettings,
  isCollaboratorOnPlan,
  isReadOnlyCollaborator
} from '#shared/household-roles'

type HouseholdRow = Household
type MemberRole = Database['public']['Enums']['member_role']

export function useHousehold() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const {
    memberships,
    activeHouseholdId,
    activeMembership,
    membershipCount,
    hasMultiplePlans,
    membershipsPending,
    fetchAllMemberships,
    setActivePlan,
    membershipForHousehold,
    clearMemberships
  } = useHouseholdMemberships()

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

  function applyMembership(membership: ReturnType<typeof membershipForHousehold>) {
    if (!membership) {
      household.value = null
      membershipRole.value = null
      return null
    }

    membershipRole.value = membership.role
    household.value = membership.household
    return membership.household
  }

  function clearHousehold() {
    household.value = null
    membershipRole.value = null
    error.value = null
    clearMemberships()
  }

  async function fetchHousehold() {
    const userId = user.value?.sub
    if (!userId) {
      household.value = null
      membershipRole.value = null
      return null
    }

    pending.value = true
    error.value = null

    if (!memberships.value.length) {
      await fetchAllMemberships()
    }

    const targetId = activeHouseholdId.value
    const membership = membershipForHousehold(targetId)
    pending.value = false

    if (!membership) {
      household.value = null
      membershipRole.value = null
      return null
    }

    return applyMembership(membership)
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

    await fetchAllMemberships()
    setActivePlan(created.id)
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
    await fetchAllMemberships()
    setActivePlan(data.id)
    return { data, error: null }
  }

  async function switchActivePlan(householdId: string) {
    const membership = setActivePlan(householdId)
    return applyMembership(membership)
  }

  return {
    household,
    membershipRole,
    memberships,
    activeHouseholdId,
    activeMembership,
    membershipCount,
    hasMultiplePlans,
    isHouseholdOwner,
    isHouseholdGuest,
    isInventoryKeeper,
    isShopper,
    isWatcher,
    isReadOnlyOnPlan,
    canEditInventory,
    canManageSettings,
    pending: computed(() => pending.value || membershipsPending.value),
    error,
    fetchHousehold,
    fetchAllMemberships,
    ensureHousehold,
    updateHousehold,
    switchActivePlan,
    clearHousehold
  }
}
