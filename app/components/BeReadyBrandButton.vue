<script setup lang="ts">
const aboutOpen = ref(false)
</script>

<template>
  <div>
    <button
      type="button"
      class="flex items-center gap-2 rounded-lg px-2 py-1.5 font-semibold text-highlighted transition-colors hover:bg-elevated/60"
      aria-label="About BeReady SOS"
      @click="aboutOpen = true"
    >
      <UIcon
        name="i-lucide-shield-check"
        class="size-5 text-primary"
      />
      <span>BeReady SOS</span>
    </button>

    <UModal
      v-model:open="aboutOpen"
      title="BeReady SOS"
      description="Household disaster preparedness — calm, clear, and actionable."
    >
      <template #body>
        <div class="space-y-4 text-sm leading-relaxed text-muted">
          <p>
            <strong class="font-semibold text-highlighted">BeReady SOS</strong> helps your household
            see what emergency supplies you have, what is expiring, and where you still fall short of
            the plan you chose — before you need them.
          </p>
          <p>
            Set a preparedness target (3, 7, 14, 30, or 90 days), log water, food, medical kits, and
            other essentials, and the app calculates coverage and <strong class="font-semibold text-highlighted">plan gap shortfalls</strong>
            — like needing another 12 gallons of water for a 7-day goal.
          </p>
          <ul class="list-disc space-y-2 pl-5">
            <li><strong class="font-medium text-highlighted">Inventory</strong> — track quantities, locations, and expiration dates</li>
            <li><strong class="font-medium text-highlighted">Expiring</strong> — spot what needs rotation soon</li>
            <li><strong class="font-medium text-highlighted">Plan</strong> — see shortfalls against your target days</li>
            <li><strong class="font-medium text-highlighted">Dashboard</strong> — household summary and category coverage at a glance</li>
          </ul>
          <p>
            One shared plan per household. Sign in to start building yours at
            <span class="font-medium text-highlighted">bereadysos.com</span>.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end">
          <UButton
            label="Got it"
            color="primary"
            @click="aboutOpen = false"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
