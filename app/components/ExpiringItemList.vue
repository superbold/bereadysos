<script setup lang="ts">
type ExpiringRow = {
  id: string
  name: string
  categoryName: string
  expiration_date: string
  daysUntil: number
  quantity: number
  unit: string | null
}

defineProps<{
  items: ExpiringRow[]
  formatDate: (date: string) => string
  formatDaysLabel: (daysUntil: number) => string
  rowTone: (daysUntil: number) => 'error' | 'warning' | 'neutral'
  selectedId?: string | null
  clickable?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <ul class="divide-y divide-default rounded-lg border border-default">
    <li
      v-for="item in items"
      :key="item.id"
      :class="selectedId === item.id ? 'bg-elevated/50' : undefined"
    >
      <button
        v-if="clickable"
        type="button"
        class="flex w-full flex-col gap-2 p-4 text-left transition-colors hover:bg-elevated/60 sm:flex-row sm:items-center sm:justify-between"
        @click="emit('select', item.id)"
      >
        <div class="min-w-0">
          <p class="font-medium text-highlighted">
            {{ item.name }}
          </p>
          <p class="text-sm text-muted">
            {{ item.categoryName }}
            <template v-if="item.unit">
              · {{ item.quantity }} {{ item.unit }}
            </template>
          </p>
        </div>
        <div class="shrink-0 text-sm sm:text-right">
          <p
            :class="{
              'text-error': rowTone(item.daysUntil) === 'error',
              'text-warning': rowTone(item.daysUntil) === 'warning',
              'text-muted': rowTone(item.daysUntil) === 'neutral'
            }"
          >
            {{ formatDaysLabel(item.daysUntil) }}
          </p>
          <p class="text-muted">
            {{ formatDate(item.expiration_date) }}
          </p>
        </div>
      </button>
      <div
        v-else
        class="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <p class="font-medium text-highlighted">
            {{ item.name }}
          </p>
          <p class="text-sm text-muted">
            {{ item.categoryName }}
            <template v-if="item.unit">
              · {{ item.quantity }} {{ item.unit }}
            </template>
          </p>
        </div>
        <div class="shrink-0 text-sm sm:text-right">
          <p
            :class="{
              'text-error': rowTone(item.daysUntil) === 'error',
              'text-warning': rowTone(item.daysUntil) === 'warning',
              'text-muted': rowTone(item.daysUntil) === 'neutral'
            }"
          >
            {{ formatDaysLabel(item.daysUntil) }}
          </p>
          <p class="text-muted">
            {{ formatDate(item.expiration_date) }}
          </p>
        </div>
      </div>
    </li>
  </ul>
</template>
