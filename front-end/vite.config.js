import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // เรียก /api/... จาก front-end → ส่งต่อไปที่ back-end (port 3000) ให้อัตโนมัติ
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
