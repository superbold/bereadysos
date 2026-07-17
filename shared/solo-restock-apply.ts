/** Mirrors complete_solo_restock_run inventory matching (see migration). */

export type RestockLineForApply = {
  line_status: 'pending' | 'bought' | 'skipped' | 'substituted'
  quantity_reported: number | null
  category_id: string | null
}

export type InventoryItemRef = {
  id: string
  category_id: string
  name: string
}

export function normalizeItemName(name: string) {
  return name.trim().toLowerCase()
}

export function shouldApplyLineToInventory(line: RestockLineForApply) {
  if (line.line_status !== 'bought' && line.line_status !== 'substituted') {
    return false
  }
  if (line.quantity_reported == null || line.quantity_reported <= 0) {
    return false
  }
  return line.category_id != null
}

/**
 * Resolve which inventory row receives a restock quantity.
 * 1. Exact name match in category (case-insensitive)
 * 2. Else sole item in category
 * 3. Else null → create new item
 */
export function resolveInventoryItemId(
  items: InventoryItemRef[],
  line: { category_id: string, name: string }
) {
  const normalized = normalizeItemName(line.name)
  const inCategory = items.filter(item => item.category_id === line.category_id)
  const exact = inCategory.find(item => normalizeItemName(item.name) === normalized)
  if (exact) {
    return exact.id
  }
  if (inCategory.length === 1) {
    return inCategory[0]!.id
  }
  return null
}
