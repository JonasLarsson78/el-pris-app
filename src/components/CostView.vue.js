/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, watch, onMounted } from 'vue';
import { fetchPrices } from '../api/elpris';
import { Zap, Building2, Network, ChevronDown, ChevronUp } from '@lucide/vue';
const props = defineProps();
const electricityProviders = [
    { name: 'Tibber', monthlyFee: 49, markupOre: 6.0 },
    { name: 'Greenely', monthlyFee: 69, markupOre: 0 },
    { name: 'Bixia', monthlyFee: 39, markupOre: 5.0 },
    { name: 'Skellefteå Kraft', monthlyFee: 49, markupOre: 6.0 },
    { name: 'Fortum', monthlyFee: 69, markupOre: 3.9 },
    { name: 'Vattenfall', monthlyFee: 45, markupOre: 8.4 },
    { name: 'E.ON', monthlyFee: 32, markupOre: 10.72 },
    { name: 'Öresundskraft', monthlyFee: 36, markupOre: 2.55 },
];
// ── Elnät ──────────────────────────────────────────────────
const includeGrid = ref(false);
const gridExpanded = ref(false);
const gridMonthlyFee = ref(161); // Abonnemang kr/mån
const gridFixedOre = ref(13.60); // Elöverföring fast
const gridSpotOre = ref(4.71); // Elöverföring spotprisbaserad
const gridEnergyTaxOre = ref(36.00); // Energiskatt
const gridTotalOre = computed(() => gridFixedOre.value + gridSpotOre.value + gridEnergyTaxOre.value);
// ── Månadsväljare ─────────────────────────────────────────
function monthOptions() {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' });
        opts.push({ value, label });
    }
    return opts;
}
const months = monthOptions();
const selectedMonth = ref(months[1].value);
const consumption = ref(null);
const loading = ref(false);
const error = ref(null);
const avgPriceOre = ref(null);
function daysInMonth(yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number);
    const days = [];
    const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        days.push(`${d.getFullYear()}-${mm}-${dd}`);
        d.setDate(d.getDate() + 1);
    }
    return days;
}
async function load() {
    loading.value = true;
    error.value = null;
    avgPriceOre.value = null;
    try {
        const days = daysInMonth(selectedMonth.value);
        const [year] = selectedMonth.value.split('-');
        const results = await Promise.all(days.map(iso => {
            const [, mm, dd] = iso.split('-');
            return fetchPrices({ year: Number(year), date: `${mm}-${dd}`, zone: props.zone })
                .then(entries => entries.map(e => e.pris))
                .catch(() => []);
        }));
        const all = results.flat();
        if (!all.length)
            throw new Error('Ingen data för vald månad');
        avgPriceOre.value = Math.round(all.reduce((s, v) => s + v, 0) / all.length * 100) / 100;
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
    }
    finally {
        loading.value = false;
    }
}
const results = computed(() => {
    if (avgPriceOre.value == null || !consumption.value)
        return [];
    const kwh = consumption.value;
    const grid = includeGrid.value
        ? (kwh * gridTotalOre.value) / 100 + gridMonthlyFee.value
        : 0;
    return electricityProviders
        .map(p => {
        const energyCost = (kwh * avgPriceOre.value) / 100;
        const markupCost = (kwh * p.markupOre) / 100;
        const total = energyCost + markupCost + p.monthlyFee + grid;
        return {
            ...p,
            energyCost: Math.round(energyCost),
            markupCost: Math.round(markupCost * 10) / 10,
            gridCost: Math.round(grid),
            total: Math.round(total),
        };
    })
        .sort((a, b) => a.total - b.total);
});
const cheapestProvider = computed(() => results.value[0] ?? null);
const maxTotal = computed(() => Math.max(...results.value.map(r => r.total), 1));
function fmt(n) {
    return n.toLocaleString('sv-SE');
}
watch(() => props.zone, load);
watch(selectedMonth, load);
onMounted(load);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cost-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cost-controls" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cost-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedMonth),
    ...{ class: "cost-select" },
});
for (const [m] of __VLS_getVForSourceType((__VLS_ctx.months))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (m.value),
        value: (m.value),
    });
    (m.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cost-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cost-input-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "0",
    placeholder: "0",
    ...{ class: "cost-input" },
});
(__VLS_ctx.consumption);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "cost-unit" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.gridExpanded = !__VLS_ctx.gridExpanded;
        } },
    ...{ class: "grid-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ onClick: () => { } },
    ...{ class: "grid-toggle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.includeGrid);
const __VLS_0 = {}.Network;
/** @type {[typeof __VLS_components.Network, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    size: (14),
}));
const __VLS_2 = __VLS_1({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "grid-expand-btn" },
});
if (!__VLS_ctx.gridExpanded) {
    const __VLS_4 = {}.ChevronDown;
    /** @type {[typeof __VLS_components.ChevronDown, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        size: (15),
    }));
    const __VLS_6 = __VLS_5({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
}
else {
    const __VLS_8 = {}.ChevronUp;
    /** @type {[typeof __VLS_components.ChevronUp, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: (15),
    }));
    const __VLS_10 = __VLS_9({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
}
if (__VLS_ctx.gridExpanded) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid-fields" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "grid-field-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cost-input-wrap small" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        ...{ class: "cost-input" },
    });
    (__VLS_ctx.gridMonthlyFee);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cost-unit" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "grid-field-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cost-input-wrap small" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.01",
        ...{ class: "cost-input" },
    });
    (__VLS_ctx.gridFixedOre);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cost-unit" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "grid-field-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cost-input-wrap small" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.01",
        ...{ class: "cost-input" },
    });
    (__VLS_ctx.gridSpotOre);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cost-unit" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "grid-field-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cost-input-wrap small" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        step: "0.01",
        ...{ class: "cost-input" },
    });
    (__VLS_ctx.gridEnergyTaxOre);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cost-unit" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid-total" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.gridTotalOre.toFixed(2));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.gridMonthlyFee);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cost-results" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.error);
}
else if (__VLS_ctx.avgPriceOre !== null) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cost-stats" },
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
    (__VLS_ctx.avgPriceOre);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    if (__VLS_ctx.consumption && __VLS_ctx.cheapestProvider) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stat-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stat-value min" },
        });
        (__VLS_ctx.cheapestProvider.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stat-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stat-value min" },
        });
        (__VLS_ctx.fmt(__VLS_ctx.cheapestProvider.total));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        if (__VLS_ctx.includeGrid) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "stat" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "stat-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "stat-value" },
            });
            (__VLS_ctx.fmt(__VLS_ctx.cheapestProvider.gridCost));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        }
    }
    if (!__VLS_ctx.consumption) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "state-overlay" },
        });
        const __VLS_12 = {}.Zap;
        /** @type {[typeof __VLS_components.Zap, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            size: (28),
            ...{ style: {} },
        }));
        const __VLS_14 = __VLS_13({
            size: (28),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "provider-list" },
        });
        for (const [p, i] of __VLS_getVForSourceType((__VLS_ctx.results))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (p.name),
                ...{ class: (['provider-row', { cheapest: i === 0 }]) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "provider-rank" },
            });
            (i + 1);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "provider-info" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "provider-name" },
            });
            const __VLS_16 = {}.Building2;
            /** @type {[typeof __VLS_components.Building2, ]} */ ;
            // @ts-ignore
            const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
                size: (13),
            }));
            const __VLS_18 = __VLS_17({
                size: (13),
            }, ...__VLS_functionalComponentArgsRest(__VLS_17));
            (p.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "provider-meta" },
            });
            (p.monthlyFee);
            (p.markupOre);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "provider-bar-wrap" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ...{ class: "provider-bar" },
                ...{ style: ({ width: (p.total / __VLS_ctx.maxTotal * 100) + '%' }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "provider-total" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "provider-price" },
            });
            (__VLS_ctx.fmt(p.total));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "provider-breakdown" },
            });
            (__VLS_ctx.fmt(p.energyCost));
            (p.markupCost);
            (p.monthlyFee);
            if (__VLS_ctx.includeGrid) {
                (__VLS_ctx.fmt(p.gridCost));
            }
        }
    }
}
/** @type {__VLS_StyleScopedClasses['cost-view']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-field']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-select']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-field']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-input-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-unit']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-section']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-header']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-expand-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-field']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-input-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-unit']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-field']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-input-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-unit']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-field']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-input-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-unit']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-field']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-input-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-unit']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-total']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-results']} */ ;
/** @type {__VLS_StyleScopedClasses['state-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['state-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-stats']} */ ;
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
/** @type {__VLS_StyleScopedClasses['min']} */ ;
/** @type {__VLS_StyleScopedClasses['stat']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['state-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['provider-list']} */ ;
/** @type {__VLS_StyleScopedClasses['provider-rank']} */ ;
/** @type {__VLS_StyleScopedClasses['provider-info']} */ ;
/** @type {__VLS_StyleScopedClasses['provider-name']} */ ;
/** @type {__VLS_StyleScopedClasses['provider-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['provider-bar-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['provider-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['provider-total']} */ ;
/** @type {__VLS_StyleScopedClasses['provider-price']} */ ;
/** @type {__VLS_StyleScopedClasses['provider-breakdown']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Zap: Zap,
            Building2: Building2,
            Network: Network,
            ChevronDown: ChevronDown,
            ChevronUp: ChevronUp,
            includeGrid: includeGrid,
            gridExpanded: gridExpanded,
            gridMonthlyFee: gridMonthlyFee,
            gridFixedOre: gridFixedOre,
            gridSpotOre: gridSpotOre,
            gridEnergyTaxOre: gridEnergyTaxOre,
            gridTotalOre: gridTotalOre,
            months: months,
            selectedMonth: selectedMonth,
            consumption: consumption,
            loading: loading,
            error: error,
            avgPriceOre: avgPriceOre,
            results: results,
            cheapestProvider: cheapestProvider,
            maxTotal: maxTotal,
            fmt: fmt,
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
