import { useState } from 'react'
import ReminderPage from './pages/ReminderPage'
import InstallGuide, { OPEN_INSTALL_GUIDE } from './components/InstallGuide'
import SelfCheck from './components/SelfCheck'
import styles from './App.module.css'

/**
 * 设备校验提醒器（独立 PWA）
 * 只包含提醒器本身 + 常驻安装入口 + 安装自检面板。
 */
export default function App() {
  const [showCheck, setShowCheck] = useState(false)

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.logo}>📋</span>
          <span className={styles.brandText}>设备校验提醒器</span>
        </div>
        <button
          className={styles.installBtn}
          onClick={() => window.dispatchEvent(new Event(OPEN_INSTALL_GUIDE))}
          title="安装到手机主屏"
        >
          📲 安装
        </button>
      </header>

      <main className={styles.main}>
        <ReminderPage />

        <div className={styles.checkWrap}>
          <button className={styles.checkToggle} onClick={() => setShowCheck((v) => !v)}>
            {showCheck ? '收起安装自检 ▴' : '安装自检 ▾'}
          </button>
          {showCheck && <SelfCheck />}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>数据保存在本机浏览器中，关闭页面不丢失</p>
        <p className={styles.footerTip}>📴 首次访问后即可离线使用</p>
      </footer>

      {/* 安装引导：常驻入口 + 按浏览器能力三分支 */}
      <InstallGuide />
    </div>
  )
}
