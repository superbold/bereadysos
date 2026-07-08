/**
 * Email confirmation links must reach /confirm with their query intact.
 * Supabase auth middleware otherwise sends unauthenticated users to login
 * and the ?code= is lost — skipping the "You're ready!" flow.
 *
 * Prefixed with 00 so this runs before the Supabase global-auth middleware.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/confirm' || to.path === '/auth/reset-password') {
    return
  }

  const code = to.query.code
  const tokenHash = to.query.token_hash
  const type = to.query.type

  const hasCode = typeof code === 'string' && code.length > 0
  const hasTokenHash = typeof tokenHash === 'string' && tokenHash.length > 0
    && typeof type === 'string' && type.length > 0

  if (hasCode || hasTokenHash) {
    if (hasTokenHash) {
      const path = type === 'recovery' ? '/api/auth/recover' : '/api/auth/confirm'
      return navigateTo({
        path,
        query: { ...to.query }
      }, { replace: true })
    }

    const path = type === 'recovery' ? '/auth/reset-password' : '/confirm'
    return navigateTo({
      path,
      query: { ...to.query }
    }, { replace: true })
  }
})
