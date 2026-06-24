<script setup lang="ts">
definePageMeta({
  layout: 'auth-confirm'
})

type Status = 'loading' | 'success' | 'error'

const user = useSupabaseUser()
const route = useRoute()

const status = ref<Status>('loading')
const errorMessage = ref('')
let redirectTimer: ReturnType<typeof setTimeout> | undefined
let failTimer: ReturnType<typeof setTimeout> | undefined

function parseAuthError(): string | null {
  if (import.meta.server) {
    return null
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const query = route.query

  const error = hashParams.get('error') ?? (query.error as string | undefined)
  const description = hashParams.get('error_description')
    ?? (query.error_description as string | undefined)

  if (!error && !description) {
    return null
  }

  if (description) {
    return decodeURIComponent(description.replace(/\+/g, ' '))
  }

  return 'This link is invalid or has expired.'
}

function scheduleRedirect() {
  clearTimeout(redirectTimer)
  redirectTimer = setTimeout(() => {
    navigateTo('/')
  }, 2200)
}

onMounted(() => {
  const authError = parseAuthError()

  if (authError) {
    status.value = 'error'
    errorMessage.value = authError
    return
  }

  failTimer = setTimeout(() => {
    if (status.value === 'loading' && !user.value) {
      status.value = 'error'
      errorMessage.value = 'We could not confirm your email. The link may have expired.'
    }
  }, 12000)
})

watch(user, (value) => {
  if (value && status.value !== 'error') {
    status.value = 'success'
    scheduleRedirect()
  }
}, { immediate: true })

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
        Your email is confirmed. Taking you to your dashboard&hellip;
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
