import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 請將 'REPOSITORY_NAME' 替換為您的 GitHub 儲存庫名稱
export default defineConfig({
  plugins: [react()],
  base: '/menutran/',
})
