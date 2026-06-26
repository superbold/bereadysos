<template>
  <div class="auth-shell">
    <div
      class="auth-shell__glow"
      aria-hidden="true"
    />

    <header class="auth-shell__toolbar">
      <BeReadyBrandButton />

      <UColorModeButton />
    </header>

    <div class="auth-shell__grid">
      <aside class="auth-shell__hero">
        <div class="auth-shell__hero-inner">
          <AuthHeroShowcase />
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
