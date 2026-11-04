import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

/** DIDAC booth demo — a separate, installable PWA that reuses the main app's utilities and photo manifest. */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  publicDir: 'public',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'media/*.jpg', 'video/*.mp4'],
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2,mp4}'], navigateFallback: 'index.html', maximumFileSizeToCacheInBytes: 12_000_000 },
      manifest: {
        name: 'DPDPA for Schools · MediaGuard demo',
        short_name: 'MediaGuard',
        description: 'Consent-driven school media management — interactive prototype with synthetic data.',
        theme_color: '#14213d',
        background_color: '#faf6ee',
        display: 'standalone',
        orientation: "any",
        start_url: './',
        scope: './',
        shortcuts: [
          { name: 'Parent app', url: './?role=parent', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'School admin', url: './?role=admin', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Booth kit', url: './?role=booth', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  build: { outDir: '../dist-didac', emptyOutDir: true },
  server: { port: 5174, host: true },
})
