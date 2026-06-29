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

export const INVITE_ROLE_OPTIONS: { value: InviteableRole, label: string, description: string }[] = [
  {
    value: 'maintainer',
    label: 'Inventory keeper',
    description: 'Can update inventory on your plan.'
  },
  {
    value: 'shopper',
    label: 'Shopper',
    description: 'Read-only access — verifies the list while shopping.'
  },
  {
    value: 'watcher',
    label: 'Watcher',
    description: 'Read-only — keeps their own plan; can watch yours for support.'
  }
]

export function roleLabel(role: HouseholdRole | null | undefined): string {
  if (!role) {
    return 'Member'
  }
  return ROLE_LABELS[role] ?? 'Member'
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
