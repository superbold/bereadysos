import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { firstNameFromEmail, formatPlanOwnerLabel } from '../shared/display.ts'

describe('formatPlanOwnerLabel', () => {
  it('uses first name when present', () => {
    assert.equal(formatPlanOwnerLabel('Alex'), 'Alex\'s plan')
  })

  it('falls back to household name', () => {
    assert.equal(formatPlanOwnerLabel('', 'Smith family'), 'Smith family')
  })

  it('uses generic label for default household without a name', () => {
    assert.equal(formatPlanOwnerLabel(null, 'My Household'), 'Preparedness plan')
  })
})

describe('firstNameFromEmail', () => {
  it('derives a display token from email', () => {
    assert.equal(firstNameFromEmail('alex.smith@example.com'), 'Alex')
  })
})
