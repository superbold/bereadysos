import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canEditInventory,
  canManageHouseholdSettings,
  isCollaboratorOnPlan,
  isReadOnlyCollaborator,
  roleDescription,
  roleLabel
} from '../shared/household-roles.ts'

describe('household roles', () => {
  it('labels maintainer as inventory keeper', () => {
    assert.equal(roleLabel('maintainer'), 'Inventory keeper')
    assert.equal(roleLabel('member'), 'Inventory keeper')
  })

  it('allows inventory CRUD for owner and inventory keeper', () => {
    assert.equal(canEditInventory('owner'), true)
    assert.equal(canEditInventory('maintainer'), true)
    assert.equal(canEditInventory('member'), true)
    assert.equal(canEditInventory('shopper'), false)
    assert.equal(canEditInventory('watcher'), false)
  })

  it('restricts household settings to owner', () => {
    assert.equal(canManageHouseholdSettings('owner'), true)
    assert.equal(canManageHouseholdSettings('maintainer'), false)
  })

  it('identifies read-only collaborators', () => {
    assert.equal(isReadOnlyCollaborator('shopper'), true)
    assert.equal(isReadOnlyCollaborator('watcher'), true)
    assert.equal(isReadOnlyCollaborator('maintainer'), false)
  })

  it('identifies collaborators on a plan', () => {
    assert.equal(isCollaboratorOnPlan('owner'), false)
    assert.equal(isCollaboratorOnPlan('shopper'), true)
  })

  it('uses the standard watcher description', () => {
    assert.match(roleDescription('watcher'), /^Read-only — watch the plan/)
  })
})
