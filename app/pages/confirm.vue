<script setup lang="ts">
import type { EmailOtpType } from '@supabase/supabase-js'

definePageMeta({
  layout: 'auth-confirm'
})

type Status = 'loading' | 'success' | 'error'

const route = useRoute()
const supabase = useSupabaseClient()

const status = ref<Status>('loading')
const errorMessage = ref('')
const handled = ref(false)
let redirectTimer: ReturnType<typeof setTimeout> | undefined
let failTimer: ReturnType<typeof setTimeout> | undefined

function parseAuthError(): string | null {
  const queryError = route.query.error
  if (typeof queryError === 'string' && queryError.length > 0) {
    if (queryError === 'missing_token') {
      return 'This confirmation link is incomplete. Request a new email from sign in.'
    }
    return decodeURIComponent(queryError)
  }

  if (import.meta.server) {
    return null
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const error = hashParams.get('error')
  const description = hashParams.get('error_description')

  if (!error && !description) {
    return null
  }

  if (description) {
    return decodeURIComponent(description.replace(/\+/g, ' '))
  }

  return 'This link is invalid or has expired.'
}

function isPkceVerifierError(message: string) {
  return message.toLowerCase().includes('pkce') || message.toLowerCase().includes('code verifier')
}

function friendlyErrorMessage(message: string) {
  if (isPkceVerifierError(message)) {
    return 'This link must be opened on the same device and browser where you signed up — or update the Supabase email template to use token_hash (see README). Your email may already be confirmed; try signing in.'
  }
  return message
}

async function finishWithSession() {
  if (handled.value || status.value === 'error') {
    return
  }

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return
  }

  handled.value = true
  status.value = 'success'

  clearTimeout(redirectTimer)
  redirectTimer = setTimeout(() => {
    const destination = consumePostAuthRedirect() ?? '/plan-picker'
    navigateTo(destination, { external: true })
  }, 2200)
}

async function establishSessionFromUrl() {
  // Prefer token_hash — works cross-device (phone email app, etc.)
  const tokenHash = route.query.token_hash
  const type = route.query.type
  if (typeof tokenHash === 'string' && tokenHash.length > 0) {
    const otpType = (typeof type === 'string' ? type : 'email') as EmailOtpType
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType
    })
    if (error) {
      throw error
    }
    return
  }

  const code = route.query.code
  if (typeof code === 'string' && code.length > 0) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      throw error
    }
    return
  }

  if (import.meta.client && window.location.hash.includes('access_token')) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('We could not confirm your email. The link may have expired.')
    }
  }
}

onMounted(async () => {
  const authError = parseAuthError()

  if (authError) {
    status.value = 'error'
    errorMessage.value = friendlyErrorMessage(authError)
    return
  }

  if (route.query.success === '1') {
    await finishWithSession()
    if (!handled.value) {
      status.value = 'error'
      errorMessage.value = 'Your email was confirmed, but we could not start a session. Please sign in.'
    }
    return
  }

  try {
    await establishSessionFromUrl()
    await finishWithSession()
  } catch (error) {
    status.value = 'error'
    const message = error instanceof Error ? error.message : 'We could not confirm your email. The link may have expired.'
    errorMessage.value = friendlyErrorMessage(message)
    return
  }

  failTimer = setTimeout(() => {
    if (!handled.value && status.value === 'loading') {
      status.value = 'error'
      errorMessage.value = 'We could not confirm your email. The link may have expired.'
    }
  }, 12000)
})

onUnmounted(() => {
  clearTimeout(redirectTimer)
  clearTimeout(failTimer)
})
</script>

<template>
  <div class="confirm-state">
    <AuthBrand />

    <!-- Loading -->
    <div
      v-if="status === 'loading'"
      class="confirm-state__body"
      role="status"
      aria-live="polite"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="confirm-state__spinner size-10 text-primary"
      />
      <h1 class="confirm-state__title">
        Confirming your email
      </h1>
      <p class="confirm-state__copy">
        Just a moment while we finish setting up your account.
      </p>
    </div>

    <!-- Success -->
    <div
      v-else-if="status === 'success'"
      class="confirm-state__body"
      role="status"
      aria-live="polite"
    >
      <div
        class="confirm-state__ready"
        aria-hidden="true"
      >
        <span class="confirm-state__ready-ring" />
        <UIcon
          name="i-lucide-check"
          class="confirm-state__ready-icon size-9 text-primary"
        />
      </div>
      <h1 class="confirm-state__title">
        You're ready!
      </h1>
      <p class="confirm-state__copy">
        Your email is confirmed. Taking you to your plans&hellip;
      </p>
    </div>

    <!-- Error -->
    <div
      v-else
      class="confirm-state__body"
      role="alert"
    >
      <div
        class="confirm-state__error-icon"
        aria-hidden="true"
      >
        <UIcon
          name="i-lucide-circle-alert"
          class="size-9 text-error"
        />
      </div>
      <h1 class="confirm-state__title">
        Link expired
      </h1>
      <p class="confirm-state__copy">
        {{ errorMessage }}
      </p>
      <UButton
        to="/auth/login"
        label="Back to sign in"
        block
        class="mt-2"
        trailing-icon="i-lucide-arrow-right"
      />
    </div>
  </div>
</template>
