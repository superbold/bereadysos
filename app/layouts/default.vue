<script setup lang="ts">
const user = useSupabaseUser()

const navItems = [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'Inventory', to: '/inventory', icon: 'i-lucide-package' },
  { label: 'Plan', to: '/plan', icon: 'i-lucide-clipboard-list' },
  { label: 'Expiring', to: '/expiring', icon: 'i-lucide-calendar-clock' }
]

async function signOut() {
  const supabase = useSupabaseClient()
  await supabase.auth.signOut()
  await navigateTo('/auth/login')
}
</script>

<template>
  <div class="flex min-h-svh flex-col bg-default">
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center gap-2 font-semibold text-highlighted"
        >
          <UIcon
            name="i-lucide-shield-check"
            class="size-5 text-primary"
          />
          <span class="hidden sm:inline">SOS Planner</span>
        </NuxtLink>

        <nav
          v-if="user"
          class="hidden items-center gap-1 md:flex"
        >
          <UButton
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            color="neutral"
            variant="ghost"
            size="sm"
          >
            {{ item.label }}
          </UButton>
        </nav>
      </template>

      <template #right>
        <UColorModeButton />

        <template v-if="user">
          <UTooltip text="Settings">
            <UButton
              to="/settings"
              icon="i-lucide-settings"
              color="neutral"
              variant="ghost"
              aria-label="Settings"
            />
          </UTooltip>
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            aria-label="Sign out"
            @click="signOut"
          />
        </template>

        <UButton
          v-else
          to="/auth/login"
          label="Sign in"
          color="primary"
          variant="soft"
          size="sm"
        />
      </template>
    </UHeader>

    <UMain class="flex-1">
      <UContainer class="py-6 sm:py-8">
        <slot />
      </UContainer>
    </UMain>

    <USeparator />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          SOS Planner &middot; Be ready before you need to be
        </p>
      </template>
    </UFooter>
  </div>
</template>
