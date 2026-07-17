<script setup lang="ts">
import * as z from 'zod'
import type { FormErrorEvent, FormSubmitEvent } from '@nuxt/ui'
import type { Category, Item } from '~/types/database.types'
import {
  formatGallons,
  gallonsFromBottles,
  gallonsPerBottleFromOunces,
  inferWaterEntryMode,
  ouncesFromGallonsPerBottle,
  WATER_BOTTLE_OZ_PRESETS,
  type WaterEntryMode
} from '#shared/water-volume'

const props = defineProps<{
  categories: Category[]
  item?: Item | null
  saving?: boolean
  /** FEMA-style target gallons for the household plan (headcount × days × 1). */
  waterTargetGallons?: number | null
}>()

const emit = defineEmits<{
  submit: [payload: {
    name: string
    category_id: string
    quantity: number
    unit: string | null
    volume_per_unit: number | null
    servings_per_unit: number | null
    expiration_date: string | null
    location: string | null
    notes: string | null
  }]
  cancel: []
}>()

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  category_id: z.string().uuid('Select a category'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative'),
  unit: z.string().trim().max(32).optional(),
  ounces_per_bottle: z.coerce.number().positive('Ounces must be greater than 0').optional(),
  expiration_date: z.string().optional(),
  location: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  name: '',
  category_id: '',
  quantity: 1,
  unit: '',
  ounces_per_bottle: 16.9,
  expiration_date: '',
  location: '',
  notes: ''
})

const waterEntryMode = ref<WaterEntryMode>('bottles')
const submitHadErrors = ref(false)

const submitLabel = computed(() => {
  if (submitHadErrors.value) {
    return 'Fix required fields'
  }
  return props.item ? 'Save changes' : 'Add item'
})

const submitColor = computed(() => (submitHadErrors.value ? 'error' : 'primary'))
const submitIcon = computed(() =>
  submitHadErrors.value ? 'i-lucide-circle-x' : 'i-lucide-check'
)

const categoryOptions = computed(() =>
  props.categories.map(category => ({
    label: category.name,
    value: category.id,
    icon: category.icon ?? undefined
  }))
)

const selectedCategory = computed(() =>
  props.categories.find(category => category.id === state.category_id) ?? null
)

const isWaterCategory = computed(() => selectedCategory.value?.slug === 'water')

const bottleOzPresets = WATER_BOTTLE_OZ_PRESETS.map(oz => ({
  label: `${oz} oz`,
  value: oz
}))

const computedWaterGallons = computed(() => {
  if (!isWaterCategory.value) {
    return null
  }
  if (waterEntryMode.value === 'gallons') {
    return state.quantity
  }
  return gallonsFromBottles(state.quantity, state.ounces_per_bottle ?? 0)
})

const waterSummary = computed(() => {
  if (!isWaterCategory.value || computedWaterGallons.value == null) {
    return null
  }
  const gallonsLabel = formatGallons(computedWaterGallons.value)
  const target = props.waterTargetGallons
  if (target != null && target > 0) {
    const pct = Math.round((computedWaterGallons.value / target) * 100)
    return `≈ ${gallonsLabel} gallons · ${pct}% of your ${formatGallons(target)} gal FEMA-style plan target`
  }
  return `≈ ${gallonsLabel} gallons (FEMA guidance is about 1 gallon per person per day)`
})

function resetForNewItem() {
  submitHadErrors.value = false
  state.name = ''
  state.category_id = props.categories[0]?.id ?? ''
  state.quantity = 1
  state.unit = props.categories[0]?.default_unit ?? ''
  state.ounces_per_bottle = 16.9
  state.expiration_date = ''
  state.location = ''
  state.notes = ''
  waterEntryMode.value = props.categories[0]?.slug === 'water' ? 'bottles' : 'gallons'
}

