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

const schema = z.object({
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
    navigateTo('/')
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  const { error } = await supabase.auth.signUp({
    email: event.data.email,
    password: event.data.password
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

  toast.add({
    title: 'Account created',
    description: 'Check your email if confirmation is required, or sign in to continue.',
    color: 'success',
    icon: 'i-lucide-check-circle'
  })

  await navigateTo('/auth/login')
}
</script>

<template>
  <div>
    <UAuthForm
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
