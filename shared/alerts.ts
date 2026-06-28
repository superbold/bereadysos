import {
  computeAllCategoryCoverage,
  computeAllCategoryGaps,
  EXPIRING_SOON_DAYS,
  formatGapDetail,
  formatGapLabel,
  type CategoryForCoverage,
  type CategoryGap,
  type ItemForCoverage
} from './coverage'

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

const KIND_LABELS: Record<AlertKind, string> = {
  expiration: 'Expiration',
  plan_gap: 'Plan gaps',
  coverage: 'Coverage'
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  error: 0,
  warning: 1
}

const KIND_ORDER: Record<AlertKind, number> = {
  expiration: 0,
  plan_gap: 1,
  coverage: 2
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

function formatExpirationDetail(daysUntil: number, categoryName: string) {
  if (daysUntil === 0) {
    return `Expires today · ${categoryName}`
  }
  if (daysUntil === 1) {
    return `Expires tomorrow · ${categoryName}`
  }
  return `Expires in ${daysUntil} days · ${categoryName}`
}

function planGapSeverity(gap: CategoryGap): AlertSeverity {
  if (gap.calc_type === 'consumable' && gap.onHand <= 0) {
    return 'error'
  }
  return 'warning'
}

function coverageSeverity(status: 'critical' | 'low'): AlertSeverity {
  return status === 'critical' ? 'error' : 'warning'
}

function coverageTitle(name: string, status: 'critical' | 'low') {
  return status === 'critical' ? `${name}: Critical` : `${name}: Needs attention`
}

function coverageDetail(
  coverage: ReturnType<typeof computeAllCategoryCoverage>[number],
  targetDays: number
) {
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
        detail: formatExpirationDetail(daysUntil, item.categoryName),
        href: '/expiring',
        itemId: item.id
      })
    }
  }

  return alerts.sort((a, b) => {
    const severity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
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
      severity: planGapSeverity(gap),
      icon: gap.icon ?? 'i-lucide-trending-up',
      title: gap.name,
      detail: `${formatGapLabel(gap)} · ${formatGapDetail(gap, targetDays)}`,
      href: '/plan',
      categoryId: gap.categoryId
    }))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
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
      severity: coverageSeverity(coverage.status as 'critical' | 'low'),
      icon: coverage.icon ?? 'i-lucide-alert-triangle',
      title: coverageTitle(coverage.name, coverage.status as 'critical' | 'low'),
      detail: coverageDetail(coverage, targetDays),
      href: '/',
      categoryId: coverage.categoryId
    }))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      || a.title.localeCompare(b.title))
}

export function sortAlerts(alerts: AppAlert[]): AppAlert[] {
  return [...alerts].sort((a, b) => {
    const severity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (severity !== 0) {
      return severity
    }
    const kind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
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
    { kind: 'expiration', label: KIND_LABELS.expiration, alerts: [] },
    { kind: 'plan_gap', label: KIND_LABELS.plan_gap, alerts: [] },
    { kind: 'coverage', label: KIND_LABELS.coverage, alerts: [] }
  ]

  for (const alert of alerts) {
    const group = groups.find(entry => entry.kind === alert.kind)
    group?.alerts.push(alert)
  }

  return groups.filter(group => group.alerts.length > 0)
}
