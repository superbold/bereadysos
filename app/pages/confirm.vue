<script setup lang="ts">
const user = useSupabaseUser()

watch(user, (value) => {
  if (value) {
    navigateTo('/')
  }
}, { immediate: true })
</script>

<template>
  <div class="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
    <UIcon
      name="i-lucide-loader-circle"
      class="size-8 animate-spin text-primary"
    />
    <p class="text-muted">
      Completing sign in...
    </p>
  </div>
</template>
