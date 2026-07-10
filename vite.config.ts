import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'pwa-192.png',
        'pwa-512.png',
        'icon.svg',
        'splash-1170x2532.png',
        'splash-1290x2796.png',
      ],
      manifest: {
        name: 'Emberforge',
        short_name: 'Emberforge',
        description: 'Thy body is thy covenant. Tend the flame.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
})
