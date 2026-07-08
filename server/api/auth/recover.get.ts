import { serverSupabaseClient } from '#supabase/server'

/**
 * Server-side password recovery — verifies recovery token_hash and sets session
 * before the user chooses a new password (works cross-device / new tab).
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tokenHash = query.token_hash as string | undefined

  if (!tokenHash) {
    return sendRedirect(event, '/auth/reset-password?error=missing_token')
  }

  const supabase = await serverSupabaseClient(event)

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'recovery'
  })

  if (error) {
    const message = encodeURIComponent(error.message)
    return sendRedirect(event, `/auth/reset-password?error=${message}`)
  }

  return sendRedirect(event, '/auth/reset-password?success=1')
})
