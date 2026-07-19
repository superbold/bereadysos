<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Category } from '~/types/database.types'

const props = defineProps<{
  categories: Category[]
  saving?: boolean
  resetKey?: number
}>()

const emit = defineEmits<{
  submit: [payload: {
    name: string
    category_id: string
    quantity: number
    unit: string | null
    note: string | null
  }]
}>()

const schema = z.object({
  name: z.string().trim().min(1, 'Item name is required').max(120),
  category_id: z.string().uuid('Select a category'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit: z.string().trim().max(32).optional(),
  note: z.string().trim().max(500).optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  name: '',
  category_id: '',
  quantity: 1,
  unit: '',
  note: ''
})

const categoryOptions = computed(() =>
  props.categories.map(category => ({
    label: category.name,
    value: category.id,
    icon: category.icon ?? undefined
  }))
)

function reset() {
  state.name = ''
  state.category_id = props.categories[0]?.id ?? ''
  state.quantity = 1
  state.unit = ''
  state.note = ''
}

watch(
  () => props.categories,
  () => {
    if (!state.category_id) {
      state.category_id = props.categories[0]?.id ?? ''
    }
  },
  { immediate: true }
)

watch(() => props.resetKey, reset)

function onSubmit(event: FormSubmitEvent<Schema>) {
  emit('submit', {
    name: event.data.name.trim(),
    category_id: event.data.category_id,
    quantity: event.data.quantity,
    unit: event.data.unit?.trim() || null,
    note: event.data.note?.trim() || null
  })
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4 rounded-lg border border-dashed border-default bg-elevated/30 p-4"
    @submit="onSubmit"
  >
    <div>
      <h3 class="font-semibold text-highlighted">
        Add an item
      </h3>
      <p class="mt-1 text-sm text-muted">
        Add one-off supplies, extras, or anything your Plan does not currently track as a gap.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)]">
      <UFormField
        label="Item name"
        name="name"
        required
      >
        <UInput
          v-model="state.name"
          placeholder="e.g. Camp stove fuel"
          autocomplete="off"
          class="w-full"
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
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField
        label="Quantity"
        name="quantity"
        required
      >
        <UInput
          v-model.number="state.quantity"
          type="number"
          min="0.01"
          step="any"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Unit"
        name="unit"
      >
        <UInput
          v-model="state.unit"
          placeholder="each, cans, packs"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField
      label="Notes"
      name="note"
      description="Optional — link, brand, size, or shopping reminder"
    >
      <UTextarea
        v-model="state.note"
        placeholder="https://… or any useful details"
        :rows="2"
        autoresize
        class="w-full"
      />
    </UFormField>

    <UButton
      type="submit"
      label="Add to shopping list"
      icon="i-lucide-plus"
      :loading="saving"
    />
  </UForm>
</template>
