<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useData } from 'vitepress'
import { filterEntries } from '../../../lib/filter'
import { groupByCategory } from '../../../lib/category'
import EntityCard from './EntityCard.vue'
import type { BrowseData } from '../../../lib/browse-types'

// The route's render-ready slice, shaped at build time and read here off the
// params ref -- this component loads nothing and derives nothing beyond the
// interactive narrowing/grouping below, both of which delegate to lib/.
const { params } = useData()
const browse = computed(() => params.value.browse as BrowseData)

const query = ref('')      // free-text filter (D3)
const grouped = ref(false) // Flat (false) vs Grouped-by-category (true), D3

const visible = computed(() => filterEntries(browse.value.rows, query.value))
const sections = computed(() =>
  grouped.value
    ? groupByCategory(visible.value)
    : [{ category: null as string | null, rows: visible.value }]
)

// F17: parent-owned hash signal. One ref here; one boolean per card below.
// location/window are browser-only -- referenced only inside onMounted and the
// event handlers below, never at setup-body top level (SSR-safety).
const currentAnchor = ref('')
const listEl = useTemplateRef<HTMLElement>('listEl')

function readHash() {
  // decodeURIComponent (not URLSearchParams) so a '+'-prefixed command anchor
  // like +attack survives: decodeURIComponent leaves '+' untouched, decoding
  // only %xx escapes.
  currentAnchor.value = decodeURIComponent(location.hash.slice(1))
}

// Capture-phase click handler for in-page anchor clicks. Capture (3rd arg true)
// runs top-down BEFORE the cvar-link's own bubble-phase @click.stop, so this
// fires even though that .stop blocks ordinary bubble delegation. Router-
// independent: works whether or not VitePress emits a hashchange for a same-
// page hash navigation. We read the clicked anchor's target id and set the
// signal directly; we do NOT preventDefault, so the browser still updates the
// URL hash and scrolls.
function onInPageClick(e: MouseEvent) {
  const a = (e.target as HTMLElement | null)?.closest('a[href^="#"]')
  if (!a) return
  const href = a.getAttribute('href') || ''
  currentAnchor.value = decodeURIComponent(href.slice(1))
}

onMounted(() => {
  readHash()
  window.addEventListener('hashchange', readHash)
  listEl.value?.addEventListener('click', onInPageClick, true)
})
onUnmounted(() => {
  window.removeEventListener('hashchange', readHash)
  listEl.value?.removeEventListener('click', onInPageClick, true)
})

// Shared grid track set, derived ONCE from activeColumns and inherited (via the
// --cols custom property) by the header and every row so columns never zigzag.
// Fixed order: Name | Type? | Default? | Description. Built with a ternary
// chain over .includes -- no array-derivation helpers.
const cols = computed(() => {
  const c = browse.value.activeColumns
  const name = 'minmax(12rem, 16rem)'
  const type = c.includes('type') ? ' minmax(6rem, 8rem)' : ''
  const def = c.includes('default') ? ' minmax(6rem, 10rem)' : ''
  const desc = ' 1fr'
  return name + type + def + desc
})
</script>

<template>
  <div>
    <!-- Heading + count + snapshot. Labels come from the data (browse.displayName /
         browse.type), never from a hardcoded name -- D14. -->
    <h1 class="text-2xl font-semibold mb-4">{{ browse.displayName }} / {{ browse.type }}</h1>
    <p class="text-base-content/60 mt-1">
      {{ visible.length }} of {{ browse.rows.length }} &middot; snapshot {{ browse.version }}
    </p>

    <!-- Controls: free-text filter + (conditional) Flat/Grouped toggle -->
    <div class="flex flex-wrap items-center gap-4 my-4">
      <input
        v-model="query"
        type="text"
        class="input w-full max-w-md"
        placeholder="Filter by name or description..."
      />
      <!-- Render the toggle ONLY where category is meaningful (D3/D11) -->
      <label v-if="browse.hasCategories" class="label cursor-pointer gap-2">
        <span class="text-sm">Group by category</span>
        <input v-model="grouped" type="checkbox" class="toggle" />
      </label>
    </div>

    <!-- One list container owning the shared track set via --cols -->
    <div ref="listEl" :style="{ '--cols': cols }">
      <!-- Sticky column header on the SAME grid template -->
      <div
        class="grid gap-4 px-3 py-1.5 sticky top-0 z-10 bg-base-100 border-b-2 border-base-300 font-semibold text-xs uppercase tracking-wide text-base-content/70"
        style="grid-template-columns: var(--cols)"
      >
        <div>Name</div>
        <div v-if="browse.activeColumns.includes('type')">Type</div>
        <div v-if="browse.activeColumns.includes('default')">Default</div>
        <div>Description</div>
      </div>

      <template v-for="section in sections" :key="section.category ?? '__flat__'">
        <!-- Group header only when grouping is active (section.category non-null) -->
        <div v-if="section.category !== null" class="divider text-sm">
          {{ section.category }} ({{ section.rows.length }})
        </div>
        <EntityCard
          v-for="row in section.rows"
          :key="row.anchor"
          :row="row"
          :columns="browse.activeColumns"
          :is-target="row.anchor === currentAnchor"
        />
      </template>

      <!-- Empty state -->
      <p v-if="visible.length === 0" class="px-3 py-6 text-base-content/60">No matches.</p>
    </div>
  </div>
</template>
