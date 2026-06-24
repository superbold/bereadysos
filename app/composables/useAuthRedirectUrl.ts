/**
 * Auth email links must land on /confirm in this app.
 * Uses the current origin so production and local dev each get the right URL.
 */
export function useAuthRedirectUrl() {
  const requestUrl = useRequestURL()

  return computed(() => `${requestUrl.origin}/confirm`)
}
