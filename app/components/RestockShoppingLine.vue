<script setup lang="ts">
import type { ShopRunLine } from '~/types/database.types'
import {
  defaultReportedQuantity,
  nextShoppingQuantity
} from '#shared/shop-run-intake'

const props = defineProps<{
  line: ShopRunLine
  saving?: boolean
  canEdit?: boolean
}>()

const emit = defineEmits<{
  update: [payload: {
    line_status: 'pending' | 'bought' | 'skipped'
    quantity_reported: number | null
  }]
}>()

const isBought = computed(() => props.line.line_status === 'bought')
const isSkipped = computed(() => props.line.line_status === 'skipped')

const displayQty = computed(() => {
  if (isSkipped.value) {
    return 0
  }
  if (props.line.quantity_reported != null) {
    return props.line.quantity_reported
  }
  return props.line.quantity_planned
})

function toggleBought() {
  if (!props.canEdit || props.saving) {
    return
  }
  if (isBought.value) {
    emit('update', { line_status: 'pending', quantity_reported: null })
    return
  }
  const quantity = defaultReportedQuantity('bought', props.line.quantity_planned)
  emit('update', {
    line_status: 'bought',
    quantity_reported: quantity && quantity > 0 ? quantity : 1
  })
}

function markSkipped() {
  if (!props.canEdit || props.saving) {
    return
  }
  if (isSkipped.value) {
    emit('update', { line_status: 'pending', quantity_reported: null })
    return
  }
  emit('update', { line_status: 'skipped', quantity_reported: 0 })
}

function adjustQty(delta: number) {
  if (!props.canEdit || props.saving || !isBought.value) {
    return
  }
  const next = nextShoppingQuantity(
    props.line.quantity_reported,
    props.line.quantity_planned,
    delta
  )
  emit('update', {
    line_status: 'bought',
    quantity_reported: next
  })
}
</script>

<template>
  <li
    class="border-b border-default last:border-b-0"
    :class="{
      'bg-primary/5': isBought,
      'bg-elevated/40': isSkipped
    }"
  >
    <div class="flex items-stretch gap-3 p-3 sm:p-4">
      <button
        type="button"
        class="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 transition-colors"
        :class="isBought
          ? 'border-primary bg-primary text-inverted'
          : isSkipped
            ? 'border-muted bg-elevated text-muted'
            : 'border-default bg-default text-muted hover:border-primary/50'"
        :disabled="!canEdit || saving"
        :aria-pressed="isBought"
        :aria-label="isBought ? `Uncheck ${line.name}` : `Mark ${line.name} bought`"
        @click="toggleBought"
      >
        <UIcon
          :name="isBought ? 'i-lucide-check' : isSkipped ? 'i-lucide-minus' : 'i-lucide-circle'"
          class="size-6"
        />
      </button>

      <div class="min-w-0 flex-1 py-0.5">
        <p
          class="text-base font-semibold leading-snug text-highlighted sm:text-lg"
          :class="{
            'line-through opacity-60': isSkipped,
            'text-primary': isBought
          }"
        >
          {{ line.name }}
        </p>
        <p class="mt-1 text-sm text-muted">
          <template v-if="line.quantity_planned != null">
            Need {{ line.quantity_planned }}{{ line.unit ? ` ${line.unit}` : '' }}
          </template>
          <template v-else>
            As needed
          </template>
          <template v-if="isSkipped">
            · Not found
          </template>
        </p>

        <div
          v-if="isBought && canEdit"
          class="mt-3 flex items-center gap-2"
        >
          <UButton
            type="button"
            icon="i-lucide-minus"
            color="neutral"
            variant="outline"
            size="md"
            class="size-11 justify-center"
            :disabled="saving || (displayQty ?? 0) <= 0"
            :aria-label="`Decrease quantity for ${line.name}`"
            @click="adjustQty(-1)"
          />
          <div class="min-w-16 text-center">
            <p class="text-lg font-semibold tabular-nums text-highlighted">
              {{ displayQty ?? 0 }}
            </p>
            <p
              v-if="line.unit"
              class="text-xs text-muted"
            >
              {{ line.unit }}
            </p>
          </div>
          <UButton
            type="button"
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            size="md"
            class="size-11 justify-center"
            :disabled="saving"
            :aria-label="`Increase quantity for ${line.name}`"
            @click="adjustQty(1)"
          />
        </div>

        <div
          v-else-if="canEdit && !isBought"
          class="mt-3"
        >
          <UButton
            type="button"
            :label="isSkipped ? 'Still need it' : 'Can’t find'"
            :icon="isSkipped ? 'i-lucide-rotate-ccw' : 'i-lucide-ban'"
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="saving"
            @click="markSkipped"
          />
        </div>
      </div>

      <div
        v-if="saving"
        class="flex items-center self-center pr-1"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-5 animate-spin text-muted"
        />
      </div>
    </div>
  </li>
</template>
