<script setup lang="ts">
import { getPlanPickerMock } from '#shared/plan-picker-fixture'

definePageMeta({
  layout: 'default'
})

const toast = useToast()
const fixture = getPlanPickerMock()

const ownedPlan = computed(() => fixture.plans.find(plan => plan.isOwned))
const helpingPlans = computed(() => fixture.plans.filter(plan => !plan.isOwned))

function onSelectPlan(planId: string) {
  const plan = fixture.plans.find(entry => entry.id === planId)
  toast.add({
    title: 'Prototype only',
    description: plan
      ? `Would open ${plan.displayName} (${plan.roleLabel}). Wire to real households later.`
      : 'Unknown plan',
    color: 'primary',
    icon: 'i-lucide-layout-grid'
  })
}
</script>

<template>
  <div class="plan-picker-page mx-auto max-w-5xl">
    <div class="mb-8">
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
        class="mb-3"
      >
        UI prototype · mock JSON
      </UBadge>
      <h1 class="text-2xl font-bold tracking-tight text-highlighted">
        Hi {{ fixture.meta.viewerFirstName }} — which plan?
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-muted">
        Pick your household or a plan you help on. Colors and badges stay with you inside the plan
        so pages don&rsquo;t all look the same.
      </p>
    </div>

    <section
      v-if="ownedPlan"
      class="mb-8"
    >
      <h2 class="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">
        Your plan
      </h2>
      <div class="max-w-xl">
        <PlanPickerCard
          :plan="ownedPlan"
          @select="onSelectPlan"
        />
      </div>
    </section>

    <section v-if="helpingPlans.length">
      <h2 class="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">
        Helping on {{ helpingPlans.length }} plan{{ helpingPlans.length === 1 ? '' : 's' }}
      </h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <PlanPickerCard
          v-for="plan in helpingPlans"
          :key="plan.id"
          :plan="plan"
          @select="onSelectPlan"
        />
      </div>
    </section>

    <p class="mt-8 text-center text-xs text-muted">
      Data from
      <code class="rounded bg-elevated px-1.5 py-0.5">shared/fixtures/plan-picker.mock.json</code>
      — edit the file and refresh to try different layouts.
    </p>
  </div>
</template>
