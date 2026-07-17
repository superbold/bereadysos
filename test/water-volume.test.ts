import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatGallons,
  formatWaterInventoryLabel,
  gallonsFromBottles,
  gallonsPerBottleFromOunces,
  inferWaterEntryMode,
  ouncesFromGallonsPerBottle,
  US_FL_OZ_PER_GALLON
} from '../shared/water-volume.ts'

describe('water-volume', () => {
  it('converts a 24-pack of 16.9 oz bottles to gallons', () => {
    const gallons = gallonsFromBottles(24, 16.9)
    assert.ok(Math.abs(gallons - ((24 * 16.9) / US_FL_OZ_PER_GALLON)) < 1e-9)
    assert.equal(formatGallons(gallons), '3.17')
  })

  it('converts 12 oz and 20 oz packs', () => {
    assert.equal(formatGallons(gallonsFromBottles(24, 12)), '2.25')
    assert.equal(formatGallons(gallonsFromBottles(24, 20)), '3.75')
  })

  it('round-trips ounces through gallons per bottle', () => {
    const perBottle = gallonsPerBottleFromOunces(16.9)
    assert.ok(perBottle != null)
    const oz = ouncesFromGallonsPerBottle(perBottle!)
    assert.ok(oz != null)
    assert.ok(Math.abs(oz! - 16.9) < 1e-9)
  })

  it('infers bottles vs gallons entry mode', () => {
    assert.equal(inferWaterEntryMode({ unit: 'bottles', volume_per_unit: 16.9 / 128 }), 'bottles')
    assert.equal(inferWaterEntryMode({ unit: 'gallons', volume_per_unit: null }), 'gallons')
    assert.equal(inferWaterEntryMode({ unit: 'gallons', volume_per_unit: 1 }), 'gallons')
    assert.equal(inferWaterEntryMode({ unit: null, volume_per_unit: 0.132 }), 'bottles')
  })

  it('formats inventory label with FEMA-friendly gallons', () => {
    const label = formatWaterInventoryLabel({
      quantity: 24,
      unit: 'bottles',
      volume_per_unit: gallonsPerBottleFromOunces(16.9)
    })
    assert.match(label, /24 bottles/)
    assert.match(label, /16\.9 fl oz each/)
    assert.match(label, /≈ 3\.17 gal/)
  })
})
