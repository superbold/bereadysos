export const TARGET_DAY_PRESETS = [3, 7, 14, 30, 90] as const
export const EXPIRING_SOON_DAYS = 30

export type CoverageStatus = 'empty' | 'critical' | 'low' | 'good' | 'over'

export type CategoryForCoverage = {
  id: string
  slug: string
  name: string
  calc_type: 'consumable' | 'checklist'
  default_daily_per_person: number | null
  default_unit: string | null
  recommended_qty: number | null
  icon: string | null
  sort_order: number
}

export type ItemForCoverage = {
  category_id: string
  quantity: number
  servings_per_unit: number | null
  volume_per_unit: number | null
  expiration_date: string | null
  name: string
}

export type ConsumableCategoryCoverage = {
  calc_type: 'consumable'
  categoryId: string
  slug: string
  name: string
  icon: string | null
  unit: string
  onHand: number
  required: number
  percent: number
  daysCovered: number
  status: CoverageStatus
}

export type ChecklistCategoryCoverage = {
  calc_type: 'checklist'
  categoryId: string
  slug: string
  name: string
  icon: string | null
  stockedCount: number
  recommendedQty: number
  percent: number
  status: CoverageStatus
}

export type CategoryCoverage = ConsumableCategoryCoverage | ChecklistCategoryCoverage

export type ConsumableCategoryGap = {
  calc_type: 'consumable'
  categoryId: string
  slug: string
  name: string
  icon: string | null
  unit: string
  onHand: number
  required: number
  gap: number
  surplus: number
  isMet: boolean
}

export type ChecklistCategoryGap = {
  calc_type: 'checklist'
  categoryId: string
  slug: string
  name: string
  icon: string | null
  stockedCount: number
  recommendedQty: number
  gap: number
  isMet: boolean
}

export type CategoryGap = ConsumableCategoryGap | ChecklistCategoryGap

export type ExpiringItem = {
  id: string
  name: string
  expiration_date: string
  daysUntil: number
  categoryName: string
}

function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function daysBetween(from: Date, to: Date) {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.ceil((startOfDay(to).getTime() - startOfDay(from).getTime()) / msPerDay)
}

export function effectiveConsumableAmount(item: ItemForCoverage, categorySlug: string) {
  if (categorySlug === 'water') {
    return item.quantity * (item.volume_per_unit ?? 1)
  }
  if (categorySlug === 'food') {
    return item.quantity * (item.servings_per_unit ?? 1)
  }
  return item.quantity
}

export function coverageStatus(percent: number, stocked = false): CoverageStatus {
  if (!stocked && percent <= 0) {
    return 'empty'
  }
  if (percent < 50) {
    return 'critical'
  }
  if (percent < 100) {
    return 'low'
  }
  if (percent > 100) {
    return 'over'
  }
  return 'good'
}

export function computeConsumableCoverage(
  category: CategoryForCoverage,
  items: ItemForCoverage[],
  headcount: number,
  targetDays: number
): ConsumableCategoryCoverage {
  const dailyPerPerson = category.default_daily_per_person ?? 0
  const unit = category.default_unit ?? 'units'
  const categoryItems = items.filter(item => item.category_id === category.id)
  const onHand = categoryItems.reduce(
    (sum, item) => sum + effectiveConsumableAmount(item, category.slug),
    0
  )
  const required = headcount * targetDays * dailyPerPerson
  const dailyNeed = headcount * dailyPerPerson
  const percent = required > 0 ? (onHand / required) * 100 : (onHand > 0 ? 100 : 0)
  const daysCovered = dailyNeed > 0 ? onHand / dailyNeed : 0

  return {
    calc_type: 'consumable',
    categoryId: category.id,
    slug: category.slug,
    name: category.name,
    icon: category.icon,
    unit,
    onHand,
    required,
    percent,
    daysCovered,
    status: coverageStatus(percent, onHand > 0)
  }
}

