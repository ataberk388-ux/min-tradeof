import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'app-icon.svg'],
      manifest: {
        name: 'Crypto Spot Terminal',
        short_name: 'CryptoTerm',
        description: 'Binance tarzı kripto spot trading terminali — paper trading + fiyat alarmları',
        theme_color: '#0B0E11',
        background_color: '#0B0E11',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Agir kutuphaneleri ayri chunk'lara bol -> daha iyi cache + lazy sayfalarla
        // birlikte ilk acilis yukunu dusurur.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-recharts'
          if (id.includes('lightweight-charts')) return 'vendor-chart'
          if (id.includes('@tanstack') || id.includes('axios')) return 'vendor-query'
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          return undefined
        },
      },
    },
  },
})
