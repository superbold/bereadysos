export type ShopRunLineStatus = 'pending' | 'bought' | 'skipped' | 'substituted'

export type IntakeLineSnapshot = {
  line_status: ShopRunLineStatus
  quantity_reported: number | null
}

export const INTAKE_LINE_STATUS_OPTIONS = [
  { value: 'bought' as const, label: 'Bought' },
  { value: 'substituted' as const, label: 'Substituted' },
  { value: 'skipped' as const, label: 'Skipped / not found' }
]

export const INTAKE_LINE_STATUS_LABELS: Record<Exclude<ShopRunLineStatus, 'pending'>, string> = {
  bought: 'Bought',
  substituted: 'Substituted',
  skipped: 'Skipped'
}

export function isIntakeLineResolved(line: IntakeLineSnapshot) {
  return line.line_status !== 'pending'
}

export function isIntakeLineValid(line: IntakeLineSnapshot) {
  if (line.line_status === 'pending') {
    return false
  }
  if (line.line_status === 'skipped') {
    return true
  }
  return line.quantity_reported != null && line.quantity_reported >= 0
}

export function canSubmitIntakeRun(lines: IntakeLineSnapshot[]) {
  if (!lines.length) {
    return false
  }
  return lines.every(isIntakeLineValid)
}

export function defaultReportedQuantity(
  lineStatus: ShopRunLineStatus,
  quantityPlanned: number | null
) {
  if (lineStatus === 'skipped') {
    return 0
  }
  if (lineStatus === 'pending') {
    return quantityPlanned
  }
  return quantityPlanned ?? 0
}

export function formatReportedQuantity(
  quantity: number | null,
  unit: string | null
) {
  if (quantity == null) {
    return '—'
  }
  return unit ? `${quantity} ${unit}` : String(quantity)
}
