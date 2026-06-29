<script setup lang="ts">
import { roleLabel } from '#shared/household-roles'

const route = useRoute()
const user = useSupabaseUser()
const toast = useToast()
const { previewInvite, acceptInvite } = useHouseholdInviteAccept()

const token = computed(() => {
  const value = route.query.token
  return typeof value === 'string' ? value : ''
})

const loading = ref(true)
const accepting = ref(false)
const preview = ref<{
  household_name: string
  inviter_first_name: string
  invited_email: string
  invited_role: string
  expires_at: string
  is_valid: boolean
} | null>(null)
const previewError = ref('')

watch([user, token], async () => {
  if (!token.value) {
    loading.value = false
    previewError.value = 'This invite link is missing a token.'
    return
  }

  loading.value = true
  previewError.value = ''

  const { data, error } = await previewInvite(token.value)
  loading.value = false

  if (error) {
    previewError.value = error.message
    preview.value = null
    return
  }

  preview.value = data?.[0] ?? null
  if (!preview.value) {
    previewError.value = 'Invite not found.'
  } else if (!preview.value.is_valid) {
    previewError.value = 'This invite is no longer valid.'
  }
}, { immediate: true })

async function onAccept() {
  if (!token.value || !user.value) {
    await navigateTo(`/auth/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }

  accepting.value = true
  const { error } = await acceptInvite(token.value)
  accepting.value = false

  if (error) {
    toast.add({
      title: 'Could not accept invite',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'You joined the plan',
    description: 'You can now view and help improve this preparedness plan.',
    color: 'success',
    icon: 'i-lucide-user-check'
  })

  await navigateTo('/')
}

const loginUrl = computed(() =>
  `/auth/login?redirect=${encodeURIComponent(route.fullPath)}`
)
</script>

<template>
  <div class="mx-auto max-w-lg">
    <div
      v-if="loading"
      class="flex min-h-48 flex-col items-center justify-center gap-3"
      role="status"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-primary"
      />
      <p class="text-sm text-muted">
        Checking invite&hellip;
      </p>
    </div>

    <div
      v-else-if="previewError"
      class="rounded-lg border border-default p-6 text-center"
    >
      <UIcon
        name="i-lucide-circle-x"
        class="mx-auto mb-4 size-10 text-error"
      />
      <h1 class="text-xl font-semibold text-highlighted">
        Invite unavailable
      </h1>
      <p class="mt-2 text-sm text-muted">
        {{ previewError }}
      </p>
      <UButton
        to="/"
        label="Go to dashboard"
        class="mt-6"
        color="neutral"
        variant="soft"
      />
    </div>

    <div
      v-else-if="preview"
      class="rounded-lg border border-default p-6"
    >
      <div class="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <UIcon
          name="i-lucide-user-plus"
          class="size-6 text-primary"
        />
      </div>

      <h1 class="text-xl font-semibold text-highlighted">
        Join {{ preview.inviter_first_name }}&rsquo;s plan
      </h1>
      <p class="mt-2 text-sm text-muted">
        You&rsquo;ve been invited as
        <span class="font-medium text-highlighted">{{ roleLabel(preview.invited_role as 'maintainer') }}</span>
        on
        <span class="font-medium text-highlighted">{{ preview.household_name }}</span>.
        Sign in as
        <span class="font-medium text-highlighted">{{ preview.invited_email }}</span>
        to accept.
      </p>

      <template v-if="user">
        <UButton
          label="Accept invite"
          icon="i-lucide-check"
          class="mt-6"
          block
          :loading="accepting"
          @click="onAccept"
        />
      </template>
      <template v-else>
        <UButton
          :to="loginUrl"
          label="Sign in to accept"
          icon="i-lucide-log-in"
          class="mt-6"
          block
        />
        <p class="mt-3 text-center text-sm text-muted">
          Need an account?
          <NuxtLink
            :to="`/auth/signup?redirect=${encodeURIComponent(route.fullPath)}`"
            class="font-medium text-primary hover:underline"
          >
            Create one
          </NuxtLink>
        </p>
      </template>
    </div>
  </div>
</template>
