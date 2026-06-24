<template>
  <div class="auth-shell auth-shell--centered">
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
        <span>BeReady SOS</span>
      </NuxtLink>

      <UColorModeButton />
    </header>

    <main class="auth-shell__center">
      <div class="auth-shell__card">
        <slot />
      </div>
    </main>
  </div>
</template>
