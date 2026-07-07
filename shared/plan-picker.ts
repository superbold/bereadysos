import type { HouseholdRole } from './household-roles.ts'

export type PlanPickerNotification = {
  id: string
  severity: 'error' | 'warning' | 'neutral'
  icon: string
  text: string
}

export type PlanPickerCardModel = {
  id: string
  householdId: string
  ownerFirstName: string
  householdName: string
  displayName: string
  role: HouseholdRole
  roleLabel: string
  roleDescription: string
  isOwned: boolean
  theme: {
    accentClass: string
    stripeColor: string
  }
  summary: string
  notifications: PlanPickerNotification[]
  alertCount: number
  lastActivity: string
}

const HELPER_THEMES = [
  { accentClass: 'plan-theme--rose', stripeColor: '#f472b6' },
  { accentClass: 'plan-theme--sky', stripeColor: '#38bdf8' },
  { accentClass: 'plan-theme--amber', stripeColor: '#fbbf24' },
  { accentClass: 'plan-theme--violet', stripeColor: '#a78bfa' }
] as const

export function planThemeForCard(isOwned: boolean, helperIndex: number) {
  if (isOwned) {
    return {
      accentClass: 'plan-theme--owned',
      stripeColor: 'var(--ui-primary)'
    }
  }

  const theme = HELPER_THEMES[helperIndex % HELPER_THEMES.length] ?? HELPER_THEMES[0]
  return {
    accentClass: theme.accentClass,
    stripeColor: theme.stripeColor
  }
}

export function formatPlanSummary(headcount: number, targetDays: number) {
  const people = headcount === 1 ? '1 person' : `${headcount} people`
  const days = targetDays === 1 ? '1-day target' : `${targetDays}-day target`
  return `${people} · ${days}`
}
