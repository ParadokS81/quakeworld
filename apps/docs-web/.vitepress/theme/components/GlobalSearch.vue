<script setup lang="ts">
import { ref, shallowRef, computed } from 'vue'
import { data as records } from '../search-records.data'
import { createSearcher, type SearchResult } from '../../../lib/search-index'

const query = ref('')
// Lazy: build the 5016-record index only when the user first focuses the box,
// not during SSR and not on every page load.
const search = shallowRef<((q: string) => SearchResult[]) | null>(null)
function ensureIndex() { if (search.value === null) search.value = createSearcher(records) }
const results = computed<SearchResult[]>(() =>
  search.value !== null && query.value.trim() !== '' ? search.value(query.value).slice(0, 20) : []
)
</script>

<template>
  <div class="w-full max-w-2xl">
    <input
      v-model="query"
      @focus="ensureIndex"
      type="text"
      class="input w-full"
      placeholder="Search 5000+ settings across 6 codebases..."
    />
    <ul v-if="results.length" class="mt-2 border border-base-300 bg-base-200 max-h-96 overflow-y-auto">
      <li v-for="r in results" :key="r.id" class="border-b border-base-300 last:border-b-0">
        <a :href="r.url" class="flex flex-wrap items-baseline gap-2 px-3 py-2 hover:bg-base-300">
          <span class="font-mono">{{ r.name }}</span>
          <span class="badge badge-ghost">{{ r.displayName }}</span>
          <span class="badge badge-ghost">{{ r.type }}</span>
          <span v-if="r.friendlyType" class="text-xs text-base-content/60">{{ r.friendlyType }}</span>
          <span v-if="r.description" class="w-full truncate leading-tight text-sm text-base-content/60">{{ r.description }}</span>
        </a>
      </li>
    </ul>
    <p v-else-if="query.trim() !== ''" class="mt-2 px-3 py-2 text-base-content/60">No matches.</p>
  </div>
</template>
