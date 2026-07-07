import { computeAlerts } from '#shared/alerts'
import { formatPlanOwnerLabel } from '#shared/display'
import {
  membershipRoleAsHouseholdRole,
  type HouseholdMembership
} from '~/composables/useHouseholdMemberships'
import {
  planPickerRoleLabel,
  roleDescription
} from '#shared/household-roles'
import {
  formatPlanSummary,
  planThemeForCard,
  type PlanPickerCardModel,
  type PlanPickerNotification
} from '#shared/plan-picker'
import type { Database } from '~/types/database.types'

function mapAlertToNotification(alert: ReturnType<typeof computeAlerts>[number]): PlanPickerNotification {
  return {
    id: alert.id,
    severity: alert.severity === 'error' ? 'error' : alert.severity === 'warning' ? 'warning' : 'neutral',
    icon: alert.icon,
    text: alert.detail ? `${alert.title} — ${alert.detail}` : alert.title
  }
}

function activityLineForShopRun(status: Database['public']['Enums']['shop_run_status'] | null) {
  switch (status) {
    case 'shopping':
      return 'Shopping in progress on this plan'
    case 'shopping_complete':
    case 'intake_pending':
      return 'Shopping complete — intake pending'
    case 'draft':
      return 'Restock list drafted'
    case 'closed':
      return 'Last restock run closed'
    default:
      return 'No active restock run'
  }
}

export function usePlanPicker() {
  const supabase = useSupabaseClient<Database>()
  const { profile } = useProfile()
  const {
    memberships,
    fetchAllMemberships,
    switchActivePlan,
    membershipCount
  } = useHousehold()

  const cards = useState<PlanPickerCardModel[]>('plan-picker-cards', () => [])
  const pending = useState('plan-picker-pending', () => false)
  const error = useState<string | null>('plan-picker-error', () => null)

  async function buildCard(
    membership: HouseholdMembership,
    helperIndex: number,
    categories: Database['public']['Tables']['categories']['Row'][]
  ): Promise<PlanPickerCardModel> {
    const role = membershipRoleAsHouseholdRole(membership.role)
    const isOwned = role === 'owner'

    const [{ data: items }, { data: latestRun }] = await Promise.all([
      supabase
        .from('items')
        .select('id, category_id, quantity, servings_per_unit, volume_per_unit, expiration_date, name, category:categories(name)')
        .eq('household_id', membership.householdId),
      supabase
        .from('shop_runs')
        .select('status')
        .eq('household_id', membership.householdId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ])

    const coverageItems = (items ?? []).map(item => ({
      id: item.id,
      category_id: item.category_id,
      quantity: item.quantity,
      servings_per_unit: item.servings_per_unit,
      volume_per_unit: item.volume_per_unit,
      expiration_date: item.expiration_date,
      name: item.name,
      categoryName: item.category?.name ?? 'Item'
    }))

    const alerts = computeAlerts({
      categories,
      items: coverageItems,
      headcount: membership.household.headcount,
      targetDays: membership.household.target_days
    })

    const ownerName = isOwned
      ? (profile.value?.first_name?.trim() || membership.ownerFirstName)
      : membership.ownerFirstName

    return {
      id: membership.householdId,
      householdId: membership.householdId,
      ownerFirstName: ownerName,
      householdName: membership.household.name,
      displayName: formatPlanOwnerLabel(ownerName, membership.household.name),
      role,
      roleLabel: planPickerRoleLabel(role),
      roleDescription: roleDescription(role),
      isOwned,
      theme: planThemeForCard(isOwned, helperIndex),
      summary: formatPlanSummary(membership.household.headcount, membership.household.target_days),
      notifications: alerts.slice(0, 3).map(mapAlertToNotification),
      alertCount: alerts.length,
      lastActivity: alerts.length
        ? `${alerts.length} open alert${alerts.length === 1 ? '' : 's'}`
        : activityLineForShopRun(latestRun?.status ?? null)
    }
  }

  async function loadCards() {
    pending.value = true
    error.value = null

    const rows = await fetchAllMemberships()
    if (!rows.length) {
      cards.value = []
      pending.value = false
      return []
    }

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (categoriesError) {
      pending.value = false
      error.value = categoriesError.message
      cards.value = []
      return []
    }

    let helperIndex = 0
    const built: PlanPickerCardModel[] = []

    for (const membership of memberships.value) {
      const isOwned = membership.role === 'owner'
      const index = isOwned ? 0 : helperIndex++
      built.push(await buildCard(membership, index, categories ?? []))
    }

    cards.value = built
    pending.value = false
    return built
  }

  async function openPlan(householdId: string) {
    await switchActivePlan(householdId)
    await navigateTo('/', { external: true })
  }

  const ownedCard = computed(() => cards.value.find(card => card.isOwned) ?? null)
  const helpingCards = computed(() => cards.value.filter(card => !card.isOwned))

  return {
    cards,
    ownedCard,
    helpingCards,
    pending,
    error,
    membershipCount,
    loadCards,
    openPlan
  }
}
