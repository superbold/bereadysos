<script setup lang="ts">
import type { ShopRunLine } from '~/types/database.types'
import {
  defaultReportedQuantity,
  formatReportedQuantity,
  INTAKE_LINE_STATUS_LABELS,
  INTAKE_LINE_STATUS_OPTIONS,
  type ShopRunLineStatus
} from '#shared/shop-run-intake'

const props = defineProps<{
  line: ShopRunLine
  saving?: boolean
  readonly?: boolean
}>()

const emit = defineEmits<{
  save: [payload: {
    line_status: Exclude<ShopRunLineStatus, 'pending'>
    quantity_reported: number | null
    intake_note: string | null
  }]
}>()

const lineStatus = ref<Exclude<ShopRunLineStatus, 'pending'>>(
  props.line.line_status === 'pending' ? 'bought' : props.line.line_status
)
const quantityReported = ref<number | null>(
  props.line.quantity_reported ?? defaultReportedQuantity(lineStatus.value, props.line.quantity_planned)
)
const intakeNote = ref(props.line.intake_note ?? '')

const statusOptions = INTAKE_LINE_STATUS_OPTIONS.map(option => ({
  label: option.label,
  value: option.value
}))

const showQuantity = computed(() => lineStatus.value !== 'skipped')
const isResolved = computed(() => props.line.line_status !== 'pending')

watch(lineStatus, (value) => {
  if (value === 'skipped') {
    quantityReported.value = 0
    return
  }
  if (quantityReported.value == null || quantityReported.value === 0) {
    quantityReported.value = defaultReportedQuantity(value, props.line.quantity_planned)
  }
})

watch(() => props.line, (value) => {
  if (value.line_status !== 'pending') {
    lineStatus.value = value.line_status
    quantityReported.value = value.quantity_reported
    intakeNote.value = value.intake_note ?? ''
  }
})

function onSave() {
  emit('save', {
    line_status: lineStatus.value,
    quantity_reported: lineStatus.value === 'skipped' ? 0 : quantityReported.value,
    intake_note: intakeNote.value.trim() || null
  })
}
</script>

<template>
  <li
    class="space-y-3 p-4"
    :class="readonly ? '' : 'border-b border-default last:border-b-0'"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-medium text-highlighted">
          {{ line.name }}
        </p>
        <p class="mt-0.5 text-sm text-muted">
          Planned:
          <template v-if="line.quantity_planned != null">
            {{ line.quantity_planned }}{{ line.unit ? ` ${line.unit}` : '' }}
          </template>
          <template v-else>
            As needed
          </template>
        </p>
      </div>

      <UBadge
        v-if="readonly && isResolved"
        color="neutral"
        variant="subtle"
        size="sm"
      >
        {{ INTAKE_LINE_STATUS_LABELS[line.line_status as Exclude<ShopRunLineStatus, 'pending'>] }}
      </UBadge>
    </div>

    <template v-if="readonly">
      <p
        v-if="isResolved"
        class="text-sm text-highlighted"
      >
        Logged: {{ formatReportedQuantity(line.quantity_reported, line.unit) }}
      </p>
      <p
        v-if="line.intake_note"
        class="text-sm text-muted"
      >
        Note: {{ line.intake_note }}
      </p>
    </template>

    <template v-else>
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="What happened?">
          <USelect
            v-model="lineStatus"
            :items="statusOptions"
            value-key="value"
            label-key="label"
          />
        </UFormField>

        <UFormField
          v-if="showQuantity"
          label="Quantity received"
        >
          <UInput
            v-model.number="quantityReported"
            type="number"
            min="0"
            step="any"
            :placeholder="line.unit ?? 'Qty'"
          />
        </UFormField>
      </div>

      <UFormField label="Note (optional)">
        <UInput
          v-model="intakeNote"
          placeholder="Substitution, partial case, expiration…"
        />
      </UFormField>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          label="Save line"
          icon="i-lucide-save"
          size="sm"
          :loading="saving"
          @click="onSave"
        />
        <span
          v-if="isResolved"
          class="inline-flex items-center gap-1 text-xs text-primary"
        >
          <UIcon
            name="i-lucide-check"
            class="size-3.5"
          />
          Saved
        </span>
      </div>
    </template>
  </li>
</template>
