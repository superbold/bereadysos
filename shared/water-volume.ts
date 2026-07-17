/** US liquid measure — FEMA planning uses gallons. */
export const US_FL_OZ_PER_GALLON = 128

/** Common retail bottle sizes (fl oz). */
export const WATER_BOTTLE_OZ_PRESETS = [12, 16.9, 20] as const

export type WaterEntryMode = 'gallons' | 'bottles'

export function gallonsFromBottles(bottleCount: number, ouncesPerBottle: number) {
  if (!Number.isFinite(bottleCount) || !Number.isFinite(ouncesPerBottle)) {
    return 0
  }
  return (bottleCount * ouncesPerBottle) / US_FL_OZ_PER_GALLON
}

export function gallonsPerBottleFromOunces(ouncesPerBottle: number) {
  if (!Number.isFinite(ouncesPerBottle) || ouncesPerBottle <= 0) {
    return null
  }
  return ouncesPerBottle / US_FL_OZ_PER_GALLON
}

export function ouncesFromGallonsPerBottle(volumePerUnitGallons: number) {
  if (!Number.isFinite(volumePerUnitGallons) || volumePerUnitGallons <= 0) {
    return null
  }
  return volumePerUnitGallons * US_FL_OZ_PER_GALLON
}

export function formatGallons(gallons: number) {
  if (!Number.isFinite(gallons)) {
    return '0'
  }
  const rounded = Math.round(gallons * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
}

/**
 * Infer bottle entry when the item was stored as bottles with gallons-per-bottle.
 * Bulk jugs stay in gallons mode (unit gallons / null volume / volume 1).
 */
export function inferWaterEntryMode(item: {
  unit: string | null
  volume_per_unit: number | null
}): WaterEntryMode {
  const unit = item.unit?.trim().toLowerCase() ?? ''
  if (unit === 'bottles' || unit === 'bottle') {
    return 'bottles'
  }
  if (
    item.volume_per_unit != null
    && item.volume_per_unit > 0
    && item.volume_per_unit < 1
    && unit !== 'gallons'
    && unit !== 'gallon'
  ) {
    return 'bottles'
  }
  return 'gallons'
}

export function formatWaterInventoryLabel(item: {
  quantity: number
  unit: string | null
  volume_per_unit: number | null
}) {
  const qty = Number.isInteger(item.quantity) ? String(item.quantity) : item.quantity.toFixed(1)
  const unit = item.unit?.trim() || null
  const base = unit ? `${qty} ${unit}` : qty

  if (inferWaterEntryMode(item) !== 'bottles' || item.volume_per_unit == null) {
    return base
  }

  const gallons = item.quantity * item.volume_per_unit
  const oz = ouncesFromGallonsPerBottle(item.volume_per_unit)
  const ozLabel = oz == null
    ? null
    : (Number.isInteger(oz) ? String(oz) : (Math.round(oz * 10) / 10).toString())

  if (ozLabel) {
    return `${base} · ${ozLabel} fl oz each · ≈ ${formatGallons(gallons)} gal`
  }
  return `${base} · ≈ ${formatGallons(gallons)} gal`
}
