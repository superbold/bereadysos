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
