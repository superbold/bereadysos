import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeItemName,
  resolveInventoryItemId,
  shouldApplyLineToInventory
} from '../shared/solo-restock-apply.ts'

describe('solo-restock-apply', () => {
  it('shouldApplyLineToInventory only applies bought/substituted with qty and category', () => {
    assert.equal(shouldApplyLineToInventory({
      line_status: 'bought',
      quantity_reported: 12,
      category_id: 'water-id'
    }), true)
    assert.equal(shouldApplyLineToInventory({
      line_status: 'skipped',
      quantity_reported: 0,
      category_id: 'water-id'
    }), false)
    assert.equal(shouldApplyLineToInventory({
      line_status: 'bought',
      quantity_reported: 0,
      category_id: 'water-id'
    }), false)
    assert.equal(shouldApplyLineToInventory({
      line_status: 'bought',
      quantity_reported: 5,
      category_id: null
    }), false)
  })

  it('resolveInventoryItemId prefers exact name match in category', () => {
    const items = [
      { id: 'a', category_id: 'water', name: 'Bottled water' },
      { id: 'b', category_id: 'food', name: 'Water' }
    ]
    assert.equal(
      resolveInventoryItemId(items, { category_id: 'water', name: 'Bottled water' }),
      'a'
    )
    assert.equal(
      resolveInventoryItemId(items, { category_id: 'water', name: '  bottled water  ' }),
      'a'
    )
  })

  it('resolveInventoryItemId falls back to sole item in category', () => {
    const items = [
      { id: 'only', category_id: 'water', name: 'Case of 16.9oz bottles' }
    ]
    assert.equal(
      resolveInventoryItemId(items, { category_id: 'water', name: 'Water' }),
      'only'
    )
  })

  it('resolveInventoryItemId returns null when ambiguous', () => {
    const items = [
      { id: 'a', category_id: 'water', name: 'Jugs' },
      { id: 'b', category_id: 'water', name: 'Bottles' }
    ]
    assert.equal(
      resolveInventoryItemId(items, { category_id: 'water', name: 'Water' }),
      null
    )
  })

  it('normalizeItemName trims and lowercases', () => {
    assert.equal(normalizeItemName('  Water '), 'water')
  })
})
