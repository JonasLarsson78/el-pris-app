<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { openUrl } from '@tauri-apps/plugin-opener'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { fetchPrices, type Zone, type PriceEntry } from './api/elpris'
import HistoryView from './components/HistoryView.vue'
import CostView from './components/CostView.vue'
import {
  CalendarDays,
  History,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  LineChart,
  AlertTriangle,
  RefreshCw,
  CircleDollarSign,
} from '@lucide/vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Title, Tooltip, Legend)

const nowLinePlugin = {
  id: 'nowLine',
  afterDraw(chart: any) {
    const idx: number | undefined = chart.options.plugins?.nowLine?.index
    if (idx == null) return
    const meta = chart.getDatasetMeta(0)
    const point = meta.data[idx]
    if (!point) return
    const { ctx, chartArea: { top, bottom } } = chart
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(point.x, top)
    ctx.lineTo(point.x, bottom)
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255, 59, 48, 0.85)'
    ctx.setLineDash([5, 4])
    ctx.stroke()
    // Liten etikett "Nu"
    const price: number | undefined = chart.options.plugins?.nowLine?.price
    const label = price != null ? `Nu  ${price} öre` : 'Nu'
    const padding = 6
    ctx.font = 'bold 11px -apple-system, sans-serif'
    const textW = ctx.measureText(label).width
    // Bakgrund
    ctx.fillStyle = 'rgba(255, 59, 48, 0.85)'
    const boxX = point.x - textW / 2 - padding
    const boxY = top + 8
    ctx.beginPath()
    ctx.roundRect(boxX, boxY, textW + padding * 2, 18, 4)
    ctx.fill()
    // Text
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, point.x, boxY + 9)
    ctx.restore()
  },
}
ChartJS.register(nowLinePlugin)

type View = 'day' | 'history' | 'cost'
const currentView = ref<View>('day')

type ChartType = 'bar' | 'line'
const chartType = ref<ChartType>((localStorage.getItem('chartType') as ChartType) ?? 'bar')
watch(chartType, v => localStorage.setItem('chartType', v))

const darkMQ = window.matchMedia('(prefers-color-scheme: dark)')
const isDark = ref(darkMQ.matches)
darkMQ.addEventListener('change', e => { isDark.value = e.matches })

const tickColor = computed(() => isDark.value ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)')
const gridColor = computed(() => isDark.value ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)')

