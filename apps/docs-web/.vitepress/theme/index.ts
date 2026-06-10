import DefaultTheme from 'vitepress/theme'
import CodebaseGrid from './components/CodebaseGrid.vue'
import './style.css'

// Extend the default theme (keeps VitePress nav / sidebar / local-search
// batteries -- D9) and layer Tailwind + daisyUI on top via style.css. Register
// the landing proof component globally so index.md can mount it. If preflight
// reconciliation forces a custom Layout instead of `extends`, switch here.
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CodebaseGrid', CodebaseGrid)
  }
}
