<script setup lang="ts">
import { computeAllCategoryGaps } from '#shared/coverage'
import { formatReportedQuantity, INTAKE_LINE_STATUS_LABELS } from '#shared/shop-run-intake'
import type { ShopRunLine } from '~/types/database.types'

const toast = useToast()
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
  createRun,
  addLine,
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
  intakeReadyToSubmit
} = useShopRuns()

const completeNote = ref('')
const savingLineId = ref<string | null>(null)
const noGapsGuidanceOpen = ref(false)
const activeRunEl = ref<HTMLElement | null>(null)
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

const activeRun = computed(() =>
  shoppingRun.value
  ?? draftRun.value
  ?? shoppingCompleteRun.value
  ?? intakeRun.value
  ?? submittedIntakeRun.value
  ?? null
)

const continueActiveRunLabel = computed(() => {
  const title = activeRun.value?.title ?? ''
  if (title === 'Supplementary Shopping' || title === 'Restock run') {
    return 'Go to Supplementary Shopping'
  }
  return 'Go to Plan Gap'
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

async function loadData() {
  await fetchCategories()
  await fetchItems()
}

onMounted(async () => {
  if (!household.value) {
    await ensureHousehold()
  }
  await loadData()
})

watch(household, async (value) => {
  if (value) {
    await loadData()
  }
})

function onRestockFromGapsClick() {
  if (hasActiveCoordinationRun.value) {
    noGapsGuidanceOpen.value = false
    toast.add({
      title: 'Finish your current restock first',
      description: 'You already have a run in progress. Complete or close it before starting another.',
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
  void onCreateFromGaps()
}

async function onCreateFromGaps() {
  const { data: run, error: createError } = await createRun('Plan Gap')
  if (createError || !run) {
    toast.add({
      title: 'Could not start restock run',
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
    title: 'Plan Gap list created',
    description: `${openGaps.value.length} items from your plan gaps.`,
    color: 'success',
    icon: 'i-lucide-shopping-cart'
  })
}

async function onStartEmptyFromGuidance() {
  noGapsGuidanceOpen.value = false
  const { error } = await createRun('Supplementary Shopping')
  if (error) {
    toast.add({
      title: 'Could not start restock run',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

async function onStartSupplementaryShopping() {
  const { error } = await createRun('Supplementary Shopping')
  if (error) {
    toast.add({
      title: 'Could not start Supplementary Shopping',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
}

async function scrollToActiveRun() {
  await nextTick()
  activeRunEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
        ? 'You can view the shopping list and mark the run complete when done.'
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
        v-if="isHouseholdOwner && !shoppingRun"
        class="panel"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            Choose a list type
          </h2>
          <p class="mt-1 text-sm text-muted">
            <template v-if="soloOwnerMode">
              Both paths end the same way: shop the list, log what came home, then update inventory.
            </template>
            <template v-else>
              Build a shopping list from plan gaps or start Supplementary Shopping, then hand off to your shopper.
            </template>
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
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
        </div>

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

        <div
          v-else-if="hasActiveCoordinationRun"
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-muted">
            Please finish the active list first before starting another —
          </p>
          <UButton
            :label="continueActiveRunLabel"
            icon="i-lucide-arrow-down"
            size="sm"
            color="primary"
            variant="solid"
            class="shrink-0"
            @click="scrollToActiveRun"
          />
        </div>
      </section>

      <section
        v-if="draftRun"
        ref="activeRunEl"
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
          <UButton
            v-if="isHouseholdOwner && draftRun.lines.length"
            :label="soloOwnerMode ? 'Start shopping' : 'Send to shopper'"
            :icon="soloOwnerMode ? 'i-lucide-shopping-cart' : 'i-lucide-send'"
            size="sm"
            :loading="working"
            @click="onStartShopping(draftRun.id)"
          />
        </div>

        <ul
          v-if="draftRun.lines.length"
          class="divide-y divide-default rounded-lg border border-default"
        >
          <li
            v-for="line in draftRun.lines"
            :key="line.id"
            class="flex items-center justify-between gap-3 p-3 text-sm"
          >
            <span class="font-medium text-highlighted">{{ line.name }}</span>
            <span class="text-muted">
              <template v-if="line.quantity_planned != null">
                {{ line.quantity_planned }}{{ line.unit ? ` ${line.unit}` : '' }}
              </template>
              <template v-else>
                As needed
              </template>
            </span>
          </li>
        </ul>
        <p
          v-else
          class="text-sm text-muted"
        >
          Add items for Supplementary Shopping, or restock from plan gaps in a future update.
        </p>
      </section>

      <section
        v-if="shoppingRun"
        ref="activeRunEl"
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
        ref="activeRunEl"
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
        ref="activeRunEl"
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
        ref="activeRunEl"
        class="panel"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            {{ soloOwnerMode ? 'Ready to update inventory' : 'Intake submitted' }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            <template v-if="soloOwnerMode">
              Your restock log is complete. Apply it to inventory to close this run.
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

      <section v-if="runs.length && !shoppingRun">
        <h2 class="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
          All runs
        </h2>
        <ul class="divide-y divide-default rounded-lg border border-default">
          <li
            v-for="run in runs"
            :key="run.id"
            class="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="font-medium text-highlighted">
                {{ run.title }}
              </p>
              <p class="text-sm text-muted">
                {{ runStatusLabel(run) }} &middot; {{ run.lines.length }} items
              </p>
            </div>
            <p class="text-xs text-muted">
              {{ new Date(run.created_at).toLocaleDateString() }}
            </p>
          </li>
        </ul>
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
          No restock runs yet. The plan owner will start one when it&rsquo;s time to shop.
        </p>
      </div>
    </template>
  </div>
</template>
