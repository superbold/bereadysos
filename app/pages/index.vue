<script setup lang="ts">
const user = useSupabaseUser()
const { household, pending, ensureHousehold } = useHousehold()
const authReady = ref(import.meta.server)

const dashboardDescription = computed(() => {
  if (!household.value) {
    return 'Track what you have, what is expiring, and what you still need for your target days.'
  }
  const { headcount, target_days, name } = household.value
  const people = headcount === 1 ? '1 person' : `${headcount} people`
  const days = target_days === 1 ? '1 day' : `${target_days} days`
  return `${name} · ${people} · planning for ${days}.`
})

onMounted(async () => {
  await useSupabaseClient().auth.getSession()
  authReady.value = true
  if (user.value) {
    await ensureHousehold()
  }
})
</script>

<template>
  <div>
    <div
      v-if="!authReady || (user && pending && !household)"
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
      :description="dashboardDescription"
      :links="[{
        label: 'View inventory',
        to: '/inventory',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'lg'
      }, {
        label: 'Household settings',
        to: '/settings',
        icon: 'i-lucide-settings',
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
