<script setup lang="ts">
import type { ShopRunLine } from '~/types/database.types'
import { shoppingListProgress } from '#shared/shop-run-intake'

const props = defineProps<{
  lines: ShopRunLine[]
  canEdit?: boolean
  working?: boolean
  savingLineId?: string | null
  completeLabel?: string
  note?: string
}>()

const emit = defineEmits<{
  'update:note': [value: string]
  'update-line': [payload: {
    lineId: string
    line_status: 'pending' | 'bought' | 'skipped'
    quantity_reported: number | null
  }]
  'complete': []
}>()

const progress = computed(() => shoppingListProgress(props.lines))
const progressValue = computed(() => {
  if (!progress.value.total) {
    return 0
  }
  return Math.round((progress.value.checked / progress.value.total) * 100)
})

const noteModel = computed({
  get: () => props.note ?? '',
  set: (value: string) => emit('update:note', value)
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-end justify-between gap-3">
      <div>
        <p class="text-xs font-semibold tracking-wide text-muted uppercase">
          At the store
        </p>
        <p class="mt-1 text-sm text-highlighted">
          <template v-if="progress.total">
            {{ progress.checked }} of {{ progress.total }} checked
            <template v-if="progress.remaining">
              · {{ progress.remaining }} left
            </template>
          </template>
          <template v-else>
            No items on this list
          </template>
        </p>
      </div>
      <UBadge
        v-if="progress.allChecked"
        color="success"
        variant="subtle"
        label="All done"
      />
    </div>

    <UProgress
      v-if="progress.total"
      :model-value="progressValue"
      size="sm"
      color="primary"
    />

    <ul class="overflow-hidden rounded-xl border border-default bg-default shadow-sm">
      <RestockShoppingLine
        v-for="line in lines"
        :key="line.id"
        :line="line"
        :can-edit="canEdit"
        :saving="savingLineId === line.id"
        @update="payload => emit('update-line', { lineId: line.id, ...payload })"
      />
    </ul>

    <div
      v-if="canEdit"
      class="sticky bottom-3 z-10 space-y-3 rounded-xl border border-default bg-default/95 p-3 shadow-lg backdrop-blur sm:static sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none"
    >
      <UTextarea
        v-model="noteModel"
        placeholder="Optional note (substitutions, out of stock…)"
        :rows="2"
        autoresize
      />
      <UButton
        :label="completeLabel ?? 'Done shopping'"
        icon="i-lucide-check-circle"
        size="lg"
        block
        :loading="working"
        @click="emit('complete')"
      />
      <p class="text-center text-xs text-muted sm:text-left">
        Checked items carry into logging when you finish.
      </p>
    </div>
  </div>
</template>
