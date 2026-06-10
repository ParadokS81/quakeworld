<script setup lang="ts">
// Dumb row renderer (D15): receives one already-shaped row plus the view's
// active column set, and toggles a local expand panel. It loads nothing and
// derives nothing -- every field below is read straight off the row prop.
// `expanded` is pure UI state (allowed; not data-fetch/derivation).
import { ref } from 'vue'
import type { BrowseRow, ColumnKey } from '../../../lib/browse-types'

defineProps<{ row: BrowseRow; columns: ColumnKey[] }>()

const expanded = ref(false)
</script>

<template>
  <!-- D22: :id is the case-folded anchor so /<codebase>/<type>#<name> scrolls here -->
  <div
    :id="row.anchor"
    class="grid items-start gap-3 px-3 py-1.5 border-b border-base-300 cursor-pointer hover:bg-base-200"
    style="grid-template-columns: var(--cols)"
    @click="expanded = !expanded"
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
      <!-- Full description: plain text in v1, line breaks preserved (no auto-linking) -->
      <p v-if="row.descriptionFull !== undefined" style="white-space: pre-line">{{ row.descriptionFull }}</p>

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

      <!-- Phase 4 reverse-index slot: deliberately empty in v1 (no dead UI). -->
    </div>
  </div>
</template>
