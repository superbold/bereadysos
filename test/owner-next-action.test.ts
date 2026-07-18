import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CategoryGap } from '../shared/coverage.ts'
import {
  computeOwnerNextAction,
  resolveOwnerRestockPhase
} from '../shared/owner-next-action.ts'

const waterGap: CategoryGap = {
  calc_type: 'consumable',
  categoryId: 'water-id',
  slug: 'water',
  name: 'Water',
  icon: 'i-lucide-droplets',
  unit: 'gallons',
  onHand: 2,
  required: 14,
  gap: 12,
  surplus: 0,
  isMet: false
}

const emptyWaterGap: CategoryGap = {
  ...waterGap,
  onHand: 0,
  gap: 14
}

describe('resolveOwnerRestockPhase', () => {
  it('prefers intake submitted over other phases', () => {
    assert.equal(resolveOwnerRestockPhase({
      hasDraft: true,
      hasShopping: true,
      hasShoppingComplete: true,
      hasIntakePending: true,
      hasIntakeSubmitted: true
    }), 'intake_submitted')
  })

  it('returns null when no active run', () => {
    assert.equal(resolveOwnerRestockPhase({
      hasDraft: false,
      hasShopping: false,
      hasShoppingComplete: false,
      hasIntakePending: false,
      hasIntakeSubmitted: false
    }), null)
  })
})

describe('computeOwnerNextAction', () => {
  it('ranks active restock above plan gaps', () => {
    const action = computeOwnerNextAction({
      openGaps: [waterGap],
      itemCount: 5,
      targetDays: 7,
      expiredCount: 2,
      expiringSoonCount: 1,
      restockPhase: 'intake_pending'
    })
    assert.equal(action.id, 'restock_log')
    assert.equal(action.href, '/restock')
  })

  it('points plan gaps to restock', () => {
    const action = computeOwnerNextAction({
      openGaps: [waterGap],
      itemCount: 5,
      targetDays: 7,
      expiredCount: 0,
      expiringSoonCount: 0,
      restockPhase: null
    })
    assert.equal(action.id, 'plan_gaps')
    assert.equal(action.ctaLabel, 'Start restock')
    assert.equal(action.href, '/restock')
    assert.match(action.detail, /Water/)
  })

  it('uses error severity when a consumable gap has zero on hand', () => {
    const action = computeOwnerNextAction({
      openGaps: [emptyWaterGap],
      itemCount: 1,
      targetDays: 7,
      expiredCount: 0,
      expiringSoonCount: 0,
      restockPhase: null
    })
    assert.equal(action.severity, 'error')
  })

  it('ranks expired above expiring and on-target', () => {
    const action = computeOwnerNextAction({
      openGaps: [],
      itemCount: 10,
      targetDays: 7,
      expiredCount: 1,
      expiringSoonCount: 3,
      restockPhase: null
    })
    assert.equal(action.id, 'expired')
    assert.equal(action.href, '/expiring')
  })

  it('surfaces expiring when stocked and no gaps', () => {
    const action = computeOwnerNextAction({
      openGaps: [],
      itemCount: 10,
      targetDays: 7,
      expiredCount: 0,
      expiringSoonCount: 2,
      restockPhase: null
    })
    assert.equal(action.id, 'expiring')
    assert.match(action.title, /2 items/)
  })

  it('returns on-target all-clear', () => {
    const action = computeOwnerNextAction({
      openGaps: [],
      itemCount: 10,
      targetDays: 7,
      expiredCount: 0,
      expiringSoonCount: 0,
      restockPhase: null
    })
    assert.equal(action.id, 'on_target')
    assert.equal(action.severity, 'success')
    assert.equal(action.href, '/plan')
  })

  it('prompts empty inventory', () => {
    const action = computeOwnerNextAction({
      openGaps: [],
      itemCount: 0,
      targetDays: 7,
      expiredCount: 0,
      expiringSoonCount: 0,
      restockPhase: null
    })
    assert.equal(action.id, 'empty_inventory')
    assert.equal(action.href, '/inventory')
  })
})
