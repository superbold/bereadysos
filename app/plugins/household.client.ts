export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  const { ensureHousehold, clearHousehold } = useHousehold()

  watch(user, async (value) => {
    if (value?.sub) {
      await ensureHousehold()
    } else {
      clearHousehold()
    }
  }, { immediate: true })
})
