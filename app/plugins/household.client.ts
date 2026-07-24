export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  const { fetchHousehold, fetchAllMemberships, clearHousehold } = useHousehold()
  const { clearProfile } = useProfile()
  const { clearInventory } = useInventory()
  const { bootstrapProfileFromAuth } = useProfileBootstrap()

  watch(user, async (value) => {
    if (value?.sub) {
      await fetchAllMemberships()
      await fetchHousehold()
      await bootstrapProfileFromAuth()
    } else {
      clearHousehold()
      clearProfile()
      clearInventory()
    }
  }, { immediate: true })
})
