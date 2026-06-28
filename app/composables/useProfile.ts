import type { Database, Profile } from '~/types/database.types'

export function useProfile() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  const profile = useState<Profile | null>('user-profile', () => null)
  const pending = useState('profile-pending', () => false)
  const error = useState<string | null>('profile-error', () => null)

  function clearProfile() {
    profile.value = null
    error.value = null
  }

  async function fetchProfile() {
    const userId = user.value?.sub
    if (!userId) {
      clearProfile()
      return null
    }

    pending.value = true
    error.value = null

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    pending.value = false

    if (fetchError) {
      error.value = fetchError.message
      return null
    }

    profile.value = data
    return data
  }

  async function ensureProfile(firstName = '') {
    const userId = user.value?.sub
    if (!userId) {
      clearProfile()
      return null
    }

    pending.value = true
    error.value = null

    const { data, error: rpcError } = await supabase.rpc('ensure_profile', {
      p_first_name: firstName
    })

    pending.value = false

    if (rpcError) {
      error.value = rpcError.message
      return null
    }

    profile.value = data
    return data
  }

  async function updateProfile(updates: { first_name: string }) {
    const userId = user.value?.sub
    if (!userId) {
      return { data: null, error: new Error('Not signed in') }
    }

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ first_name: updates.first_name.trim() })
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      return { data: null, error: updateError }
    }

    profile.value = data
    return { data, error: null }
  }

  return {
    profile,
    pending,
    error,
    fetchProfile,
    ensureProfile,
    updateProfile,
    clearProfile
  }
}