export function computeChecklistCoverage(
  category: CategoryForCoverage,
  items: ItemForCoverage[]
): ChecklistCategoryCoverage {
  const recommendedQty = category.recommended_qty ?? 1
  const stockedCount = items.filter(
    item => item.category_id === category.id && item.quantity > 0
  ).length
  const percent = recommendedQty > 0
    ? (stockedCount / recommendedQty) * 100
    : (stockedCount > 0 ? 100 : 0)

  return {
    calc_type: 'checklist',
    categoryId: category.id,
    slug: category.slug,
    name: category.name,
    icon: category.icon,
    stockedCount,
    recommendedQty,
    percent,
    status: coverageStatus(percent, stockedCount > 0)
  }
}

export function computeCategoryCoverage(
  category: CategoryForCoverage,
  items: ItemForCoverage[],
  headcount: number,
  targetDays: number
): CategoryCoverage {
  if (category.calc_type === 'consumable') {
    return computeConsumableCoverage(category, items, headcount, targetDays)
  }
  return computeChecklistCoverage(category, items)
}

export function computeAllCategoryCoverage(
  categories: CategoryForCoverage[],
  items: ItemForCoverage[],
  headcount: number,
  targetDays: number
): CategoryCoverage[] {
  return [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(category => computeCategoryCoverage(category, items, headcount, targetDays))
}

export function coverageToGap(coverage: CategoryCoverage): CategoryGap {
  if (coverage.calc_type === 'consumable') {
    const gap = Math.max(0, coverage.required - coverage.onHand)
    return {
      calc_type: 'consumable',
      categoryId: coverage.categoryId,
      slug: coverage.slug,
      name: coverage.name,
      icon: coverage.icon,
      unit: coverage.unit,
      onHand: coverage.onHand,
      required: coverage.required,
      gap,
      surplus: Math.max(0, coverage.onHand - coverage.required),
      isMet: gap === 0
    }
  }

  const gap = Math.max(0, coverage.recommendedQty - coverage.stockedCount)
  return {
    calc_type: 'checklist',
    categoryId: coverage.categoryId,
    slug: coverage.slug,
    name: coverage.name,
    icon: coverage.icon,
    stockedCount: coverage.stockedCount,
    recommendedQty: coverage.recommendedQty,
    gap,
    isMet: gap === 0
  }
}

export function computeAllCategoryGaps(
  categories: CategoryForCoverage[],
  items: ItemForCoverage[],
  headcount: number,
  targetDays: number
): CategoryGap[] {
  return computeAllCategoryCoverage(categories, items, headcount, targetDays)
    .map(coverageToGap)
}

export function formatGapLabel(gap: CategoryGap): string {
  if (gap.calc_type === 'consumable') {
    if (!gap.isMet) {
      return `Shortfall: need +${formatQuantity(gap.gap)} ${gap.unit}`
    }
    if (gap.surplus > 0) {
      return `+${formatQuantity(gap.surplus)} ${gap.unit} above target`
    }
    return 'On target — no shortfall'
  }

  if (!gap.isMet) {
    if (gap.stockedCount === 0) {
      return 'Shortfall: add at least one item'
    }
    return `Shortfall: need ${gap.gap} more item${gap.gap === 1 ? '' : 's'}`
  }

  return 'On target — no shortfall'
}

export function formatGapDetail(gap: CategoryGap, targetDays: number): string {
  if (gap.calc_type === 'consumable') {
    const days = targetDays === 1 ? '1 day' : `${targetDays} days`
    const amounts = `${formatQuantity(gap.onHand)} of ${formatQuantity(gap.required)} ${gap.unit} for ${days}`
    if (!gap.isMet) {
      return `Plan gap shortfall · ${amounts}`
    }
    return amounts
  }

  const stocked = `${gap.stockedCount} of ${gap.recommendedQty} essentials stocked`
  if (!gap.isMet) {
    return `Plan gap shortfall · ${stocked}`
  }
  return stocked
}

export function countExpiringSoon(
  items: ItemForCoverage[],
  withinDays = EXPIRING_SOON_DAYS,
  referenceDate = new Date()
): number {
  return items.filter((item) => {
    if (!item.expiration_date) {
      return false
    }
    const daysUntil = daysBetween(referenceDate, new Date(`${item.expiration_date}T12:00:00`))
    return daysUntil >= 0 && daysUntil <= withinDays
  }).length
}

export function countExpired(
  items: ItemForCoverage[],
  referenceDate = new Date()
): number {
  return items.filter((item) => {
    if (!item.expiration_date) {
      return false
    }
    return daysBetween(referenceDate, new Date(`${item.expiration_date}T12:00:00`)) < 0
  }).length
}

export function listExpiringItems(
  items: Array<ItemForCoverage & { id: string, categoryName: string }>,
  withinDays = EXPIRING_SOON_DAYS,
  referenceDate = new Date(),
  limit = 5
): ExpiringItem[] {
  return items
    .filter((item): item is typeof item & { expiration_date: string } => Boolean(item.expiration_date))
    .map(item => ({
      id: item.id,
      name: item.name,
      expiration_date: item.expiration_date,
      daysUntil: daysBetween(referenceDate, new Date(`${item.expiration_date}T12:00:00`)),
      categoryName: item.categoryName
    }))
    .filter(item => item.daysUntil >= 0 && item.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name))
    .slice(0, limit)
}