function loadItem(value: Item) {
  submitHadErrors.value = false
  state.name = value.name
  state.category_id = value.category_id
  state.quantity = value.quantity
  state.unit = value.unit ?? ''
  state.expiration_date = value.expiration_date ?? ''
  state.location = value.location ?? ''
  state.notes = value.notes ?? ''

  const category = props.categories.find(c => c.id === value.category_id)
  if (category?.slug === 'water') {
    const mode = inferWaterEntryMode(value)
    waterEntryMode.value = mode
    if (mode === 'bottles') {
      const oz = value.volume_per_unit != null
        ? ouncesFromGallonsPerBottle(value.volume_per_unit)
        : 16.9
      state.ounces_per_bottle = oz != null ? Math.round(oz * 10) / 10 : 16.9
      state.unit = 'bottles'
    } else {
      state.ounces_per_bottle = 16.9
      if (!state.unit) {
        state.unit = 'gallons'
      }
    }
  } else {
    waterEntryMode.value = 'gallons'
    state.ounces_per_bottle = 16.9
  }
}

watch(
  () => props.item,
  (value) => {
    if (value) {
      loadItem(value)
    } else {
      resetForNewItem()
    }
  },
  { immediate: true }
)

watch(
  () => state.category_id,
  (categoryId) => {
    if (props.item) {
      return
    }
    const category = props.categories.find(c => c.id === categoryId)
    if (category?.slug === 'water') {
      waterEntryMode.value = 'bottles'
      state.unit = 'bottles'
      if (!state.ounces_per_bottle) {
        state.ounces_per_bottle = 16.9
      }
      return
    }
    if (category?.default_unit) {
      state.unit = category.default_unit
    }
  }
)

watch(waterEntryMode, (mode) => {
  if (!isWaterCategory.value) {
    return
  }
  if (mode === 'bottles') {
    state.unit = 'bottles'
  } else if (!state.unit || state.unit === 'bottles' || state.unit === 'bottle') {
    state.unit = 'gallons'
  }
})

