<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()
const loading = ref(false)
const signedUp = ref(false)
const signedUpEmail = ref('')
const authRedirectUrl = useAuthRedirectUrl()

const schema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(40),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

const fields = [
  {
    name: 'first_name',
    type: 'text' as const,
    label: 'First name',
    placeholder: 'Alex',
    autocomplete: 'given-name'
  },
  {
    name: 'email',
    type: 'email' as const,
    label: 'Email',
    placeholder: 'you@example.com',
    autocomplete: 'email'
  },
  {
    name: 'password',
    type: 'password' as const,
    label: 'Password',
    placeholder: 'At least 8 characters',
    autocomplete: 'new-password'
  },
  {
    name: 'confirmPassword',
    type: 'password' as const,
    label: 'Confirm password',
    placeholder: 'Repeat your password',
    autocomplete: 'new-password'
  }
]

watch(user, (value) => {
  if (value) {
    navigateTo('/', { external: true })
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  const { error } = await supabase.auth.signUp({
    email: event.data.email,
    password: event.data.password,
    options: {
      emailRedirectTo: authRedirectUrl.value,
      data: {
        first_name: event.data.first_name.trim()
      }
    }
  })

  loading.value = false

  if (error) {
    toast.add({
      title: 'Sign up failed',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  signedUpEmail.value = event.data.email
  signedUp.value = true
}
</script>

<template>
  <div>
    <div
      v-if="signedUp"
      class="flex flex-col items-center text-center"
    >
      <div
        class="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20"
        aria-hidden="true"
      >
        <UIcon
          name="i-lucide-mail-check"
          class="size-8 text-primary"
        />
      </div>

      <h1 class="mt-4 text-xl font-semibold text-highlighted">
        Check your email
      </h1>

      <p class="mt-2 max-w-xs text-sm leading-relaxed text-muted">
        We sent a confirmation link to
        <span class="font-medium text-highlighted">{{ signedUpEmail }}</span>.
        Click it to finish setting up your account.
      </p>

      <p class="mt-4 max-w-xs text-xs text-muted">
        The link opens a short confirmation screen, then takes you straight to your dashboard.
      </p>

      <UButton
        to="/auth/login"
        label="Already confirmed? Sign in"
        color="neutral"
        variant="soft"
        class="mt-6"
        block
      />
    </div>

    <UAuthForm
      v-else
      :schema="schema"
      :fields="fields"
      icon="i-lucide-user-plus"
      title="Create your account"
      description="Start tracking supplies and building a plan for your household."
      :submit="{ label: 'Create account', block: true, loading }"
      @submit="onSubmit"
    >
      <template #footer>
        <p>
          Already have an account?
          <NuxtLink
            to="/auth/login"
            class="font-medium text-primary hover:underline"
          >
            Sign in
          </NuxtLink>
        </p>
      </template>
    </UAuthForm>
  </div>
</template>
