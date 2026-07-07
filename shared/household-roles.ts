export type HouseholdRole
  = | 'owner'
    | 'maintainer'
    | 'shopper'
    | 'watcher'
    | 'member'

export type InviteableRole = 'maintainer' | 'shopper' | 'watcher'

export const ROLE_LABELS: Record<HouseholdRole, string> = {
  owner: 'Plan owner',
  maintainer: 'Inventory keeper',
  shopper: 'Shopper',
  watcher: 'Watcher',
  member: 'Inventory keeper'
}

export const ROLE_DESCRIPTIONS: Record<HouseholdRole, string> = {
  owner: 'You set targets, invite helpers, and own this inventory.',
  maintainer: 'You update inventory after shops and rotations.',
  shopper: 'Read-only — verify the list in the store and mark shopping complete.',
  watcher: 'Read-only — watch the plan, offer suggestions, and see when the owner follows up — without editing inventory or settings.',
  member: 'You update inventory after shops and rotations.'
}

export const INVITE_ROLE_OPTIONS: { value: InviteableRole, label: string, description: string }[] = [
  {
    value: 'maintainer',
    label: 'Inventory keeper',
    description: ROLE_DESCRIPTIONS.maintainer
  },
  {
    value: 'shopper',
    label: 'Shopper',
    description: ROLE_DESCRIPTIONS.shopper
  },
  {
    value: 'watcher',
    label: 'Watcher',
    description: ROLE_DESCRIPTIONS.watcher
  }
]

export function roleLabel(role: HouseholdRole | null | undefined): string {
  if (!role) {
    return 'Member'
  }
  return ROLE_LABELS[role] ?? 'Member'
}

export function roleDescription(role: HouseholdRole | null | undefined): string {
  if (!role) {
    return ''
  }
  return ROLE_DESCRIPTIONS[role] ?? ''
}

export function planPickerRoleLabel(role: HouseholdRole | null | undefined): string {
  if (role === 'owner') {
    return 'Your plan'
  }
  return roleLabel(role)
}

export function canEditInventory(role: HouseholdRole | null | undefined): boolean {
  return role === 'owner' || role === 'maintainer' || role === 'member'
}

export function canManageHouseholdSettings(role: HouseholdRole | null | undefined): boolean {
  return role === 'owner'
}

export function isReadOnlyCollaborator(role: HouseholdRole | null | undefined): boolean {
  return role === 'shopper' || role === 'watcher'
}

export function isCollaboratorOnPlan(role: HouseholdRole | null | undefined): boolean {
  return role !== null
    && role !== undefined
    && role !== 'owner'
}
