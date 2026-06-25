import type { Database, Household, TablesUpdate } from '~/types/database.types'

type HouseholdRow = Household

export function useHousehold() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  const household = useState<HouseholdRow | null>('household', () => null)
  const pending = useState('household-pending', () => false)
  const error = useState<string | null>('household-error', () => null)

  function clearHousehold() {
    household.value = null
    error.value = null
  }

  async function fetchHousehold() {
    const userId = user.value?.sub
    if (!userId) {
      clearHousehold()
      return null
    }

    pending.value = true
    error.value = null

    const { data, error: fetchError } = await supabase
      .from('household_members')
      .select('households(*)')
      .eq('user_id', userId)
      .maybeSingle()

    pending.value = false

    if (fetchError) {
      error.value = fetchError.message
      return null
    }

    const row = data?.households as HouseholdRow | null
    household.value = row
    return row
  }

  async function ensureHousehold() {
    const existing = await fetchHousehold()
    if (existing) {
      return existing
    }

    const userId = user.value?.sub
    if (!userId) {
      return null
    }

    if (error.value) {
      return null
    }

    pending.value = true
    error.value = null

    const { data: created, error: createError } = await supabase
      .from('households')
      .insert({ name: 'My Household' })
      .select()
      .single()

    if (createError) {
      pending.value = false
      error.value = createError.message
      return null
    }

    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: created.id,
        user_id: userId,
        role: 'owner'
      })

    pending.value = false

    if (memberError) {
      // Another tab may have created the household first
      const raced = await fetchHousehold()
      if (raced) {
        return raced
      }
      error.value = memberError.message
      return null
    }

    household.value = created
    return created
  }

  async function updateHousehold(updates: TablesUpdate<'households'>) {
    if (!household.value?.id) {
      return { data: null, error: new Error('No household loaded') }
    }

    const { data, error: updateError } = await supabase
      .from('households')
      .update(updates)
      .eq('id', household.value.id)
      .select()
      .single()

    if (updateError) {
      return { data: null, error: updateError }
    }

    household.value = data
    return { data, error: null }
  }

  return {
    household,
    pending,
    error,
    fetchHousehold,
    ensureHousehold,
    updateHousehold,
    clearHousehold
  }
}
