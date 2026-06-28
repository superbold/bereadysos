<script setup lang="ts">
import type { AlertSeverity } from '#shared/alerts'

const open = ref(false)
const { groupedAlerts, alertCount, hasAlerts, loadAlerts } = useAlerts()

onMounted(() => {
  loadAlerts()
})

function severityIconClass(severity: AlertSeverity) {
  return severity === 'error'
    ? 'alerts-panel__icon alerts-panel__icon--error'
    : 'alerts-panel__icon alerts-panel__icon--warning'
}

function onAlertClick() {
  open.value = false
}
</script>

<template>
  <div>
    <UTooltip text="Needs attention">
      <div class="relative">
        <UButton
          icon="i-lucide-bell"
          color="neutral"
          variant="ghost"
          aria-label="Needs attention"
          :aria-expanded="open"
          @click="open = true"
        />
        <UBadge
          v-if="hasAlerts"
          :label="String(alertCount)"
          :color="groupedAlerts.some(group => group.alerts.some(alert => alert.severity === 'error')) ? 'error' : 'warning'"
          size="sm"
          class="alerts-bell__badge"
        />
      </div>
    </UTooltip>

    <USlideover
      v-model:open="open"
      title="Needs attention"
      description="Review expiration dates, plan gaps, and coverage — then jump to the right page."
    >
      <template #body>
        <div
          v-if="!hasAlerts"
          class="flex flex-col items-center px-4 py-12 text-center"
        >
          <UIcon
            name="i-lucide-circle-check"
            class="mb-4 size-12 text-success"
          />
          <p class="font-medium text-highlighted">
            You&rsquo;re on target
          </p>
          <p class="mt-2 max-w-xs text-sm text-muted">
            Nothing needs attention right now.
          </p>
        </div>

        <div
          v-else
          class="space-y-6"
        >
          <section
            v-for="group in groupedAlerts"
            :key="group.kind"
          >
            <h2 class="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
              {{ group.label }}
            </h2>
            <ul class="divide-y divide-default rounded-lg border border-default">
              <li
                v-for="alert in group.alerts"
                :key="alert.id"
              >
                <NuxtLink
                  :to="alert.href"
                  class="flex items-start gap-3 p-3 transition-colors hover:bg-elevated/60"
                  @click="onAlertClick"
                >
                  <span
                    class="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    :class="severityIconClass(alert.severity)"
                  >
                    <UIcon
                      :name="alert.icon"
                      class="size-4"
                    />
                  </span>
                  <span class="min-w-0 text-left">
                    <span class="block font-medium text-highlighted">
                      {{ alert.title }}
                    </span>
                    <span class="mt-0.5 block text-sm text-muted">
                      {{ alert.detail }}
                    </span>
                  </span>
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="mt-1 size-4 shrink-0 text-muted"
                  />
                </NuxtLink>
              </li>
            </ul>
          </section>
        </div>
      </template>
    </USlideover>
  </div>
</template>
