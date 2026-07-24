<script setup lang="ts">
const user = useSupabaseUser()
const { planLabel, hasMultiplePlans } = useHouseholdPlan()
</script>

<template>
  <NuxtLink
    v-if="user"
    :to="hasMultiplePlans ? '/plan-picker' : '/'"
    class="app-shell__brand"
  >
    <UIcon
      name="i-lucide-shield-check"
      class="size-5 shrink-0 text-primary"
    />
    <span class="min-w-0">
      <span class="app-shell__brand-title block font-semibold text-highlighted leading-tight">
        <span class="hidden sm:inline">SOS Planner</span>
        <span class="sm:hidden">SOS</span>
      </span>
      <span class="block truncate text-xs font-medium text-muted leading-tight">
        {{ planLabel }}
        <span
          v-if="hasMultiplePlans"
          class="text-primary"
        >
          · switch
        </span>
      </span>
    </span>
  </NuxtLink>
</template>
