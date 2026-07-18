<script setup lang="ts">
import {
  computeAllCategoryGaps,
  TARGET_DAY_PRESETS
} from '#shared/coverage'

const toast = useToast()
const { household, pending: householdPending, ensureHousehold, updateHousehold } = useHousehold()
const {
  categories,
  items,
  pending: inventoryPending,
  error: inventoryError,
  fetchCategories,
  fetchItems
} = useInventory()

const savingTargetDays = ref(false)
const targetPresets = TARGET_DAY_PRESETS

const isLoading = computed(() =>
  householdPending.value || (inventoryPending.value && !items.value.length)
)

const planDescription = computed(() => {
  if (!household.value) {
    return 'See plan gaps and shortfalls — where your inventory falls short of your preparedness target.'
  }
  const { headcount, target_days } = household.value
  const people = headcount === 1 ? '1 person' : `${headcount} people`
  const days = target_days === 1 ? '1 day' : `${target_days} days`
  return `Plan gaps and shortfalls for ${people} · ${days} of supplies.`
})

const coverageItems = computed(() =>
  items.value.map(item => ({
    category_id: item.category_id,
    quantity: item.quantity,
    servings_per_unit: item.servings_per_unit,
    volume_per_unit: item.volume_per_unit,
    expiration_date: item.expiration_date,
    name: item.name
  }))
)

const categoryGaps = computed(() => {
  if (!household.value || !categories.value.length) {
    return []
  }

  return computeAllCategoryGaps(
    categories.value,
    coverageItems.value,
    household.value.headcount,
    household.value.target_days
  )
})

const openGaps = computed(() => categoryGaps.value.filter(gap => !gap.isMet))
const metGaps = computed(() => categoryGaps.value.filter(gap => gap.isMet))

async function loadPlanData() {
  await fetchCategories()
  await fetchItems()
}

onMounted(async () => {
  if (!household.value) {
    await ensureHousehold()
  }
  await loadPlanData()
})

watch(household, async (value) => {
  if (value) {
    await loadPlanData()
  }
})

async function applyTargetDays(days: number) {
  if (!household.value || household.value.target_days === days) {
    return
  }

  savingTargetDays.value = true
  const { error } = await updateHousehold({ target_days: days })
  savingTargetDays.value = false

  if (error) {
    toast.add({
      title: 'Could not update target',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Target updated',
    description: `Planning for ${days} days.`,
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-6 sm:mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-highlighted">
        Preparedness plan
      </h1>
      <p class="mt-1 text-sm text-muted">
        {{ planDescription }}
      </p>
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
        Loading your plan&hellip;
      </p>
    </div>

    <UAlert
      v-else-if="inventoryError"
      color="error"
      icon="i-lucide-circle-alert"
      title="Could not load inventory"
      :description="inventoryError"
      class="mb-6"
    />

    <template v-else-if="household">
      <section class="mb-8">
        <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-sm font-semibold text-highlighted">
              Target days
            </h2>
            <p class="text-sm text-muted">
              Plan gap shortfalls update when you change your preparedness target.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="days in targetPresets"
              :key="days"
              :label="`${days} days`"
              size="xs"
              :color="household.target_days === days ? 'primary' : 'neutral'"
              :variant="household.target_days === days ? 'soft' : 'outline'"
              :loading="savingTargetDays && household.target_days !== days"
              :disabled="savingTargetDays"
              @click="applyTargetDays(days)"
            />
          </div>
        </div>
      </section>

      <div
        v-if="!items.length"
        class="flex flex-col items-center rounded-lg border border-dashed border-default px-6 py-16 text-center"
      >
        <UIcon
          name="i-lucide-clipboard-list"
          class="mb-4 size-12 text-muted"
        />
        <h2 class="text-lg font-semibold text-highlighted">
          Add inventory to build your plan
        </h2>
        <p class="mt-2 max-w-sm text-sm text-muted">
          Log what you have first — we will calculate plan gaps and shortfalls for water, food, and other essentials.
        </p>
        <UButton
          to="/inventory"
          label="Add items"
          icon="i-lucide-plus"
          class="mt-6"
        />
      </div>

      <div
        v-else-if="!openGaps.length"
        class="mb-8 flex flex-col items-center rounded-lg border border-default bg-elevated/30 px-6 py-12 text-center"
      >
        <UIcon
          name="i-lucide-circle-check"
          class="mb-4 size-12 text-success"
        />
        <h2 class="text-lg font-semibold text-highlighted">
          You are on target
        </h2>
        <p class="mt-2 max-w-sm text-sm text-muted">
          No plan gap shortfalls — all categories meet your {{ household.target_days }}-day goal. Review details below or adjust the target to plan further out.
        </p>
      </div>

      <section
        v-if="items.length && openGaps.length"
        class="mb-8"
      >
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-sm font-semibold text-highlighted">
              Plan gap shortfalls
            </h2>
            <p class="text-sm text-muted">
              {{ openGaps.length }} categor{{ openGaps.length === 1 ? 'y' : 'ies' }} with a shortfall below your {{ household.target_days }}-day target.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              to="/restock"
              label="Restock from gaps"
              icon="i-lucide-shopping-cart"
              size="sm"
            />
            <UButton
              to="/inventory"
              label="Update inventory"
              icon="i-lucide-package"
              color="neutral"
              variant="outline"
              size="sm"
            />
          </div>
        </div>

        <div class="grid gap-4">
          <PlanGapCard
            v-for="gap in openGaps"
            :key="gap.categoryId"
            :gap="gap"
            :target-days="household.target_days"
          />
        </div>
      </section>

      <section v-if="items.length && metGaps.length">
        <h2 class="mb-4 text-sm font-semibold text-highlighted">
          On target — no shortfall
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <PlanGapCard
            v-for="gap in metGaps"
            :key="gap.categoryId"
            :gap="gap"
            :target-days="household.target_days"
          />
        </div>
      </section>

      <div
        v-if="items.length"
        class="mt-8 flex flex-wrap gap-2"
      >
        <UButton
          to="/"
          label="Dashboard"
          icon="i-lucide-layout-dashboard"
          color="neutral"
          variant="subtle"
        />
        <UButton
          to="/settings"
          label="Household settings"
          icon="i-lucide-settings"
          color="neutral"
          variant="ghost"
        />
      </div>
    </template>
  </div>
</template>