async function onFormError(event: FormErrorEvent) {
  submitHadErrors.value = true
  await nextTick()
  const firstErrorId = event.errors?.[0]?.id
  if (!firstErrorId) {
    return
  }
  const element = document.getElementById(firstErrorId)
  element?.focus()
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function onSubmit(event: FormSubmitEvent<Schema>) {
  submitHadErrors.value = false
  const category = props.categories.find(c => c.id === event.data.category_id)
  let quantity = event.data.quantity
  let unit = event.data.unit?.trim() || null
  let volumePerUnit: number | null = props.item?.volume_per_unit ?? null
  let servingsPerUnit: number | null = props.item?.servings_per_unit ?? null

  if (category?.slug === 'water') {
    servingsPerUnit = null
    if (waterEntryMode.value === 'bottles') {
      const oz = event.data.ounces_per_bottle ?? 16.9
      quantity = event.data.quantity
      unit = 'bottles'
      volumePerUnit = gallonsPerBottleFromOunces(oz)
    } else {
      quantity = event.data.quantity
      unit = unit || 'gallons'
      volumePerUnit = 1
    }
  } else if (category?.slug !== 'food') {
    volumePerUnit = null
  }

  emit('submit', {
    name: event.data.name,
    category_id: event.data.category_id,
    quantity,
    unit,
    volume_per_unit: volumePerUnit,
    servings_per_unit: servingsPerUnit,
    expiration_date: event.data.expiration_date?.trim() || null,
    location: event.data.location?.trim() || null,
    notes: event.data.notes?.trim() || null
  })
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-5"
    @submit="onSubmit"
    @error="onFormError"
  >
    <UFormField
      label="Item name"
      name="name"
      required
    >
      <UInput
        v-model="state.name"
        placeholder="e.g. Bottled water, first aid kit"
        autocomplete="off"
      />
    </UFormField>

    <UFormField
      label="Category"
      name="category_id"
      required
    >
      <USelect
        v-model="state.category_id"
        :items="categoryOptions"
        placeholder="Select category"
        class="w-full"
      />
    </UFormField>

    <template v-if="isWaterCategory">
      <UFormField
        label="How are you counting water?"
        description="Bottles convert to gallons for FEMA-style planning (about 1 gallon per person per day)."
      >
        <div class="flex flex-wrap gap-2">
          <UButton
            type="button"
            label="Bottles"
            size="sm"
            :color="waterEntryMode === 'bottles' ? 'primary' : 'neutral'"
            :variant="waterEntryMode === 'bottles' ? 'soft' : 'outline'"
            @click="waterEntryMode = 'bottles'"
          />
          <UButton
            type="button"
            label="Gallons"
            size="sm"
            :color="waterEntryMode === 'gallons' ? 'primary' : 'neutral'"
            :variant="waterEntryMode === 'gallons' ? 'soft' : 'outline'"
            @click="waterEntryMode = 'gallons'"
          />
        </div>
      </UFormField>

      <div
        v-if="waterEntryMode === 'bottles'"
        class="grid grid-cols-2 gap-4"
      >
        <UFormField
          label="Number of bottles"
          name="quantity"
          required
        >
          <UInput
            v-model.number="state.quantity"
            type="number"
            min="0"
            step="1"
          />
        </UFormField>

        <UFormField
          label="Ounces per bottle"
          name="ounces_per_bottle"
          required
          description="Common sizes: 12, 16.9, 20 fl oz"
        >
          <UInput
            v-model.number="state.ounces_per_bottle"
            type="number"
            min="0.1"
            step="0.1"
          />
        </UFormField>
      </div>

      <div
        v-if="waterEntryMode === 'bottles'"
        class="flex flex-wrap gap-2"
      >
        <UButton
          v-for="preset in bottleOzPresets"
          :key="preset.value"
          type="button"
          :label="preset.label"
          size="xs"
          color="neutral"
          :variant="state.ounces_per_bottle === preset.value ? 'soft' : 'outline'"
          @click="state.ounces_per_bottle = preset.value"
        />
      </div>

      <UFormField
        v-if="waterEntryMode === 'gallons'"
        label="Gallons"
        name="quantity"
        required
        description="Jugs, barrels, or water already counted in gallons"
      >
        <UInput
          v-model.number="state.quantity"
          type="number"
          min="0"
          step="any"
        />
      </UFormField>

      <p
        v-if="waterSummary"
        class="rounded-lg border border-default bg-elevated/50 px-3 py-2 text-sm text-muted"
      >
        {{ waterSummary }}
      </p>
    </template>

    <div
      v-else
      class="grid grid-cols-2 gap-4"
    >
      <UFormField
        label="Quantity"
        name="quantity"
        required
      >
        <UInput
          v-model.number="state.quantity"
          type="number"
          min="0"
          step="any"
        />
      </UFormField>

      <UFormField
        label="Unit"
        name="unit"
        description="e.g. cans, each"
      >
        <UInput
          v-model="state.unit"
          placeholder="each"
        />
      </UFormField>
    </div>

    <UFormField
      label="Expiration date"
      name="expiration_date"
      description="Optional — for food, meds, batteries"
    >
      <UInput
        v-model="state.expiration_date"
        type="date"
      />
    </UFormField>

    <UFormField
      label="Location"
      name="location"
      description="Where you keep it — pantry, garage, go-bag"
    >
      <UInput
        v-model="state.location"
        placeholder="e.g. Kitchen pantry"
      />
    </UFormField>

    <UFormField
      label="Notes"
      name="notes"
    >
      <UTextarea
        v-model="state.notes"
        placeholder="Brand, size, rotation reminder…"
        :rows="3"
        autoresize
      />
    </UFormField>

    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <UButton
        type="button"
        label="Cancel"
        color="neutral"
        variant="ghost"
        block
        class="sm:w-auto"
        @click="emit('cancel')"
      />
      <UButton
        type="submit"
        :label="submitLabel"
        :color="submitColor"
        :loading="saving"
        block
        class="sm:w-auto"
        :trailing-icon="submitIcon"
      />
    </div>
  </UForm>
</template>
