<script setup lang="ts">
import { computeAllCategoryGaps } from '#shared/coverage'

const user = useSupabaseUser()
const route = useRoute()
const toast = useToast()

const { household, isHouseholdOwner } = useHousehold()
const { categories, items, fetchCategories, fetchItems } = useInventory()
const {
  runs,
  shoppingCompleteRun,
  intakeRun,
  submittedIntakeRun,
  completedLists
} = useShopRuns()

const mobileNavOpen = ref(false)
const restockMenuOpen = ref(false)

const desktopNavItems = [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'Inventory', to: '/inventory', icon: 'i-lucide-package' },
  { label: 'Plan', to: '/plan', icon: 'i-lucide-clipboard-list', tooltip: 'Plan gaps and shortfalls' },
  { label: 'Restock', to: '/restock', icon: 'i-lucide-shopping-cart' },
  { label: 'Expiring', to: '/expiring', icon: 'i-lucide-calendar-clock' }
]

const mobilePrimaryBeforeRestock = [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'Inventory', to: '/inventory', icon: 'i-lucide-package' },
  { label: 'Plan', to: '/plan', icon: 'i-lucide-clipboard-list' }
]

const mobilePrimaryAfterRestock = [
  { label: 'Expiring', to: '/expiring', icon: 'i-lucide-calendar-clock' }
]

const draftRun = computed(() => runs.value.find(run => run.status === 'draft') ?? null)
const shoppingRun = computed(() => runs.value.find(run => run.status === 'shopping') ?? null)
const hasActiveShoppingList = computed(() =>
  !!(draftRun.value || shoppingRun.value || shoppingCompleteRun.value || intakeRun.value || submittedIntakeRun.value)
)

const openGapsCount = computed(() => {
  if (!household.value || !categories.value.length) {
    return 0
  }

  return computeAllCategoryGaps(
    categories.value,
    items.value.map(item => ({
      category_id: item.category_id,
      quantity: item.quantity,
      servings_per_unit: item.servings_per_unit,
      volume_per_unit: item.volume_per_unit,
      expiration_date: item.expiration_date,
      name: item.name
    })),
    household.value.headcount,
    household.value.target_days
  ).filter(gap => !gap.isMet).length
})

const canStartPlanGap = computed(() =>
  isHouseholdOwner.value && openGapsCount.value > 0 && !hasActiveShoppingList.value
)
const canStartSupplementary = computed(() =>
  isHouseholdOwner.value && !hasActiveShoppingList.value
)
const canStartBoth = computed(() => canStartPlanGap.value)

const restockSubItems = computed(() => [
  {
    key: 'plan_gap',
    label: 'Plan Gap',
    icon: 'i-lucide-clipboard-list',
    to: '/restock?start=plan_gap',
    disabled: !canStartPlanGap.value,
    disabledReason: hasActiveShoppingList.value
      ? 'Finish or cancel the active shopping list first.'
      : 'No plan gaps right now.'
  },
  {
    key: 'supplementary',
    label: 'Supplementary Shopping',
    icon: 'i-lucide-shopping-bag',
    to: '/restock?start=supplementary',
    disabled: !canStartSupplementary.value,
    disabledReason: 'Finish or cancel the active shopping list first.'
  },
  {
    key: 'both',
    label: 'Let’s Do Both!',
    icon: 'i-lucide-list-plus',
    to: '/restock?start=both',
    disabled: !canStartBoth.value,
    disabledReason: hasActiveShoppingList.value
      ? 'Finish or cancel the active shopping list first.'
      : 'No plan gaps right now.'
  },
  {
    key: 'completed',
    label: 'Completed Lists',
    icon: 'i-lucide-history',
    to: '/restock#completed',
    disabled: completedLists.value.length === 0,
    disabledReason: 'No completed shopping lists yet.'
  }
])

function isActiveNavItem(to: string) {
  return route.path === to
}

const isRestockActive = computed(() =>
  route.path === '/restock' || route.path.startsWith('/restock/')
)

const mobilePrimaryItemsBefore = computed(() =>
  mobilePrimaryBeforeRestock.map(item => ({
    ...item,
    active: isActiveNavItem(item.to)
  }))
)

const mobilePrimaryItemsAfter = computed(() =>
  mobilePrimaryAfterRestock.map(item => ({
    ...item,
    active: isActiveNavItem(item.to)
  }))
)

watch(user, async (value) => {
  if (!value) {
    return
  }
  await Promise.all([fetchCategories(), fetchItems()])
}, { immediate: true })

watch(isRestockActive, (active) => {
  if (active) {
    restockMenuOpen.value = true
  }
}, { immediate: true })

function onRestockSubItemClick(item: {
  to: string
  disabled: boolean
  disabledReason: string
}) {
  if (item.disabled) {
    toast.add({
      title: 'Unavailable right now',
      description: item.disabledReason,
      color: 'warning',
      icon: 'i-lucide-circle-alert'
    })
    return
  }
  restockMenuOpen.value = false
  mobileNavOpen.value = false
  navigateTo(item.to)
}

