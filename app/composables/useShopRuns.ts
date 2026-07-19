import type { Database, ShopRun, ShopRunLine } from '~/types/database.types'
import type { ShopRunLineStatus } from '#shared/shop-run-intake'
import { canSubmitIntakeRun } from '#shared/shop-run-intake'

export type ShopRunWithLines = ShopRun & { lines: ShopRunLine[] }
export type ShoppingListType = 'plan_gap' | 'supplementary' | 'both'

export function useShopRuns() {
  const supabase = useSupabaseClient<Database>()
  const { household, isHouseholdOwner, isShopper, canEditInventory } = useHousehold()
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

  async function createShoppingList(listType: ShoppingListType) {
    if (!household.value?.id) {
      return { data: null, error: new Error('No active plan loaded') }
    }

    working.value = true
    const { data, error } = await supabase.rpc('create_shopping_list', {
      p_household_id: household.value.id,
      p_list_type: listType
    })
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

  async function addShoppingListItem(
    runId: string,
    payload: {
      name: string
      category_id: string
      quantity: number
      unit?: string | null
      note?: string | null
    }
  ) {
    const { data, error } = await supabase.rpc('add_shopping_list_item', {
      p_run_id: runId,
      p_name: payload.name,
      p_category_id: payload.category_id,
      p_quantity: payload.quantity,
      p_unit: payload.unit ?? undefined,
      p_note: payload.note ?? undefined
    })

    if (error) {
      return { data: null, error }
    }

    await loadRuns()
    return { data, error: null }
  }

  async function removeShoppingListItem(lineId: string) {
    const { error } = await supabase.rpc('remove_shopping_list_item', {
      p_line_id: lineId
    })

    if (error) {
      return { error }
    }

    await loadRuns()
    return { error: null }
  }

  async function cancelShoppingList(runId: string) {
    working.value = true
    const { error } = await supabase.rpc('cancel_shopping_list', {
      p_run_id: runId
    })
    working.value = false

    if (error) {
      return { error }
    }

    await loadRuns()
    return { error: null }
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

  async function startIntake(runId: string) {
    working.value = true
    const { data, error } = await supabase.rpc('start_shop_run_intake', {
      p_run_id: runId
    })
    working.value = false

    if (error) {
      return { data: null, error }
    }

    await loadRuns()
    return { data, error: null }
  }

  function patchLineInRuns(line: ShopRunLine) {
    runs.value = runs.value.map((run) => {
      if (run.id !== line.shop_run_id) {
        return run
      }
      return {
        ...run,
        lines: run.lines.map(existing => (existing.id === line.id ? line : existing))
      }
    })
  }

  async function updateLineShopping(
    lineId: string,
    payload: {
      line_status: 'pending' | 'bought' | 'skipped'
      quantity_reported?: number | null
    }
  ) {
    const { data, error } = await supabase.rpc('update_shop_run_line_shopping', {
      p_line_id: lineId,
      p_line_status: payload.line_status,
      p_quantity_reported: payload.quantity_reported ?? undefined
    })

    if (error) {
      return { data: null, error }
    }

    if (data) {
      patchLineInRuns(data)
    } else {
      await loadRuns()
    }
    return { data, error: null }
  }

  async function updateLineIntake(
    lineId: string,
    payload: {
      line_status: Exclude<ShopRunLineStatus, 'pending'>
      quantity_reported?: number | null
      intake_note?: string | null
    }
  ) {
    const { data, error } = await supabase.rpc('update_shop_run_line_intake', {
      p_line_id: lineId,
      p_line_status: payload.line_status,
      p_quantity_reported: payload.quantity_reported ?? undefined,
      p_intake_note: payload.intake_note ?? undefined
    })

    if (error) {
      return { data: null, error }
    }

    if (data) {
      patchLineInRuns(data)
    } else {
      await loadRuns()
    }
    return { data, error: null }
  }

  async function submitIntake(runId: string) {
    working.value = true
    const { data, error } = await supabase.rpc('submit_shop_run_intake', {
      p_run_id: runId
    })
    working.value = false

    if (error) {
      return { data: null, error }
    }

    await loadRuns()
    return { data, error: null }
  }

  async function completeSoloRestock(runId: string) {
    working.value = true
    const { data, error } = await supabase.rpc('complete_solo_restock_run', {
      p_run_id: runId
    })
    working.value = false

    if (error) {
      return { data: null, error }
    }

    await loadRuns()
    return { data, error: null }
  }

  const shoppingCompleteRun = computed(() =>
    runs.value.find(run => run.status === 'shopping_complete') ?? null
  )

  const intakeRun = computed(() =>
    runs.value.find(run => run.status === 'intake_pending' && !run.intake_submitted_at) ?? null
  )

  const submittedIntakeRun = computed(() =>
    runs.value.find(run => run.status === 'intake_pending' && !!run.intake_submitted_at) ?? null
  )

  const completedLists = computed(() =>
    runs.value.filter(run => run.status === 'closed')
  )

  const intakeReadyToSubmit = computed(() => {
    const run = intakeRun.value
    if (!run) {
      return false
    }
    return canSubmitIntakeRun(run.lines)
  })

  const coordinationBanner = computed(() => {
    if (shoppingCompleteRun.value) {
      if (isHouseholdOwner.value) {
        return {
          color: 'warning' as const,
          title: 'Shopping done — log what you bought',
          description: 'Open Restock to record what came home and update your inventory.',
          to: '/restock'
        }
      }
      if (canEditInventory.value) {
        return {
          color: 'warning' as const,
          title: 'Shopping complete — log intake',
          description: 'The shopper finished. Start intake on Restock and log what came in.',
          to: '/restock'
        }
      }
      return {
        color: 'warning' as const,
        title: 'Shopping complete — awaiting intake',
        description: 'The inventory keeper can log items on Restock when ready.',
        to: '/restock'
      }
    }

    if (intakeRun.value && canEditInventory.value) {
      if (isHouseholdOwner.value) {
        return {
          color: 'primary' as const,
          title: 'Finish your restock',
          description: 'Log each item on Restock, then update inventory when done.',
          to: '/restock'
        }
      }
      return {
        color: 'primary' as const,
        title: 'Intake in progress',
        description: 'Log each item on Restock, then submit for the plan owner to review.',
        to: '/restock'
      }
    }

    if (submittedIntakeRun.value && isHouseholdOwner.value) {
      return {
        color: 'primary' as const,
        title: 'Ready to update inventory',
        description: 'Your restock log is complete. Apply it to inventory on Restock.',
        to: '/restock'
      }
    }

    return null
  })

  watch(household, () => {
    loadRuns()
  }, { immediate: true })

  return {
    runs,
    pending,
    working,
    isHouseholdOwner,
    isShopper,
    canEditInventory,
    shoppingCompleteRun,
    intakeRun,
    submittedIntakeRun,
    completedLists,
    intakeReadyToSubmit,
    coordinationBanner,
    loadRuns,
    createRun,
    createShoppingList,
    addLine,
    addShoppingListItem,
    removeShoppingListItem,
    cancelShoppingList,
    startRun,
    completeShopping,
    startIntake,
    updateLineShopping,
    updateLineIntake,
    submitIntake,
    completeSoloRestock
  }
}
