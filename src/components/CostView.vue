<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { fetchPrices, type Zone } from '../api/elpris'
import { Zap, Building2, Network, ChevronDown, ChevronUp } from '@lucide/vue'

const props = defineProps<{ zone: Zone }>()

const electricityProviders = [
  { name: 'Tibber',           monthlyFee: 49,  markupOre: 6.0   },
  { name: 'Greenely',         monthlyFee: 69,  markupOre: 0     },
  { name: 'Bixia',            monthlyFee: 39,  markupOre: 5.0   },
  { name: 'Skellefteå Kraft', monthlyFee: 49,  markupOre: 6.0   },
  { name: 'Fortum',           monthlyFee: 69,  markupOre: 3.9   },
  { name: 'Vattenfall',       monthlyFee: 45,  markupOre: 8.4   },
  { name: 'E.ON',             monthlyFee: 32,  markupOre: 10.72 },
  { name: 'Öresundskraft',    monthlyFee: 36,  markupOre: 2.55  },
]

// ── Elnät ──────────────────────────────────────────────────
const includeGrid = ref(false)
const gridExpanded = ref(false)
const gridMonthlyFee   = ref(161)    // Abonnemang kr/mån
const gridFixedOre     = ref(13.60)  // Elöverföring fast
const gridSpotOre      = ref(4.71)   // Elöverföring spotprisbaserad
const gridEnergyTaxOre = ref(36.00)  // Energiskatt

const gridTotalOre = computed(() =>
  gridFixedOre.value + gridSpotOre.value + gridEnergyTaxOre.value
)

// ── Månadsväljare ─────────────────────────────────────────
function monthOptions() {
  const opts: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' })
    opts.push({ value, label })
  }
  return opts
}

const months = monthOptions()
const selectedMonth = ref(months[1].value)
const consumption = ref<number | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const avgPriceOre = ref<number | null>(null)

function daysInMonth(yearMonth: string): string[] {
  const [year, month] = yearMonth.split('-').map(Number)
  const days: string[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    days.push(`${d.getFullYear()}-${mm}-${dd}`)
    d.setDate(d.getDate() + 1)
  }
  return days
}

