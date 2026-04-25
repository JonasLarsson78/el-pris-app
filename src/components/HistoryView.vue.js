/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, watch, onMounted } from 'vue';
import { AlertTriangle } from '@lucide/vue';
import { Bar } from 'vue-chartjs';
import { fetchPrices } from '../api/elpris';
const props = defineProps();
const days = ref([]);
const loading = ref(false);
const error = ref(null);
function toISODate(d) {
    return d.toISOString().slice(0, 10);
}
function dayLabel(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
}
async function load() {
    loading.value = true;
    error.value = null;
    days.value = [];
    try {
        const results = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const iso = toISODate(d);
            const [, month, day] = iso.split('-');
            const prices = await fetchPrices({ year: Number(iso.slice(0, 4)), date: `${month}-${day}`, zone: props.zone });
            const vals = prices.map(p => p.pris);
            if (!vals.length)
                continue;
            const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10;
            results.push({
                iso,
                label: dayLabel(iso),
                avg,
                min: Math.round(Math.min(...vals) * 10) / 10,
                max: Math.round(Math.max(...vals) * 10) / 10,
            });
        }
        days.value = results;
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        loading.value = false;
    }
}
const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
const isDark = ref(darkMQ.matches);
darkMQ.addEventListener('change', e => { isDark.value = e.matches; });
const tickColor = computed(() => isDark.value ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)');
const gridColor = computed(() => isDark.value ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)');
function barColor(avg) {
    if (avg < 0)
        return 'rgba(0, 199, 190, 0.85)';
    if (avg < 50)
        return 'rgba(52, 199, 89, 0.85)';
    if (avg < 100)
        return 'rgba(255, 204, 0, 0.85)';
    if (avg < 150)
        return 'rgba(255, 149, 0, 0.85)';
    return 'rgba(255, 59, 48, 0.85)';
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
}));
const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    layout: { padding: { bottom: 8 } },
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx) => `${ctx.parsed.y} öre/kWh snitt`,
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
                callback: (v) => `${v} ö`,
            },
            beginAtZero: true,
        },
    },
}));
const cheapestDay = computed(() => days.value.length ? [...days.value].sort((a, b) => a.avg - b.avg)[0] : null);
const mostExpensiveDay = computed(() => days.value.length ? [...days.value].sort((a, b) => b.avg - a.avg)[0] : null);
watch(() => props.zone, load);
onMounted(load);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "history" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "state-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "spinner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "state-overlay error" },
    });
    const __VLS_0 = {}.AlertTriangle;
    /** @type {[typeof __VLS_components.AlertTriangle, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: (32),
    }));
    const __VLS_2 = __VLS_1({
        size: (32),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.error);
}
else if (__VLS_ctx.days.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-stats" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-value min" },
    });
    (__VLS_ctx.cheapestDay?.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-sub" },
    });
    (__VLS_ctx.cheapestDay?.avg);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-value max" },
    });
    (__VLS_ctx.mostExpensiveDay?.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-sub" },
    });
    (__VLS_ctx.mostExpensiveDay?.avg);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-chart" },
    });
    const __VLS_4 = {}.Bar;
    /** @type {[typeof __VLS_components.Bar, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        data: (__VLS_ctx.chartData),
        options: __VLS_ctx.chartOptions,
    }));
    const __VLS_6 = __VLS_5({
        data: (__VLS_ctx.chartData),
        options: __VLS_ctx.chartOptions,
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-row header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    for (const [d] of __VLS_getVForSourceType((__VLS_ctx.days))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (d.iso),
            ...{ class: "history-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "day-label" },
        });
        (d.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "price-min" },
        });
        (d.min);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "price-avg" },
        });
        (d.avg);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "price-max" },
        });
        (d.max);
    }
}
/** @type {__VLS_StyleScopedClasses['history']} */ ;
/** @type {__VLS_StyleScopedClasses['state-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['state-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['history-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['stat']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['min']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['stat']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['max']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['history-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['history-table']} */ ;
/** @type {__VLS_StyleScopedClasses['history-row']} */ ;
/** @type {__VLS_StyleScopedClasses['header']} */ ;
/** @type {__VLS_StyleScopedClasses['history-row']} */ ;
/** @type {__VLS_StyleScopedClasses['day-label']} */ ;
/** @type {__VLS_StyleScopedClasses['price-min']} */ ;
/** @type {__VLS_StyleScopedClasses['price-avg']} */ ;
/** @type {__VLS_StyleScopedClasses['price-max']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AlertTriangle: AlertTriangle,
            Bar: Bar,
            days: days,
            loading: loading,
            error: error,
            chartData: chartData,
            chartOptions: chartOptions,
            cheapestDay: cheapestDay,
            mostExpensiveDay: mostExpensiveDay,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
