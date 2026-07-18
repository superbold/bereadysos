<script setup lang="ts">
const user = useSupabaseUser()
const route = useRoute()

const navItems = [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'Inventory', to: '/inventory', icon: 'i-lucide-package' },
  { label: 'Plan', to: '/plan', icon: 'i-lucide-clipboard-list', tooltip: 'Plan gaps and shortfalls' },
  { label: 'Restock', to: '/restock', icon: 'i-lucide-shopping-cart' },
  { label: 'Expiring', to: '/expiring', icon: 'i-lucide-calendar-clock' }
]

function isActiveNavItem(to: string) {
  return route.path === to
}

const mobileNavItems = computed(() => [
  ...navItems.map(item => ({
    label: item.label,
    icon: item.icon,
    to: item.to,
    active: isActiveNavItem(item.to)
  })),
  { label: 'Settings', icon: 'i-lucide-settings', to: '/settings', active: isActiveNavItem('/settings') }
])

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
        <AppShellBrand />

        <nav
          v-if="user"
          class="hidden items-center gap-1 md:flex"
        >
          <template
            v-for="item in navItems"
            :key="item.to"
          >
            <UTooltip
              v-if="item.tooltip"
              :text="item.tooltip"
            >
              <UButton
                :to="item.to"
                :icon="item.icon"
                color="neutral"
                variant="ghost"
                size="sm"
                :aria-label="item.tooltip"
                :aria-current="isActiveNavItem(item.to) ? 'page' : undefined"
                :class="isActiveNavItem(item.to) ? 'rounded-none border-b-2 border-primary' : undefined"
              >
                {{ item.label }}
              </UButton>
            </UTooltip>
            <UButton
              v-else
              :to="item.to"
              :icon="item.icon"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-current="isActiveNavItem(item.to) ? 'page' : undefined"
              :class="isActiveNavItem(item.to) ? 'rounded-none border-b-2 border-primary' : undefined"
            >
              {{ item.label }}
            </UButton>
          </template>
        </nav>
      </template>

      <template #right>
        <UColorModeButton />

        <template v-if="user">
          <AlertsBell />

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

      <template #body>
        <nav v-if="user">
          <UNavigationMenu
            :items="mobileNavItems"
            orientation="vertical"
            class="-mx-2.5"
          />
          <USeparator class="my-3" />
          <UButton
            label="Sign out"
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            block
            class="justify-start"
            @click="signOut"
          />
        </nav>
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
