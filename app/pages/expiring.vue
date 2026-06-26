<script setup lang="ts">
import { EXPIRING_SOON_DAYS } from '#shared/coverage'

const { household, ensureHousehold } = useHousehold()
const { items, pending, error, fetchCategories, fetchItems } = useInventory()

type ExpiringRow = {
  id: string
  name: string
  categoryName: string
  expiration_date: string
  daysUntil: number
  quantity: number
  unit: string | null
}

const sortBy = ref<'date' | 'name' | 'category'>('date')

onMounted(async () => {
  if (!household.value) {
    await ensureHousehold()
  }
  await fetchCategories()
  await fetchItems()
})

const coverageItems = computed(() =>
  items.value.map(item => ({
    id: item.id,
    category_id: item.category_id,
    quantity: item.quantity,
    servings_per_unit: item.servings_per_unit,
    volume_per_unit: item.volume_per_unit,
    expiration_date: item.expiration_date,
    name: item.name,
    categoryName: item.category.name,
    unit: item.unit
  }))
)

function daysUntil(expirationDate: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(`${expirationDate}T12:00:00`)
  exp.setHours(0, 0, 0, 0)
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function toRow(item: (typeof coverageItems.value)[number]): ExpiringRow {
  return {
    id: item.id,
    name: item.name,
    categoryName: item.categoryName,
    expiration_date: item.expiration_date!,
    daysUntil: daysUntil(item.expiration_date!),
    quantity: item.quantity,
    unit: item.unit
  }
}

function sortRows(rows: ExpiringRow[]) {
  return [...rows].sort((a, b) => {
    if (sortBy.value === 'name') {
      return a.name.localeCompare(b.name)
    }
    if (sortBy.value === 'category') {
      return a.categoryName.localeCompare(b.categoryName) || a.expiration_date.localeCompare(b.expiration_date)
    }
    return a.expiration_date.localeCompare(b.expiration_date) || a.name.localeCompare(b.name)
  })
}

const expiredItems = computed(() =>
  sortRows(coverageItems.value.filter(item => item.expiration_date && daysUntil(item.expiration_date) < 0).map(toRow))
)

const expiringSoonItems = computed(() =>
  sortRows(coverageItems.value.filter((item) => {
    if (!item.expiration_date) {
      return false
    }
    const days = daysUntil(item.expiration_date)
    return days >= 0 && days <= EXPIRING_SOON_DAYS
  }).map(toRow))
)

const laterItems = computed(() =>
  sortRows(coverageItems.value.filter((item) => {
    if (!item.expiration_date) {
      return false
    }
    return daysUntil(item.expiration_date) > EXPIRING_SOON_DAYS
  }).map(toRow))
)

const itemsWithDates = computed(() =>
  coverageItems.value.filter(item => item.expiration_date).length
)

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDaysLabel(daysUntilExpiry: number) {
  if (daysUntilExpiry < 0) {
    return `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) === 1 ? '' : 's'} ago`
  }
  if (daysUntilExpiry === 0) {
    return 'Expires today'
  }
  if (daysUntilExpiry === 1) {
    return 'Expires tomorrow'
  }
  return `In ${daysUntilExpiry} days`
}

function rowTone(daysUntilExpiry: number): 'error' | 'warning' | 'neutral' {
  if (daysUntilExpiry < 0) {
    return 'error'
  }
  if (daysUntilExpiry <= EXPIRING_SOON_DAYS) {
    return 'warning'
  }
  return 'neutral'
}

const sortOptions = [
  { label: 'Expiration date', value: 'date' },
  { label: 'Item name', value: 'name' },
  { label: 'Category', value: 'category' }
]
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          Expiring items
        </h1>
        <p class="mt-1 text-sm text-muted">
          Items with expiration dates, sorted for rotation and restocking.
        </p>
      </div>
      <UButton
        to="/inventory"
        label="Manage inventory"
        icon="i-lucide-package"
        color="neutral"
        variant="outline"
        class="shrink-0"
      />
    </div>

    <div
      v-if="pending && !items.length"
      class="flex min-h-48 flex-col items-center justify-center gap-3"
      role="status"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-primary"
      />
      <p class="text-sm text-muted">
        Loading expiration dates&hellip;
      </p>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      icon="i-lucide-circle-alert"
      title="Could not load inventory"
      :description="error"
    />

    <div
      v-else-if="!itemsWithDates"
      class="flex flex-col items-center rounded-lg border border-dashed border-default px-6 py-16 text-center"
    >
      <UIcon
        name="i-lucide-calendar-off"
        class="mb-4 size-12 text-muted"
      />
      <h2 class="text-lg font-semibold text-highlighted">
        No expiration dates yet
      </h2>
      <p class="mt-2 max-w-sm text-sm text-muted">
        Add expiration dates when editing inventory items to track food, meds, and batteries here.
      </p>
      <UButton
        to="/inventory"
        label="Go to inventory"
        trailing-icon="i-lucide-arrow-right"
        class="mt-6"
      />
    </div>

    <template v-else>
      <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted">
          {{ itemsWithDates }} item{{ itemsWithDates === 1 ? '' : 's' }} with dates
          <template v-if="expiredItems.length">
            · {{ expiredItems.length }} expired
          </template>
          <template v-if="expiringSoonItems.length">
            · {{ expiringSoonItems.length }} within 30 days
          </template>
        </p>
        <USelect
          v-model="sortBy"
          :items="sortOptions"
          class="w-full sm:w-48"
        />
      </div>

      <section
        v-if="expiredItems.length"
        class="mb-8"
      >
        <h2 class="mb-3 text-sm font-semibold text-error">
          Expired
        </h2>
        <ExpiringItemList
          :items="expiredItems"
          :format-date="formatDate"
          :format-days-label="formatDaysLabel"
          :row-tone="rowTone"
        />
      </section>

      <section
        v-if="expiringSoonItems.length"
        class="mb-8"
      >
        <h2 class="mb-3 text-sm font-semibold text-warning">
          Expiring within 30 days
        </h2>
        <ExpiringItemList
          :items="expiringSoonItems"
          :format-date="formatDate"
          :format-days-label="formatDaysLabel"
          :row-tone="rowTone"
        />
      </section>

      <section v-if="laterItems.length">
        <h2 class="mb-3 text-sm font-semibold text-highlighted">
          Later
        </h2>
        <ExpiringItemList
          :items="laterItems"
          :format-date="formatDate"
          :format-days-label="formatDaysLabel"
          :row-tone="rowTone"
        />
      </section>
    </template>
  </div>
</template>
