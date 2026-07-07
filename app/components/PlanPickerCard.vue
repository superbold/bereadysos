<script setup lang="ts">
import type { PlanPickerCard } from '#shared/plan-picker-fixture'

defineProps<{
  plan: PlanPickerCard
}>()

const emit = defineEmits<{
  select: [planId: string]
}>()
</script>

<template>
  <button
    type="button"
    class="plan-picker-card"
    :class="[
      plan.theme.accentClass,
      plan.isOwned ? 'plan-picker-card--owned' : 'plan-picker-card--helping'
    ]"
    :style="{ '--plan-stripe': plan.theme.stripeColor }"
    @click="emit('select', plan.id)"
  >
    <div
      class="plan-picker-card__stripe"
      aria-hidden="true"
    />

    <div class="plan-picker-card__header">
      <div class="min-w-0 text-left">
        <p class="truncate text-lg font-semibold text-highlighted">
          {{ plan.displayName }}
        </p>
        <p class="mt-0.5 text-sm text-muted">
          {{ plan.summary }}
        </p>
      </div>

      <UBadge
        :color="plan.isOwned ? 'primary' : 'neutral'"
        :variant="plan.isOwned ? 'solid' : 'subtle'"
        size="sm"
        class="shrink-0"
      >
        {{ plan.roleLabel }}
      </UBadge>
    </div>

    <p class="plan-picker-card__role-desc">
      {{ plan.roleDescription }}
    </p>

    <div
      v-if="plan.notifications.length"
      class="plan-picker-card__alerts"
    >
      <p class="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
        {{ plan.alertCount }} alert{{ plan.alertCount === 1 ? '' : 's' }}
      </p>
      <ul class="space-y-2">
        <li
          v-for="note in plan.notifications"
          :key="note.id"
          class="flex items-start gap-2 text-left text-sm"
        >
          <UIcon
            :name="note.icon"
            class="mt-0.5 size-4 shrink-0"
            :class="{
              'text-error': note.severity === 'error',
              'text-warning': note.severity === 'warning',
              'text-muted': note.severity === 'neutral'
            }"
          />
          <span class="text-highlighted">{{ note.text }}</span>
        </li>
      </ul>
    </div>

    <p
      v-else
      class="plan-picker-card__quiet text-sm text-muted"
    >
      <UIcon
        name="i-lucide-check-circle"
        class="mr-1 inline size-4 text-primary"
      />
      No open alerts
    </p>

    <p class="plan-picker-card__activity text-xs text-muted">
      {{ plan.lastActivity }}
    </p>

    <span class="plan-picker-card__cta text-sm font-medium text-primary">
      Open plan
      <UIcon
        name="i-lucide-arrow-right"
        class="ml-1 inline size-4"
      />
    </span>
  </button>
</template>