async function signOut() {
  const supabase = useSupabaseClient()
  await supabase.auth.signOut()
  await navigateTo('/auth/login')
}
</script>

<template>
  <div class="flex min-h-svh flex-col bg-default">
    <UHeader v-model:open="mobileNavOpen">
      <template #left>
        <AppShellBrand />

        <nav
          v-if="user"
          class="hidden items-center gap-1 md:flex"
        >
          <template
            v-for="item in desktopNavItems"
            :key="item.to"
          >
            <UTooltip
              v-if="item.tooltip"
              :text="item.tooltip"
            >
              <UButton
                :to="item.to"
                :icon="item.icon"
                color="neutral"
                variant="ghost"
                size="sm"
                :aria-label="item.tooltip"
                :aria-current="isActiveNavItem(item.to) ? 'page' : undefined"
                :class="isActiveNavItem(item.to) ? 'rounded-none border-b-2 border-primary' : undefined"
              >
                {{ item.label }}
              </UButton>
            </UTooltip>
            <UButton
              v-else
              :to="item.to"
              :icon="item.icon"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-current="(item.to === '/restock' ? isRestockActive : isActiveNavItem(item.to)) ? 'page' : undefined"
              :class="(item.to === '/restock' ? isRestockActive : isActiveNavItem(item.to)) ? 'rounded-none border-b-2 border-primary' : undefined"
            >
              {{ item.label }}
            </UButton>
          </template>
        </nav>
      </template>

      <template #right>
        <UColorModeButton />

        <template v-if="user">
          <AlertsBell />

          <UTooltip text="Settings">
            <UButton
              to="/settings"
              icon="i-lucide-settings"
              color="neutral"
              variant="ghost"
              aria-label="Settings"
            />
          </UTooltip>
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            aria-label="Sign out"
            @click="signOut"
          />
        </template>

        <UButton
          v-else
          to="/auth/login"
          label="Sign in"
          color="primary"
          variant="soft"
          size="sm"
        />
      </template>

      <template #body>
        <nav v-if="user">
          <ul class="space-y-2">
            <li
              v-for="item in mobilePrimaryItemsBefore"
              :key="item.to"
            >
              <UButton
                :to="item.to"
                :label="item.label"
                :icon="item.icon"
                :color="item.active ? 'primary' : 'neutral'"
                :variant="item.active ? 'soft' : 'ghost'"
                size="xl"
                block
                class="min-h-14 justify-start px-4 text-base"
                :aria-current="item.active ? 'page' : undefined"
              />
            </li>

            <li>
              <UButton
                label="Restock"
                icon="i-lucide-shopping-cart"
                :trailing-icon="restockMenuOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                :color="isRestockActive ? 'primary' : 'neutral'"
                :variant="isRestockActive ? 'soft' : 'ghost'"
                size="xl"
                block
                class="min-h-14 justify-start px-4 text-base"
                :aria-expanded="restockMenuOpen"
                @click="restockMenuOpen = !restockMenuOpen"
              />
              <ul
                v-if="restockMenuOpen"
                class="mt-2 space-y-1 border-l-2 border-default pl-3"
              >
                <li
                  v-for="item in restockSubItems"
                  :key="item.key"
                >
                  <UButton
                    :label="item.label"
                    :icon="item.icon"
                    color="neutral"
                    variant="ghost"
                    size="lg"
                    block
                    class="min-h-12 justify-start px-3 text-sm"
                    :class="item.disabled ? 'restock-cta-unavailable' : undefined"
                    :aria-disabled="item.disabled"
                    @click="onRestockSubItemClick(item)"
                  />
                </li>
              </ul>
            </li>

            <li
              v-for="item in mobilePrimaryItemsAfter"
              :key="item.to"
            >
              <UButton
                :to="item.to"
                :label="item.label"
                :icon="item.icon"
                :color="item.active ? 'primary' : 'neutral'"
                :variant="item.active ? 'soft' : 'ghost'"
                size="xl"
                block
                class="min-h-14 justify-start px-4 text-base"
                :aria-current="item.active ? 'page' : undefined"
              />
            </li>

            <li>
              <UButton
                to="/settings"
                label="Settings"
                icon="i-lucide-settings"
                :color="isActiveNavItem('/settings') ? 'primary' : 'neutral'"
                :variant="isActiveNavItem('/settings') ? 'soft' : 'ghost'"
                size="xl"
                block
                class="min-h-14 justify-start px-4 text-base"
                :aria-current="isActiveNavItem('/settings') ? 'page' : undefined"
              />
            </li>
          </ul>
          <USeparator class="my-4" />
          <UButton
            label="Sign out"
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            size="xl"
            block
            class="min-h-14 justify-start px-4 text-base"
            @click="signOut"
          />
        </nav>
      </template>
    </UHeader>

    <UMain class="flex-1">
      <UContainer class="py-6 sm:py-8">
        <slot />
      </UContainer>
    </UMain>

    <USeparator />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          SOS Planner &middot; Be ready before you need to be
        </p>
      </template>
    </UFooter>
  </div>
</template>
