/**
 * Password recovery emails should land on the server recover route so the
 * session cookie is set before the user chooses a new password.
 */
export function usePasswordRecoverRedirectUrl() {
  const requestUrl = useRequestURL()

  return computed(() => `${requestUrl.origin}/api/auth/recover`)
}
