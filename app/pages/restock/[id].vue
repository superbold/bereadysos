<script setup lang="ts">
import { formatReportedQuantity, INTAKE_LINE_STATUS_LABELS } from '#shared/shop-run-intake'
import type { ShopRunLineStatus } from '#shared/shop-run-intake'

const route = useRoute()
const { household, ensureHousehold } = useHousehold()
const { runs, pending, loadRuns } = useShopRuns()
const { categories, fetchCategories } = useInventory()

const listId = computed(() => String(route.params.id))
const shoppingList = computed(() =>
  runs.value.find(list => list.id === listId.value) ?? null
)

const categoryNames = computed(() =>
  new Map(categories.value.map(category => [category.id, category.name]))
)

function lineStatusLabel(status: ShopRunLineStatus) {
  if (status === 'pending') {
    return 'Not validated'
  }
  return INTAKE_LINE_STATUS_LABELS[status]
}

onMounted(async () => {
  if (!household.value) {
    await ensureHousehold()
  }
  await Promise.all([loadRuns(), fetchCategories()])
})
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="page-header">
      <div>
        <UButton
          to="/restock"
          label="Back to Restock"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          class="mb-3 -ml-2"
        />
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          {{ shoppingList?.title ?? 'Shopping list' }}
        </h1>
        <p
          v-if="shoppingList"
          class="mt-1 text-sm text-muted"
        >
          Completed {{ new Date(shoppingList.updated_at).toLocaleDateString() }}
          &middot;
          {{ shoppingList.lines.length }} item{{ shoppingList.lines.length === 1 ? '' : 's' }}
        </p>
      </div>
    </div>

    <div
      v-if="pending && !shoppingList"
      class="flex min-h-48 flex-col items-center justify-center gap-3"
      role="status"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-primary"
      />
      <p class="text-sm text-muted">
        Loading shopping list&hellip;
      </p>
    </div>

    <UAlert
      v-else-if="!shoppingList"
      color="error"
      icon="i-lucide-circle-alert"
      title="Shopping list not found"
      description="It may have been cancelled, or it does not belong to the active plan."
      variant="subtle"
    />

    <template v-else>
      <UAlert
        v-if="shoppingList.status !== 'closed'"
        color="warning"
        icon="i-lucide-list-checks"
        title="This shopping list is still active"
        description="Return to Restock to finish shopping, validate purchases, and update Inventory."
        variant="subtle"
        class="mb-6"
      />

      <ul class="divide-y divide-default overflow-hidden rounded-lg border border-default">
        <li
          v-for="line in shoppingList.lines"
          :key="line.id"
          class="space-y-2 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-medium text-highlighted">
                {{ line.name }}
              </p>
              <p class="text-sm text-muted">
                {{ line.category_id ? categoryNames.get(line.category_id) : 'No category' }}
                &middot;
                Planned {{ formatReportedQuantity(line.quantity_planned, line.unit) }}
              </p>
            </div>
            <UBadge
              :color="line.line_status === 'bought' || line.line_status === 'substituted' ? 'success' : 'neutral'"
              variant="subtle"
            >
              {{ lineStatusLabel(line.line_status) }}
            </UBadge>
          </div>

          <p class="text-sm text-highlighted">
            Validated: {{ formatReportedQuantity(line.quantity_reported, line.unit) }}
          </p>
          <p
            v-if="line.shopper_note"
            class="break-words text-sm text-muted"
          >
            Shopping note: {{ line.shopper_note }}
          </p>
          <p
            v-if="line.intake_note"
            class="break-words text-sm text-muted"
          >
            Validation note: {{ line.intake_note }}
          </p>
        </li>
      </ul>
    </template>
  </div>
</template>
