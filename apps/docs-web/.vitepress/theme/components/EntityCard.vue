<script setup lang="ts">
// Dumb row renderer (D15): receives one already-shaped row plus the view's
// active column set, and toggles a local expand panel. It loads nothing and
// derives nothing -- every field below is read straight off the row prop.
// `expanded` and `flash` are pure UI state (allowed; not data-fetch/derivation).
// `isTarget` is a boolean signal from the parent that triggers auto-expand +
// scroll when this card's anchor is the current hash target (F17).
import { ref, watch, onMounted, nextTick, useTemplateRef } from 'vue'
import type { BrowseRow, ColumnKey } from '../../../lib/browse-types'

const props = defineProps<{ row: BrowseRow; columns: ColumnKey[]; isTarget?: boolean }>()

const expanded = ref(false)
const flash = ref(false)
const rootEl = useTemplateRef<HTMLElement>('rootEl')

function activate() {
  expanded.value = true
  flash.value = true
  // scroll after the panel renders; idempotent on repeat calls
  nextTick(() => rootEl.value?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
}
// Parent sets the target signal in ITS onMounted (fires AFTER this child's
// onMounted, since Vue mounts children first), so the watch -- not this
// onMounted -- catches the first true on a fresh deep-link load. Both kept;
// activate() is idempotent.
onMounted(() => { if (props.isTarget) activate() })
watch(() => props.isTarget, (v) => { if (v) activate() })
</script>

<template>
  <!-- D22: :id is the case-folded anchor so /<codebase>/<type>#<name> scrolls here -->
  <div
    ref="rootEl"
    :id="row.anchor"
    class="grid items-start gap-3 px-3 py-1.5 border-b border-base-300 cursor-pointer hover:bg-base-200"
    :class="{ 'entity-flash': flash }"
    style="grid-template-columns: var(--cols)"
    @click="expanded = !expanded"
    @animationend="flash = false"
  >
    <!-- Name cell (always) -->
    <div class="flex items-center gap-2 min-w-0">
      <span
        class="inline-block transition-transform text-base-content/50"
        :class="{ 'rotate-90': expanded }"
        aria-hidden="true"
      >&rsaquo;</span>
      <span class="font-mono truncate">{{ row.name }}</span>
    </div>

    <!-- Type cell (only when the view carries a Type column) -->
    <div v-if="columns.includes('type')" class="min-w-0">
      <span v-if="row.friendlyType" class="badge badge-ghost">{{ row.friendlyType }}</span>
    </div>

    <!-- Default cell (only when the view carries a Default column) -->
    <div v-if="columns.includes('default')" class="font-mono truncate text-base-content/80">
      <template v-if="row.default !== undefined">{{ row.default }}</template>
    </div>

    <!-- Description preview (always): one-line truncated teaser; full text on hover -->
    <div class="truncate text-base-content/70" :title="row.descriptionFull">
      <template v-if="row.descriptionPreview !== undefined">{{ row.descriptionPreview }}</template>
    </div>

    <!-- Inline expansion: full-width panel directly below, spanning all columns.
         In-place (not a modal, not a new page). @click.stop keeps clicks inside
         the panel from collapsing the row. -->
    <div
      v-if="expanded"
      class="px-1 py-2 text-sm"
      style="grid-column: 1 / -1; max-width: 90ch"
      @click.stop
    >
      <!-- Full description: segments rendered where cvar links were resolved at build
           time (D7/D15/D19); falls back to plain text when no links exist (D11). -->
      <template v-if="row.descriptionSegments !== undefined">
        <p style="white-space: pre-line">
          <!-- Index key (Q2 resolution): the segment array is built once at shape
               time and never mutated client-side, so an index key is stable and
               safe -- and it avoids duplicate keys when a description repeats a
               cvar name (e.g. baseskin mentions 'skin' three times). -->
          <template v-for="(seg, i) in row.descriptionSegments" :key="i">
            <a
              v-if="seg.kind === 'link'"
              :href="'#' + seg.anchor"
              class="text-primary underline decoration-dotted"
              @click.stop
            >{{ seg.name }}</a>
            <template v-else>{{ seg.text }}</template>
          </template>
        </p>
      </template>
      <p v-else-if="row.descriptionFull !== undefined" style="white-space: pre-line">{{ row.descriptionFull }}</p>

      <!-- Remarks: caveats / status -->
      <div v-if="row.remarks !== undefined" class="mt-3">
        <div class="font-semibold text-base-content/80">Remarks</div>
        <p style="white-space: pre-line">{{ row.remarks }}</p>
      </div>

      <!-- Values: value-by-value list -->
      <div v-if="row.values !== undefined" class="mt-3">
        <div class="font-semibold text-base-content/80">Values</div>
        <div v-for="v in row.values" :key="v.name" class="mt-1">
          <span class="font-mono font-medium">{{ v.name }}</span>
          <span
            v-if="v.description !== undefined"
            class="text-base-content/70"
            style="white-space: pre-line"
          > - {{ v.description }}</span>
        </div>
      </div>

      <!-- Meta strip: small labeled cluster; each item only when present -->
      <div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-base-content/70">
        <div v-if="row.categoryLabel !== undefined">
          <span class="font-semibold">Category:</span>
          {{ row.categoryLabel }}<template v-if="row.categoryMajor !== undefined"> ({{ row.categoryMajor }})</template>
        </div>
        <div v-if="row.rawType !== undefined">
          <span class="font-semibold">Type:</span> {{ row.rawType }}
        </div>
        <div v-if="row.macroType !== undefined">
          <span class="font-semibold">Expands to:</span> {{ row.macroType }}
        </div>
        <div v-if="row.arguments !== undefined">
          <span class="font-semibold">Arguments:</span> {{ row.arguments }}
        </div>
        <div v-if="row.scope !== undefined">
          <span class="font-semibold">Scope:</span> {{ row.scope }}
        </div>
        <div>
          <span class="font-semibold">Source:</span>
          <a
            v-if="row.sourceUrl !== undefined"
            :href="row.sourceUrl"
            target="_blank"
            rel="noopener"
          >{{ row.sourceRef.file }}:{{ row.sourceRef.line }}</a>
          <!-- graceful degradation (D11): no URL -> plain file:line, no dead link -->
          <span v-else>{{ row.sourceRef.file }}:{{ row.sourceRef.line }}</span>
        </div>
        <!-- Version walk (D8): only for rows with default-value history -->
        <div v-if="row.hasHistory">
          <span class="font-semibold">Version:</span>
          <span v-for="(h, i) in row.history" :key="h.version">
            <template v-if="i > 0">, then </template>{{ h.version }} &rarr; {{ h.value }}</span>
          <span v-if="row.firstSeen !== row.lastSeen"> &middot; Since {{ row.firstSeen }}</span>
        </div>
      </div>

      <!-- Entity->guide reverse-index (D7/D19/D21 amendment 2026-06-09). Renders only
           when usedInGuides is non-empty. In v1 browse.ts always passes [] (render
           suppressed via GUIDES_PORTAL_LIVE -- the guides portal does not exist yet,
           so a /guides/<slug> link would be a dead 404), so this slot shows nothing.
           The markup is ready for when the portal arc flips the flag. -->
      <div v-if="row.usedInGuides !== undefined && row.usedInGuides.length > 0" class="mt-3">
        <span class="font-semibold">Used in:</span>
        <span v-for="(g, i) in row.usedInGuides" :key="g.slug">
          <template v-if="i > 0">, </template>
          <a :href="g.path" class="underline">{{ g.slug }}</a>
        </span>
      </div>
    </div>
  </div>
</template>
