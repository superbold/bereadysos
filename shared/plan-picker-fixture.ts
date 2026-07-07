import mockData from './fixtures/plan-picker.mock.json'
import type { PlanPickerCardModel } from './plan-picker.ts'

export type PlanPickerFixture = {
  meta: {
    description: string
    viewerFirstName: string
  }
  plans: PlanPickerCardModel[]
}

export function getPlanPickerMock(): PlanPickerFixture {
  return mockData as PlanPickerFixture
}
