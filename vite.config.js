import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'  // 必须引入React插件

export default defineConfig({
  plugins: [react()],  // 启用React插件
  base: './',         // 关键：设置相对路径，确保部署后资源能加载
})
