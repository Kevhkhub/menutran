import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 根據您的 GitHub Repository 名稱 "menutran" 進行設定
export default defineConfig({
  plugins: [react()],
  // 重要：GitHub Pages 的路徑必須匹配您的儲存庫名稱
  base: '/menutran/', 
  build: {
    outDir: 'dist',
  }
})
