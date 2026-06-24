<script setup lang="ts">
const user = useSupabaseUser()
const authReady = ref(import.meta.server)

onMounted(async () => {
  await useSupabaseClient().auth.getSession()
  authReady.value = true
})
</script>

<template>
  <div>
    <div
      v-if="!authReady"
      class="flex min-h-48 flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-primary"
      />
      <p class="text-sm text-muted">
        Loading your dashboard&hellip;
      </p>
    </div>

    <UPageHero
      v-else-if="user"
      title="Your preparedness dashboard"
      description="Track what you have, what is expiring, and what you still need for your target days."
      :links="[{
        label: 'View inventory',
        to: '/inventory',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'lg'
      }, {
        label: 'Build a plan',
        to: '/plan',
        icon: 'i-lucide-clipboard-list',
        size: 'lg',
        color: 'neutral',
        variant: 'subtle'
      }]"
    />

    <UPageHero
      v-else
      title="Plan ahead with confidence"
      description="Sign in to track supplies, monitor expiration dates, and see how many days your household is ready for."
      :links="[{
        label: 'Sign in',
        to: '/auth/login',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'lg'
      }, {
        label: 'Create account',
        to: '/auth/signup',
        size: 'lg',
        color: 'neutral',
        variant: 'subtle'
      }]"
    />
  </div>
</template>
