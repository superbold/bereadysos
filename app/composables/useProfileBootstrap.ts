import { firstNameFromEmail } from '#shared/display'

export function useProfileBootstrap() {
  const user = useSupabaseUser()
  const { profile, fetchProfile, ensureProfile, updateProfile } = useProfile()

  async function bootstrapProfileFromAuth() {
    if (!user.value?.sub) {
      return
    }

    await fetchProfile()

    if (profile.value?.first_name?.trim()) {
      return
    }

    const metadataFirstName = typeof user.value.user_metadata?.first_name === 'string'
      ? user.value.user_metadata.first_name.trim()
      : ''
    const seed = metadataFirstName || firstNameFromEmail(user.value.email)

    if (!profile.value) {
      await ensureProfile(seed)
      return
    }

    if (seed) {
      await updateProfile({ first_name: seed })
    }
  }

  return {
    bootstrapProfileFromAuth
  }
}
