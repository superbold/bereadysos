import type { Database, Household } from '~/types/database.types'
import type { HouseholdRole } from '#shared/household-roles'

export type HouseholdMembership = {
  householdId: string
  role: Database['public']['Enums']['member_role']
  household: Household
  ownerFirstName: string
  createdAt: string
}

const ACTIVE_PLAN_STORAGE_KEY = 'bereadysos:active-plan-id'
const COLLABORATOR_ROLES: Database['public']['Enums']['member_role'][] = [
  'maintainer',
  'member',
  'shopper',
  'watcher'
]

export function useHouseholdMemberships() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  const memberships = useState<HouseholdMembership[]>('household-memberships', () => [])
  const activeHouseholdId = useState<string | null>('active-household-id', () => null)
  const membershipsPending = useState('household-memberships-pending', () => false)
  const membershipsError = useState<string | null>('household-memberships-error', () => null)

  const membershipCount = computed(() => memberships.value.length)
  const hasMultiplePlans = computed(() => memberships.value.length > 1)

  const activeMembership = computed(() =>
    memberships.value.find(entry => entry.householdId === activeHouseholdId.value) ?? null
  )

  function readStoredActivePlanId() {
    if (!import.meta.client) {
      return null
    }
    return sessionStorage.getItem(ACTIVE_PLAN_STORAGE_KEY)
  }

  function persistActivePlanId(householdId: string) {
    activeHouseholdId.value = householdId
    if (import.meta.client) {
      sessionStorage.setItem(ACTIVE_PLAN_STORAGE_KEY, householdId)
    }
  }

  function clearActivePlan() {
    activeHouseholdId.value = null
    if (import.meta.client) {
      sessionStorage.removeItem(ACTIVE_PLAN_STORAGE_KEY)
    }
  }

  function resolveDefaultActivePlanId(rows: HouseholdMembership[]) {
    const stored = readStoredActivePlanId()
    if (stored && rows.some(row => row.householdId === stored)) {
      return stored
    }

    const owned = rows.find(row => row.role === 'owner')
    if (owned) {
      return owned.householdId
    }

    return rows[0]?.householdId ?? null
  }

  async function fetchOwnerFirstNames(householdIds: string[]) {
    const names = new Map<string, string>()

    await Promise.all(householdIds.map(async (householdId) => {
      const { data: ownerMember } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', householdId)
        .eq('role', 'owner')
        .maybeSingle()

      if (!ownerMember?.user_id) {
        names.set(householdId, 'Someone')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', ownerMember.user_id)
        .maybeSingle()

      names.set(
        householdId,
        profile?.first_name?.trim() || 'Someone'
      )
    }))

    return names
  }

  async function fetchAllMemberships() {
    const userId = user.value?.sub
    if (!userId) {
      memberships.value = []
      clearActivePlan()
      return []
    }

    membershipsPending.value = true
    membershipsError.value = null

    const { data: rows, error } = await supabase
      .from('household_members')
      .select('role, created_at, household_id, households(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    membershipsPending.value = false

    if (error) {
      membershipsError.value = error.message
      memberships.value = []
      return []
    }

    const householdIds = [...new Set((rows ?? []).map(row => row.household_id))]
    const ownerNames = await fetchOwnerFirstNames(householdIds)

    const nextMemberships = (rows ?? [])
      .filter(row => row.households)
      .map(row => ({
        householdId: row.household_id,
        role: row.role,
        household: row.households as Household,
        ownerFirstName: ownerNames.get(row.household_id) ?? 'Someone',
        createdAt: row.created_at
      }))
      .sort((a, b) => {
        if (a.role === 'owner') {
          return -1
        }
        if (b.role === 'owner') {
          return 1
        }
        return a.household.name.localeCompare(b.household.name)
      })

    memberships.value = nextMemberships

    const defaultActiveId = resolveDefaultActivePlanId(nextMemberships)
    if (defaultActiveId) {
      activeHouseholdId.value = defaultActiveId
    } else {
      clearActivePlan()
    }

    return nextMemberships
  }

  function setActivePlan(householdId: string) {
    const membership = memberships.value.find(entry => entry.householdId === householdId)
    if (!membership) {
      return null
    }

    persistActivePlanId(householdId)
    return membership
  }

  function membershipForHousehold(householdId: string | null | undefined) {
    if (!householdId) {
      return null
    }
    return memberships.value.find(entry => entry.householdId === householdId) ?? null
  }

  function clearMemberships() {
    memberships.value = []
    clearActivePlan()
    membershipsError.value = null
  }

  return {
    memberships,
    activeHouseholdId,
    activeMembership,
    membershipCount,
    hasMultiplePlans,
    membershipsPending,
    membershipsError,
    fetchAllMemberships,
    setActivePlan,
    membershipForHousehold,
    clearMemberships,
    collaboratorRoles: COLLABORATOR_ROLES
  }
}

export function membershipRoleAsHouseholdRole(
  role: Database['public']['Enums']['member_role']
): HouseholdRole {
  return role
}
