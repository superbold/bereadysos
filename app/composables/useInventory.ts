import type { Category, Database, Item, TablesInsert, TablesUpdate } from '~/types/database.types'

export type ItemWithCategory = Item & {
  category: Category
}

type FetchResult<T> = { data: T | null, error: { message: string } | null }

let categoriesInFlight: Promise<FetchResult<Category[]>> | null = null
let itemsInFlight: Promise<FetchResult<ItemWithCategory[]>> | null = null
let itemsInFlightHouseholdId: string | null = null

export function useInventory() {
  const supabase = useSupabaseClient<Database>()
  const { household } = useHousehold()

  const categories = useState<Category[]>('inventory-categories', () => [])
  const items = useState<ItemWithCategory[]>('inventory-items', () => [])
  const pending = useState('inventory-pending', () => false)
  const error = useState<string | null>('inventory-error', () => null)
  const itemsHouseholdId = useState<string | null>('inventory-items-household-id', () => null)
  const categoriesLoaded = useState('inventory-categories-loaded', () => false)

  async function fetchCategories(options: { force?: boolean } = {}) {
    if (!options.force && categoriesLoaded.value && categories.value.length) {
      return { data: categories.value, error: null }
    }

    if (categoriesInFlight) {
      return categoriesInFlight
    }

    categoriesInFlight = (async (): Promise<FetchResult<Category[]>> => {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order')

      if (fetchError) {
        return { data: null, error: fetchError }
      }

      categories.value = data
      categoriesLoaded.value = true
      return { data, error: null }
    })()

    try {
      return await categoriesInFlight
    } finally {
      categoriesInFlight = null
    }
  }

  async function fetchItems(options: { force?: boolean } = {}) {
    const householdId = household.value?.id
    if (!householdId) {
      return { data: items.value, error: null }
    }

    if (
      !options.force
      && itemsHouseholdId.value === householdId
      && !itemsInFlight
    ) {
      return { data: items.value, error: null }
    }

    if (itemsInFlight && itemsInFlightHouseholdId === householdId) {
      return itemsInFlight
    }

    if (itemsInFlight) {
      await itemsInFlight
      if (!options.force && itemsHouseholdId.value === householdId) {
        return { data: items.value, error: null }
      }
    }

    itemsInFlightHouseholdId = householdId
    itemsInFlight = (async (): Promise<FetchResult<ItemWithCategory[]>> => {
      pending.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('items')
        .select('*, category:categories(*)')
        .eq('household_id', householdId)
        .order('name')

      pending.value = false

      if (fetchError) {
        error.value = fetchError.message
        return { data: null, error: fetchError }
      }

      items.value = data as ItemWithCategory[]
      itemsHouseholdId.value = householdId
      return { data: items.value, error: null }
    })()

    try {
      return await itemsInFlight
    } finally {
      itemsInFlight = null
      itemsInFlightHouseholdId = null
    }
  }

  function clearInventory() {
    categories.value = []
    items.value = []
    itemsHouseholdId.value = null
    categoriesLoaded.value = false
    pending.value = false
    error.value = null
    categoriesInFlight = null
    itemsInFlight = null
    itemsInFlightHouseholdId = null
  }

  async function createItem(payload: Omit<TablesInsert<'items'>, 'household_id'>) {
    const householdId = household.value?.id
    if (!householdId) {
      return { data: null, error: new Error('No household loaded') }
    }

    const { data, error: insertError } = await supabase
      .from('items')
      .insert({ ...payload, household_id: householdId })
      .select('*, category:categories(*)')
      .single()

    if (insertError) {
      return { data: null, error: insertError }
    }

    const row = data as ItemWithCategory
    items.value = [...items.value, row].sort((a, b) => a.name.localeCompare(b.name))
    itemsHouseholdId.value = householdId
    return { data: row, error: null }
  }

  async function updateItem(id: string, updates: TablesUpdate<'items'>) {
    const { data, error: updateError } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select('*, category:categories(*)')
      .single()

    if (updateError) {
      return { data: null, error: updateError }
    }

    const row = data as ItemWithCategory
    items.value = items.value
      .map(item => (item.id === id ? row : item))
      .sort((a, b) => a.name.localeCompare(b.name))
    return { data: row, error: null }
  }

  async function deleteItem(id: string) {
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return { error: deleteError }
    }

    items.value = items.value.filter(item => item.id !== id)
    return { error: null }
  }

  return {
    categories,
    items,
    pending,
    error,
    fetchCategories,
    fetchItems,
    clearInventory,
    createItem,
    updateItem,
    deleteItem
  }
}
