<script setup lang="ts">
const user = useSupabaseUser()
const { planLabel } = useHouseholdPlan()
</script>

<template>
  <NuxtLink
    v-if="user"
    to="/"
    class="app-shell__brand"
  >
    <UIcon
      name="i-lucide-shield-check"
      class="size-5 shrink-0 text-primary"
    />
    <span class="min-w-0">
      <span class="block font-semibold text-highlighted leading-tight">
        <span class="hidden sm:inline">SOS Planner</span>
        <span class="sm:hidden">SOS</span>
      </span>
      <span class="block truncate text-xs font-medium text-muted leading-tight">
        {{ planLabel }}
      </span>
    </span>
  </NuxtLink>
</template>
