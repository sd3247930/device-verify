import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// 独立部署在 GitHub Pages 项目站点：https://sd3247930.github.io/device-verify/
// id / start_url / scope 三者必须一致且带该前缀，
// 否则从主屏图标启动会落到域名根（GitHub 无站点 → 404）。
const base = '/device-verify/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        id: base,
        name: '设备校验提醒器',
        short_name: '设备校验',
        description: '设备校验日期提醒：≤30 天橙色预警、≤7 天红色预警，数据保存在本地',
        theme_color: '#2563eb',
        background_color: '#f0f4f8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        lang: 'zh-CN',
        dir: 'ltr',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // maskable 单独一张：把图标缩到安全区内，避免安卓启动器裁掉边角
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [new RegExp(`^${base}api/`)],
      },
    }),
  ],
})
