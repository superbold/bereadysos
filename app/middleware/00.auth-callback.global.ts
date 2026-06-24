/**
 * Email confirmation links must reach /confirm with their query intact.
 * Supabase auth middleware otherwise sends unauthenticated users to login
 * and the ?code= is lost — skipping the "You're ready!" flow.
 *
 * Prefixed with 00 so this runs before the Supabase global-auth middleware.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/confirm') {
    return
  }

  const code = to.query.code
  const tokenHash = to.query.token_hash
  const type = to.query.type

  const hasCode = typeof code === 'string' && code.length > 0
  const hasTokenHash = typeof tokenHash === 'string' && tokenHash.length > 0
    && typeof type === 'string' && type.length > 0

  if (hasCode || hasTokenHash) {
    // token_hash links go through the server route so cookies are set before /confirm
    if (hasTokenHash) {
      return navigateTo({
        path: '/api/auth/confirm',
        query: { ...to.query }
      }, { replace: true })
    }

    return navigateTo({
      path: '/confirm',
      query: { ...to.query }
    }, { replace: true })
  }
})
