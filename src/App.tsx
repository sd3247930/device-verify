import ReminderPage from './pages/ReminderPage'
import InstallGuide, { OPEN_INSTALL_GUIDE } from './components/InstallGuide'
import { isInApp } from './utils/env'
import styles from './App.module.css'

/**
 * 设备校验提醒器（独立 PWA）
 * 只包含提醒器本身 + 安装入口（点击才弹出面板）。
 *
 * 安装自检面板已按要求下线（组件文件仍保留在 components/SelfCheck.tsx，
 * 需要排查问题时临时引回即可）。
 * APK 内通过 UA 标记隐藏「安装」按钮，避免出现「自己下载自己」的入口。
 */
export default function App() {
  const inApp = isInApp()

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.logo}>📋</span>
          <span className={styles.brandText}>设备校验提醒器</span>
        </div>
        {!inApp && (
          <button
            className={styles.installBtn}
            onClick={() => window.dispatchEvent(new Event(OPEN_INSTALL_GUIDE))}
            title="安装到手机主屏 / 下载独立 APK"
          >
            📲 安装
          </button>
        )}
      </header>

      <main className={styles.main}>
        <ReminderPage />
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
