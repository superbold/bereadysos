<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const user = useSupabaseUser()
const { profile } = useProfile()
const {
  cards,
  ownedCard,
  helpingCards,
  pending,
  error,
  membershipCount,
  loadCards,
  openPlan
} = usePlanPicker()

const greetingName = computed(() =>
  profile.value?.first_name?.trim() || 'there'
)

onMounted(async () => {
  if (!user.value) {
    await navigateTo('/auth/login?redirect=/plan-picker')
    return
  }

  await loadCards()

  if (membershipCount.value === 0) {
    await navigateTo('/')
    return
  }

  if (membershipCount.value === 1 && cards.value[0]) {
    await openPlan(cards.value[0].householdId)
  }
})

async function onSelectPlan(householdId: string) {
  await openPlan(householdId)
}
</script>

<template>
  <div class="plan-picker-page mx-auto max-w-5xl">
    <div class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-highlighted">
        Hi {{ greetingName }} — which plan?
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-muted">
        Pick your household or a plan you help on. Colors and badges stay with you inside the plan
        so pages don&rsquo;t all look the same.
      </p>
    </div>

    <div
      v-if="pending"
      class="flex min-h-48 flex-col items-center justify-center gap-3"
      role="status"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-primary"
      />
      <p class="text-sm text-muted">
        Loading your plans&hellip;
      </p>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      icon="i-lucide-circle-alert"
      title="Could not load your plans"
      :description="error"
    />

    <template v-else>
      <section
        v-if="ownedCard"
        class="mb-8"
      >
        <h2 class="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">
          Your plan
        </h2>
        <div class="max-w-xl">
          <PlanPickerCard
            :plan="ownedCard"
            @select="onSelectPlan"
          />
        </div>
      </section>

      <section v-if="helpingCards.length">
        <h2 class="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">
          Helping on {{ helpingCards.length }} plan{{ helpingCards.length === 1 ? '' : 's' }}
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <PlanPickerCard
            v-for="plan in helpingCards"
            :key="plan.id"
            :plan="plan"
            @select="onSelectPlan"
          />
        </div>
      </section>
    </template>
  </div>
</template>
