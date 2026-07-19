<script setup lang="ts">
import { EXPIRING_SOON_DAYS, needsExpirationAttention } from '#shared/coverage'
import type { ItemWithCategory } from '~/composables/useInventory'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const {
  household,
  ensureHousehold,
  canEditInventory,
  isReadOnlyOnPlan
} = useHousehold()
const {
  categories,
  items,
  pending,
  error,
  fetchCategories,
  fetchItems,
  updateItem
} = useInventory()

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
const editingItem = ref<ItemWithCategory | null>(null)
const saving = ref(false)
const editorEl = ref<HTMLElement | null>(null)
const leftAttentionBanner = ref<{ name: string } | null>(null)

const waterTargetGallons = computed(() => {
  if (!household.value) {
    return null
  }
  return household.value.headcount * household.value.target_days
})

onMounted(async () => {
  if (!household.value) {
    await ensureHousehold()
  }
  await fetchCategories()
  await fetchItems()
  await openFromQuery()
})

watch(
  () => route.query.item,
  async () => {
    await openFromQuery()
  }
)

watch(items, async () => {
  if (route.query.item && !editingItem.value) {
    await openFromQuery()
  }
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

async function openFromQuery() {
  const raw = route.query.item
  const itemId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : null
  if (!itemId) {
    return
  }
  const match = items.value.find(item => item.id === itemId)
  if (!match) {
    return
  }
  await selectItem(match.id)
}

async function selectItem(id: string) {
  leftAttentionBanner.value = null
  const match = items.value.find(item => item.id === id) ?? null
  if (!match) {
    return
  }
  if (!canEditInventory.value) {
    toast.add({
      title: 'Read-only access',
      description: 'You can view expiration dates but cannot edit items on this plan.',
      color: 'warning',
      icon: 'i-lucide-eye'
    })
    return
  }
  editingItem.value = match
  await router.replace({ query: { ...route.query, item: id } })
  await nextTick()
  editorEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeEditor() {
  editingItem.value = null
  const query = { ...route.query }
  delete query.item
  router.replace({ query })
}

async function onFormSubmit(payload: {
  name: string
  category_id: string
  quantity: number
  unit: string | null
  volume_per_unit: number | null
  servings_per_unit: number | null
  expiration_date: string | null
  location: string | null
  notes: string | null
}) {
  if (!editingItem.value) {
    return
  }

  const previousName = editingItem.value.name
  const wasAttention = needsExpirationAttention(editingItem.value.expiration_date)

  saving.value = true
  const { error: updateError } = await updateItem(editingItem.value.id, payload)
  saving.value = false

  if (updateError) {
    toast.add({
      title: 'Could not save item',
      description: updateError.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  const stillAttention = needsExpirationAttention(payload.expiration_date)
  closeEditor()

  if (wasAttention && !stillAttention) {
    leftAttentionBanner.value = { name: previousName }
    toast.add({
      title: 'No longer on the expiring list',
      description: `${previousName} is current — find it in Inventory.`,
      color: 'success',
      icon: 'i-lucide-circle-check'
    })
    return
  }

  toast.add({
    title: 'Item updated',
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
}

function dismissLeftAttentionBanner() {
  leftAttentionBanner.value = null
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="page-header">
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

    <UAlert
      v-if="isReadOnlyOnPlan"
      color="primary"
      icon="i-lucide-eye"
      title="Read-only access"
      description="You can view expiration dates but cannot edit items on this plan."
      variant="subtle"
      class="mb-6"
    />

    <div
      v-if="leftAttentionBanner"
      class="expiring-cleared mb-6"
      role="status"
    >
      <UAlert
        color="success"
        icon="i-lucide-party-popper"
        :title="`“${leftAttentionBanner.name}” is no longer expiring`"
        description="It’s current now — open Inventory anytime to review or adjust it."
        variant="subtle"
        class="expiring-cleared__alert"
      >
        <template #actions>
          <UButton
            to="/inventory"
            label="Go to Inventory"
            icon="i-lucide-package"
            size="sm"
            color="primary"
          />
          <UButton
            label="Dismiss"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="dismissLeftAttentionBanner"
          />
        </template>
      </UAlert>
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
      <div
        v-if="editingItem"
        ref="editorEl"
        class="mb-8 rounded-lg border border-primary/30 bg-primary/5 p-4"
      >
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-highlighted">
              Update {{ editingItem.name }}
            </h2>
            <p class="mt-1 text-sm text-muted">
              Change the date, quantity, or replace this supply. Saving a later date removes it from the expiring list.
            </p>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Close editor"
            @click="closeEditor"
          />
        </div>
        <InventoryItemForm
          v-if="categories.length"
          :categories="categories"
          :item="editingItem"
          :saving="saving"
          :water-target-gallons="waterTargetGallons"
          @submit="onFormSubmit"
          @cancel="closeEditor"
        />
      </div>

      <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted">
          {{ itemsWithDates }} item{{ itemsWithDates === 1 ? '' : 's' }} with dates
          <template v-if="expiredItems.length">
            · {{ expiredItems.length }} expired
          </template>
          <template v-if="expiringSoonItems.length">
            · {{ expiringSoonItems.length }} within 30 days
          </template>
          <template v-if="canEditInventory">
            · tap an item to update
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
          :selected-id="editingItem?.id"
          :clickable="canEditInventory"
          @select="selectItem"
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
          :selected-id="editingItem?.id"
          :clickable="canEditInventory"
          @select="selectItem"
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
          :selected-id="editingItem?.id"
          :clickable="canEditInventory"
          @select="selectItem"
        />
      </section>
    </template>
  </div>
</template>

<style scoped>
.expiring-cleared {
  animation: expiring-cleared-enter 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.expiring-cleared__alert {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ui-success) 35%, transparent);
}

@keyframes expiring-cleared-enter {
  0% {
    opacity: 0;
    transform: translateY(-0.75rem) scale(0.97);
  }
  60% {
    opacity: 1;
    transform: translateY(0.1rem) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
