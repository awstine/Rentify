import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        '**/rentify-temp/**',
        '**/npm-cache-temp/**',
        '**/dist/**',
        '**/node_modules/**',
      ],
    },
  },
})