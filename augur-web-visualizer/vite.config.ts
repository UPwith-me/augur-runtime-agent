import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // --- 这是修复“实时模式” 404 问题的关键 ---
  server: {
    proxy: {
      // 这条规则告诉 Vite (5173 端口):
      // 任何以 '/api' 开头的请求 (例如 /api/v1/session/.../events)
      // 都应该被转发到 'http://localhost:4000' (后端)
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true, // (必须) 更改请求头中的 origin
      }
    }
  },
  // --- 修复结束 ---

  resolve: {
    alias: {
      '@': path.resolve('src'),
    },
  },
})