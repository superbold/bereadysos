import type { Database, HouseholdInvite } from '~/types/database.types'
import type { InviteableRole } from '#shared/household-roles'
import { roleLabel } from '#shared/household-roles'

export type HouseholdMemberRow = {
  user_id: string
  role: Database['public']['Enums']['member_role']
  created_at: string
  first_name: string
}

export function useHouseholdSharing() {
  const supabase = useSupabaseClient<Database>()
  const { household, isHouseholdOwner, membershipRole } = useHousehold()
  const toast = useToast()

  const pendingInvites = useState<HouseholdInvite[]>('household-pending-invites', () => [])
  const members = useState<HouseholdMemberRow[]>('household-members', () => [])
  const sharingPending = useState('household-sharing-pending', () => false)
  const inviting = useState('household-inviting', () => false)

  async function loadSharing() {
    if (!household.value?.id || !isHouseholdOwner.value) {
      pendingInvites.value = []
      members.value = []
      return
    }

    sharingPending.value = true

    const [invitesResult, membersResult] = await Promise.all([
      supabase
        .from('household_invites')
        .select('*')
        .eq('household_id', household.value.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('household_members')
        .select('user_id, role, created_at')
        .eq('household_id', household.value.id)
        .order('created_at', { ascending: true })
    ])

    sharingPending.value = false

    if (invitesResult.error) {
      toast.add({
        title: 'Could not load invites',
        description: invitesResult.error.message,
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
      return
    }

    if (membersResult.error) {
      toast.add({
        title: 'Could not load people',
        description: membersResult.error.message,
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
      return
    }

    pendingInvites.value = invitesResult.data ?? []

    const memberRows = membersResult.data ?? []
    const profileResults = await Promise.all(
      memberRows.map(row =>
        supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', row.user_id)
          .maybeSingle()
      )
    )

    members.value = memberRows.map((row, index) => ({
      user_id: row.user_id,
      role: row.role,
      created_at: row.created_at,
      first_name: profileResults[index]?.data?.first_name?.trim() || 'Member'
    }))
  }

  function inviteLink(token: string) {
    if (import.meta.client) {
      return `${window.location.origin}/invite/accept?token=${token}`
    }
    return `/invite/accept?token=${token}`
  }

  async function createInvite(email: string, role: InviteableRole = 'maintainer') {
    if (!isHouseholdOwner.value) {
      return { data: null, error: new Error('Only the plan owner can invite people') }
    }

    inviting.value = true
    const { data, error } = await supabase.rpc('create_household_invite', {
      p_email: email.trim(),
      p_role: role
    })
    inviting.value = false

    if (error) {
      return { data: null, error }
    }

    await loadSharing()
    return { data, error: null }
  }

  async function cancelInvite(inviteId: string) {
    const { error } = await supabase.rpc('cancel_household_invite', {
      p_invite_id: inviteId
    })

    if (error) {
      return { error }
    }

    await loadSharing()
    return { error: null }
  }

  async function revokeMember(userId: string) {
    const { error } = await supabase.rpc('revoke_household_member', {
      p_user_id: userId
    })

    if (error) {
      return { error }
    }

    await loadSharing()
    return { error: null }
  }

  async function copyInviteLink(token: string) {
    const link = inviteLink(token)
    if (!import.meta.client) {
      return { error: new Error('Clipboard is not available') }
    }

    try {
      await navigator.clipboard.writeText(link)
      return { error: null }
    } catch {
      return { error: new Error('Could not copy link') }
    }
  }

  watch([household, isHouseholdOwner], () => {
    loadSharing()
  }, { immediate: true })

  return {
    pendingInvites,
    members,
    sharingPending,
    inviting,
    membershipRole,
    roleLabel,
    loadSharing,
    createInvite,
    cancelInvite,
    revokeMember,
    copyInviteLink,
    inviteLink
  }
}

export function useHouseholdInviteAccept() {
  const supabase = useSupabaseClient<Database>()
  const { fetchHousehold } = useHousehold()

  async function previewInvite(token: string) {
    return supabase.rpc('preview_household_invite', { p_token: token })
  }

  async function acceptInvite(token: string) {
    const { data, error } = await supabase.rpc('accept_household_invite', { p_token: token })
    if (!error) {
      await fetchHousehold()
    }
    return { data, error }
  }

  return {
    previewInvite,
    acceptInvite
  }
}
