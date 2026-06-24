import { serverSupabaseClient } from '#supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Server-side email confirmation — works when the link is opened on any
 * device (phone, desktop, different browser). PKCE ?code= links require the
 * same browser that started sign-up and will fail cross-device.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tokenHash = query.token_hash as string | undefined
  const type = (query.type as string | undefined) ?? 'email'

  if (!tokenHash) {
    return sendRedirect(event, '/confirm?error=missing_token')
  }

  const supabase = await serverSupabaseClient(event)

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType
  })

  if (error) {
    const message = encodeURIComponent(error.message)
    return sendRedirect(event, `/confirm?error=${message}`)
  }

  return sendRedirect(event, '/confirm?success=1')
})
