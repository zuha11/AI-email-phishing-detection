
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,

    https: {
      key: fs.readFileSync(
        path.resolve(import.meta.dirname, 'localhost+1-key.pem')
      ),
      cert: fs.readFileSync(
        path.resolve(import.meta.dirname, 'localhost+1.pem')
      ),
    },
  },
})
