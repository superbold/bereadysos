<script setup lang="ts">
import { computeAllCategoryGaps } from '#shared/coverage'
import { formatReportedQuantity, INTAKE_LINE_STATUS_LABELS } from '#shared/shop-run-intake'
import type { ShopRunLine } from '~/types/database.types'
import type { ShoppingListType } from '~/composables/useShopRuns'

const toast = useToast()
const route = useRoute()
const router = useRouter()
const {
  household,
  pending: householdPending,
  ensureHousehold,
  isHouseholdOwner,
  isShopper,
  isReadOnlyOnPlan,
  canEditInventory
} = useHousehold()
const {
  categories,
  items,
  pending: inventoryPending,
  fetchCategories,
  fetchItems
} = useInventory()
const {
  runs,
  pending,
  working,
  createShoppingList,
  addLine,
  addShoppingListItem,
  removeShoppingListItem,
  cancelShoppingList,
  startRun,
  completeShopping,
  startIntake,
  updateLineShopping,
  updateLineIntake,
  submitIntake,
  completeSoloRestock,
  shoppingCompleteRun,
  intakeRun,
  submittedIntakeRun,
  completedLists,
  intakeReadyToSubmit
} = useShopRuns()

const completeNote = ref('')
const savingLineId = ref<string | null>(null)
const addingItem = ref(false)
const removingLineId = ref<string | null>(null)
const itemFormResetKey = ref(0)
const noGapsGuidanceOpen = ref(false)
const canEditShoppingList = computed(() => isHouseholdOwner.value || isShopper.value)

/** Owners use the solo restock path (list → shop → log → update inventory). */
const soloOwnerMode = computed(() => isHouseholdOwner.value)

const isLoading = computed(() =>
  householdPending.value || (inventoryPending.value && !items.value.length && !isReadOnlyOnPlan.value)
)

const openGaps = computed(() => {
  if (!household.value || !categories.value.length) {
    return []
  }

  const coverageItems = items.value.map(item => ({
    category_id: item.category_id,
    quantity: item.quantity,
    servings_per_unit: item.servings_per_unit,
    volume_per_unit: item.volume_per_unit,
    expiration_date: item.expiration_date,
    name: item.name
  }))

  return computeAllCategoryGaps(
    categories.value,
    coverageItems,
    household.value.headcount,
    household.value.target_days
  ).filter(gap => !gap.isMet)
})

const draftRun = computed(() => runs.value.find(run => run.status === 'draft'))
const shoppingRun = computed(() => runs.value.find(run => run.status === 'shopping'))
const hasActiveCoordinationRun = computed(() =>
  !!(draftRun.value || shoppingRun.value || shoppingCompleteRun.value || intakeRun.value || submittedIntakeRun.value)
)

const canStartFromGaps = computed(() =>
  openGaps.value.length > 0 && !hasActiveCoordinationRun.value
)

const canStartSupplementary = computed(() => !hasActiveCoordinationRun.value)
const canStartBoth = computed(() =>
  openGaps.value.length > 0 && !hasActiveCoordinationRun.value
)

const draftAllowsManualItems = computed(() =>
  draftRun.value?.list_type === 'supplementary'
  || draftRun.value?.list_type === 'both'
  || draftRun.value?.title === 'Restock run'
)

const activeRun = computed(() =>
  shoppingRun.value
  ?? draftRun.value
  ?? shoppingCompleteRun.value
  ?? intakeRun.value
  ?? submittedIntakeRun.value
  ?? null
)

const continueActiveRunLabel = computed(() => {
  const listType = activeRun.value?.list_type
  if (listType === 'supplementary' || activeRun.value?.title === 'Restock run') {
    return 'Continue Supplementary Shopping'
  }
  if (listType === 'both') {
    return 'Continue combined list'
  }
  return 'Continue Plan Gap shopping'
})

const coordinationStatusLabels: Record<string, string> = {
  draft: 'Draft',
  shopping: 'Shopping in progress',
  shopping_complete: 'Awaiting intake',
  intake_pending: 'Intake in progress',
  closed: 'Closed'
}

const soloStatusLabels: Record<string, string> = {
  draft: 'List ready',
  shopping: 'At the store',
  shopping_complete: 'Ready to log',
  intake_pending: 'Log what you bought',
  closed: 'Complete'
}

