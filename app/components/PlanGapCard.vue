<script setup lang="ts">
import type { CategoryGap } from '#shared/coverage'
import { formatGapDetail, formatGapLabel } from '#shared/coverage'

const props = defineProps<{
  gap: CategoryGap
  targetDays: number
}>()

const statusColor = computed(() => {
  if (!props.gap.isMet) {
    return props.gap.calc_type === 'consumable' && props.gap.onHand <= 0
      ? 'error'
      : 'warning'
  }
  if (props.gap.calc_type === 'consumable' && props.gap.surplus > 0) {
    return 'success'
  }
  return 'success'
})
</script>

<template>
  <div class="rounded-lg border border-default p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-elevated">
          <UIcon
            :name="gap.icon ?? 'i-lucide-package'"
            class="size-5 text-primary"
          />
        </div>
        <div class="min-w-0">
          <p class="font-medium text-highlighted">
            {{ gap.name }}
          </p>
          <p class="text-sm text-muted">
            {{ formatGapDetail(gap, targetDays) }}
          </p>
        </div>
      </div>
      <UBadge
        :color="statusColor"
        variant="subtle"
        size="sm"
        class="shrink-0 text-right"
      >
        {{ formatGapLabel(gap) }}
      </UBadge>
    </div>
  </div>
</template>
