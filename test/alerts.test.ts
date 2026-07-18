import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeAlerts,
  computeExpirationAlerts,
  computePlanGapAlerts,
  groupAlerts,
  type CategoryGap
} from '../shared/coverage.ts'

const water = {
  id: 'water-id',
  slug: 'water',
  name: 'Water',
  calc_type: 'consumable' as const,
  default_daily_per_person: 1,
  default_unit: 'gallons',
  recommended_qty: null,
  icon: 'i-lucide-droplets',
  sort_order: 10
}

const medical = {
  id: 'medical-id',
  slug: 'medical',
  name: 'Medical',
  calc_type: 'checklist' as const,
  default_daily_per_person: null,
  default_unit: 'each',
  recommended_qty: 1,
  icon: 'i-lucide-cross',
  sort_order: 30
}

const referenceDate = new Date('2026-06-15T12:00:00')

describe('computeExpirationAlerts', () => {
  it('creates error alerts for expired items', () => {
    const alerts = computeExpirationAlerts([{
      id: 'item-1',
      category_id: water.id,
      quantity: 1,
      servings_per_unit: null,
      volume_per_unit: null,
      expiration_date: '2026-06-10',
      name: 'Bottled water',
      categoryName: 'Water'
    }], referenceDate)

    assert.equal(alerts.length, 1)
    assert.equal(alerts[0]?.severity, 'error')
    assert.equal(alerts[0]?.icon, 'i-lucide-calendar-x')
    assert.match(alerts[0]?.detail ?? '', /Expired 5 days ago/)
  })

  it('creates warning alerts for items expiring within 30 days', () => {
    const alerts = computeExpirationAlerts([{
      id: 'item-2',
      category_id: water.id,
      quantity: 1,
      servings_per_unit: null,
      volume_per_unit: null,
      expiration_date: '2026-07-01',
      name: 'Canned beans',
      categoryName: 'Water'
    }], referenceDate)

    assert.equal(alerts.length, 1)
    assert.equal(alerts[0]?.severity, 'warning')
    assert.equal(alerts[0]?.icon, 'i-lucide-calendar-clock')
    assert.match(alerts[0]?.detail ?? '', /Expires in/)
  })
})

describe('computePlanGapAlerts', () => {
  it('maps open gaps to warning alerts with shortfall copy', () => {
    const gap: CategoryGap = {
      calc_type: 'consumable',
      categoryId: water.id,
      slug: 'water',
      name: 'Water',
      icon: 'i-lucide-droplets',
      unit: 'gallons',
      onHand: 5,
      required: 7,
      gap: 2,
      surplus: 0,
      isMet: false
    }

    const alerts = computePlanGapAlerts([gap], 7)
    assert.equal(alerts.length, 1)
    assert.equal(alerts[0]?.severity, 'warning')
    assert.match(alerts[0]?.detail ?? '', /Shortfall: need \+2 gallons/)
    assert.equal(alerts[0]?.href, '/restock')
  })

  it('uses error severity when consumable on hand is zero', () => {
    const gap: CategoryGap = {
      calc_type: 'consumable',
      categoryId: water.id,
      slug: 'water',
      name: 'Water',
      icon: 'i-lucide-droplets',
      unit: 'gallons',
      onHand: 0,
      required: 7,
      gap: 7,
      surplus: 0,
      isMet: false
    }

    const alerts = computePlanGapAlerts([gap], 7)
    assert.equal(alerts[0]?.severity, 'error')
  })
})

describe('computeAlerts', () => {
  it('aggregates expiration and plan gap alerts', () => {
    const alerts = computeAlerts({
      categories: [water, medical],
      items: [{
        id: 'item-1',
        category_id: water.id,
        quantity: 5,
        servings_per_unit: null,
        volume_per_unit: 1,
        expiration_date: '2026-06-20',
        name: 'Bottled water',
        categoryName: 'Water'
      }],
      headcount: 1,
      targetDays: 7,
      referenceDate
    })

    assert.ok(alerts.some(alert => alert.kind === 'expiration'))
    assert.ok(alerts.some(alert => alert.kind === 'plan_gap'))
  })
})

describe('groupAlerts', () => {
  it('groups alerts by kind and omits empty groups', () => {
    const groups = groupAlerts([
      {
        id: 'expiration:1',
        kind: 'expiration',
        severity: 'warning',
        icon: 'i-lucide-calendar-clock',
        title: 'Beans',
        detail: 'Expires in 3 days',
        href: '/expiring'
      },
      {
        id: 'plan_gap:water',
        kind: 'plan_gap',
        severity: 'warning',
        icon: 'i-lucide-droplets',
        title: 'Water',
        detail: 'Shortfall',
        href: '/plan'
      }
    ])

    assert.equal(groups.length, 2)
    assert.equal(groups[0]?.kind, 'expiration')
    assert.equal(groups[1]?.kind, 'plan_gap')
  })
})
