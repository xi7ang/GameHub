import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

// MPA 多页入口：每页一个 html，页面间用 query 传参，不引 vue-router
const pages = ['index', 'category', 'resource', 'search', 'changelog', 'disclaimer', 'admin']
const input = {}
for (const p of pages) {
  input[p] = resolve(__dirname, `${p}.html`)
}

export default defineConfig({
  base: '/GameHub/', // 非 username.github.io 仓库，Pages 部署在子路径
  plugins: [vue()],
  build: {
    outDir: 'dist',
    rollupOptions: { input },
    minify: 'esbuild',
    sourcemap: false,
  },
})
