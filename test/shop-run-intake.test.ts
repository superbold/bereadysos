import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canSubmitIntakeRun,
  defaultReportedQuantity,
  isIntakeLineResolved,
  isIntakeLineValid
} from '../shared/shop-run-intake.ts'

describe('shop run intake', () => {
  it('detects unresolved intake lines', () => {
    assert.equal(isIntakeLineResolved({ line_status: 'pending', quantity_reported: null }), false)
    assert.equal(isIntakeLineResolved({ line_status: 'bought', quantity_reported: 2 }), true)
  })

  it('requires quantity for bought and substituted lines', () => {
    assert.equal(isIntakeLineValid({ line_status: 'skipped', quantity_reported: null }), true)
    assert.equal(isIntakeLineValid({ line_status: 'bought', quantity_reported: null }), false)
    assert.equal(isIntakeLineValid({ line_status: 'bought', quantity_reported: 3 }), true)
  })

  it('blocks submit until every line is valid', () => {
    assert.equal(canSubmitIntakeRun([
      { line_status: 'bought', quantity_reported: 2 },
      { line_status: 'pending', quantity_reported: null }
    ]), false)

    assert.equal(canSubmitIntakeRun([
      { line_status: 'bought', quantity_reported: 2 },
      { line_status: 'skipped', quantity_reported: 0 }
    ]), true)
  })

  it('defaults reported quantity from the plan', () => {
    assert.equal(defaultReportedQuantity('bought', 12), 12)
    assert.equal(defaultReportedQuantity('skipped', 12), 0)
  })
})