const statusLabels = computed(() =>
  soloOwnerMode.value ? soloStatusLabels : coordinationStatusLabels
)

function runStatusLabel(run: { status: string, intake_submitted_at: string | null }) {
  if (run.status === 'closed') {
    return statusLabels.value.closed
  }
  if (run.intake_submitted_at && !soloOwnerMode.value) {
    return 'Awaiting owner review'
  }
  if (run.intake_submitted_at && soloOwnerMode.value) {
    return 'Ready to update inventory'
  }
  return statusLabels.value[run.status] ?? run.status
}

const activeListPromptTitle = computed(() => {
  const listType = activeRun.value?.list_type
  if (listType === 'supplementary' || activeRun.value?.title === 'Restock run') {
    return 'Continue your Supplementary Shopping?'
  }
  if (listType === 'both') {
    return 'Continue your combined shopping list?'
  }
  return 'Continue your Plan Gap shopping?'
})

const activeListPromptDetail = computed(() => {
  const run = activeRun.value
  if (!run) {
    return ''
  }

  const status = runStatusLabel(run)
  const count = run.lines.length
  const itemWord = count === 1 ? 'item' : 'items'

  if (run.status === 'shopping') {
    const checked = run.lines.filter(line => line.line_status !== 'pending').length
    return `${status} · ${checked} of ${count} checked · not closed out yet`
  }

  if (run.status === 'draft') {
    return `${status} · ${count} ${itemWord} · not closed out yet`
  }

  return `${status} · ${count} ${itemWord}`
})

const canCancelActiveList = computed(() =>
  Boolean(draftRun.value && isHouseholdOwner.value)
)

async function loadData() {
  await fetchCategories()
  await fetchItems()
}

onMounted(async () => {
  if (!household.value) {
    await ensureHousehold()
  }
  await loadData()
  await handleRestockDeepLink()
})

watch(household, async (value) => {
  if (value) {
    await loadData()
  }
})

watch(
  () => [route.query.start, route.hash, hasActiveCoordinationRun.value, openGaps.value.length],
  async () => {
    await handleRestockDeepLink()
  }
)

async function handleRestockDeepLink() {
  await nextTick()

  if (route.hash === '#completed') {
    document.getElementById('completed-shopping-lists')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }

  const start = typeof route.query.start === 'string' ? route.query.start : null
  if (!start || !isHouseholdOwner.value) {
    return
  }

  const clearStartQuery = async () => {
    const query = { ...route.query }
    delete query.start
    await router.replace({ query, hash: route.hash || undefined })
  }

  if (hasActiveCoordinationRun.value) {
    await clearStartQuery()
    toast.add({
      title: 'Finish your active shopping list first',
      description: 'Complete or cancel the active list before starting another.',
      color: 'warning',
      icon: 'i-lucide-circle-alert'
    })
    scrollToActiveRun()
    return
  }

  if (start === 'plan_gap') {
    await clearStartQuery()
    onRestockFromGapsClick()
    return
  }

  if (start === 'supplementary') {
    await clearStartQuery()
    await onStartSupplementaryShopping()
    return
  }

  if (start === 'both') {
    await clearStartQuery()
    await onStartBoth()
  }
}

