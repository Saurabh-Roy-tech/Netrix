import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      'events': 'events',
      'util': 'util',
      'crypto': 'crypto-browserify',
      'buffer': 'buffer',
      'process': 'process/browser'
    }
  },
  define: {
    global: 'globalThis', // Define global for browser compatibility
  },
  logLevel: 'warn' // Set log level to 'warn' to reduce console output
})
