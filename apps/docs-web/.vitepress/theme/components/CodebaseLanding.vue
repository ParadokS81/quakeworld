<script setup lang="ts">
// Dumb per-codebase landing (D15): reads the pre-shaped CodebaseLandingData off
// route params -- no data loading, no derivation. The build-time loader already
// shaped the payload; this component only renders it.
import { computed } from 'vue'
import { useData } from 'vitepress'
import type { CodebaseLandingData } from '../../../lib/browse-types'

const { params } = useData()
const landing = computed(() => params.value.landing as CodebaseLandingData)
</script>

<template>
  <div>
    <!-- Heading driven by data (D14: no hardcoded codebase name) -->
    <h1 class="text-2xl font-semibold mb-4">{{ landing.displayName }}</h1>

    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
      <a
        v-for="t in landing.types"
        :key="t.type"
        :href="`/${landing.codebase}/${t.type}`"
        class="card bg-base-200 border border-base-300 hover:bg-base-300 transition-colors"
      >
        <div class="card-body p-4">
          <div class="card-title text-base text-base-content">{{ t.type }}</div>
          <div class="flex items-center gap-2 mt-1">
            <span class="badge badge-primary">{{ t.count }}</span>
            <span class="text-xs text-base-content/60">{{ t.version }}</span>
          </div>
        </div>
      </a>
    </div>
  </div>
</template>
