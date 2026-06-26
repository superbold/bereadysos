<script setup lang="ts">
type Phase
  = 'inventory-card'
    | 'inventory-demo'
    | 'expiring-card'
    | 'expiring-demo'
    | 'plan-card'
    | 'plan-demo'
    | 'finale'

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
const expiringAlertLabel = 'Expires in 12 days'
const expiringAlertDetail = 'Sep 15, 2026 · add a date when you log items'
const resultLabel = 'Shortfall: need +2 gallons'
const resultDetail = '5 of 7 gallons for 7 days'

/** Pause on each benefit card before the matching demo */
const CARD_INTRO_MS = 2200
/** Extra hold on demo beats */
const BEAT_HOLD_MS = 2000
const TYPING_CHAR_MS = 50
const FIELD_PAUSE_MS = 300

type TypingField = 'name' | 'quantity' | 'expiration' | 'result' | null

const phase = ref<Phase>('inventory-card')
const typedName = ref('')
const typedQuantity = ref('')
const typedExpiration = ref('')
const typedResultLabel = ref('')
const typingField = ref<TypingField>(null)
const showCategory = ref(false)
const showQuantityField = ref(false)
const showExpirationField = ref(false)
const showExpiringAlert = ref(false)
const showResultPanel = ref(false)
const showResultDetail = ref(false)
const glowIndex = ref(-1)

const reducedMotion = ref(false)
let timeouts: ReturnType<typeof setTimeout>[] = []

const isFinale = computed(() => phase.value === 'finale')

const activeBenefitIndex = computed(() => {
  if (phase.value.startsWith('inventory')) {
    return 0
  }
  if (phase.value.startsWith('expiring')) {
    return 1
  }
  if (phase.value.startsWith('plan')) {
    return 2
  }
  return -1
})

const activeBenefit = computed(() => {
  const index = activeBenefitIndex.value
  return index >= 0 ? benefits[index] : null
})

const stageKey = computed(() => phase.value)

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
  typedQuantity.value = ''
  typedExpiration.value = ''
  typedResultLabel.value = ''
  typingField.value = null
  showCategory.value = false
  showQuantityField.value = false
  showExpirationField.value = false
  showExpiringAlert.value = false
  showResultPanel.value = false
  showResultDetail.value = false
}

function typeText(
  text: string,
  apply: (value: string) => void,
  field: TypingField,
  startMs: number
): number {
  typingField.value = field

  text.split('').forEach((_, index) => {
    schedule(() => {
      apply(text.slice(0, index + 1))
      if (index === text.length - 1 && typingField.value === field) {
        typingField.value = null
      }
    }, startMs + index * TYPING_CHAR_MS)
  })

  return startMs + text.length * TYPING_CHAR_MS
}

function prefillItemFields() {
  typedName.value = itemName
  showCategory.value = true
  showQuantityField.value = true
  typedQuantity.value = `${itemQuantity} ${itemUnit}`
}

function showCardThenDemo(
  cardPhase: Phase,
  demoPhase: Phase,
  runDemo: (next: () => void) => void,
  next: () => void
) {
  phase.value = cardPhase
  glowIndex.value = -1
  resetForm()

  schedule(() => {
    phase.value = demoPhase
    runDemo(next)
  }, CARD_INTRO_MS)
}

function runInventoryDemo(next: () => void) {
  let t = 0
  t = typeText(itemName, value => typedName.value = value, 'name', t)
  t += FIELD_PAUSE_MS
  schedule(() => {
    showCategory.value = true
  }, t)
  t += 400
  schedule(() => {
    showQuantityField.value = true
  }, t)
  t += 150
  t = typeText(`${itemQuantity} ${itemUnit}`, value => typedQuantity.value = value, 'quantity', t)
  schedule(next, t + FIELD_PAUSE_MS + BEAT_HOLD_MS)
}

function runExpiringDemo(next: () => void) {
  prefillItemFields()

  let t = 450
  schedule(() => {
    showExpirationField.value = true
  }, t)
  t += 200
  t = typeText(itemExpiration, value => typedExpiration.value = value, 'expiration', t)
  schedule(() => {
    showExpiringAlert.value = true
  }, t + FIELD_PAUSE_MS)
  schedule(next, t + FIELD_PAUSE_MS + 650 + BEAT_HOLD_MS)
}

