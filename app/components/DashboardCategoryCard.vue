<script setup lang="ts">
import type { CategoryCoverage } from '#shared/coverage'
import { formatQuantity } from '#shared/coverage'

const props = defineProps<{
  coverage: CategoryCoverage
}>()

const statusColor = computed(() => {
  switch (props.coverage.status) {
    case 'critical':
      return 'error'
    case 'low':
      return 'warning'
    case 'good':
    case 'over':
      return 'success'
    default:
      return 'neutral'
  }
})

const statusLabel = computed(() => {
  switch (props.coverage.status) {
    case 'empty':
      return 'Not started'
    case 'critical':
      return 'Critical'
    case 'low':
      return 'Needs attention'
    case 'good':
      return 'On target'
    case 'over':
      return 'Above target'
    default:
      return ''
  }
})

const summary = computed(() => {
  if (props.coverage.calc_type === 'consumable') {
    const { onHand, required, unit, daysCovered } = props.coverage
    const have = `${formatQuantity(onHand)} ${unit}`
    const need = `${formatQuantity(required)} ${unit}`
    const days = formatQuantity(daysCovered)
    return `${have} of ${need} · ~${days} days covered`
  }

  const { stockedCount, recommendedQty } = props.coverage
  const itemLabel = stockedCount === 1 ? 'item' : 'items'
  return `${stockedCount} ${itemLabel} stocked · goal ${recommendedQty}+`
})

const progressValue = computed(() => {
  return Math.min(props.coverage.percent, 100)
})
</script>

<template>
  <div class="rounded-lg border border-default p-4">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-elevated">
          <UIcon
            :name="coverage.icon ?? 'i-lucide-package'"
            class="size-5 text-primary"
          />
        </div>
        <div class="min-w-0">
          <p class="font-medium text-highlighted">
            {{ coverage.name }}
          </p>
          <p class="text-sm text-muted">
            {{ summary }}
          </p>
        </div>
      </div>
      <UBadge
        :color="statusColor"
        variant="subtle"
        size="sm"
        class="shrink-0"
      >
        {{ statusLabel }}
      </UBadge>
    </div>

    <UProgress
      :model-value="progressValue"
      :color="statusColor"
      size="sm"
    />
  </div>
</template>
