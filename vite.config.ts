import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 相对路径，方便部署到 GitHub Pages 的 /keyboardJoy/ 子路径
  base: './',
  plugins: [vue()],
  server: {
    port: 5173,
    host: 'localhost',
  },
})
