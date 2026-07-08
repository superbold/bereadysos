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
  updateLineIntake,
  submitIntake,
  shoppingCompleteRun,
  intakeRun,
  submittedIntakeRun,
  intakeReadyToSubmit
} = useShopRuns()

const completeNote = ref('')
const savingLineId = ref<string | null>(null)

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

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  shopping: 'Shopping in progress',
  shopping_complete: 'Awaiting intake',
  intake_pending: 'Intake in progress',
  closed: 'Closed'
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

async function onCreateFromGaps() {
  const { data: run, error: createError } = await createRun('Restock from plan gaps')
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
    title: 'Restock list created',
    description: `${openGaps.value.length} items from your plan gaps.`,
    color: 'success',
    icon: 'i-lucide-shopping-cart'
  })
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
    title: 'Shopping started',
    description: 'The list is ready for your shopper.',
    color: 'success',
    icon: 'i-lucide-play'
  })
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
    description: 'Log each item below — inventory is not updated until the owner reviews.',
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
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-highlighted">
        Restock
      </h1>
      <p class="mt-1 text-sm text-muted">
        Coordinate shopping and intake — plan owner, shopper, and inventory keeper working together.
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
        v-if="isHouseholdOwner"
        class="mb-6 space-y-4 rounded-lg border border-default p-4"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            Start a run
          </h2>
          <p class="mt-1 text-sm text-muted">
            Build a shopping list from plan gaps, then hand off to your shopper.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            label="Restock from plan gaps"
            icon="i-lucide-list-plus"
            :disabled="!openGaps.length || hasActiveCoordinationRun"
            :loading="working"
            @click="onCreateFromGaps"
          />
          <UButton
            label="Empty restock run"
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            :disabled="hasActiveCoordinationRun"
            :loading="working"
            @click="createRun()"
          />
        </div>

        <p
          v-if="!openGaps.length"
          class="text-sm text-muted"
        >
          No open plan gaps — your inventory meets your target, or add items on the Plan page.
        </p>
        <p
          v-else-if="hasActiveCoordinationRun"
          class="text-sm text-muted"
        >
          Finish the current run before starting another.
        </p>
      </section>

      <section
        v-if="draftRun"
        class="mb-6 space-y-4 rounded-lg border border-default p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-highlighted">
              {{ draftRun.title }}
            </h2>
            <p class="mt-1 text-sm text-muted">
              {{ statusLabels[draftRun.status] }} &middot; {{ draftRun.lines.length }} items
            </p>
          </div>
          <UButton
            v-if="isHouseholdOwner && draftRun.lines.length"
            label="Send to shopper"
            icon="i-lucide-send"
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
          Add items from plan gaps or assign lines manually in a future update.
        </p>
      </section>

      <section
        v-if="shoppingRun"
        class="mb-6 space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            {{ shoppingRun.title }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            {{ statusLabels[shoppingRun.status] }}
          </p>
        </div>

        <ul class="divide-y divide-default rounded-lg border border-default bg-default">
          <li
            v-for="line in shoppingRun.lines"
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

        <div
          v-if="isHouseholdOwner || isShopper"
          class="space-y-3"
        >
          <UTextarea
            v-model="completeNote"
            placeholder="Optional note for the inventory keeper (substitutions, out of stock…)"
            :rows="2"
            autoresize
          />
          <UButton
            label="Mark shopping complete"
            icon="i-lucide-check-circle"
            :loading="working"
            @click="onCompleteShopping(shoppingRun.id)"
          />
        </div>
      </section>

      <section
        v-if="shoppingCompleteRun"
        class="mb-6 space-y-4 rounded-lg border border-warning/40 bg-warning/5 p-4"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            Shopping complete — ready for intake
          </h2>
          <p class="mt-1 text-sm text-muted">
            <template v-if="canEditInventory">
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
          label="Start intake"
          icon="i-lucide-package-open"
          :loading="working"
          @click="onStartIntake(shoppingCompleteRun.id)"
        />
      </section>

      <section
        v-if="intakeRun"
        class="mb-6 space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            Log intake
          </h2>
          <p class="mt-1 text-sm text-muted">
            <template v-if="canEditInventory">
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
          Shopper note: {{ intakeRun.shopping_note }}
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
          v-if="canEditInventory"
          label="Submit for owner review"
          icon="i-lucide-send"
          :disabled="!intakeReadyToSubmit"
          :loading="working"
          @click="onSubmitIntake(intakeRun.id)"
        />
      </section>

      <section
        v-if="submittedIntakeRun"
        class="mb-6 space-y-4 rounded-lg border border-default p-4"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            Intake submitted
          </h2>
          <p class="mt-1 text-sm text-muted">
            <template v-if="isHouseholdOwner">
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
      </section>

      <section v-if="runs.length">
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
                <template v-if="run.intake_submitted_at">
                  Awaiting owner review
                </template>
                <template v-else>
                  {{ statusLabels[run.status] }}
                </template>
                &middot; {{ run.lines.length }} items
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
