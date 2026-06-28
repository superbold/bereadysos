/** Header label for a household plan, e.g. “Alex's plan”. */
export function formatPlanOwnerLabel(
  firstName: string | null | undefined,
  householdName?: string | null
): string {
  const trimmed = firstName?.trim()
  if (trimmed) {
    return `${trimmed}'s plan`
  }

  const household = householdName?.trim()
  if (household && household !== 'My Household') {
    return household
  }

  return 'Preparedness plan'
}

/** First token from an email local-part as a last-resort display hint. */
export function firstNameFromEmail(email: string | null | undefined): string {
  if (!email) {
    return ''
  }
  const local = email.split('@')[0] ?? ''
  const token = local.split(/[._+-]/)[0] ?? ''
  if (!token) {
    return ''
  }
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
}
