export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  const route = useRoute()
  const { fetchHousehold, ensureHousehold, clearHousehold } = useHousehold()
  const { clearProfile } = useProfile()
  const { bootstrapProfileFromAuth } = useProfileBootstrap()

  async function syncHouseholdForUser() {
    const pendingRedirect = peekPostAuthRedirect()
    const deferBootstrap
      = route.path === '/invite/accept'
        || isPendingInviteRedirect(pendingRedirect)

    if (deferBootstrap) {
      await fetchHousehold()
    } else {
      await ensureHousehold()
    }
    await bootstrapProfileFromAuth()
  }

  watch(user, async (value) => {
    if (value?.sub) {
      await syncHouseholdForUser()
    } else {
      clearHousehold()
      clearProfile()
    }
  }, { immediate: true })
})