export function formatQuantity(value: number, maxDecimals = 1) {
  if (Number.isInteger(value)) {
    return String(value)
  }
  return value.toFixed(maxDecimals).replace(/\.0$/, '')
}

// --- Global alerts panel (aggregates expiration, plan gaps, coverage) ---

export type AlertKind = 'expiration' | 'plan_gap' | 'coverage'
export type AlertSeverity = 'error' | 'warning'

/** Preparedness alert — icon (shape), severity (color), title + detail (text). */
export type AppAlert = {
  id: string
  kind: AlertKind
  severity: AlertSeverity
  icon: string
  title: string
  detail: string
  href: string
  categoryId?: string
  itemId?: string
}

export type AlertGroup = {
  kind: AlertKind
  label: string
  alerts: AppAlert[]
}

export type AlertsItem = ItemForCoverage & {
  id: string
  categoryName: string
}

export type ComputeAlertsInput = {
  categories: CategoryForCoverage[]
  items: AlertsItem[]
  headcount: number
  targetDays: number
  referenceDate?: Date
}

const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  expiration: 'Expiration',
  plan_gap: 'Plan gaps',
  coverage: 'Coverage'
}

const ALERT_SEVERITY_ORDER: Record<AlertSeverity, number> = {
  error: 0,
  warning: 1
}

const ALERT_KIND_ORDER: Record<AlertKind, number> = {
  expiration: 0,
  plan_gap: 1,
  coverage: 2
}

function formatExpirationAlertDetail(daysUntil: number, categoryName: string) {
  if (daysUntil === 0) {
    return `Expires today · ${categoryName}`
  }
  if (daysUntil === 1) {
    return `Expires tomorrow · ${categoryName}`
  }
  return `Expires in ${daysUntil} days · ${categoryName}`
}

function planGapAlertSeverity(gap: CategoryGap): AlertSeverity {
  if (gap.calc_type === 'consumable' && gap.onHand <= 0) {
    return 'error'
  }
  return 'warning'
}

function coverageAlertSeverity(status: 'critical' | 'low'): AlertSeverity {
  return status === 'critical' ? 'error' : 'warning'
}

function coverageAlertTitle(name: string, status: 'critical' | 'low') {
  return status === 'critical' ? `${name}: Critical` : `${name}: Needs attention`
}

function coverageAlertDetail(coverage: CategoryCoverage, targetDays: number) {
  if (coverage.calc_type === 'consumable') {
    const days = targetDays === 1 ? '1 day' : `${targetDays} days`
    return `${Math.round(coverage.percent)}% of ${days} target`
  }
  return `${coverage.stockedCount} of ${coverage.recommendedQty} essentials stocked`
}

