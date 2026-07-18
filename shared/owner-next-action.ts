import type { CategoryGap } from './coverage'

export type OwnerNextActionSeverity = 'error' | 'warning' | 'success' | 'neutral'

export type OwnerRestockPhase =
  | 'draft'
  | 'shopping'
  | 'shopping_complete'
  | 'intake_pending'
  | 'intake_submitted'
  | null

export type OwnerNextAction = {
  id: string
  title: string
  detail: string
  ctaLabel: string
  href: string
  severity: OwnerNextActionSeverity
  icon: string
}

export type ComputeOwnerNextActionInput = {
  openGaps: CategoryGap[]
  itemCount: number
  targetDays: number
  expiredCount: number
  expiringSoonCount: number
  restockPhase: OwnerRestockPhase
  /** When false, skip owner-only restock finish CTAs that assume solo path. */
  isPlanOwner?: boolean
}

function formatGapAmount(value: number) {
  if (!Number.isFinite(value)) {
    return '0'
  }
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function gapSummary(openGaps: CategoryGap[]) {
  if (openGaps.length === 1) {
    const gap = openGaps[0]!
    if (gap.calc_type === 'consumable' && gap.gap > 0) {
      return `${gap.name}: need +${formatGapAmount(gap.gap)} ${gap.unit}`
    }
    return `${gap.name} needs attention`
  }
  const names = openGaps.slice(0, 2).map(gap => gap.name)
  const more = openGaps.length > 2 ? ` +${openGaps.length - 2} more` : ''
  return `${names.join(', ')}${more}`
}

/**
 * Single ranked “do this next” for solo owners (Dashboard See pass).
 * Priority: active restock → plan gaps → expired → expiring → empty inventory → on target.
 */
export function computeOwnerNextAction(input: ComputeOwnerNextActionInput): OwnerNextAction {
  const {
    openGaps,
    itemCount,
    targetDays,
    expiredCount,
    expiringSoonCount,
    restockPhase,
    isPlanOwner = true
  } = input

  const daysLabel = targetDays === 1 ? '1 day' : `${targetDays} days`

  if (isPlanOwner && restockPhase === 'intake_submitted') {
    return {
      id: 'restock_apply',
      title: 'Ready to update inventory',
      detail: 'Your restock log is complete. Apply it so coverage stays current.',
      ctaLabel: 'Update inventory',
      href: '/restock',
      severity: 'warning',
      icon: 'i-lucide-package-check'
    }
  }

  if (isPlanOwner && restockPhase === 'intake_pending') {
    return {
      id: 'restock_log',
      title: 'Finish logging what you bought',
      detail: 'Record each line on Restock, then update your inventory.',
      ctaLabel: 'Open Restock',
      href: '/restock',
      severity: 'warning',
      icon: 'i-lucide-package-open'
    }
  }

  if (isPlanOwner && restockPhase === 'shopping_complete') {
    return {
      id: 'restock_put_away',
      title: 'Log what you bought',
      detail: 'Shopping is done — put items away and update inventory on Restock.',
      ctaLabel: 'Open Restock',
      href: '/restock',
      severity: 'warning',
      icon: 'i-lucide-shopping-bag'
    }
  }

  if (isPlanOwner && restockPhase === 'shopping') {
    return {
      id: 'restock_shopping',
      title: 'Finish shopping',
      detail: 'You have an active shopping list. Mark it done when you return, then log what came in.',
      ctaLabel: 'Open Restock',
      href: '/restock',
      severity: 'warning',
      icon: 'i-lucide-shopping-cart'
    }
  }

  if (isPlanOwner && restockPhase === 'draft') {
    return {
      id: 'restock_draft',
      title: 'Continue your restock list',
      detail: 'A shopping list is ready. Start shopping when you head to the store.',
      ctaLabel: 'Open Restock',
      href: '/restock',
      severity: 'neutral',
      icon: 'i-lucide-list'
    }
  }

  if (openGaps.length > 0) {
    const count = openGaps.length
    return {
      id: 'plan_gaps',
      title: count === 1 ? 'Close 1 plan gap' : `Close ${count} plan gaps`,
      detail: `${gapSummary(openGaps)} · for your ${daysLabel} target`,
      ctaLabel: 'Start restock',
      href: '/restock',
      severity: openGaps.some(gap => gap.calc_type === 'consumable' && gap.onHand <= 0)
        ? 'error'
        : 'warning',
      icon: 'i-lucide-list-plus'
    }
  }

  if (expiredCount > 0) {
    return {
      id: 'expired',
      title: expiredCount === 1 ? 'Review 1 expired item' : `Review ${expiredCount} expired items`,
      detail: 'Replace or remove expired supplies so your plan stays accurate.',
      ctaLabel: 'View expiring',
      href: '/expiring',
      severity: 'error',
      icon: 'i-lucide-calendar-x'
    }
  }

  if (expiringSoonCount > 0) {
    return {
      id: 'expiring',
      title: expiringSoonCount === 1
        ? '1 item expiring soon'
        : `${expiringSoonCount} items expiring soon`,
      detail: 'Rotate or replace items within 30 days so nothing slips past.',
      ctaLabel: 'View expiring',
      href: '/expiring',
      severity: 'warning',
      icon: 'i-lucide-calendar-clock'
    }
  }

  if (itemCount === 0) {
    return {
      id: 'empty_inventory',
      title: 'Add supplies to see coverage',
      detail: 'Start with water and food, then medical, power, and other essentials.',
      ctaLabel: 'Add items',
      href: '/inventory',
      severity: 'neutral',
      icon: 'i-lucide-package-plus'
    }
  }

  return {
    id: 'on_target',
    title: `On target for ${daysLabel}`,
    detail: 'No plan gaps right now. Keep inventory current as you use or rotate supplies.',
    ctaLabel: 'View plan',
    href: '/plan',
    severity: 'success',
    icon: 'i-lucide-circle-check'
  }
}

/** Derive restock phase from active shop-run flags (owner See ranking). */
export function resolveOwnerRestockPhase(input: {
  hasDraft: boolean
  hasShopping: boolean
  hasShoppingComplete: boolean
  hasIntakePending: boolean
  hasIntakeSubmitted: boolean
}): OwnerRestockPhase {
  if (input.hasIntakeSubmitted) {
    return 'intake_submitted'
  }
  if (input.hasIntakePending) {
    return 'intake_pending'
  }
  if (input.hasShoppingComplete) {
    return 'shopping_complete'
  }
  if (input.hasShopping) {
    return 'shopping'
  }
  if (input.hasDraft) {
    return 'draft'
  }
  return null
}

export function ownerNextActionAlertColor(
  severity: OwnerNextActionSeverity
): 'error' | 'warning' | 'success' | 'primary' | 'neutral' {
  switch (severity) {
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    case 'success':
      return 'success'
    case 'neutral':
      return 'neutral'
    default:
      return 'primary'
  }
}
