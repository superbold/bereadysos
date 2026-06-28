import {
  computeAlerts,
  groupAlerts,
  type AlertGroup,
  type AppAlert
} from '#shared/alerts'

export function useAlerts() {
  const { household, ensureHousehold } = useHousehold()
  const { categories, items, fetchCategories, fetchItems, pending } = useInventory()

  const loaded = useState('alerts-loaded', () => false)

  const coverageItems = computed(() =>
    items.value.map(item => ({
      id: item.id,
      category_id: item.category_id,
      quantity: item.quantity,
      servings_per_unit: item.servings_per_unit,
      volume_per_unit: item.volume_per_unit,
      expiration_date: item.expiration_date,
      name: item.name,
      categoryName: item.category.name
    }))
  )

  const alerts = computed<AppAlert[]>(() => {
    if (!household.value || !categories.value.length) {
      return []
    }

    return computeAlerts({
      categories: categories.value,
      items: coverageItems.value,
      headcount: household.value.headcount,
      targetDays: household.value.target_days
    })
  })

  const groupedAlerts = computed<AlertGroup[]>(() => groupAlerts(alerts.value))
  const alertCount = computed(() => alerts.value.length)
  const hasAlerts = computed(() => alertCount.value > 0)

  async function loadAlerts() {
    if (!household.value) {
      await ensureHousehold()
    }
    if (!household.value) {
      return
    }

    await Promise.all([fetchCategories(), fetchItems()])
    loaded.value = true
  }

  watch(household, async (value) => {
    if (value) {
      await loadAlerts()
    }
  })

  return {
    alerts,
    groupedAlerts,
    alertCount,
    hasAlerts,
    pending,
    loaded,
    loadAlerts
  }
}
