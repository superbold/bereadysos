<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()
const recoverRedirectUrl = usePasswordRecoverRedirectUrl()
const toast = useToast()
const loading = ref(false)
const sent = ref(false)
const submittedEmail = ref('')

const schema = z.object({
  email: z.email('Enter a valid email address')
})

type Schema = z.output<typeof schema>

const fields = [
  {
    name: 'email',
    type: 'email' as const,
    label: 'Email',
    placeholder: 'you@example.com',
    autocomplete: 'email'
  }
]

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  submittedEmail.value = event.data.email

  const { error } = await supabase.auth.resetPasswordForEmail(event.data.email, {
    redirectTo: recoverRedirectUrl.value
  })

  loading.value = false

  if (error) {
    toast.add({
      title: 'Could not send reset email',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  sent.value = true
}
</script>

<template>
  <div>
    <template v-if="sent">
      <div class="space-y-4 text-center">
        <UIcon
          name="i-lucide-mail-check"
          class="mx-auto size-10 text-primary"
        />
        <h1 class="text-xl font-semibold text-highlighted">
          Check your email
        </h1>
        <p class="text-sm text-muted">
          If an account exists for
          <span class="font-medium text-highlighted">{{ submittedEmail }}</span>,
          we sent a link to reset your password. The link expires after a short time.
        </p>
        <p class="text-sm text-muted">
          Open the link on any device — phone or computer is fine.
        </p>
        <UButton
          to="/auth/login"
          label="Back to sign in"
          block
          class="mt-2"
        />
      </div>
    </template>

    <UAuthForm
      v-else
      :schema="schema"
      :fields="fields"
      icon="i-lucide-key-round"
      title="Reset your password"
      description="Enter your email and we&rsquo;ll send a link to choose a new password."
      :submit="{ label: 'Send reset link', block: true, loading }"
      @submit="onSubmit"
    >
      <template #footer>
        <p>
          Remember it?
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
