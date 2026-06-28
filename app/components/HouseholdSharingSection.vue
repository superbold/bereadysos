<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const toast = useToast()
const {
  pendingInvites,
  members,
  sharingPending,
  inviting,
  createInvite,
  cancelInvite,
  revokeMember,
  copyInviteLink
} = useHouseholdSharing()

const inviteSchema = z.object({
  email: z.email('Enter a valid email address')
})

type InviteSchema = z.output<typeof inviteSchema>

const inviteState = reactive<InviteSchema>({
  email: ''
})

const guestMembers = computed(() => members.value.filter(member => member.role === 'member'))
const ownerMember = computed(() => members.value.find(member => member.role === 'owner'))

async function onInviteSubmit(event: FormSubmitEvent<InviteSchema>) {
  const { data, error } = await createInvite(event.data.email)

  if (error) {
    toast.add({
      title: 'Could not send invite',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  inviteState.email = ''

  const copied = await copyInviteLink(data.token)
  toast.add({
    title: 'Invite created',
    description: copied.error
      ? 'Share the invite link with your guest from the list below.'
      : 'Invite link copied to your clipboard — send it to your guest.',
    color: 'success',
    icon: 'i-lucide-user-plus'
  })
}

async function onCopyLink(token: string) {
  const { error } = await copyInviteLink(token)
  if (error) {
    toast.add({
      title: 'Could not copy link',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Link copied',
    description: 'Send it to your guest by email or message.',
    color: 'success',
    icon: 'i-lucide-clipboard-check'
  })
}

async function onCancelInvite(inviteId: string) {
  const { error } = await cancelInvite(inviteId)
  if (error) {
    toast.add({
      title: 'Could not cancel invite',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Invite cancelled',
    color: 'neutral',
    icon: 'i-lucide-x'
  })
}

async function onRevokeMember(userId: string, firstName: string) {
  const { error } = await revokeMember(userId)
  if (error) {
    toast.add({
      title: 'Could not remove guest',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  toast.add({
    title: 'Guest removed',
    description: `${firstName} no longer has access to this plan.`,
    color: 'neutral',
    icon: 'i-lucide-user-minus'
  })
}

function formatInviteExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<template>
  <section class="space-y-5 rounded-lg border border-default p-4">
    <div>
      <h2 class="text-sm font-semibold text-highlighted">
        Household sharing
      </h2>
      <p class="mt-1 text-sm text-muted">
        Invite someone to view and help improve this preparedness plan. You can remove guests at any time.
      </p>
    </div>

    <UForm
      :schema="inviteSchema"
      :state="inviteState"
      class="space-y-3"
      @submit="onInviteSubmit"
    >
      <UFormField
        label="Guest email"
        name="email"
        description="They must sign in with this email to accept."
      >
        <UInput
          v-model="inviteState.email"
          type="email"
          placeholder="guest@example.com"
          autocomplete="email"
        />
      </UFormField>
      <UButton
        type="submit"
        label="Create invite link"
        icon="i-lucide-user-plus"
        :loading="inviting"
      />
    </UForm>

    <div
      v-if="sharingPending"
      class="flex items-center gap-2 text-sm text-muted"
      role="status"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-4 animate-spin"
      />
      Loading sharing&hellip;
    </div>

    <template v-else>
      <div v-if="pendingInvites.length">
        <h3 class="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
          Pending invites
        </h3>
        <ul class="divide-y divide-default rounded-lg border border-default">
          <li
            v-for="invite in pendingInvites"
            :key="invite.id"
            class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                {{ invite.invited_email }}
              </p>
              <p class="text-sm text-muted">
                Expires {{ formatInviteExpiry(invite.expires_at) }}
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <UButton
                label="Copy link"
                icon="i-lucide-clipboard"
                size="xs"
                color="neutral"
                variant="outline"
                @click="onCopyLink(invite.token)"
              />
              <UButton
                label="Cancel"
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="onCancelInvite(invite.id)"
              />
            </div>
          </li>
        </ul>
      </div>

      <div>
        <h3 class="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
          People on this plan
        </h3>
        <ul class="divide-y divide-default rounded-lg border border-default">
          <li
            v-if="ownerMember"
            class="flex items-center justify-between gap-3 p-3"
          >
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                {{ ownerMember.first_name }}
              </p>
              <p class="text-sm text-muted">
                Owner
              </p>
            </div>
            <UBadge
              color="primary"
              variant="subtle"
              size="sm"
            >
              Owner
            </UBadge>
          </li>
          <li
            v-for="member in guestMembers"
            :key="member.user_id"
            class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                {{ member.first_name }}
              </p>
              <p class="text-sm text-muted">
                Guest
              </p>
            </div>
            <UButton
              label="Remove"
              icon="i-lucide-user-minus"
              size="xs"
              color="error"
              variant="soft"
              @click="onRevokeMember(member.user_id, member.first_name)"
            />
          </li>
          <li
            v-if="!guestMembers.length"
            class="p-3 text-sm text-muted"
          >
            No guests yet — create an invite link above.
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
