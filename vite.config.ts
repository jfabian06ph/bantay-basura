import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true, // expose on the local network so you can open it on your phone
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-mark-192.png', 'logo-mark-512.png'],
      manifest: {
        name: 'Bantay Basura',
        short_name: 'BantayBasura',
        description: 'Tingnan. I-flag. Linisin. — i-flag ang basura sa inyong lugar.',
        theme_color: '#101a2d',
        background_color: '#101a2d',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'logo-mark-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo-mark-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'logo-mark-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        // Keep the service worker OFF in dev — it caches stale assets and
        // causes "new JS but old shell" glitches. PWA still works in prod build.
        enabled: false,
      },
    }),
  ],
})
