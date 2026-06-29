import type { Database, ShopRun, ShopRunLine } from '~/types/database.types'

export type ShopRunWithLines = ShopRun & { lines: ShopRunLine[] }

export function useShopRuns() {
  const supabase = useSupabaseClient<Database>()
  const { household, isHouseholdOwner, isShopper } = useHousehold()
  const toast = useToast()

  const runs = useState<ShopRunWithLines[]>('shop-runs', () => [])
  const pending = useState('shop-runs-pending', () => false)
  const working = useState('shop-runs-working', () => false)

  async function loadRuns() {
    if (!household.value?.id) {
      runs.value = []
      return
    }

    pending.value = true

    const { data: runRows, error: runsError } = await supabase
      .from('shop_runs')
      .select('*')
      .eq('household_id', household.value.id)
      .order('created_at', { ascending: false })

    if (runsError) {
      pending.value = false
      toast.add({
        title: 'Could not load restock runs',
        description: runsError.message,
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
      return
    }

    const runList = runRows ?? []
    if (!runList.length) {
      runs.value = []
      pending.value = false
      return
    }

    const { data: lineRows, error: linesError } = await supabase
      .from('shop_run_lines')
      .select('*')
      .in('shop_run_id', runList.map(run => run.id))
      .order('sort_order', { ascending: true })

    pending.value = false

    if (linesError) {
      toast.add({
        title: 'Could not load shopping list',
        description: linesError.message,
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
      return
    }

    const linesByRun = new Map<string, ShopRunLine[]>()
    for (const line of lineRows ?? []) {
      const bucket = linesByRun.get(line.shop_run_id) ?? []
      bucket.push(line)
      linesByRun.set(line.shop_run_id, bucket)
    }

    runs.value = runList.map(run => ({
      ...run,
      lines: linesByRun.get(run.id) ?? []
    }))
  }

  async function createRun(title = 'Restock run') {
    working.value = true
    const { data, error } = await supabase.rpc('create_shop_run', { p_title: title })
    working.value = false

    if (error) {
      return { data: null, error }
    }

    await loadRuns()
    return { data, error: null }
  }

  async function addLine(
    runId: string,
    payload: { name: string, category_id?: string | null, quantity?: number | null, unit?: string | null }
  ) {
    const { data, error } = await supabase.rpc('add_shop_run_line', {
      p_run_id: runId,
      p_name: payload.name,
      p_category_id: payload.category_id ?? undefined,
      p_quantity: payload.quantity ?? undefined,
      p_unit: payload.unit ?? undefined
    })

    if (error) {
      return { data: null, error }
    }

    await loadRuns()
    return { data, error: null }
  }

  async function startRun(runId: string, shopperUserId?: string | null) {
    working.value = true
    const { data, error } = await supabase.rpc('start_shop_run', {
      p_run_id: runId,
      p_shopper_user_id: shopperUserId ?? undefined
    })
    working.value = false

    if (error) {
      return { data: null, error }
    }

    await loadRuns()
    return { data, error: null }
  }

  async function completeShopping(runId: string, note?: string) {
    working.value = true
    const { data, error } = await supabase.rpc('complete_shop_run_shopping', {
      p_run_id: runId,
      p_note: note ?? undefined
    })
    working.value = false

    if (error) {
      return { data: null, error }
    }

    await loadRuns()
    return { data, error: null }
  }

  watch(household, () => {
    loadRuns()
  }, { immediate: true })

  return {
    runs,
    pending,
    working,
    isHouseholdOwner,
    isShopper,
    loadRuns,
    createRun,
    addLine,
    startRun,
    completeShopping
  }
}