function runPlanDemo(next: () => void) {
  prefillItemFields()

  let t = 450
  schedule(() => {
    showResultPanel.value = true
  }, t)
  t += 250
  t = typeText(resultLabel, value => typedResultLabel.value = value, 'result', t)
  schedule(() => {
    showResultDetail.value = true
  }, t + FIELD_PAUSE_MS)
  schedule(next, t + FIELD_PAUSE_MS + 700 + BEAT_HOLD_MS)
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
    glowIndex.value = 2
    return
  }

  clearTimers()
  showCardThenDemo('inventory-card', 'inventory-demo', runInventoryDemo, () => {
    showCardThenDemo('expiring-card', 'expiring-demo', runExpiringDemo, () => {
      showCardThenDemo('plan-card', 'plan-demo', runPlanDemo, () => {
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
    :class="{ 'auth-hero-showcase--finale': isFinale }"
    aria-hidden="true"
  >
    <div class="auth-hero-showcase__header">
      <p class="auth-shell__eyebrow">
        Disaster preparedness
      </p>

      <div class="auth-hero-showcase__headline-slot">
        <h1
          class="auth-shell__headline auth-hero-showcase__headline"
          :class="{ 'auth-hero-showcase__headline--active': !isFinale }"
        >
          It's Easy to <span class="auth-hero-showcase__brand">BeReady</span>!
        </h1>
        <h1
          class="auth-shell__headline auth-hero-showcase__headline"
          :class="{ 'auth-hero-showcase__headline--active': isFinale }"
        >
          <span class="auth-hero-showcase__brand">BeReady</span> when it matters most
        </h1>
      </div>
    </div>

    <div
      class="auth-hero-showcase__lede-slot"
      :class="{ 'auth-hero-showcase__lede-slot--visible': isFinale }"
    >
      <p
        class="auth-shell__lede auth-hero-showcase__lede"
        :class="{ 'auth-hero-showcase__lede--active': isFinale }"
      >
        A calm, clear view of your supplies — whether you are planning for three days or three months.
      </p>
    </div>

    <div class="auth-hero-showcase__stage">
      <Transition
        name="auth-hero-fade"
        mode="out-in"
      >
        <!-- Benefit card: what it is -->
        <div
          v-if="activeBenefit && phase.endsWith('-card')"
          :key="`${stageKey}-card`"
        >
          <p class="auth-hero-showcase__step-label">
            What it is
          </p>
          <article class="auth-shell__feature auth-shell__feature--spotlight">
            <span class="auth-shell__feature-icon">
              <UIcon
                :name="activeBenefit.icon"
                class="size-5"
              />
            </span>
            <div>
              <p class="auth-shell__feature-title">
                {{ activeBenefit.title }}
              </p>
              <p class="auth-shell__feature-copy">
                {{ activeBenefit.description }}
              </p>
            </div>
          </article>
        </div>

        <!-- Demo: what you do -->
        <div
          v-else-if="phase.endsWith('-demo')"
          :key="`${stageKey}-demo`"
          class="auth-demo auth-demo--showcase"
        >
          <p class="auth-hero-showcase__step-label">
            What you do
          </p>
          <div class="auth-demo__panel">
            <div class="auth-demo__form">
              <div class="auth-demo__field">
                <span class="auth-demo__label">Item name</span>
                <span class="auth-demo__value">
                  {{ typedName }}<span
                    v-if="typingField === 'name'"
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
                :class="{ 'auth-demo__field--visible': showQuantityField }"
              >
                <span class="auth-demo__label">Quantity</span>
                <span class="auth-demo__value">
                  {{ typedQuantity }}<span
                    v-if="typingField === 'quantity'"
                    class="auth-demo__cursor"
                  >|</span>
                </span>
              </div>

              <div
                v-if="phase === 'expiring-demo'"
                class="auth-demo__field auth-demo__field--fade"
                :class="{ 'auth-demo__field--visible': showExpirationField }"
              >
                <span class="auth-demo__label">Expiration date</span>
                <span class="auth-demo__value">
                  {{ typedExpiration }}<span
                    v-if="typingField === 'expiration'"
                    class="auth-demo__cursor"
                  >|</span>
                </span>
              </div>
            </div>

            <div
              v-if="phase === 'expiring-demo'"
              class="auth-demo__result auth-demo__result--fade auth-demo__result--warning"
              :class="{ 'auth-demo__result--visible': showExpiringAlert }"
            >
              <UIcon
                name="i-lucide-calendar-clock"
                class="size-4 shrink-0"
              />
              <div class="min-w-0">
                <p class="auth-demo__result-label">
                  {{ expiringAlertLabel }}
                </p>
                <p class="auth-demo__result-detail">
                  {{ expiringAlertDetail }}
                </p>
              </div>
            </div>

            <div
              v-if="phase === 'plan-demo'"
              class="auth-demo__result auth-demo__result--fade auth-demo__result--warning"
              :class="{ 'auth-demo__result--visible': showResultPanel }"
            >
              <UIcon
                name="i-lucide-trending-up"
                class="size-4 shrink-0"
              />
              <div class="min-w-0">
                <p class="auth-demo__result-label">
                  {{ typedResultLabel }}<span
                    v-if="typingField === 'result'"
                    class="auth-demo__cursor"
                  >|</span>
                </p>
                <p
                  class="auth-demo__result-detail auth-demo__result-detail--fade"
                  :class="{ 'auth-demo__result-detail--visible': showResultDetail }"
                >
                  {{ resultDetail }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Finale: all three benefits -->
        <div
          v-else-if="isFinale"
          key="finale"
        >
          <ul class="auth-shell__features auth-shell__features--showcase">
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
        </div>
      </Transition>
    </div>
  </div>
</template>
