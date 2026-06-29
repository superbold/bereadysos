<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { roleLabel } from '#shared/household-roles'

const { household, pending, error: householdError, ensureHousehold, updateHousehold, isHouseholdOwner, isHouseholdGuest, membershipRole, canManageSettings } = useHousehold()
const { profile, fetchProfile, updateProfile } = useProfile()
const toast = useToast()
const saving = ref(false)

const targetPresets = [3, 7, 14, 30, 90]

const schema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(40),
  name: z.string().trim().min(1, 'Name is required').max(80),
  headcount: z.coerce.number().int().min(1, 'At least 1 person').max(50),
  target_days: z.coerce.number().int().min(1).max(365)
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  first_name: '',
  name: 'My Household',
  headcount: 1,
  target_days: 7
})

watch(household, (value) => {
  if (value) {
    state.name = value.name
    state.headcount = value.headcount
    state.target_days = value.target_days
  }
}, { immediate: true })

watch(profile, (value) => {
  if (value) {
    state.first_name = value.first_name
  }
}, { immediate: true })

onMounted(async () => {
  if (!household.value) {
    await ensureHousehold()
  }
  if (!profile.value) {
    await fetchProfile()
  }
})

function applyTargetDays(days: number) {
  state.target_days = days
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true

  const { error: profileError } = await updateProfile({
    first_name: event.data.first_name
  })

  if (profileError) {
    saving.value = false
    toast.add({
      title: 'Could not save profile',
      description: profileError.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  if (isHouseholdGuest.value) {
    saving.value = false
    toast.add({
      title: 'Profile saved',
      description: 'Your first name has been updated.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    return
  }

  const { error } = await updateHousehold({
    name: event.data.name,
    headcount: event.data.headcount,
    target_days: event.data.target_days
  })

  saving.value = false

  if (error) {
    toast.add({
      title: 'Could not save settings',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Settings saved',
    description: 'Your household plan has been updated.',
    color: 'success',
    icon: 'i-lucide-check-circle'
  })
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <div class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-highlighted">
        Household settings
      </h1>
      <p class="mt-1 text-sm text-muted">
        These values drive your preparedness targets and days-of-supply calculations.
      </p>
    </div>

    <div
      v-if="pending && !household"
      class="flex min-h-48 flex-col items-center justify-center gap-3"
      role="status"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-primary"
      />
      <p class="text-sm text-muted">
        Loading household&hellip;
      </p>
    </div>

    <UAlert
      v-else-if="householdError"
      color="error"
      icon="i-lucide-circle-alert"
      title="Could not load household"
      :description="householdError"
      class="mb-6"
    />

    <UForm
      v-else-if="household"
      :schema="schema"
      :state="state"
      class="space-y-6"
      @submit="onSubmit"
    >
      <UAlert
        v-if="isHouseholdGuest"
        color="primary"
        icon="i-lucide-users"
        :title="`You are the ${roleLabel(membershipRole).toLowerCase()} on this plan`"
        :description="canManageSettings
          ? ''
          : membershipRole === 'shopper' || membershipRole === 'watcher'
            ? 'You can view the plan and inventory. Use Restock when it is time to shop.'
            : 'You can update inventory and your first name. Only the plan owner changes targets and sharing.'"
        variant="subtle"
      />

      <UFormField
        label="Your first name"
        name="first_name"
        description="Shown at the top of the app, e.g. “Alex's plan”."
      >
        <UInput
          v-model="state.first_name"
          placeholder="Alex"
          autocomplete="given-name"
        />
      </UFormField>

      <UFormField
        label="Household name"
        name="name"
        description="e.g. Smith family, Apartment 4B"
      >
        <UInput
          v-model="state.name"
          placeholder="My Household"
          autocomplete="organization"
          :disabled="!canManageSettings"
        />
      </UFormField>

      <UFormField
        label="People in household"
        name="headcount"
        description="Used for water and food planning per person."
      >
        <UInput
          v-model.number="state.headcount"
          type="number"
          min="1"
          max="50"
          :disabled="!canManageSettings"
        />
      </UFormField>

      <UFormField
        label="Preparedness target (days)"
        name="target_days"
        description="How many days you want to be ready for."
      >
        <UInput
          v-model.number="state.target_days"
          type="number"
          min="1"
          max="365"
          class="mb-3"
          :disabled="!canManageSettings"
        />
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="days in targetPresets"
            :key="days"
            :label="`${days} days`"
            size="xs"
            :color="state.target_days === days ? 'primary' : 'neutral'"
            :variant="state.target_days === days ? 'soft' : 'outline'"
            type="button"
            :disabled="!canManageSettings"
            @click="applyTargetDays(days)"
          />
        </div>
      </UFormField>

      <UButton
        type="submit"
        :label="canManageSettings ? 'Save settings' : 'Save profile'"
        block
        :loading="saving"
        trailing-icon="i-lucide-check"
      />
    </UForm>

    <HouseholdSharingSection
      v-if="household && isHouseholdOwner"
      class="mt-8"
    />
  </div>
</template>
