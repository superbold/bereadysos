<template>
  <div class="auth-shell auth-shell--centered">
    <div
      class="auth-shell__glow"
      aria-hidden="true"
    />

    <header class="auth-shell__toolbar">
      <BeReadyBrandButton />

      <UColorModeButton />
    </header>

    <main class="auth-shell__center">
      <div class="auth-shell__card">
        <slot />
      </div>
    </main>
  </div>
</template>
