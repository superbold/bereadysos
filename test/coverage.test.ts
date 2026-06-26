import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeAllCategoryCoverage,
  computeConsumableCoverage,
  countExpired,
  countExpiringSoon,
  effectiveConsumableAmount,
  listExpiringItems,
  TARGET_DAY_PRESETS
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

const food = {
  id: 'food-id',
  slug: 'food',
  name: 'Food',
  calc_type: 'consumable' as const,
  default_daily_per_person: 3,
  default_unit: 'servings',
  recommended_qty: null,
  icon: 'i-lucide-utensils',
  sort_order: 20
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

describe('effectiveConsumableAmount', () => {
  it('multiplies water quantity by volume_per_unit', () => {
    const amount = effectiveConsumableAmount({
      category_id: water.id,
      quantity: 4,
      volume_per_unit: 2.5,
      servings_per_unit: null,
      expiration_date: null,
      name: 'Jugs'
    }, 'water')
    assert.equal(amount, 10)
  })

  it('multiplies food quantity by servings_per_unit', () => {
    const amount = effectiveConsumableAmount({
      category_id: food.id,
      quantity: 6,
      volume_per_unit: null,
      servings_per_unit: 2,
      expiration_date: null,
      name: 'Cans'
    }, 'food')
    assert.equal(amount, 12)
  })
})

describe('computeConsumableCoverage', () => {
  it('calculates required gallons for headcount and target days', () => {
    const coverage = computeConsumableCoverage(water, [{
      category_id: water.id,
      quantity: 10,
      volume_per_unit: null,
      servings_per_unit: null,
      expiration_date: null,
      name: 'Stored water'
    }], 2, 7)

    assert.equal(coverage.required, 14)
    assert.equal(coverage.onHand, 10)
    assert.equal(coverage.daysCovered, 5)
    assert.equal(coverage.status, 'low')
  })

  it('marks full coverage as good', () => {
    const coverage = computeConsumableCoverage(water, [{
      category_id: water.id,
      quantity: 14,
      volume_per_unit: null,
      servings_per_unit: null,
      expiration_date: null,
      name: 'Stored water'
    }], 2, 7)

    assert.equal(coverage.percent, 100)
    assert.equal(coverage.status, 'good')
  })
})

describe('computeAllCategoryCoverage', () => {
  it('includes checklist stocked counts', () => {
    const results = computeAllCategoryCoverage(
      [water, medical],
      [
        {
          category_id: medical.id,
          quantity: 1,
          volume_per_unit: null,
          servings_per_unit: null,
          expiration_date: null,
          name: 'First aid kit'
        }
      ],
      1,
      7
    )

    const checklist = results.find(result => result.calc_type === 'checklist')
    assert.equal(checklist?.calc_type === 'checklist' && checklist.stockedCount, 1)
    assert.equal(checklist?.calc_type === 'checklist' && checklist.status, 'good')
  })
})

describe('expiration helpers', () => {
  const referenceDate = new Date('2026-06-25T12:00:00')

  const items = [
    {
      id: '1',
      category_id: food.id,
      quantity: 1,
      volume_per_unit: null,
      servings_per_unit: null,
      expiration_date: '2026-07-01',
      name: 'Soon',
      categoryName: 'Food'
    },
    {
      id: '2',
      category_id: food.id,
      quantity: 1,
      volume_per_unit: null,
      servings_per_unit: null,
      expiration_date: '2026-08-01',
      name: 'Later',
      categoryName: 'Food'
    },
    {
      id: '3',
      category_id: food.id,
      quantity: 1,
      volume_per_unit: null,
      servings_per_unit: null,
      expiration_date: '2026-06-01',
      name: 'Past',
      categoryName: 'Food'
    }
  ]

  it('counts items expiring within 30 days', () => {
    assert.equal(countExpiringSoon(items, 30, referenceDate), 1)
  })

  it('counts expired items', () => {
    assert.equal(countExpired(items, referenceDate), 1)
  })

  it('lists soonest expiring items first', () => {
    const listed = listExpiringItems(items, 30, referenceDate, 5)
    assert.equal(listed.length, 1)
    assert.equal(listed[0]?.name, 'Soon')
    assert.equal(listed[0]?.daysUntil, 6)
  })
})

describe('TARGET_DAY_PRESETS', () => {
  it('matches product presets', () => {
    assert.deepEqual(TARGET_DAY_PRESETS, [3, 7, 14, 30, 90])
  })
})
