<script setup lang="ts">
import {
  computeAllCategoryCoverage,
  countExpired,
  countExpiringSoon,
  listExpiringItems,
  TARGET_DAY_PRESETS
} from '#shared/coverage'

const user = useSupabaseUser()
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
const { coordinationBanner } = useShopRuns()

const authReady = ref(import.meta.server)
const savingTargetDays = ref(false)

const targetPresets = TARGET_DAY_PRESETS

const isLoading = computed(() =>
  !authReady.value
  || householdPending.value
  || (inventoryPending.value && !items.value.length && user.value)
)

const dashboardDescription = computed(() => {
  if (!household.value) {
    return 'Track what you have, what is expiring, and what you still need for your target days.'
  }
  const { headcount, target_days, name } = household.value
  const people = headcount === 1 ? '1 person' : `${headcount} people`
  const days = target_days === 1 ? '1 day' : `${target_days} days`
  return `${name} · ${people} · planning for ${days}.`
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
    categoryName: item.category.name
  }))
)

const categoryCoverage = computed(() => {
  if (!household.value || !categories.value.length) {
    return []
  }

  return computeAllCategoryCoverage(
    categories.value,
    coverageItems.value,
    household.value.headcount,
    household.value.target_days
  )
})

const expiringSoonCount = computed(() => countExpiringSoon(coverageItems.value))
const expiredCount = computed(() => countExpired(coverageItems.value))
const upcomingExpiring = computed(() => listExpiringItems(coverageItems.value))

async function loadDashboardData() {
  await fetchCategories()
  await fetchItems()
}

onMounted(async () => {
  await useSupabaseClient().auth.getSession()
  authReady.value = true
  if (user.value) {
    await ensureHousehold()
    await loadDashboardData()
  }
})

watch(household, async (value) => {
  if (value) {
    await loadDashboardData()
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

function formatExpiringLabel(daysUntil: number) {
  if (daysUntil === 0) {
    return 'Expires today'
  }
  if (daysUntil === 1) {
    return 'Expires tomorrow'
  }
  return `Expires in ${daysUntil} days`
}
</script>

<template>
  <div>
    <div
      v-if="isLoading"
      class="flex min-h-48 flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-primary"
      />
      <p class="text-sm text-muted">
        Loading your dashboard&hellip;
      </p>
    </div>

    <template v-else-if="user && household">
      <div class="mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          Your preparedness dashboard
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ dashboardDescription }}
        </p>
      </div>

      <UAlert
        v-if="inventoryError"
        color="error"
        icon="i-lucide-circle-alert"
        title="Could not load inventory"
        :description="inventoryError"
        class="mb-6"
      />

      <UAlert
        v-if="coordinationBanner"
        :color="coordinationBanner.color"
        icon="i-lucide-shopping-cart"
        :title="coordinationBanner.title"
        :description="coordinationBanner.description"
        variant="subtle"
        class="mb-6"
      >
        <template #actions>
          <UButton
            :to="coordinationBanner.to"
            label="Open Restock"
            size="xs"
            color="neutral"
            variant="outline"
          />
        </template>
      </UAlert>

      <section class="mb-8">
        <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-sm font-semibold text-highlighted">
              Preparedness target
            </h2>
            <p class="text-sm text-muted">
              Coverage below is calculated for this many days.
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

      <section
        v-if="expiredCount || expiringSoonCount"
        class="mb-8 rounded-lg border border-default p-4"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-sm font-semibold text-highlighted">
              Expiration alerts
            </h2>
            <p class="mt-1 text-sm text-muted">
              <template v-if="expiredCount">
                {{ expiredCount }} expired
                <template v-if="expiringSoonCount">
                  ·
                </template>
              </template>
              <template v-if="expiringSoonCount">
                {{ expiringSoonCount }} expiring within 30 days
              </template>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              to="/inventory"
              label="Review inventory"
              icon="i-lucide-package"
              color="neutral"
              variant="outline"
              size="sm"
            />
            <UButton
              to="/expiring"
              label="View expiring"
              icon="i-lucide-calendar-clock"
              color="neutral"
              variant="soft"
              size="sm"
            />
          </div>
        </div>

        <ul
          v-if="upcomingExpiring.length"
          class="mt-4 divide-y divide-default rounded-lg border border-default"
        >
          <li
            v-for="item in upcomingExpiring"
            :key="item.id"
            class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
          >
            <span class="truncate text-highlighted">
              {{ item.name }}
            </span>
            <span class="shrink-0 text-warning">
              {{ formatExpiringLabel(item.daysUntil) }}
            </span>
          </li>
        </ul>
      </section>

      <section class="mb-8">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-sm font-semibold text-highlighted">
              Category coverage
            </h2>
            <p class="text-sm text-muted">
              Water and food use days-of-supply math; other categories track stocked essentials.
            </p>
          </div>
          <UButton
            to="/inventory"
            label="Manage inventory"
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </div>

        <div
          v-if="!items.length"
          class="flex flex-col items-center rounded-lg border border-dashed border-default px-6 py-12 text-center"
        >
          <UIcon
            name="i-lucide-package-open"
            class="mb-4 size-12 text-muted"
          />
          <h3 class="text-lg font-semibold text-highlighted">
            Add inventory to see coverage
          </h3>
          <p class="mt-2 max-w-sm text-sm text-muted">
            Start with water and food, then add medical, power, and other essentials.
          </p>
          <UButton
            to="/inventory"
            label="Add items"
            icon="i-lucide-plus"
            class="mt-6"
          />
        </div>

        <div
          v-else
          class="grid gap-4 sm:grid-cols-2"
        >
          <DashboardCategoryCard
            v-for="coverage in categoryCoverage"
            :key="coverage.categoryId"
            :coverage="coverage"
          />
        </div>
      </section>

      <div class="flex flex-wrap gap-2">
        <UButton
          to="/inventory"
          label="View inventory"
          trailing-icon="i-lucide-arrow-right"
        />
        <UButton
          to="/settings"
          label="Household settings"
          icon="i-lucide-settings"
          color="neutral"
          variant="subtle"
        />
      </div>
    </template>

    <UPageHero
      v-else-if="user"
      title="Your preparedness dashboard"
      description="We could not load your household yet. Check settings or try again."
      :links="[{
        label: 'Household settings',
        to: '/settings',
        icon: 'i-lucide-settings',
        size: 'lg'
      }]"
    />

    <UPageHero
      v-else
      title="Plan ahead with confidence"
      description="Sign in to track supplies, monitor expiration dates, and see how many days your household is ready for."
      :links="[{
        label: 'Sign in',
        to: '/auth/login',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'lg'
      }, {
        label: 'Create account',
        to: '/auth/signup',
        size: 'lg',
        color: 'neutral',
        variant: 'subtle'
      }]"
    />
  </div>
</template>
