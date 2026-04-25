<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { AlertTriangle } from '@lucide/vue'
import { Bar } from 'vue-chartjs'
import { fetchPrices, type Zone } from '../api/elpris'

const props = defineProps<{ zone: Zone }>()


interface DaySummary {
  iso: string       // YYYY-MM-DD
  label: string     // "mån 25 apr"
  avg: number
  min: number
  max: number
}

const days = ref<DaySummary[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function dayLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })
}

async function load() {
  loading.value = true
  error.value = null
  days.value = []
  try {
    const results: DaySummary[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = toISODate(d)
      const [, month, day] = iso.split('-')
      const prices = await fetchPrices({ year: Number(iso.slice(0, 4)), date: `${month}-${day}`, zone: props.zone })
      const vals = prices.map(p => p.pris)
      if (!vals.length) continue
      const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10
      results.push({
        iso,
        label: dayLabel(iso),
        avg,
        min: Math.round(Math.min(...vals) * 10) / 10,
        max: Math.round(Math.max(...vals) * 10) / 10,
      })
    }
    days.value = results
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

const darkMQ = window.matchMedia('(prefers-color-scheme: dark)')
const isDark = ref(darkMQ.matches)
darkMQ.addEventListener('change', e => { isDark.value = e.matches })
const tickColor = computed(() => isDark.value ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)')
const gridColor = computed(() => isDark.value ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)')

function barColor(avg: number) {
  if (avg < 0)   return 'rgba(0, 199, 190, 0.85)'
  if (avg < 50)  return 'rgba(52, 199, 89, 0.85)'
  if (avg < 100) return 'rgba(255, 204, 0, 0.85)'
  if (avg < 150) return 'rgba(255, 149, 0, 0.85)'
  return 'rgba(255, 59, 48, 0.85)'
}

const chartData = computed(() => ({
  labels: days.value.map(d => d.label),
  datasets: [{
    label: 'Snitt öre/kWh',
    data: days.value.map(d => d.avg),
    backgroundColor: days.value.map(d => barColor(d.avg)),
    borderRadius: 6,
    borderSkipped: false,
  }],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  layout: { padding: { bottom: 8 } },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number } }) => `${ctx.parsed.y} öre/kWh snitt`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: gridColor.value },
      ticks: { color: tickColor.value, font: { size: 12 } },
    },
    y: {
      grid: { color: gridColor.value },
      ticks: {
        color: tickColor.value,
        font: { size: 11 },
        callback: (v: number | string) => `${v} ö`,
      },
      beginAtZero: true,
    },
  },
}))

const cheapestDay = computed(() => days.value.length ? [...days.value].sort((a, b) => a.avg - b.avg)[0] : null)
const mostExpensiveDay = computed(() => days.value.length ? [...days.value].sort((a, b) => b.avg - a.avg)[0] : null)

watch(() => props.zone, load)
onMounted(load)
</script>

<template>
  <div class="history">
    <div v-if="loading" class="state-overlay">
      <div class="spinner" />
      <span>Hämtar historik…</span>
    </div>

    <div v-else-if="error" class="state-overlay error">
      <AlertTriangle :size="32" />
      <span>{{ error }}</span>
    </div>

    <template v-else-if="days.length">
      <div class="history-stats">
        <div class="stat">
          <span class="stat-label">Billigaste dag</span>
          <span class="stat-value min">{{ cheapestDay?.label }}</span>
          <span class="stat-sub">{{ cheapestDay?.avg }} öre snitt</span>
        </div>
        <div class="stat">
          <span class="stat-label">Dyraste dag</span>
          <span class="stat-value max">{{ mostExpensiveDay?.label }}</span>
          <span class="stat-sub">{{ mostExpensiveDay?.avg }} öre snitt</span>
        </div>
      </div>

      <div class="history-chart">
        <Bar :data="chartData" :options="chartOptions as any" />
      </div>

      <div class="history-table">
        <div class="history-row header">
          <span>Dag</span>
          <span>Min</span>
          <span>Snitt</span>
          <span>Max</span>
        </div>
        <div v-for="d in days" :key="d.iso" class="history-row">
          <span class="day-label">{{ d.label }}</span>
          <span class="price-min">{{ d.min }} ö</span>
          <span class="price-avg">{{ d.avg }} ö</span>
          <span class="price-max">{{ d.max }} ö</span>
        </div>
      </div>
    </template>
  </div>
</template>
