<script setup lang="ts">
type Phase = 'inventory' | 'expiring' | 'plan' | 'finale'

const benefits = [
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
    description: 'Discover plan gaps and shortfalls — like needing +2 gallons of water.'
  }
]

const itemName = 'Bottled water'
const itemCategory = 'Water'
const itemIcon = 'i-lucide-droplets'
const itemQuantity = '5'
const itemUnit = 'gallons'
const itemExpiration = 'Sep 15, 2026'
const resultLabel = 'Shortfall: need +2 gallons'
const resultDetail = '5 of 7 gallons for 7 days'

/** Extra hold time on each beat so readers can absorb the step */
const BEAT_HOLD_MS = 2000

const phase = ref<Phase>('inventory')
const typedName = ref('')
const isTyping = ref(false)
const showCategory = ref(false)
const showQuantity = ref(false)
const showExpiration = ref(false)
const showResult = ref(false)
const glowIndex = ref(-1)

const reducedMotion = ref(false)
let timeouts: ReturnType<typeof setTimeout>[] = []

const headline = computed(() =>
  phase.value === 'finale' ? 'Ready when it matters most' : 'It\'s Easy to BeReady!'
)

const benefitCaption = computed(() => {
  if (phase.value === 'inventory') {
    return benefits[0]!.description
  }
  if (phase.value === 'expiring') {
    return benefits[1]!.description
  }
  if (phase.value === 'plan') {
    return benefits[2]!.description
  }
  return ''
})

const activeBenefitTitle = computed(() => {
  if (phase.value === 'inventory') {
    return benefits[0]!.title
  }
  if (phase.value === 'expiring') {
    return benefits[1]!.title
  }
  if (phase.value === 'plan') {
    return benefits[2]!.title
  }
  return ''
})

function clearTimers() {
  for (const id of timeouts) {
    clearTimeout(id)
  }
  timeouts = []
}

function schedule(fn: () => void, ms: number) {
  timeouts.push(setTimeout(fn, ms))
}

function resetForm() {
  typedName.value = ''
  isTyping.value = false
  showCategory.value = false
  showQuantity.value = false
  showExpiration.value = false
  showResult.value = false
}

function fillForm() {
  typedName.value = itemName
  isTyping.value = false
  showCategory.value = true
  showQuantity.value = true
}

function typeName(onComplete: () => void) {
  isTyping.value = true
  typedName.value = ''

  itemName.split('').forEach((char, index) => {
    schedule(() => {
      typedName.value += char
      if (index === itemName.length - 1) {
        isTyping.value = false
      }
    }, index * 50)
  })

  const afterName = itemName.length * 50 + 280
  schedule(() => {
    showCategory.value = true
  }, afterName)
  schedule(() => {
    showQuantity.value = true
  }, afterName + 380)
  schedule(onComplete, afterName + 1100 + BEAT_HOLD_MS)
}

function runInventoryBeat(next: () => void) {
  phase.value = 'inventory'
  glowIndex.value = -1
  resetForm()
  typeName(next)
}

function runExpiringBeat(next: () => void) {
  phase.value = 'expiring'
  fillForm()
  showExpiration.value = false
  showResult.value = false
  schedule(() => {
    showExpiration.value = true
  }, 350)
  schedule(next, 1800 + BEAT_HOLD_MS)
}

function runPlanBeat(next: () => void) {
  phase.value = 'plan'
  fillForm()
  showExpiration.value = true
  showResult.value = false
  schedule(() => {
    showResult.value = true
  }, 450)
  schedule(next, 2000 + BEAT_HOLD_MS)
}

function runFinaleBeat(next: () => void) {
  phase.value = 'finale'
  glowIndex.value = -1
  schedule(() => {
    glowIndex.value = 0
  }, 400)
  schedule(() => {
    glowIndex.value = 1
  }, 1400)
  schedule(() => {
    glowIndex.value = 2
  }, 2400)
  schedule(next, 3200 + BEAT_HOLD_MS)
}

