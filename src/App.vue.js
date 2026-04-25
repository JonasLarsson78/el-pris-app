/// <reference types="../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { getVersion } from '@tauri-apps/api/app';
import { Bar, Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Title, Tooltip, Legend, } from 'chart.js';
import { fetchPrices } from './api/elpris';
import HistoryView from './components/HistoryView.vue';
import CostView from './components/CostView.vue';
import { CalendarDays, History, ChevronLeft, ChevronRight, BarChart2, LineChart, AlertTriangle, RefreshCw, CircleDollarSign, } from '@lucide/vue';
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Title, Tooltip, Legend);
const nowLinePlugin = {
    id: 'nowLine',
    afterDraw(chart) {
        const idx = chart.options.plugins?.nowLine?.index;
        if (idx == null)
            return;
        const meta = chart.getDatasetMeta(0);
        const point = meta.data[idx];
        if (!point)
            return;
        const { ctx, chartArea: { top, bottom } } = chart;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(point.x, top);
        ctx.lineTo(point.x, bottom);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 59, 48, 0.85)';
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        // Liten etikett "Nu"
        const price = chart.options.plugins?.nowLine?.price;
        const label = price != null ? `Nu  ${price} öre` : 'Nu';
        const padding = 6;
        ctx.font = 'bold 11px -apple-system, sans-serif';
        const textW = ctx.measureText(label).width;
        // Bakgrund
        ctx.fillStyle = 'rgba(255, 59, 48, 0.85)';
        const boxX = point.x - textW / 2 - padding;
        const boxY = top + 8;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, textW + padding * 2, 18, 4);
        ctx.fill();
        // Text
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, point.x, boxY + 9);
        ctx.restore();
    },
};
ChartJS.register(nowLinePlugin);
const currentView = ref('day');
const chartType = ref(localStorage.getItem('chartType') ?? 'bar');
watch(chartType, v => localStorage.setItem('chartType', v));
const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
const isDark = ref(darkMQ.matches);
darkMQ.addEventListener('change', e => { isDark.value = e.matches; });
const tickColor = computed(() => isDark.value ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)');
const gridColor = computed(() => isDark.value ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)');
const zones = ['SE1', 'SE2', 'SE3', 'SE4'];
const selectedZone = ref(localStorage.getItem('zone') ?? 'SE4');
watch(selectedZone, v => localStorage.setItem('zone', v));
const selectedDate = ref(todayString());
const prices = ref([]);
const loading = ref(false);
const error = ref(null);
const MONTHS = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'maj': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'dec': 11,
};
// Tiderna från API:et är UTC — parsa med Date.UTC
function parseSwedishDate(s) {
    const parts = s.split(' ');
    const day = parseInt(parts[0]);
    const month = MONTHS[parts[1].replace('.', '')];
    const year = parseInt(parts[2]);
    const [h, m] = parts[3].split(':').map(Number);
    return new Date(Date.UTC(year, month, day, h, m));
}
function toISODate(d) {
    return d.toISOString().slice(0, 10);
}
function todayString() {
    return toISODate(new Date());
}
function tomorrowString() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toISODate(d);
}
function formatDateSv(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function stepDate(days) {
    const d = new Date(selectedDate.value + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const next = toISODate(d);
    if (next <= tomorrowString())
        selectedDate.value = next;
}
const canGoForward = computed(() => selectedDate.value < tomorrowString());
function parseDateParam(iso) {
    const [year, month, day] = iso.split('-');
    return { year: Number(year), date: `${month}-${day}` };
}
async function load() {
    loading.value = true;
    error.value = null;
    try {
        const { year, date } = parseDateParam(selectedDate.value);
        const data = await fetchPrices({ year, date, zone: selectedZone.value });
        prices.value = data.sort((a, b) => parseSwedishDate(a.startTime).getTime() - parseSwedishDate(b.startTime).getTime());
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
        prices.value = [];
    }
    finally {
        loading.value = false;
    }
}
// Parsar UTC-tid och visar som svensk lokal tid: "00:00"
function formatTime(svTime) {
    return parseSwedishDate(svTime).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}
function priceColor(ore) {
    if (ore < 0)
        return 'rgba(0, 199, 190, 0.85)'; // negativ = turkos
    if (ore < 50)
        return 'rgba(52, 199, 89, 0.85)';
    if (ore < 100)
        return 'rgba(255, 204, 0, 0.85)';
    if (ore < 150)
        return 'rgba(255, 149, 0, 0.85)';
    return 'rgba(255, 59, 48, 0.85)';
}
const chartData = computed(() => {
    const ore = prices.value.map(p => Math.round(p.pris * 10) / 10);
    const labels = prices.value.map(p => formatTime(p.startTime));
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
                        borderColor: (ctx) => priceColor(ctx.p1.parsed.y ?? 0),
                    },
                    pointBackgroundColor: ore.map(priceColor),
                },
            ],
        };
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
    };
});
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
                label: (ctx) => `${ctx.parsed.y} öre/kWh`,
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
                callback: (v) => `${v} ö`,
            },
            beginAtZero: true,
        },
    },
}));
const nowIndex = computed(() => {
    if (selectedDate.value !== todayString())
        return null;
    const now = new Date();
    const idx = prices.value.findIndex(p => parseSwedishDate(p.endTime) > now);
    return idx < 0 ? prices.value.length - 1 : idx;
});
const currentPrice = computed(() => {
    const idx = nowIndex.value;
    if (idx == null)
        return null;
    return Math.round(prices.value[idx]?.pris * 10) / 10;
});
const avgPrice = computed(() => {
    if (!prices.value.length)
        return null;
    const avg = prices.value.reduce((s, p) => s + p.pris, 0) / prices.value.length;
    return Math.round(avg * 10) / 10;
});
const minPrice = computed(() => {
    if (!prices.value.length)
        return null;
    return Math.round(Math.min(...prices.value.map(p => p.pris)) * 10) / 10;
});
const maxPrice = computed(() => {
    if (!prices.value.length)
        return null;
    return Math.round(Math.max(...prices.value.map(p => p.pris)) * 10) / 10;
});
const cheapestHours = computed(() => {
    if (!prices.value.length)
        return [];
    // Gruppera kvartar per heltimme
    const hours = new Map();
    for (const p of prices.value) {
        const time = formatTime(p.startTime); // "10:15"
        const hour = time.slice(0, 2) + ':00'; // "10:00"
        if (!hours.has(hour))
            hours.set(hour, []);
        hours.get(hour).push(p.pris);
    }
    // Beräkna snitt per timme
    const sorted = Array.from(hours.entries())
        .map(([hour, vals]) => ({
        hour,
        avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10,
    }))
        .sort((a, b) => a.avg - b.avg);
    return sorted.slice(0, 3);
});
const chartWidth = computed(() => Math.max(900, prices.value.length * 24));
const chartWrap = ref(null);
const chartScroll = ref(null);
const chartHeight = ref(400);
let ro = null;
onMounted(() => {
    ro = new ResizeObserver(entries => {
        const h = entries[0]?.contentRect.height;
        if (h)
            chartHeight.value = Math.floor(h) - 64;
    });
    if (chartWrap.value)
        ro.observe(chartWrap.value);
});
onUnmounted(() => ro?.disconnect());
async function scrollToNow() {
    await nextTick();
    if (!chartScroll.value || !prices.value.length)
        return;
    const now = new Date();
    let idx = prices.value.findIndex(p => parseSwedishDate(p.endTime) > now);
    if (idx < 0)
        idx = prices.value.length - 1;
    const barWidth = chartWidth.value / prices.value.length;
    const scrollX = idx * barWidth - chartScroll.value.clientWidth / 2;
    chartScroll.value.scrollTo({ left: Math.max(0, scrollX), behavior: 'smooth' });
}
watch(prices, () => {
    if (selectedDate.value === todayString())
        scrollToNow();
});
watch(currentView, async (v) => {
    if (v === 'day' && selectedDate.value === todayString())
        scrollToNow();
});
const appVersion = ref('');
watch([selectedZone, selectedDate], load);
onMounted(async () => {
    load();
    appVersion.value = await getVersion();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "app-header" },
    'data-tauri-drag-region': true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "view-tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.currentView = 'day';
        } },
    ...{ class: (['view-tab', { active: __VLS_ctx.currentView === 'day' }]) },
});
const __VLS_0 = {}.CalendarDays;
/** @type {[typeof __VLS_components.CalendarDays, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.currentView = 'history';
        } },
    ...{ class: (['view-tab', { active: __VLS_ctx.currentView === 'history' }]) },
});
const __VLS_4 = {}.History;
/** @type {[typeof __VLS_components.History, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (14),
}));
const __VLS_6 = __VLS_5({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.currentView = 'cost';
        } },
    ...{ class: (['view-tab', { active: __VLS_ctx.currentView === 'cost' }]) },
});
const __VLS_8 = {}.CircleDollarSign;
/** @type {[typeof __VLS_components.CircleDollarSign, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    size: (14),
}));
const __VLS_10 = __VLS_9({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
if (__VLS_ctx.currentView === 'day') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "controls" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "zone-selector" },
    });
    for (const [zone] of __VLS_getVForSourceType((__VLS_ctx.zones))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.currentView === 'day'))
                        return;
                    __VLS_ctx.selectedZone = zone;
                } },
            key: (zone),
            ...{ class: (['zone-btn', { active: __VLS_ctx.selectedZone === zone }]) },
        });
        (zone);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "date-nav" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.currentView === 'day'))
                    return;
                __VLS_ctx.stepDate(-1);
            } },
        ...{ class: "date-arrow" },
    });
    const __VLS_12 = {}.ChevronLeft;
    /** @type {[typeof __VLS_components.ChevronLeft, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (15),
    }));
    const __VLS_14 = __VLS_13({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "date-label" },
    });
    (__VLS_ctx.formatDateSv(__VLS_ctx.selectedDate));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.currentView === 'day'))
                    return;
                __VLS_ctx.stepDate(1);
            } },
        ...{ class: "date-arrow" },
        disabled: (!__VLS_ctx.canGoForward),
    });
    const __VLS_16 = {}.ChevronRight;
    /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: (15),
    }));
    const __VLS_18 = __VLS_17({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-type-selector" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.currentView === 'day'))
                    return;
                __VLS_ctx.chartType = 'bar';
            } },
        ...{ class: (['type-btn', { active: __VLS_ctx.chartType === 'bar' }]) },
        title: "Stapeldiagram",
    });
    const __VLS_20 = {}.BarChart2;
    /** @type {[typeof __VLS_components.BarChart2, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        size: (16),
    }));
    const __VLS_22 = __VLS_21({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.currentView === 'day'))
                    return;
                __VLS_ctx.chartType = 'line';
            } },
        ...{ class: (['type-btn', { active: __VLS_ctx.chartType === 'line' }]) },
        title: "Linjediagram",
    });
    const __VLS_24 = {}.LineChart;
    /** @type {[typeof __VLS_components.LineChart, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        size: (16),
    }));
    const __VLS_26 = __VLS_25({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "controls" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "zone-selector" },
    });
    for (const [zone] of __VLS_getVForSourceType((__VLS_ctx.zones))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.currentView === 'day'))
                        return;
                    __VLS_ctx.selectedZone = zone;
                } },
            key: (zone),
            ...{ class: (['zone-btn', { active: __VLS_ctx.selectedZone === zone }]) },
        });
        (zone);
    }
}
if (__VLS_ctx.appVersion) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "app-version" },
    });
    (__VLS_ctx.appVersion);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "app-main" },
});
if (__VLS_ctx.currentView === 'history') {
    /** @type {[typeof HistoryView, ]} */ ;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent(HistoryView, new HistoryView({
        zone: (__VLS_ctx.selectedZone),
    }));
    const __VLS_29 = __VLS_28({
        zone: (__VLS_ctx.selectedZone),
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
}
else if (__VLS_ctx.currentView === 'cost') {
    /** @type {[typeof CostView, ]} */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(CostView, new CostView({
        zone: (__VLS_ctx.selectedZone),
    }));
    const __VLS_32 = __VLS_31({
        zone: (__VLS_ctx.selectedZone),
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
}
else if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "state-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "spinner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else if (__VLS_ctx.currentView === 'day' && __VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "state-overlay error" },
    });
    const __VLS_34 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
        size: (32),
    }));
    const __VLS_36 = __VLS_35({
        size: (32),
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.error);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.load) },
        ...{ class: "retry-btn" },
    });
    const __VLS_38 = {}.RefreshCw;
    /** @type {[typeof __VLS_components.RefreshCw, ]} */ ;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
        size: (13),
    }));
    const __VLS_40 = __VLS_39({
        size: (13),
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
}
else if (__VLS_ctx.currentView === 'day' && __VLS_ctx.prices.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stats" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-value avg" },
    });
    (__VLS_ctx.avgPrice);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-value min" },
    });
    (__VLS_ctx.minPrice);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-value max" },
    });
    (__VLS_ctx.maxPrice);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.prices.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cheapest" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cheapest-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cheapest-hours" },
    });
    for (const [h, i] of __VLS_getVForSourceType((__VLS_ctx.cheapestHours))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (h.hour),
            ...{ class: "cheapest-hour" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "cheapest-rank" },
        });
        (i + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "cheapest-time" },
        });
        (h.hour);
        (String(Number(h.hour.slice(0, 2)) + 1).padStart(2, '0'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "cheapest-price" },
        });
        (h.avg);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-wrap" },
        ref: "chartWrap",
    });
    /** @type {typeof __VLS_ctx.chartWrap} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-scroll" },
        ref: "chartScroll",
    });
    /** @type {typeof __VLS_ctx.chartScroll} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chart-inner" },
    });
    if (__VLS_ctx.chartType === 'bar') {
        const __VLS_42 = {}.Bar;
        /** @type {[typeof __VLS_components.Bar, ]} */ ;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
            data: (__VLS_ctx.chartData),
            options: __VLS_ctx.chartOptions,
            width: (__VLS_ctx.chartWidth),
            height: (__VLS_ctx.chartHeight),
        }));
        const __VLS_44 = __VLS_43({
            data: (__VLS_ctx.chartData),
            options: __VLS_ctx.chartOptions,
            width: (__VLS_ctx.chartWidth),
            height: (__VLS_ctx.chartHeight),
        }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    }
    else {
        const __VLS_46 = {}.Line;
        /** @type {[typeof __VLS_components.Line, ]} */ ;
        // @ts-ignore
        const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
            data: (__VLS_ctx.chartData),
            options: __VLS_ctx.chartOptions,
            width: (__VLS_ctx.chartWidth),
            height: (__VLS_ctx.chartHeight),
        }));
        const __VLS_48 = __VLS_47({
            data: (__VLS_ctx.chartData),
            options: __VLS_ctx.chartOptions,
            width: (__VLS_ctx.chartWidth),
            height: (__VLS_ctx.chartHeight),
        }, ...__VLS_functionalComponentArgsRest(__VLS_47));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "legend" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "legend-item teal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "legend-item green" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "legend-item yellow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "legend-item orange" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "legend-item red" },
    });
}
else if (__VLS_ctx.currentView === 'day') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "state-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
/** @type {__VLS_StyleScopedClasses['app']} */ ;
/** @type {__VLS_StyleScopedClasses['app-header']} */ ;
/** @type {__VLS_StyleScopedClasses['view-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['zone-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['date-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['date-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['date-label']} */ ;
/** @type {__VLS_StyleScopedClasses['date-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-type-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['zone-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['app-version']} */ ;
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
/** @type {__VLS_StyleScopedClasses['state-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['state-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['retry-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['stats']} */ ;
/** @type {__VLS_StyleScopedClasses['stat']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['avg']} */ ;
/** @type {__VLS_StyleScopedClasses['stat']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['min']} */ ;
/** @type {__VLS_StyleScopedClasses['stat']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['max']} */ ;
/** @type {__VLS_StyleScopedClasses['stat']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['cheapest']} */ ;
/** @type {__VLS_StyleScopedClasses['cheapest-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cheapest-hours']} */ ;
/** @type {__VLS_StyleScopedClasses['cheapest-hour']} */ ;
/** @type {__VLS_StyleScopedClasses['cheapest-rank']} */ ;
/** @type {__VLS_StyleScopedClasses['cheapest-time']} */ ;
/** @type {__VLS_StyleScopedClasses['cheapest-price']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['legend']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['teal']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['green']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['yellow']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['orange']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['red']} */ ;
/** @type {__VLS_StyleScopedClasses['state-overlay']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Bar: Bar,
            Line: Line,
            HistoryView: HistoryView,
            CostView: CostView,
            CalendarDays: CalendarDays,
            History: History,
            ChevronLeft: ChevronLeft,
            ChevronRight: ChevronRight,
            BarChart2: BarChart2,
            LineChart: LineChart,
            AlertTriangle: AlertTriangle,
            RefreshCw: RefreshCw,
            CircleDollarSign: CircleDollarSign,
            currentView: currentView,
            chartType: chartType,
            zones: zones,
            selectedZone: selectedZone,
            selectedDate: selectedDate,
            prices: prices,
            loading: loading,
            error: error,
            formatDateSv: formatDateSv,
            stepDate: stepDate,
            canGoForward: canGoForward,
            load: load,
            chartData: chartData,
            chartOptions: chartOptions,
            avgPrice: avgPrice,
            minPrice: minPrice,
            maxPrice: maxPrice,
            cheapestHours: cheapestHours,
            chartWidth: chartWidth,
            chartWrap: chartWrap,
            chartScroll: chartScroll,
            chartHeight: chartHeight,
            appVersion: appVersion,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
