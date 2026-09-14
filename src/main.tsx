import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { registerSW } from 'virtual:pwa-register'

// PWA：注册 Service Worker（自动更新 + 离线缓存），scope 为 /device-verify/
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
