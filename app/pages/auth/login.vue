<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()
const session = useSupabaseSession()
const toast = useToast()
const loading = ref(false)

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
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
    placeholder: 'Your password',
    autocomplete: 'current-password'
  }
]

watch(session, (value) => {
  if (value) {
    navigateTo('/', { external: true })
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  const { error } = await supabase.auth.signInWithPassword({
    email: event.data.email,
    password: event.data.password
  })

  loading.value = false

  if (error) {
    toast.add({
      title: 'Sign in failed',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  await navigateTo('/', { external: true })
}
</script>

<template>
  <div>
    <UAuthForm
      :schema="schema"
      :fields="fields"
      icon="i-lucide-log-in"
      title="Welcome back"
      description="Sign in to manage your household preparedness plan."
      :submit="{ label: 'Sign in', block: true, loading }"
      @submit="onSubmit"
    >
      <template #footer>
        <p>
          New here?
          <NuxtLink
            to="/auth/signup"
            class="font-medium text-primary hover:underline"
          >
            Create an account
          </NuxtLink>
        </p>
      </template>
    </UAuthForm>
  </div>
</template>
