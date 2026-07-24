<script setup lang="ts">
import type { ItemWithCategory } from '~/composables/useInventory'
import { formatWaterInventoryLabel } from '#shared/water-volume'

const toast = useToast()
const route = useRoute()
const router = useRouter()
const { household, pending: householdPending, ensureHousehold, canEditInventory, isReadOnlyOnPlan } = useHousehold()
const {
  categories,
  items,
  pending,
  error,
  fetchCategories,
  fetchItems,
  createItem,
  updateItem,
  deleteItem
} = useInventory()

/** FEMA-style water target: 1 gallon per person per day. */
const waterTargetGallons = computed(() => {
  if (!household.value) {
    return null
  }
  return household.value.headcount * household.value.target_days
})

const search = ref('')
const categoryFilter = ref<string>('all')
const formOpen = ref(false)
const editingItem = ref<ItemWithCategory | null>(null)
const saving = ref(false)
const deleteTarget = ref<ItemWithCategory | null>(null)
const deleteModalOpen = ref(false)
const deleting = ref(false)

const categoryFilterOptions = computed(() => [
  { label: 'All categories', value: 'all' },
  ...categories.value.map(category => ({
    label: category.name,
    value: category.id,
    icon: category.icon ?? undefined
  }))
])

watch(
  () => route.query.category,
  (raw) => {
    const id = typeof raw === 'string' ? raw : null
    categoryFilter.value = id ?? 'all'
  },
  { immediate: true }
)

watch(categoryFilter, (value) => {
  const current = typeof route.query.category === 'string' ? route.query.category : null
  const next = value === 'all' ? null : value
  if (current === next) {
    return
  }
  const query = { ...route.query }
  if (next) {
    query.category = next
  } else {
    delete query.category
  }
  void router.replace({ query })
})

watch(categories, (list) => {
  if (
    categoryFilter.value !== 'all'
    && list.length
    && !list.some(category => category.id === categoryFilter.value)
  ) {
    categoryFilter.value = 'all'
  }
})

