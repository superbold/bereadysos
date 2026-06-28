export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  const { ensureHousehold, clearHousehold } = useHousehold()
  const { clearProfile } = useProfile()
  const { bootstrapProfileFromAuth } = useProfileBootstrap()

  watch(user, async (value) => {
    if (value?.sub) {
      await ensureHousehold()
      await bootstrapProfileFromAuth()
    } else {
      clearHousehold()
      clearProfile()
    }
  }, { immediate: true })
})