function onRestockFromGapsClick() {
  if (hasActiveCoordinationRun.value) {
    noGapsGuidanceOpen.value = false
    toast.add({
      title: 'Finish your active shopping list first',
      description: 'Complete or cancel the active list before starting another.',
      color: 'warning',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  if (!openGaps.value.length) {
    noGapsGuidanceOpen.value = true
    return
  }

  noGapsGuidanceOpen.value = false
  void onCreateGapSeededList('plan_gap')
}

async function onCreateGapSeededList(
  listType: Exclude<ShoppingListType, 'supplementary'>
) {
  const { data: run, error: createError } = await createShoppingList(listType)
  if (createError || !run) {
    toast.add({
      title: 'Could not start shopping list',
      description: createError?.message ?? 'Unknown error',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  for (const gap of openGaps.value) {
    const quantity = gap.gap
    const unit = gap.calc_type === 'consumable' ? gap.unit : 'items'
    const { error } = await addLine(run.id, {
      name: gap.name,
      category_id: gap.categoryId,
      quantity: quantity > 0 ? quantity : null,
      unit
    })
    if (error) {
      toast.add({
        title: 'Could not add list item',
        description: `${gap.name}: ${error.message}`,
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
      return
    }
  }

  toast.add({
    title: listType === 'both' ? 'Combined shopping list created' : 'Plan Gap list created',
    description: listType === 'both'
      ? `${openGaps.value.length} plan-gap items added. Add any supplementary items below.`
      : `${openGaps.value.length} items added from your plan gaps.`,
    color: 'success',
    icon: 'i-lucide-shopping-cart'
  })
}

async function onStartEmptyFromGuidance() {
  noGapsGuidanceOpen.value = false
  const { error } = await createShoppingList('supplementary')
  if (error) {
    toast.add({
      title: 'Could not start shopping list',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

async function onStartSupplementaryShopping() {
  const { error } = await createShoppingList('supplementary')
  if (error) {
    toast.add({
      title: 'Could not start Supplementary Shopping',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

async function onStartBoth() {
  if (!canStartBoth.value) {
    if (!openGaps.value.length) {
      noGapsGuidanceOpen.value = true
    }
    return
  }
  await onCreateGapSeededList('both')
}

async function onAddShoppingListItem(payload: {
  name: string
  category_id: string
  quantity: number
  unit: string | null
  note: string | null
}) {
  if (!draftRun.value) {
    return
  }

  addingItem.value = true
  const { error } = await addShoppingListItem(draftRun.value.id, payload)
  addingItem.value = false

  if (error) {
    toast.add({
      title: 'Could not add item',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  itemFormResetKey.value += 1
  toast.add({
    title: 'Added to shopping list',
    description: payload.name,
    color: 'success',
    icon: 'i-lucide-list-plus'
  })
}

async function onRemoveShoppingListItem(line: ShopRunLine) {
  removingLineId.value = line.id
  const { error } = await removeShoppingListItem(line.id)
  removingLineId.value = null

  if (error) {
    toast.add({
      title: 'Could not remove item',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

async function onCancelDraftList() {
  if (!draftRun.value) {
    return
  }

  const { error } = await cancelShoppingList(draftRun.value.id)
  if (error) {
    toast.add({
      title: 'Could not cancel shopping list',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Shopping list cancelled',
    color: 'success',
    icon: 'i-lucide-trash-2'
  })
}

async function scrollToActiveRun() {
  await nextTick()
  const target = document.getElementById('active-shopping-list')
  if (!target) {
    return
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function onStartShopping(runId: string) {
  const { error } = await startRun(runId)
  if (error) {
    toast.add({
      title: 'Could not start shopping',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: soloOwnerMode.value ? 'Shopping list ready' : 'Shopping started',
    description: soloOwnerMode.value
      ? 'Use this list at the store, then mark shopping done when you return.'
      : 'The list is ready for your shopper.',
    color: 'success',
    icon: 'i-lucide-play'
  })
}

async function onUpdateShoppingLine(payload: {
  lineId: string
  line_status: 'pending' | 'bought' | 'skipped'
  quantity_reported: number | null
}) {
  savingLineId.value = payload.lineId
  const { error } = await updateLineShopping(payload.lineId, {
    line_status: payload.line_status,
    quantity_reported: payload.quantity_reported
  })
  savingLineId.value = null

  if (error) {
    toast.add({
      title: 'Could not update list item',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

async function onCompleteShopping(runId: string) {
  const { error } = await completeShopping(runId, completeNote.value)
  completeNote.value = ''

  if (error) {
    toast.add({
      title: 'Could not complete shopping',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  if (soloOwnerMode.value) {
    const intakeError = (await startIntake(runId)).error
    if (intakeError) {
      toast.add({
        title: 'Shopping done — could not open log',
        description: intakeError.message,
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
      return
    }

    toast.add({
      title: 'Shopping done',
      description: 'Checked items are ready — finish any leftovers, then update inventory.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    return
  }

  toast.add({
    title: 'Shopping complete',
    description: 'The inventory keeper can log items when ready.',
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
}

async function onStartIntake(runId: string) {
  const { error } = await startIntake(runId)
  if (error) {
    toast.add({
      title: 'Could not start intake',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Intake started',
    description: soloOwnerMode.value
      ? 'Log each item below, then update your inventory.'
      : 'Log each item below — inventory is not updated until the owner reviews.',
    color: 'success',
    icon: 'i-lucide-package-open'
  })
}

async function onSaveIntakeLine(
  line: ShopRunLine,
  payload: {
    line_status: 'bought' | 'skipped' | 'substituted'
    quantity_reported: number | null
    intake_note: string | null
  }
) {
  savingLineId.value = line.id
  const { error } = await updateLineIntake(line.id, payload)
  savingLineId.value = null

  if (error) {
    toast.add({
      title: 'Could not save line',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Line saved',
    description: line.name,
    color: 'success',
    icon: 'i-lucide-check'
  })
}

async function onSubmitIntake(runId: string) {
  const { error } = await submitIntake(runId)
  if (error) {
    toast.add({
      title: 'Could not submit intake',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Intake submitted',
    description: 'The plan owner can review and accept inventory in a future update.',
    color: 'success',
    icon: 'i-lucide-send'
  })
}

async function onCompleteSoloRestock(runId: string) {
  const { error } = await completeSoloRestock(runId)
  if (error) {
    toast.add({
      title: 'Could not update inventory',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  await fetchItems()

  toast.add({
    title: 'Inventory updated',
    description: 'Your restock is complete. Check Dashboard or Plan for updated coverage.',
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-highlighted">
        Restock
      </h1>
      <p class="mt-1 text-sm text-muted">
        <template v-if="soloOwnerMode">
          Create either a Plan Gap or Supplementary Shopping list, then log what you bought. This list will be used to update your inventory.
        </template>
        <template v-else>
          Coordinate shopping and intake — plan owner, shopper, and inventory keeper working together.
        </template>
      </p>
    </div>

    <UAlert
      v-if="isReadOnlyOnPlan"
      color="primary"
      icon="i-lucide-eye"
      :title="isShopper ? 'You are the shopper' : 'You are watching this plan'"
      :description="isShopper
        ? 'You can view the shopping list and mark shopping complete when done.'
        : 'You have read-only access. Suggestions and owner review come in a later update.'"
      variant="subtle"
      class="mb-6"
    />

    <div
      v-if="isLoading || pending"
      class="flex min-h-48 flex-col items-center justify-center gap-3"
      role="status"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-primary"
      />
      <p class="text-sm text-muted">
        Loading restock&hellip;
      </p>
    </div>

    <template v-else-if="household">
      <section
        v-if="hasActiveCoordinationRun"
        class="panel panel--emphasize"
      >
        <div>
          <h2 class="text-lg font-semibold tracking-tight text-highlighted">
            {{ activeListPromptTitle }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            {{ activeListPromptDetail }}
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <UButton
            :label="continueActiveRunLabel"
            icon="i-lucide-arrow-down"
            color="success"
            variant="solid"
            size="lg"
            class="sm:flex-1"
            @click="scrollToActiveRun"
          />
          <UButton
            v-if="canCancelActiveList"
            label="Cancel list"
            icon="i-lucide-trash-2"
            color="error"
            variant="outline"
            size="lg"
            :loading="working"
            @click="onCancelDraftList"
          />
        </div>
      </section>

      <section
        v-if="draftRun"
        id="active-shopping-list"
        class="panel"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-highlighted">
              {{ draftRun.title }}
            </h2>
            <p class="mt-1 text-sm text-muted">
              {{ runStatusLabel(draftRun) }} &middot; {{ draftRun.lines.length }} items
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="isHouseholdOwner && draftRun.lines.length"
              :label="soloOwnerMode ? 'Start shopping' : 'Send to shopper'"
              :icon="soloOwnerMode ? 'i-lucide-shopping-cart' : 'i-lucide-send'"
              size="sm"
              :loading="working"
              @click="onStartShopping(draftRun.id)"
            />
            <UButton
              v-if="isHouseholdOwner"
              label="Cancel list"
              icon="i-lucide-trash-2"
              size="sm"
              color="error"
              variant="ghost"
              :loading="working"
              @click="onCancelDraftList"
            />
          </div>
        </div>

        <ul
          v-if="draftRun.lines.length"
          class="divide-y divide-default rounded-lg border border-default"
        >
          <li
            v-for="line in draftRun.lines"
            :key="line.id"
            class="flex items-start justify-between gap-3 p-3 text-sm"
          >
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                {{ line.name }}
              </p>
              <p class="text-muted">
                <template v-if="line.quantity_planned != null">
                  {{ line.quantity_planned }}{{ line.unit ? ` ${line.unit}` : '' }}
                </template>
                <template v-else>
                  As needed
                </template>
              </p>
              <p
                v-if="line.shopper_note"
                class="mt-1 break-words text-xs text-muted"
              >
                {{ line.shopper_note }}
              </p>
            </div>
            <UButton
              v-if="isHouseholdOwner"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              :loading="removingLineId === line.id"
              :aria-label="`Remove ${line.name}`"
              @click="onRemoveShoppingListItem(line)"
            />
          </li>
        </ul>

        <ShoppingListItemForm
          v-if="isHouseholdOwner && draftAllowsManualItems"
          :categories="categories"
          :saving="addingItem"
          :reset-key="itemFormResetKey"
          @submit="onAddShoppingListItem"
        />
      </section>

      <section
        v-if="shoppingRun"
        id="active-shopping-list"
        class="mb-6 space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5"
      >
        <div>
          <h2 class="text-lg font-semibold tracking-tight text-highlighted sm:text-xl">
            {{ shoppingRun.title }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            {{ runStatusLabel(shoppingRun) }}
            <template v-if="soloOwnerMode">
              — tap items as you find them
            </template>
          </p>
        </div>

        <RestockShoppingList
          v-model:note="completeNote"
          :lines="shoppingRun.lines"
          :can-edit="canEditShoppingList"
          :working="working"
          :saving-line-id="savingLineId"
          :complete-label="soloOwnerMode ? 'Done shopping' : 'Mark shopping complete'"
          @update-line="onUpdateShoppingLine"
          @complete="onCompleteShopping(shoppingRun.id)"
        />
      </section>

      <section
        v-if="shoppingCompleteRun"
        id="active-shopping-list"
        class="panel panel--caution"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            {{ soloOwnerMode ? 'Shopping done' : 'Shopping complete — ready for intake' }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            <template v-if="soloOwnerMode && canEditInventory">
              Log what you bought, then update your inventory.
            </template>
            <template v-else-if="canEditInventory">
              Log what actually came in. Inventory stays unchanged until the owner reviews.
            </template>
            <template v-else>
              Waiting for the inventory keeper to log items.
            </template>
          </p>
        </div>

        <ul class="divide-y divide-default rounded-lg border border-default bg-default">
          <li
            v-for="line in shoppingCompleteRun.lines"
            :key="line.id"
            class="flex items-center justify-between gap-3 p-3 text-sm"
          >
            <span class="font-medium text-highlighted">{{ line.name }}</span>
            <span class="text-muted">
              <template v-if="line.quantity_planned != null">
                {{ line.quantity_planned }}{{ line.unit ? ` ${line.unit}` : '' }}
              </template>
            </span>
          </li>
        </ul>

        <p
          v-if="shoppingCompleteRun.shopping_note"
          class="text-sm text-highlighted"
        >
          Shopper note: {{ shoppingCompleteRun.shopping_note }}
        </p>

        <UButton
          v-if="canEditInventory"
          :label="soloOwnerMode ? 'Log what you bought' : 'Start intake'"
          icon="i-lucide-package-open"
          :loading="working"
          @click="onStartIntake(shoppingCompleteRun.id)"
        />
      </section>

      <section
        v-if="intakeRun"
        id="active-shopping-list"
        class="panel panel--emphasize"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            {{ soloOwnerMode ? 'Log what you bought' : 'Log intake' }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            <template v-if="soloOwnerMode && canEditInventory">
              Record what you bought, substituted, or skipped. Then update your inventory.
            </template>
            <template v-else-if="canEditInventory">
              Record bought, substituted, or skipped for each line. Submit when done — the owner will review before inventory updates.
            </template>
            <template v-else>
              The inventory keeper is logging what came in.
            </template>
          </p>
        </div>

        <p
          v-if="intakeRun.shopping_note"
          class="text-sm text-highlighted"
        >
          {{ soloOwnerMode ? 'Note:' : 'Shopper note:' }} {{ intakeRun.shopping_note }}
        </p>

        <ul
          v-if="canEditInventory"
          class="divide-y divide-default rounded-lg border border-default bg-default"
        >
          <RestockIntakeLine
            v-for="line in intakeRun.lines"
            :key="line.id"
            :line="line"
            :saving="savingLineId === line.id"
            @save="payload => onSaveIntakeLine(line, payload)"
          />
        </ul>

        <ul
          v-else
          class="divide-y divide-default rounded-lg border border-default bg-default"
        >
          <li
            v-for="line in intakeRun.lines"
            :key="line.id"
            class="flex flex-col gap-1 p-3 text-sm"
          >
            <span class="font-medium text-highlighted">{{ line.name }}</span>
            <span
              v-if="line.line_status !== 'pending'"
              class="text-muted"
            >
              {{ INTAKE_LINE_STATUS_LABELS[line.line_status as 'bought' | 'skipped' | 'substituted'] }}
              &middot;
              {{ formatReportedQuantity(line.quantity_reported, line.unit) }}
            </span>
            <span
              v-else
              class="text-muted"
            >
              Not logged yet
            </span>
          </li>
        </ul>

        <UButton
          v-if="soloOwnerMode && canEditInventory"
          label="Update inventory"
          icon="i-lucide-package-check"
          :disabled="!intakeReadyToSubmit"
          :loading="working"
          @click="onCompleteSoloRestock(intakeRun.id)"
        />
        <UButton
          v-else-if="canEditInventory"
          label="Submit for owner review"
          icon="i-lucide-send"
          :disabled="!intakeReadyToSubmit"
          :loading="working"
          @click="onSubmitIntake(intakeRun.id)"
        />
      </section>

      <section
        v-if="submittedIntakeRun"
        id="active-shopping-list"
        class="panel"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            {{ soloOwnerMode ? 'Ready to update inventory' : 'Intake submitted' }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            <template v-if="soloOwnerMode">
              Your validated shopping list is ready. Apply it to Inventory to finish.
            </template>
            <template v-else-if="isHouseholdOwner">
              The inventory keeper finished logging. Owner accept / send-back review is coming in the next update.
            </template>
            <template v-else>
              Waiting for the plan owner to review and accept inventory.
            </template>
          </p>
        </div>

        <ul class="divide-y divide-default rounded-lg border border-default bg-default">
          <RestockIntakeLine
            v-for="line in submittedIntakeRun.lines"
            :key="line.id"
            :line="line"
            readonly
          />
        </ul>

        <UButton
          v-if="soloOwnerMode"
          label="Update inventory"
          icon="i-lucide-package-check"
          :loading="working"
          @click="onCompleteSoloRestock(submittedIntakeRun.id)"
        />
      </section>

      <section
        v-if="isHouseholdOwner"
        class="panel"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            Choose a list type
          </h2>
          <p class="mt-1 text-sm text-muted">
            <template v-if="soloOwnerMode">
              Choose the list that matches this trip. All three paths end with validated purchases updating Inventory.
            </template>
            <template v-else>
              Build a shopping list from plan gaps or start Supplementary Shopping, then hand off to your shopper.
            </template>
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div class="restock-list-choice">
            <div class="flex items-start gap-2">
              <UIcon
                name="i-lucide-clipboard-list"
                class="mt-0.5 size-5 shrink-0"
                :class="canStartFromGaps ? 'text-primary' : 'text-muted'"
              />
              <div class="min-w-0">
                <h3 class="font-semibold text-highlighted">
                  Plan Gap
                </h3>
                <p class="mt-1 text-sm text-muted">
                  Builds a shopping list from what your Plan still needs — coverage shortfalls like water, food, or kit items.
                </p>
              </div>
            </div>
            <UButton
              label="Start Plan Gap list"
              icon="i-lucide-list-plus"
              :color="canStartFromGaps ? 'primary' : 'neutral'"
              :variant="canStartFromGaps ? 'solid' : 'soft'"
              :class="canStartFromGaps ? undefined : 'restock-cta-unavailable'"
              :loading="working"
              :aria-disabled="!canStartFromGaps"
              block
              class="mt-4"
              @click="onRestockFromGapsClick"
            />
          </div>

          <div class="restock-list-choice">
            <div class="flex items-start gap-2">
              <UIcon
                name="i-lucide-shopping-bag"
                class="mt-0.5 size-5 shrink-0"
                :class="canStartSupplementary ? 'text-primary' : 'text-muted'"
              />
              <div class="min-w-0">
                <h3 class="font-semibold text-highlighted">
                  Supplementary Shopping
                </h3>
                <p class="mt-1 text-sm text-muted">
                  For when you want to shop outside the gap for one-off supplies, extras, or things Plan doesn’t track yet.
                </p>
              </div>
            </div>
            <UButton
              label="Start Supplementary Shopping"
              icon="i-lucide-plus"
              :color="canStartSupplementary ? 'primary' : 'neutral'"
              :variant="canStartSupplementary ? 'solid' : 'soft'"
              :class="canStartSupplementary ? undefined : 'restock-cta-unavailable'"
              :disabled="!canStartSupplementary"
              :loading="working"
              :aria-disabled="!canStartSupplementary"
              block
              class="mt-4"
              @click="onStartSupplementaryShopping"
            />
          </div>

          <div class="restock-list-choice">
            <div class="flex items-start gap-2">
              <UIcon
                name="i-lucide-list-plus"
                class="mt-0.5 size-5 shrink-0"
                :class="canStartBoth ? 'text-primary' : 'text-muted'"
              />
              <div class="min-w-0">
                <h3 class="font-semibold text-highlighted">
                  Let&rsquo;s Do Both!
                </h3>
                <p class="mt-1 text-sm text-muted">
                  Starts with every Plan Gap, then lets you add one-off or supplementary items to the same trip.
                </p>
              </div>
            </div>
            <UButton
              label="Start combined list"
              icon="i-lucide-list-plus"
              :color="canStartBoth ? 'primary' : 'neutral'"
              :variant="canStartBoth ? 'solid' : 'soft'"
              :class="canStartBoth ? undefined : 'restock-cta-unavailable'"
              :disabled="hasActiveCoordinationRun"
              :loading="working"
              :aria-disabled="!canStartBoth"
              block
              class="mt-4"
              @click="onStartBoth"
            />
          </div>
        </div>

        <UAlert
          color="neutral"
          icon="i-lucide-route"
          title="Every list follows the same path"
          description="Shop the list, validate what you actually bought and adjust quantities, then add the validated items to Inventory."
          variant="subtle"
        />

        <UAlert
          v-if="noGapsGuidanceOpen"
          color="warning"
          icon="i-lucide-circle-help"
          title="There are no plan gaps right now"
          description="Your inventory meets your target (or Plan has nothing short). Would you like to start Supplementary Shopping instead for one-off supplies outside the gaps?"
          variant="subtle"
        >
          <template #actions>
            <UButton
              label="Start Supplementary Shopping"
              icon="i-lucide-plus"
              size="sm"
              color="primary"
              :loading="working"
              @click="onStartEmptyFromGuidance"
            />
            <UButton
              label="Not now"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="noGapsGuidanceOpen = false"
            />
          </template>
        </UAlert>

        <p
          v-else-if="hasActiveCoordinationRun"
          class="text-sm text-muted"
        >
          Finish or cancel the active list above before starting another.
        </p>
      </section>

      <section
        id="completed-shopping-lists"
        class="mt-8"
      >
        <h2 class="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
          Completed Shopping Lists
        </h2>
        <ul
          v-if="completedLists.length"
          class="divide-y divide-default rounded-lg border border-default"
        >
          <li
            v-for="list in completedLists"
            :key="list.id"
          >
            <NuxtLink
              :to="`/restock/${list.id}`"
              class="flex flex-col gap-1 p-3 transition-colors hover:bg-elevated/60 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p class="font-medium text-highlighted">
                  {{ list.title }}
                </p>
                <p class="text-sm text-muted">
                  {{ list.lines.length }} item{{ list.lines.length === 1 ? '' : 's' }}
                </p>
              </div>
              <div class="flex items-center gap-2 text-xs text-muted">
                {{ new Date(list.updated_at).toLocaleDateString() }}
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4"
                />
              </div>
            </NuxtLink>
          </li>
        </ul>
        <p
          v-else
          class="rounded-lg border border-dashed border-default px-4 py-6 text-center text-sm text-muted"
        >
          Finished shopping lists will appear here after their validated items are added to Inventory.
        </p>
      </section>

      <div
        v-if="!runs.length && !isHouseholdOwner"
        class="rounded-lg border border-dashed border-default px-6 py-12 text-center"
      >
        <UIcon
          name="i-lucide-shopping-cart"
          class="mx-auto mb-3 size-10 text-muted"
        />
        <p class="text-sm text-muted">
          No shopping lists yet. The plan owner will start one when it&rsquo;s time to shop.
        </p>
      </div>
    </template>
  </div>
</template>
