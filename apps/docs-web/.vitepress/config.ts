import { defineConfig } from 'vitepress'
import tailwindcss from '@tailwindcss/vite'

// VitePress owns its own Vite config; we inject the Tailwind v4 Vite plugin
// through the `vite` option (Tailwind v4 is a Vite plugin + CSS-first config,
// no tailwind.config.js). data/ and lib/ are excluded from page scanning so
// the JSON snapshots and the plain-TS modules are not treated as content.
export default defineConfig({
  title: 'docs.quake.world',
  description: 'Layer 1 reference for the QuakeWorld ecosystem -- every tunable knob, per codebase.',
  srcExclude: ['data/**', 'lib/**', '**/node_modules/**', 'README.md'],
  themeConfig: {
    nav: [
      { text: 'ezQuake', link: '/ezquake' },
      { text: 'KTX', link: '/ktx' },
      { text: 'MVDSV', link: '/mvdsv' },
      { text: 'QTV', link: '/qtv' },
      { text: 'QWCL', link: '/qwcl' },
      { text: 'QWFWD', link: '/qwfwd' },
      { text: 'Search', link: '/search' }
    ],
    search: { provider: 'local' }
  },
  vite: {
    plugins: [tailwindcss()]
  }
})
