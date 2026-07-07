import mockData from './fixtures/plan-picker.mock.json'

export type PlanPickerNotification = {
  id: string
  severity: 'error' | 'warning' | 'neutral'
  icon: string
  text: string
}

export type PlanPickerCard = {
  id: string
  ownerFirstName: string
  householdName: string
  displayName: string
  role: 'owner' | 'maintainer' | 'shopper' | 'watcher'
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

export type PlanPickerFixture = {
  meta: {
    description: string
    viewerFirstName: string
  }
  plans: PlanPickerCard[]
}

export function getPlanPickerMock(): PlanPickerFixture {
  return mockData as PlanPickerFixture
}
