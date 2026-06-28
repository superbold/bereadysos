import { formatPlanOwnerLabel } from '#shared/display'

export function useHouseholdPlan() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const { household } = useHousehold()
  const { profile } = useProfile()

  const ownerFirstName = useState<string | null>('household-owner-first-name', () => null)

  const planLabel = computed(() =>
    formatPlanOwnerLabel(ownerFirstName.value ?? profile.value?.first_name, household.value?.name)
  )

  async function fetchOwnerFirstName() {
    if (!household.value?.id) {
      ownerFirstName.value = null
      return
    }

    const { data: ownerMember } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', household.value.id)
      .eq('role', 'owner')
      .maybeSingle()

    if (!ownerMember?.user_id) {
      ownerFirstName.value = null
      return
    }

    if (ownerMember.user_id === user.value?.sub) {
      ownerFirstName.value = profile.value?.first_name?.trim() || null
      return
    }

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('user_id', ownerMember.user_id)
      .maybeSingle()

    ownerFirstName.value = ownerProfile?.first_name?.trim() || null
  }

  watch([household, profile], async () => {
    await fetchOwnerFirstName()
  }, { immediate: true })

  return {
    planLabel,
    ownerFirstName,
    fetchOwnerFirstName
  }
}