export function computeExpirationAlerts(
  items: AlertsItem[],
  referenceDate = new Date()
): AppAlert[] {
  const alerts: AppAlert[] = []

  for (const item of items) {
    if (!item.expiration_date) {
      continue
    }

    const daysUntil = daysBetween(referenceDate, new Date(`${item.expiration_date}T12:00:00`))

    if (daysUntil < 0) {
      const daysAgo = Math.abs(daysUntil)
      alerts.push({
        id: `expiration:${item.id}`,
        kind: 'expiration',
        severity: 'error',
        icon: 'i-lucide-calendar-x',
        title: item.name,
        detail: `Expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago · ${item.categoryName}`,
        href: '/expiring',
        itemId: item.id
      })
      continue
    }

    if (daysUntil <= EXPIRING_SOON_DAYS) {
      alerts.push({
        id: `expiration:${item.id}`,
        kind: 'expiration',
        severity: 'warning',
        icon: 'i-lucide-calendar-clock',
        title: item.name,
        detail: formatExpirationAlertDetail(daysUntil, item.categoryName),
        href: '/expiring',
        itemId: item.id
      })
    }
  }

  return alerts.sort((a, b) => {
    const severity = ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity]
    if (severity !== 0) {
      return severity
    }
    return a.title.localeCompare(b.title)
  })
}

export function computePlanGapAlerts(gaps: CategoryGap[], targetDays: number): AppAlert[] {
  return gaps
    .filter(gap => !gap.isMet)
    .map(gap => ({
      id: `plan_gap:${gap.categoryId}`,
      kind: 'plan_gap' as const,
      severity: planGapAlertSeverity(gap),
      icon: gap.icon ?? 'i-lucide-trending-up',
      title: gap.name,
      detail: `${formatGapLabel(gap)} · ${formatGapDetail(gap, targetDays)}`,
      href: '/plan',
      categoryId: gap.categoryId
    }))
    .sort((a, b) => ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity]
      || a.title.localeCompare(b.title))
}

export function computeCoverageAlerts(
  categories: CategoryForCoverage[],
  items: AlertsItem[],
  headcount: number,
  targetDays: number,
  openGapCategoryIds: Set<string>
): AppAlert[] {
  const coverages = computeAllCategoryCoverage(categories, items, headcount, targetDays)

  return coverages
    .filter((coverage) => {
      if (coverage.status !== 'critical' && coverage.status !== 'low') {
        return false
      }
      return !openGapCategoryIds.has(coverage.categoryId)
    })
    .map(coverage => ({
      id: `coverage:${coverage.categoryId}`,
      kind: 'coverage' as const,
      severity: coverageAlertSeverity(coverage.status as 'critical' | 'low'),
      icon: coverage.icon ?? 'i-lucide-alert-triangle',
      title: coverageAlertTitle(coverage.name, coverage.status as 'critical' | 'low'),
      detail: coverageAlertDetail(coverage, targetDays),
      href: '/',
      categoryId: coverage.categoryId
    }))
    .sort((a, b) => ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity]
      || a.title.localeCompare(b.title))
}

export function sortAlerts(alerts: AppAlert[]): AppAlert[] {
  return [...alerts].sort((a, b) => {
    const severity = ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity]
    if (severity !== 0) {
      return severity
    }
    const kind = ALERT_KIND_ORDER[a.kind] - ALERT_KIND_ORDER[b.kind]
    if (kind !== 0) {
      return kind
    }
    return a.title.localeCompare(b.title)
  })
}

export function computeAlerts(input: ComputeAlertsInput): AppAlert[] {
  const {
    categories,
    items,
    headcount,
    targetDays,
    referenceDate = new Date()
  } = input

  const gaps = computeAllCategoryGaps(categories, items, headcount, targetDays)
  const openGapCategoryIds = new Set(
    gaps.filter(gap => !gap.isMet).map(gap => gap.categoryId)
  )

  return sortAlerts([
    ...computeExpirationAlerts(items, referenceDate),
    ...computePlanGapAlerts(gaps, targetDays),
    ...computeCoverageAlerts(categories, items, headcount, targetDays, openGapCategoryIds)
  ])
}

export function groupAlerts(alerts: AppAlert[]): AlertGroup[] {
  const groups: AlertGroup[] = [
    { kind: 'expiration', label: ALERT_KIND_LABELS.expiration, alerts: [] },
    { kind: 'plan_gap', label: ALERT_KIND_LABELS.plan_gap, alerts: [] },
    { kind: 'coverage', label: ALERT_KIND_LABELS.coverage, alerts: [] }
  ]

  for (const alert of alerts) {
    const group = groups.find(entry => entry.kind === alert.kind)
    group?.alerts.push(alert)
  }

  return groups.filter(group => group.alerts.length > 0)
}
