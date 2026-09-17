import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react()],
  base: '/',

  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer
      ]
    }
  },

  server: {
    port: 3000,
    // Ilman tätä Node sitoo dev-serverin vain IPv6-osoitteeseen [::1], jolloin
    // selain saa ERR_CONNECTION_REFUSED yrittäessään osoitetta 127.0.0.1.
    // true = kuuntele kaikkia osoitteita (myös lähiverkko, ks. Network-rivi).
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
