import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the same build also works inside an Android APK (Capacitor) later.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5180, strictPort: true, host: true },
})