async function load() {
  loading.value = true
  error.value = null
  avgPriceOre.value = null
  try {
    const days = daysInMonth(selectedMonth.value)
    const [year] = selectedMonth.value.split('-')
    const results = await Promise.all(
      days.map(iso => {
        const [, mm, dd] = iso.split('-')
        return fetchPrices({ year: Number(year), date: `${mm}-${dd}`, zone: props.zone })
          .then(entries => entries.map(e => e.pris))
          .catch(() => [] as number[])
      })
    )
    const all = results.flat()
    if (!all.length) throw new Error('Ingen data för vald månad')
    avgPriceOre.value = Math.round(all.reduce((s, v) => s + v, 0) / all.length * 100) / 100
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

interface ProviderResult {
  name: string
  monthlyFee: number
  markupOre: number
  energyCost: number
  markupCost: number
  gridCost: number
  total: number
}

const results = computed<ProviderResult[]>(() => {
  if (avgPriceOre.value == null || !consumption.value) return []
  const kwh = consumption.value
  const grid = includeGrid.value
    ? (kwh * gridTotalOre.value) / 100 + gridMonthlyFee.value
    : 0

  return electricityProviders
    .map(p => {
      const energyCost = (kwh * avgPriceOre.value!) / 100
      const markupCost = (kwh * p.markupOre) / 100
      const total = energyCost + markupCost + p.monthlyFee + grid
      return {
        ...p,
        energyCost: Math.round(energyCost),
        markupCost: Math.round(markupCost * 10) / 10,
        gridCost: Math.round(grid),
        total: Math.round(total),
      }
    })
    .sort((a, b) => a.total - b.total)
})

const cheapestProvider = computed(() => results.value[0] ?? null)
const maxTotal = computed(() => Math.max(...results.value.map(r => r.total), 1))

function fmt(n: number) {
  return n.toLocaleString('sv-SE')
}

watch(() => props.zone, load)
watch(selectedMonth, load)
onMounted(load)
</script>

<template>
  <div class="cost-view">
    <div class="cost-controls">
      <div class="cost-field">
        <label>Månad</label>
        <select v-model="selectedMonth" class="cost-select">
          <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>
      <div class="cost-field">
        <label>Förbrukning</label>
        <div class="cost-input-wrap">
          <input
            v-model.number="consumption"
            type="number"
            min="0"
            placeholder="0"
            class="cost-input"
          />
          <span class="cost-unit">kWh</span>
        </div>
      </div>
    </div>

    <!-- Elnät -->
    <div class="grid-section">
      <div class="grid-header" @click="gridExpanded = !gridExpanded">
        <label class="grid-toggle" @click.stop>
          <input type="checkbox" v-model="includeGrid" />
          <Network :size="14" />
          <span>Inkludera elnätskostnader</span>
        </label>
        <button class="grid-expand-btn">
          <ChevronDown v-if="!gridExpanded" :size="15" />
          <ChevronUp v-else :size="15" />
        </button>
      </div>
      <div v-if="gridExpanded" class="grid-fields">
        <div class="grid-field">
          <span class="grid-field-label">Abonnemang</span>
          <div class="cost-input-wrap small">
            <input v-model.number="gridMonthlyFee" type="number" min="0" class="cost-input" />
            <span class="cost-unit">kr/mån</span>
          </div>
        </div>
        <div class="grid-field">
          <span class="grid-field-label">Elöverföring fast</span>
          <div class="cost-input-wrap small">
            <input v-model.number="gridFixedOre" type="number" min="0" step="0.01" class="cost-input" />
            <span class="cost-unit">öre/kWh</span>
          </div>
        </div>
        <div class="grid-field">
          <span class="grid-field-label">Elöverföring spot</span>
          <div class="cost-input-wrap small">
            <input v-model.number="gridSpotOre" type="number" min="0" step="0.01" class="cost-input" />
            <span class="cost-unit">öre/kWh</span>
          </div>
        </div>
        <div class="grid-field">
          <span class="grid-field-label">Energiskatt</span>
          <div class="cost-input-wrap small">
            <input v-model.number="gridEnergyTaxOre" type="number" min="0" step="0.01" class="cost-input" />
            <span class="cost-unit">öre/kWh</span>
          </div>
        </div>
        <div class="grid-total">
          Totalt rörligt: <strong>{{ gridTotalOre.toFixed(2) }} öre/kWh</strong> + <strong>{{ gridMonthlyFee }} kr/mån</strong>
        </div>
      </div>
    </div>

    <div class="cost-results">
    <div v-if="loading" class="state-overlay">
      <div class="spinner" />
      <span>Hämtar månadsdata…</span>
    </div>

    <div v-else-if="error" class="state-overlay error">
      <span>{{ error }}</span>
    </div>

    <template v-else-if="avgPriceOre !== null">
      <div class="cost-stats">
        <div class="stat">
          <span class="stat-label">Snittspris</span>
          <span class="stat-value avg">{{ avgPriceOre }} <small>öre/kWh</small></span>
        </div>
        <template v-if="consumption && cheapestProvider">
          <div class="stat">
            <span class="stat-label">Billigaste leverantör</span>
            <span class="stat-value min">{{ cheapestProvider.name }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Lägsta kostnad</span>
            <span class="stat-value min">{{ fmt(cheapestProvider.total) }} <small>kr</small></span>
          </div>
          <div v-if="includeGrid" class="stat">
            <span class="stat-label">Varav elnät</span>
            <span class="stat-value">{{ fmt(cheapestProvider.gridCost) }} <small>kr</small></span>
          </div>
        </template>
      </div>

      <div v-if="!consumption" class="state-overlay">
        <Zap :size="28" style="opacity:0.3" />
        <span>Ange din förbrukning för att se kostnader</span>
      </div>

      <div v-else class="provider-list">
        <div
          v-for="(p, i) in results"
          :key="p.name"
          :class="['provider-row', { cheapest: i === 0 }]"
        >
          <div class="provider-rank">{{ i + 1 }}</div>
          <div class="provider-info">
            <span class="provider-name">
              <Building2 :size="13" />{{ p.name }}
            </span>
            <span class="provider-meta">{{ p.monthlyFee }} kr/mån · {{ p.markupOre }} öre påslag</span>
          </div>
          <div class="provider-bar-wrap">
            <div class="provider-bar" :style="{ width: (p.total / maxTotal * 100) + '%' }" />
          </div>
          <div class="provider-total">
            <span class="provider-price">{{ fmt(p.total) }} <small>kr</small></span>
            <span class="provider-breakdown">
              el {{ fmt(p.energyCost) }} + påslag {{ p.markupCost }} + avg {{ p.monthlyFee }}<template v-if="includeGrid"> + elnät {{ fmt(p.gridCost) }}</template>
            </span>
          </div>
        </div>
      </div>
    </template>
    </div>
  </div>
</template>
