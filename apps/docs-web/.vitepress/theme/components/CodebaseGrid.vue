<script setup lang="ts">
// Dumb render component (D15): it imports the build-time `data` constant and
// iterates it in the template. No data loading and no array derivation live in
// this component -- the loader (codebases.data.ts) already shaped the data.
// daisyUI classes only.
import { data as codebases } from '../codebases.data'
</script>

<template>
  <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
    <div v-for="cb in codebases" :key="cb.codebase" class="card bg-base-200 border border-base-300">
      <div class="card-body">
        <!-- div, not h2: dodges VitePress .vp-doc h2 prose styling (border-top +
             top margin would band the card); matches CodebaseLanding -->
        <div class="card-title text-base-content">
          <a :href="`/${cb.codebase}`">{{ cb.displayName }}</a>
        </div>
        <div class="flex flex-wrap gap-2">
          <a
            v-for="t in cb.types"
            :key="t.type"
            :href="`/${cb.codebase}/${t.type}`"
            class="badge badge-primary"
          >{{ t.type }} ({{ t.count }})</a>
        </div>
      </div>
    </div>
  </div>
</template>