const zones: Zone[] = ['SE1', 'SE2', 'SE3', 'SE4']
const selectedZone = ref<Zone>((localStorage.getItem('zone') as Zone) ?? 'SE4')
watch(selectedZone, v => localStorage.setItem('zone', v))
const selectedDate = ref(todayString())
const prices = ref<PriceEntry[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const MONTHS: Record<string, number> = {
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'maj': 4, 'jun': 5,
  'jul': 6, 'aug': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'dec': 11,
}

// Tiderna från API:et är UTC — parsa med Date.UTC
function parseSwedishDate(s: string): Date {
  const parts = s.split(' ')
  const day = parseInt(parts[0])
  const month = MONTHS[parts[1].replace('.', '')]
  const year = parseInt(parts[2])
  const [h, m] = parts[3].split(':').map(Number)
  return new Date(Date.UTC(year, month, day, h, m))
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function todayString() {
  return toISODate(new Date())
}

function tomorrowString() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toISODate(d)
}

function formatDateSv(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function stepDate(days: number) {
  const d = new Date(selectedDate.value + 'T12:00:00')
  d.setDate(d.getDate() + days)
  const next = toISODate(d)
  if (next <= tomorrowString()) selectedDate.value = next
}

const canGoForward = computed(() => selectedDate.value < tomorrowString())

function parseDateParam(iso: string): { year: number; date: string } {
  const [year, month, day] = iso.split('-')
  return { year: Number(year), date: `${month}-${day}` }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const { year, date } = parseDateParam(selectedDate.value)
    const data = await fetchPrices({ year, date, zone: selectedZone.value })
    prices.value = data.sort((a, b) =>
      parseSwedishDate(a.startTime).getTime() - parseSwedishDate(b.startTime).getTime()
    )
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    prices.value = []
  } finally {
    loading.value = false
  }
}

// Parsar UTC-tid och visar som svensk lokal tid: "00:00"
function formatTime(svTime: string) {
  return parseSwedishDate(svTime).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

function priceColor(ore: number) {
  if (ore < 0)   return 'rgba(0, 199, 190, 0.85)'   // negativ = turkos
  if (ore < 50)  return 'rgba(52, 199, 89, 0.85)'
  if (ore < 100) return 'rgba(255, 204, 0, 0.85)'
  if (ore < 150) return 'rgba(255, 149, 0, 0.85)'
  return 'rgba(255, 59, 48, 0.85)'
}

const chartData = computed(() => {
  const ore = prices.value.map(p => Math.round(p.pris * 10) / 10)
  const labels = prices.value.map(p => formatTime(p.startTime))

  if (chartType.value === 'line') {
    return {
      labels,
      datasets: [
        {
          label: 'öre/kWh',
          data: ore,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: false,
          tension: 0.3,
          segment: {
            borderColor: (ctx: any) => priceColor(ctx.p1.parsed.y ?? 0),
          },
          pointBackgroundColor: ore.map(priceColor),
        },
      ],
    }
  }

  return {
    labels,
    datasets: [
      {
        label: 'öre/kWh',
        data: ore,
        backgroundColor: ore.map(priceColor),
        borderRadius: 3,
        borderSkipped: false,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: false,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  layout: { padding: { bottom: 16 } },
  plugins: {
    nowLine: { index: nowIndex.value, price: currentPrice.value },
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number } }) => `${ctx.parsed.y} öre/kWh`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: gridColor.value },
      ticks: {
        autoSkip: false,
        maxRotation: 90,
        minRotation: 90,
        color: tickColor.value,
        font: { size: 12 },
      },
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

const nowIndex = computed(() => {
  if (selectedDate.value !== todayString()) return null
  const now = new Date()
  const idx = prices.value.findIndex(p => parseSwedishDate(p.endTime) > now)
  return idx < 0 ? prices.value.length - 1 : idx
})

const currentPrice = computed(() => {
  const idx = nowIndex.value
  if (idx == null) return null
  return Math.round(prices.value[idx]?.pris * 10) / 10
})

const avgPrice = computed(() => {
  if (!prices.value.length) return null
  const avg = prices.value.reduce((s, p) => s + p.pris, 0) / prices.value.length
  return Math.round(avg * 10) / 10
})

const minPrice = computed(() => {
  if (!prices.value.length) return null
  return Math.round(Math.min(...prices.value.map(p => p.pris)) * 10) / 10
})

const maxPrice = computed(() => {
  if (!prices.value.length) return null
  return Math.round(Math.max(...prices.value.map(p => p.pris)) * 10) / 10
})

const cheapestHours = computed(() => {
  if (!prices.value.length) return []
  // Gruppera kvartar per heltimme
  const hours = new Map<string, number[]>()
  for (const p of prices.value) {
    const time = formatTime(p.startTime)   // "10:15"
    const hour = time.slice(0, 2) + ':00'  // "10:00"
    if (!hours.has(hour)) hours.set(hour, [])
    hours.get(hour)!.push(p.pris)
  }
  // Beräkna snitt per timme
  const sorted = Array.from(hours.entries())
    .map(([hour, vals]) => ({
      hour,
      avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10,
    }))
    .sort((a, b) => a.avg - b.avg)
  return sorted.slice(0, 3)
})

const chartWidth = computed(() => Math.max(900, prices.value.length * 24))
const chartWrap = ref<HTMLElement | null>(null)
const chartScroll = ref<HTMLElement | null>(null)
const chartHeight = ref(400)

let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(entries => {
    const h = entries[0]?.contentRect.height
    if (h) chartHeight.value = Math.floor(h) - 64
  })
  if (chartWrap.value) ro.observe(chartWrap.value)
})
onUnmounted(() => ro?.disconnect())


async function scrollToNow() {
  await nextTick()
  if (!chartScroll.value || !prices.value.length) return

  const now = new Date()
  let idx = prices.value.findIndex(p => parseSwedishDate(p.endTime) > now)
  if (idx < 0) idx = prices.value.length - 1

  const barWidth = chartWidth.value / prices.value.length
  const scrollX = idx * barWidth - chartScroll.value.clientWidth / 2
  chartScroll.value.scrollTo({ left: Math.max(0, scrollX), behavior: 'smooth' })
}

watch(prices, () => {
  if (selectedDate.value === todayString()) scrollToNow()
})

watch(currentView, async (v) => {
  if (v === 'day' && selectedDate.value === todayString()) scrollToNow()
})

const appVersion = ref('')
const updateTag = ref<string | null>(null)

function isNewer(latest: string, current: string): boolean {
  const a = latest.split('.').map(Number)
  const b = current.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false
  }
  return false
}

async function checkForUpdates(current: string) {
  try {
    const res = await fetch('https://api.github.com/repos/JonasLarsson78/el-pris-app/releases/latest')
    if (!res.ok) return
    const data = await res.json()
    const tag: string = data.tag_name ?? ''
    const latest = tag.replace(/^v/, '')
    if (latest && isNewer(latest, current)) updateTag.value = tag
  } catch { /* nätverksfel – ignorera */ }
}

watch([selectedZone, selectedDate], load)
onMounted(async () => {
  load()
  appVersion.value = await getVersion()
  checkForUpdates(appVersion.value)
})
</script>

<template>
  <div class="app">
    <header class="app-header" data-tauri-drag-region>
      <div class="view-tabs">
        <button :class="['view-tab', { active: currentView === 'day' }]" @click="currentView = 'day'">
          <CalendarDays :size="14" /><span>Dag</span>
        </button>
        <button :class="['view-tab', { active: currentView === 'history' }]" @click="currentView = 'history'">
          <History :size="14" /><span>Historik</span>
        </button>
        <button :class="['view-tab', { active: currentView === 'cost' }]" @click="currentView = 'cost'">
          <CircleDollarSign :size="14" /><span>Kostnad</span>
        </button>
      </div>
      <div class="controls" v-if="currentView === 'day'">
        <div class="zone-selector">
          <button
            v-for="zone in zones"
            :key="zone"
            :class="['zone-btn', { active: selectedZone === zone }]"
            @click="selectedZone = zone"
          >
            {{ zone }}
          </button>
        </div>
        <div class="date-nav">
          <button class="date-arrow" @click="stepDate(-1)"><ChevronLeft :size="15" /></button>
          <span class="date-label">{{ formatDateSv(selectedDate) }}</span>
          <button class="date-arrow" @click="stepDate(1)" :disabled="!canGoForward"><ChevronRight :size="15" /></button>
        </div>
        <div class="chart-type-selector">
          <button :class="['type-btn', { active: chartType === 'bar' }]" @click="chartType = 'bar'" title="Stapeldiagram">
            <BarChart2 :size="16" />
          </button>
          <button :class="['type-btn', { active: chartType === 'line' }]" @click="chartType = 'line'" title="Linjediagram">
            <LineChart :size="16" />
          </button>
        </div>
      </div>
      <div class="controls" v-else>
        <div class="zone-selector">
          <button
            v-for="zone in zones"
            :key="zone"
            :class="['zone-btn', { active: selectedZone === zone }]"
            @click="selectedZone = zone"
          >
            {{ zone }}
          </button>
        </div>
      </div>
      <span v-if="appVersion" class="app-version">v{{ appVersion }}</span>
    </header>

    <div v-if="updateTag" class="update-banner">
      <span>Ny version tillgänglig: <strong>{{ updateTag }}</strong></span>
      <button class="update-btn" @click="openUrl('https://github.com/JonasLarsson78/el-pris-app/releases/latest').catch(e => console.error('openUrl failed:', e))">Ladda ner</button>
      <button class="update-dismiss" @click="updateTag = null">✕</button>
    </div>

    <main class="app-main">
      <HistoryView v-if="currentView === 'history'" :zone="selectedZone" />
      <CostView v-else-if="currentView === 'cost'" :zone="selectedZone" />

      <div v-else-if="loading" class="state-overlay">
        <div class="spinner" />
        <span>Hämtar priser…</span>
      </div>

      <div v-else-if="currentView === 'day' && error" class="state-overlay error">
        <AlertTriangle :size="32" />
        <span>{{ error }}</span>
        <button class="retry-btn" @click="load"><RefreshCw :size="13" />Försök igen</button>
      </div>

      <template v-else-if="currentView === 'day' && prices.length">
        <div class="stats">
          <div class="stat">
            <span class="stat-label">Snitt</span>
            <span class="stat-value avg">{{ avgPrice }} <small>öre</small></span>
          </div>
          <div class="stat">
            <span class="stat-label">Min</span>
            <span class="stat-value min">{{ minPrice }} <small>öre</small></span>
          </div>
          <div class="stat">
            <span class="stat-label">Max</span>
            <span class="stat-value max">{{ maxPrice }} <small>öre</small></span>
          </div>
          <div class="stat">
            <span class="stat-label">Perioder</span>
            <span class="stat-value">{{ prices.length }}</span>
          </div>
        </div>

        <div class="cheapest">
          <span class="cheapest-label">Billigast idag</span>
          <div class="cheapest-hours">
            <div v-for="(h, i) in cheapestHours" :key="h.hour" class="cheapest-hour">
              <span class="cheapest-rank">{{ i + 1 }}</span>
              <span class="cheapest-time">{{ h.hour }}–{{ String(Number(h.hour.slice(0,2)) + 1).padStart(2,'0') }}:00</span>
              <span class="cheapest-price">{{ h.avg }} <small>öre</small></span>
            </div>
          </div>
        </div>

        <div class="chart-wrap" ref="chartWrap">
          <div class="chart-scroll" ref="chartScroll">
            <div class="chart-inner">
              <Bar v-if="chartType === 'bar'" :data="chartData" :options="chartOptions as any" :width="chartWidth" :height="chartHeight" />
              <Line v-else :data="chartData" :options="chartOptions as any" :width="chartWidth" :height="chartHeight" />
            </div>
          </div>
        </div>

        <div class="legend">
          <span class="legend-item teal">&lt;0 öre</span>
          <span class="legend-item green">0–50 öre</span>
          <span class="legend-item yellow">50–100 öre</span>
          <span class="legend-item orange">100–150 öre</span>
          <span class="legend-item red">&gt;150 öre</span>
        </div>
      </template>

      <div v-else-if="currentView === 'day'" class="state-overlay">
        <span>Ingen data tillgänglig</span>
      </div>
    </main>
  </div>
</template>