const filteredItems = computed(() => {
  const query = search.value.trim().toLowerCase()
  return items.value.filter((item) => {
    if (categoryFilter.value !== 'all' && item.category_id !== categoryFilter.value) {
      return false
    }
    if (!query) {
      return true
    }
    const haystack = [
      item.name,
      item.location,
      item.notes,
      item.category.name,
      item.unit
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
})

const isLoading = computed(() => householdPending.value || (pending.value && !items.value.length))

function clearFilters() {
  search.value = ''
  categoryFilter.value = 'all'
}

function openAddForm() {
  editingItem.value = null
  formOpen.value = true
}

function openEditForm(item: ItemWithCategory) {
  editingItem.value = item
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingItem.value = null
}

function formatQuantity(item: ItemWithCategory) {
  if (item.category.slug === 'water') {
    return formatWaterInventoryLabel(item)
  }
  const qty = Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(1)
  return item.unit ? `${qty} ${item.unit}` : String(qty)
}

function formatExpiration(date: string | null) {
  if (!date) {
    return null
  }
  const parsed = new Date(`${date}T12:00:00`)
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function expirationTone(date: string | null): 'error' | 'warning' | 'neutral' {
  if (!date) {
    return 'neutral'
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(`${date}T12:00:00`)
  const daysUntil = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntil < 0) {
    return 'error'
  }
  if (daysUntil <= 30) {
    return 'warning'
  }
  return 'neutral'
}

async function loadInventory() {
  await fetchCategories()
  await fetchItems()
}

onMounted(async () => {
  if (!household.value) {
    await ensureHousehold()
  }
  await loadInventory()
})

watch(
  () => household.value?.id,
  async (householdId, previousId) => {
    if (householdId && previousId && householdId !== previousId) {
      await loadInventory()
    }
  }
)

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
  saving.value = true

  const result = editingItem.value
    ? await updateItem(editingItem.value.id, payload)
    : await createItem(payload)

  saving.value = false

  if (result.error) {
    toast.add({
      title: editingItem.value ? 'Could not save item' : 'Could not add item',
      description: result.error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: editingItem.value ? 'Item updated' : 'Item added',
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
  closeForm()
}

async function confirmDelete() {
  if (!deleteTarget.value) {
    return
  }

  deleting.value = true
  const { error: deleteError } = await deleteItem(deleteTarget.value.id)
  deleting.value = false

  if (deleteError) {
    toast.add({
      title: 'Could not delete item',
      description: deleteError.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Item deleted',
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
  deleteTarget.value = null
  deleteModalOpen.value = false
}

function openDeleteModal(item: ItemWithCategory) {
  deleteTarget.value = item
  deleteModalOpen.value = true
}

function closeDeleteModal() {
  deleteTarget.value = null
  deleteModalOpen.value = false
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="page-header">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          Inventory
        </h1>
        <p class="mt-1 text-sm text-muted">
          Track supplies across your household — water, food, kits, and more.
        </p>
      </div>
      <UButton
        v-if="canEditInventory"
        label="Add item"
        icon="i-lucide-plus"
        class="shrink-0"
        :disabled="!household || isLoading"
        @click="openAddForm"
      />
    </div>

    <div
      v-if="isLoading"
      class="flex min-h-48 flex-col items-center justify-center gap-3"
      role="status"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-primary"
      />
      <p class="text-sm text-muted">
        Loading inventory&hellip;
      </p>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      icon="i-lucide-circle-alert"
      title="Could not load inventory"
      :description="error"
      class="mb-6"
    />

    <template v-else-if="household">
      <UAlert
        v-if="isReadOnlyOnPlan"
        color="primary"
        icon="i-lucide-eye"
        title="Read-only access"
        description="You can view this inventory but cannot add or edit items."
        variant="subtle"
        class="mb-6"
      />

      <div
        v-if="items.length"
        class="mb-6 flex flex-col gap-3 sm:flex-row"
      >
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search items…"
          class="flex-1"
        />
        <USelect
          v-model="categoryFilter"
          :items="categoryFilterOptions"
          class="w-full sm:w-48"
        />
      </div>

      <div
        v-if="!items.length"
        class="flex flex-col items-center rounded-lg border border-dashed border-default px-6 py-16 text-center"
      >
        <UIcon
          name="i-lucide-package-open"
          class="mb-4 size-12 text-muted"
        />
        <h2 class="text-lg font-semibold text-highlighted">
          No items yet
        </h2>
        <p class="mt-2 max-w-sm text-sm text-muted">
          Start building your preparedness inventory — add water, food, first aid, and other essentials.
        </p>
        <UButton
          v-if="canEditInventory"
          label="Add your first item"
          icon="i-lucide-plus"
          class="mt-6"
          @click="openAddForm"
        />
      </div>

      <div
        v-else-if="!filteredItems.length"
        class="flex flex-col items-center rounded-lg border border-dashed border-default px-6 py-12 text-center"
      >
        <UIcon
          name="i-lucide-search-x"
          class="mb-3 size-10 text-muted"
        />
        <p class="text-sm text-muted">
          No items match your search or filter.
        </p>
        <UButton
          label="Clear filters"
          color="neutral"
          variant="ghost"
          size="sm"
          class="mt-3"
          @click="clearFilters"
        />
      </div>

      <ul
        v-else
        class="divide-y divide-default rounded-lg border border-default"
      >
        <li
          v-for="item in filteredItems"
          :key="item.id"
          class="flex gap-3 p-4 first:rounded-t-lg last:rounded-b-lg hover:bg-elevated/50"
        >
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-elevated"
          >
            <UIcon
              :name="item.category.icon ?? 'i-lucide-package'"
              class="size-5 text-primary"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-highlighted">
                {{ item.name }}
              </span>
              <UBadge
                color="neutral"
                variant="subtle"
                size="sm"
              >
                {{ item.category.name }}
              </UBadge>
            </div>

            <p class="mt-1 text-sm text-muted">
              {{ formatQuantity(item) }}
              <template v-if="item.location">
                &middot; {{ item.location }}
              </template>
            </p>

            <p
              v-if="item.expiration_date"
              class="mt-1 text-sm"
              :class="{
                'text-error': expirationTone(item.expiration_date) === 'error',
                'text-warning': expirationTone(item.expiration_date) === 'warning',
                'text-muted': expirationTone(item.expiration_date) === 'neutral'
              }"
            >
              <UIcon
                name="i-lucide-calendar-clock"
                class="mr-1 inline size-3.5 align-text-bottom"
              />
              Expires {{ formatExpiration(item.expiration_date) }}
            </p>

            <p
              v-if="item.notes"
              class="mt-1 line-clamp-2 text-sm text-muted"
            >
              {{ item.notes }}
            </p>
          </div>

          <div
            v-if="canEditInventory"
            class="flex shrink-0 gap-1"
          >
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Edit item"
              @click="openEditForm(item)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Delete item"
              @click="openDeleteModal(item)"
            />
          </div>
        </li>
      </ul>

      <p
        v-if="items.length && filteredItems.length"
        class="mt-4 text-center text-xs text-muted"
      >
        {{ filteredItems.length === items.length
          ? `${items.length} item${items.length === 1 ? '' : 's'}`
          : `${filteredItems.length} of ${items.length} items` }}
      </p>
    </template>

    <USlideover
      v-model:open="formOpen"
      :title="editingItem ? 'Edit item' : 'Add item'"
      :description="editingItem ? 'Update this inventory line.' : 'Add a supply to your household inventory.'"
    >
      <template #body>
        <InventoryItemForm
          v-if="categories.length"
          :categories="categories"
          :item="editingItem"
          :saving="saving"
          :water-target-gallons="waterTargetGallons"
          @submit="onFormSubmit"
          @cancel="closeForm"
        />
      </template>
    </USlideover>

    <UModal
      v-model:open="deleteModalOpen"
      title="Delete item?"
      :description="deleteTarget ? `Remove “${deleteTarget.name}” from your inventory. This cannot be undone.` : ''"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="closeDeleteModal"
          />
          <UButton
            label="Delete"
            color="error"
            :loading="deleting"
            @click="confirmDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
