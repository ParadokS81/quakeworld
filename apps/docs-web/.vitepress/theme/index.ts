import DefaultTheme from 'vitepress/theme'
import CodebaseGrid from './components/CodebaseGrid.vue'
import EntityBrowse from './components/EntityBrowse.vue'
import CodebaseLanding from './components/CodebaseLanding.vue'
import GlobalSearch from './components/GlobalSearch.vue'
import './style.css'

// Extend the default theme (keeps VitePress nav / sidebar / local-search
// batteries -- D9) and layer Tailwind + daisyUI on top via style.css. Register
// landing + browse components globally so per-codebase and per-type pages can
// mount them. If preflight reconciliation forces a custom Layout instead of
// `extends`, switch here.
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CodebaseGrid', CodebaseGrid)
    app.component('EntityBrowse', EntityBrowse)
    app.component('CodebaseLanding', CodebaseLanding)
    app.component('GlobalSearch', GlobalSearch)
  }
}
