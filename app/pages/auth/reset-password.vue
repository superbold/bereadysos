<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { EmailOtpType } from '@supabase/supabase-js'

definePageMeta({
  layout: 'auth'
})

const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()
const loading = ref(false)
const ready = ref(false)
const errorMessage = ref('')

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

const fields = [
  {
    name: 'password',
    type: 'password' as const,
    label: 'New password',
    placeholder: 'At least 8 characters',
    autocomplete: 'new-password'
  },
  {
    name: 'confirmPassword',
    type: 'password' as const,
    label: 'Confirm password',
    placeholder: 'Repeat your new password',
    autocomplete: 'new-password'
  }
]

function parseAuthError(): string | null {
  const queryError = route.query.error
  if (typeof queryError === 'string' && queryError.length > 0) {
    if (queryError === 'missing_token') {
      return 'This reset link is incomplete. Request a new one from sign in.'
    }
    return decodeURIComponent(queryError)
  }
  return null
}

async function establishSessionFromUrl() {
  const tokenHash = route.query.token_hash
  const type = route.query.type
  if (typeof tokenHash === 'string' && tokenHash.length > 0) {
    const otpType = (typeof type === 'string' ? type : 'recovery') as EmailOtpType
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
  }
}

async function ensureRecoverySession() {
  const authError = parseAuthError()
  if (authError) {
    errorMessage.value = authError
    return
  }

  if (route.query.success === '1') {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      ready.value = true
      return
    }
    errorMessage.value = 'Your reset link was accepted, but we could not start a session. Request a new link.'
    return
  }

  try {
    await establishSessionFromUrl()
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      ready.value = true
      return
    }
    errorMessage.value = 'This reset link is invalid or has expired.'
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'This reset link is invalid or has expired.'
  }
}

onMounted(() => {
  ensureRecoverySession()
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  const { error } = await supabase.auth.updateUser({
    password: event.data.password
  })

  loading.value = false

  if (error) {
    toast.add({
      title: 'Could not update password',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Password updated',
    description: 'You can sign in with your new password.',
    color: 'success',
    icon: 'i-lucide-check-circle'
  })

  await navigateTo('/auth/login', { external: true })
}
</script>

<template>
  <div>
    <div
      v-if="errorMessage"
      class="space-y-4 text-center"
      role="alert"
    >
      <UIcon
        name="i-lucide-circle-alert"
        class="mx-auto size-10 text-error"
      />
      <h1 class="text-xl font-semibold text-highlighted">
        Link expired
      </h1>
      <p class="text-sm text-muted">
        {{ errorMessage }}
      </p>
      <UButton
        to="/auth/forgot-password"
        label="Request a new link"
        block
      />
      <UButton
        to="/auth/login"
        label="Back to sign in"
        color="neutral"
        variant="ghost"
        block
      />
    </div>

    <UAuthForm
      v-else-if="ready"
      :schema="schema"
      :fields="fields"
      icon="i-lucide-lock-keyhole"
      title="Choose a new password"
      description="You&rsquo;re signed in from the reset link. Pick a new password for your account."
      :submit="{ label: 'Update password', block: true, loading }"
      @submit="onSubmit"
    />

    <div
      v-else
      class="flex min-h-48 flex-col items-center justify-center gap-3 text-center"
      role="status"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-primary"
      />
      <p class="text-sm text-muted">
        Verifying your reset link&hellip;
      </p>
    </div>
  </div>
</template>
