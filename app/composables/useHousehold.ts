import type { Database, Household, TablesUpdate } from '~/types/database.types'

type HouseholdRow = Household
type MemberRole = Database['public']['Enums']['member_role']

export function useHousehold() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  const household = useState<HouseholdRow | null>('household', () => null)
  const membershipRole = useState<MemberRole | null>('household-membership-role', () => null)
  const pending = useState('household-pending', () => false)
  const error = useState<string | null>('household-error', () => null)

  const isHouseholdOwner = computed(() => membershipRole.value === 'owner')
  const isHouseholdGuest = computed(() => membershipRole.value === 'member')

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

    const { data: memberRow, error: memberError } = await supabase
      .from('household_members')
      .select('role, households(*)')
      .eq('user_id', userId)
      .eq('role', 'member')
      .maybeSingle()

    pending.value = false

    if (memberError) {
      error.value = memberError.message
      return null
    }

    if (memberRow?.households) {
      membershipRole.value = 'member'
      household.value = memberRow.households as HouseholdRow
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
    if (!household.value?.id || !isHouseholdOwner.value) {
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
    pending,
    error,
    fetchHousehold,
    ensureHousehold,
    updateHousehold,
    clearHousehold
  }
}
