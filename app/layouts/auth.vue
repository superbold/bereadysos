<script setup lang="ts">
const highlights = [
  {
    icon: 'i-lucide-package-search',
    title: 'Know what you have',
    description: 'Track water, food, medical supplies, and gear in one place.'
  },
  {
    icon: 'i-lucide-calendar-clock',
    title: 'Catch expiring items',
    description: 'See what needs rotation before it goes to waste.'
  },
  {
    icon: 'i-lucide-target',
    title: 'Plan for X days',
    description: 'Set a target and discover plan gaps — shortfalls between your goal and what you have, like +12 gallons of water.'
  }
]
</script>

<template>
  <div class="auth-shell">
    <div
      class="auth-shell__glow"
      aria-hidden="true"
    />

    <header class="auth-shell__toolbar">
      <NuxtLink
        to="/"
        class="flex items-center gap-2 rounded-lg px-2 py-1.5 font-semibold text-highlighted transition-colors hover:bg-elevated/60"
      >
        <UIcon
          name="i-lucide-shield-check"
          class="size-5 text-primary"
        />
        <span>SOS Planner</span>
      </NuxtLink>

      <UColorModeButton />
    </header>

    <div class="auth-shell__grid">
      <aside class="auth-shell__hero">
        <div class="auth-shell__hero-inner">
          <p class="auth-shell__eyebrow">
            Disaster preparedness
          </p>

          <h1 class="auth-shell__headline">
            Ready when it matters most
          </h1>

          <p class="auth-shell__lede">
            A calm, clear view of your supplies — whether you are planning for three days or three months.
          </p>

          <ul class="auth-shell__features">
            <li
              v-for="item in highlights"
              :key="item.title"
              class="auth-shell__feature"
            >
              <span class="auth-shell__feature-icon">
                <UIcon
                  :name="item.icon"
                  class="size-5"
                />
              </span>
              <div>
                <p class="auth-shell__feature-title">
                  {{ item.title }}
                </p>
                <p class="auth-shell__feature-copy">
                  {{ item.description }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </aside>

      <main class="auth-shell__main">
        <div class="auth-shell__card">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