function runLoop() {
  if (reducedMotion.value) {
    phase.value = 'finale'
    fillForm()
    showExpiration.value = true
    showResult.value = true
    glowIndex.value = 2
    return
  }

  clearTimers()
  runInventoryBeat(() => {
    runExpiringBeat(() => {
      runPlanBeat(() => {
        runFinaleBeat(() => {
          runLoop()
        })
      })
    })
  })
}

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  runLoop()
})

onUnmounted(() => {
  clearTimers()
})
</script>

<template>
  <div
    class="auth-hero-showcase"
    aria-hidden="true"
  >
    <p class="auth-shell__eyebrow">
      Disaster preparedness
    </p>

    <Transition
      name="auth-hero-fade"
      mode="out-in"
    >
      <h1
        :key="headline"
        class="auth-shell__headline"
      >
        {{ headline }}
      </h1>
    </Transition>

    <Transition
      name="auth-hero-fade"
      mode="out-in"
    >
      <p
        v-if="phase !== 'finale'"
        :key="activeBenefitTitle"
        class="auth-hero-showcase__caption"
      >
        <span class="auth-hero-showcase__caption-title">{{ activeBenefitTitle }}</span>
        {{ benefitCaption }}
      </p>
      <p
        v-else
        key="finale-lede"
        class="auth-shell__lede auth-hero-showcase__lede"
      >
        A calm, clear view of your supplies — whether you are planning for three days or three months.
      </p>
    </Transition>

    <div class="auth-hero-showcase__stage">
      <Transition
        name="auth-hero-fade"
        mode="out-in"
      >
        <div
          v-if="phase !== 'finale'"
          key="demo"
          class="auth-demo auth-demo--showcase"
        >
          <div class="auth-demo__panel">
            <div class="auth-demo__form">
              <div class="auth-demo__field">
                <span class="auth-demo__label">Item name</span>
                <span class="auth-demo__value">
                  {{ typedName }}<span
                    v-if="isTyping"
                    class="auth-demo__cursor"
                  >|</span>
                </span>
              </div>

              <div
                class="auth-demo__field auth-demo__field--fade"
                :class="{ 'auth-demo__field--visible': showCategory }"
              >
                <span class="auth-demo__label">Category</span>
                <span class="auth-demo__value auth-demo__value--chip">
                  <UIcon
                    :name="itemIcon"
                    class="size-3.5"
                  />
                  {{ itemCategory }}
                </span>
              </div>

              <div
                class="auth-demo__field auth-demo__field--fade"
                :class="{ 'auth-demo__field--visible': showQuantity }"
              >
                <span class="auth-demo__label">Quantity</span>
                <span class="auth-demo__value">
                  {{ itemQuantity }} {{ itemUnit }}
                </span>
              </div>

              <div
                class="auth-demo__field auth-demo__field--fade"
                :class="{ 'auth-demo__field--visible': showExpiration }"
              >
                <span class="auth-demo__label">Expiration date</span>
                <span class="auth-demo__value">
                  {{ itemExpiration }}
                </span>
              </div>
            </div>

            <div
              class="auth-demo__result auth-demo__result--fade auth-demo__result--warning"
              :class="{ 'auth-demo__result--visible': showResult }"
            >
              <UIcon
                name="i-lucide-trending-up"
                class="size-4 shrink-0"
              />
              <div class="min-w-0">
                <p class="auth-demo__result-label">
                  {{ resultLabel }}
                </p>
                <p class="auth-demo__result-detail">
                  {{ resultDetail }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <ul
          v-else
          key="finale"
          class="auth-shell__features auth-shell__features--showcase"
        >
          <li
            v-for="(item, index) in benefits"
            :key="item.title"
            class="auth-shell__feature"
            :class="{ 'auth-shell__feature--glow': glowIndex === index }"
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
      </Transition>
    </div>
  </div>
</template>
