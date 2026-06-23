<script setup lang="ts">
const user = useSupabaseUser()
</script>

<template>
  <div>
    <UPageHero
      v-if="user"
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
