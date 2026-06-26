<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Category, Item } from '~/types/database.types'

const props = defineProps<{
  categories: Category[]
  item?: Item | null
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: {
    name: string
    category_id: string
    quantity: number
    unit: string | null
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
  expiration_date: '',
  location: '',
  notes: ''
})

const categoryOptions = computed(() =>
  props.categories.map(category => ({
    label: category.name,
    value: category.id,
    icon: category.icon ?? undefined
  }))
)

watch(
  () => props.item,
  (value) => {
    if (value) {
      state.name = value.name
      state.category_id = value.category_id
      state.quantity = value.quantity
      state.unit = value.unit ?? ''
      state.expiration_date = value.expiration_date ?? ''
      state.location = value.location ?? ''
      state.notes = value.notes ?? ''
    } else {
      state.name = ''
      state.category_id = props.categories[0]?.id ?? ''
      state.quantity = 1
      state.unit = props.categories[0]?.default_unit ?? ''
      state.expiration_date = ''
      state.location = ''
      state.notes = ''
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
    if (category?.default_unit && !state.unit) {
      state.unit = category.default_unit
    }
  }
)

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit('submit', {
    name: event.data.name,
    category_id: event.data.category_id,
    quantity: event.data.quantity,
    unit: event.data.unit?.trim() || null,
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

    <div class="grid grid-cols-2 gap-4">
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
        description="e.g. gallons, cans, each"
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
        :label="item ? 'Save changes' : 'Add item'"
        :loading="saving"
        block
        class="sm:w-auto"
        trailing-icon="i-lucide-check"
      />
    </div>
  </UForm>
</template>
