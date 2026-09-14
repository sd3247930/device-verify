import { useEffect, useMemo, useState } from 'react'
import styles from './InstallGuide.module.css'

/** Chrome/Edge 的安装事件（Safari、多数国产浏览器与 WebView 不触发） */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Brand = 'honor' | 'huawei' | 'xiaomi' | 'oppo' | 'vivo' | 'samsung' | 'other'
type BrowserKind =
  | 'chrome'
  | 'edge'
  | 'samsung'
  | 'miui'
  | 'heytap'
  | 'honorbrowser'
  | 'wechat'
  | 'qq'
  | 'dingtalk'
  | 'firefox'
  | 'safari'
  | 'other'

/** 顶栏「安装」按钮通过该事件唤起引导 */
export const OPEN_INSTALL_GUIDE = 'device-verify-open-install-guide'

/**
 * 忽略标记独立命名，避免与同源的「四合一工具集」共用同一个 localStorage 键：
 * 同源 → 存储共享，若沿用 install_guide_dismissed，
 * 用户在工具集点过一次 ✕，本应用装上后就永远不会显示安装入口。
 */
const DISMISS_KEY = 'device_verify_install_guide_dismissed'

/** 等待 beforeinstallprompt 的兜底时间 */
const PROMPT_WAIT_MS = 1500

function detectBrand(ua: string): Brand {
  if (/HONOR|MagicOS/i.test(ua)) return 'honor'
  if (/Huawei|HarmonyOS/i.test(ua)) return 'huawei'
  if (/MIUI|Xiaomi|HyperOS|Redmi|POCO/i.test(ua)) return 'xiaomi'
  if (/OPPO|ColorOS|HeyTap|realme|OnePlus/i.test(ua)) return 'oppo'
  if (/vivo|iQOO|Funtouch|OriginOS/i.test(ua)) return 'vivo'
  if (/Samsung|SM-[A-Z0-9]{2,}/i.test(ua)) return 'samsung'
  return 'other'
}

function detectBrowser(ua: string): BrowserKind {
  if (/MicroMessenger/i.test(ua)) return 'wechat'
  if (/DingTalk/i.test(ua)) return 'dingtalk'
  if (/QQ\/|QQBrowser/i.test(ua)) return 'qq'
  if (/MiuiBrowser/i.test(ua)) return 'miui'
  if (/HeyTapBrowser|OppoBrowser/i.test(ua)) return 'heytap'
  if (/HONORBrowser|HuaweiBrowser/i.test(ua)) return 'honorbrowser'
  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  if (/EdgA|Edg\/|EdgiOS/i.test(ua)) return 'edge'
  if (/FxiOS|Firefox/i.test(ua)) return 'firefox'
  if (/Chrome|CriOS/i.test(ua)) return 'chrome'
  if (/Safari/i.test(ua)) return 'safari'
  return 'other'
}

function isIOSDevice(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function browserName(b: BrowserKind): string {
  const map: Record<BrowserKind, string> = {
    chrome: 'Chrome',
    edge: 'Edge',
    samsung: '三星浏览器',
    miui: '小米浏览器',
    heytap: 'OPPO / 一加浏览器',
    honorbrowser: '荣耀 / 华为浏览器',
    wechat: '微信内置浏览器',
    qq: 'QQ 内置浏览器',
    dingtalk: '钉钉内置浏览器',
    firefox: 'Firefox',
    safari: 'Safari',
    other: '当前浏览器',
  }
  return map[b]
}

/** 应用内浏览器（微信/QQ/钉钉）无法安装 PWA，必须换到系统浏览器 */
const IN_APP: BrowserKind[] = ['wechat', 'qq', 'dingtalk']
/** 基于 Chromium 但通常不提供安装入口的国产内核 */
const LIKELY_NO_INSTALL: BrowserKind[] = ['miui', 'heytap', 'honorbrowser']

/** 实现了 WebAPK 安装管线、正常会给安装入口的浏览器 */
function supportsWebApkInstall(browser: BrowserKind): boolean {
  return browser === 'chrome' || browser === 'edge' || browser === 'samsung'
}

interface ManualSteps {
  title: string
  steps: string[]
}

function manualSteps(browser: BrowserKind, isIOS: boolean): ManualSteps {
  if (IN_APP.includes(browser)) {
    return {
      title: `当前在${browserName(browser)}中打开，无法安装`,
      steps: [
        '点右上角「···」→ 选择「在浏览器中打开」',
        '换到 Edge 或 Chrome 后，再点页面上的「安装到主屏」',
      ],
    }
  }

  if (isIOS) {
    return {
      title: 'iPhone / iPad 安装步骤',
      steps: [
        '点底部中间（iOS 15+ 在地址栏左侧）的「分享」按钮 ⬆',
        '在弹出菜单里选择「添加到主屏幕」',
        '点右上角「添加」',
      ],
    }
  }

  switch (browser) {
    case 'chrome':
      return {
        title: 'Chrome 安装步骤',
        steps: ['点右上角「⋮」打开菜单', '选择「安装应用」或「添加到主屏幕」', '在弹窗里点「安装」确认'],
      }
    case 'edge':
      return {
        title: 'Edge 安装步骤',
        steps: [
          '点右下角「☰」或底部「⋯」打开菜单',
          '选择「安装应用」或「添加到手机」',
          '在系统弹窗里点「安装」确认',
        ],
      }
    case 'honorbrowser':
      return {
        title: '荣耀 / 华为浏览器：只能建桌面快捷方式',
        steps: [
          '这种浏览器不提供真正的「安装应用」，装不成独立 App',
          '点下方「复制网址」，改用 Edge 或 Chrome 打开本页',
          '在 Edge / Chrome 里点「安装到主屏」即可装成独立应用',
        ],
      }
    case 'miui':
      return {
        title: '小米浏览器安装步骤',
        steps: ['点右下角「≡」菜单', '选择「添加到主屏幕」', '若弹窗询问，请点「允许创建快捷方式」'],
      }
    case 'heytap':
      return {
        title: 'OPPO / 一加浏览器安装步骤',
        steps: ['点右下角「≡」菜单', '选择「添加到主屏幕」', '确认后点「添加」'],
      }
    case 'samsung':
      return {
        title: '三星浏览器安装步骤',
        steps: ['点右下角「≡」菜单', '选择「添加页面到」→「主屏幕」', '确认后点「添加」'],
      }
    case 'firefox':
      return {
        title: 'Firefox 暂不支持安装网页应用',
        steps: ['点下方「复制网址」', '改用 Edge 或 Chrome 打开本页', '再点「安装到主屏」'],
      }
    case 'safari':
      return {
        title: 'Safari 安装步骤',
        steps: ['点底部「分享」按钮', '选择「添加到主屏幕」', '点「添加」确认'],
      }
    default:
      return {
        title: '浏览器菜单安装步骤',
        steps: [
          '点右上角「⋮」或「≡」打开菜单',
          '选择「安装应用」或「添加到主屏幕」',
          '在弹窗里点「安装」确认',
        ],
      }
  }
}

/** 国产 ROM 常见「装完不能独立启动/没有图标」的补充设置 */
const ROM_TIPS: Partial<Record<Brand, string>> = {
  honor: '荣耀/华为：若装完无法独立启动，请到「设置 → 应用 → 特殊访问权限」允许自启动。',
  huawei: '荣耀/华为：若装完无法独立启动，请到「设置 → 应用 → 特殊访问权限」允许自启动。',
  xiaomi: '小米：安装时若弹出「允许创建快捷方式」，请点允许，否则主屏不会出现图标。',
  oppo: 'OPPO/一加：若主屏没有图标，请到「设置 → 应用管理」确认应用已创建。',
  vivo: 'vivo：若主屏没有图标，请到「设置 → 应用管理」确认应用已创建。',
  samsung: '三星：若装完无法独立启动，请在「设置 → 应用程序 → 该应用 → 电池」取消限制。',
}

export default function InstallGuide() {
  const ua = navigator.userAgent
  const brand = useMemo(() => detectBrand(ua), [ua])
  const browser = useMemo(() => detectBrowser(ua), [ua])
  const isIOS = useMemo(() => isIOSDevice(), [])
  const inApp = IN_APP.includes(browser)

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [waited, setWaited] = useState(false)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  )
  const [expanded, setExpanded] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const [barEl, setBarEl] = useState<HTMLDivElement | null>(null)

  /**
   * 底栏是 fixed 定位，会压住页面最底部的内容。
   * 这里把它的真实高度写进 CSS 变量，由页脚预留出等高的空间，
   * 展开/收起或换行导致高度变化时也会同步更新。
   */
  useEffect(() => {
    const root = document.documentElement
    if (!barEl) {
      root.style.removeProperty('--install-bar-height')
      return
    }
    const sync = () => {
      const h = barEl.getBoundingClientRect().height
      root.style.setProperty('--install-bar-height', `${Math.ceil(h) + 26}px`)
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(barEl)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--install-bar-height')
    }
  }, [barEl])

  /** 已作为独立应用运行时不再提示 */
  useEffect(() => {
    const queries = [
      window.matchMedia('(display-mode: standalone)'),
      window.matchMedia('(display-mode: fullscreen)'),
    ]
    const sync = () =>
      setStandalone(
        queries.some((q) => q.matches) ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true,
      )
    sync()
    queries.forEach((q) => q.addEventListener('change', sync))
    return () => queries.forEach((q) => q.removeEventListener('change', sync))
  }, [])

  /** 捕获原生安装能力 */
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setWaited(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => setDeferred(null))
    const timer = window.setTimeout(() => setWaited(true), PROMPT_WAIT_MS)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.clearTimeout(timer)
    }
  }, [])

  /** 顶栏「安装」按钮随时可以重新唤起引导（即使之前点过 ✕） */
  useEffect(() => {
    const open = () => {
      setDismissed(false)
      setExpanded(true)
    }
    window.addEventListener(OPEN_INSTALL_GUIDE, open)
    return () => window.removeEventListener(OPEN_INSTALL_GUIDE, open)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* 隐私模式忽略 */
    }
  }

  const install = async () => {
    if (!deferred) return
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      setDeferred(null)
      if (choice.outcome !== 'accepted') {
        setFailed(true)
        setExpanded(true)
      }
    } catch {
      // 事件已被浏览器消费或失效：退回到手动步骤
      setDeferred(null)
      setFailed(true)
      setExpanded(true)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText('https://sd3247930.github.io/device-verify/')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (standalone) return null

  // 安装过程中不能调用 prompt() 的场景
  const canPrompt = !!deferred && !inApp && !isIOS
  // 明确知道当前浏览器装不了
  const cannotInstall = inApp || LIKELY_NO_INSTALL.includes(browser) || browser === 'firefox'
  // 支持安装的浏览器却没触发事件：多半是这台设备已经装过本应用
  const likelyAlreadyInstalled = supportsWebApkInstall(browser) && waited && !canPrompt
  const guide = manualSteps(browser, isIOS)
  const tip = ROM_TIPS[brand]
  const stepsVisible = expanded || inApp

  // 用户点过「不再提示」后完全隐藏；顶栏「📲 安装」仍可唤回
  if (dismissed) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.card} ref={setBarEl}>
        <div className={styles.row}>
          <span className={styles.text}>
            {canPrompt ? '📲 安装到主屏，可离线使用' : `📲 安装到主屏（当前：${browserName(browser)}）`}
          </span>

          {canPrompt ? (
            <button className={styles.btn} onClick={install}>
              安装到主屏
            </button>
          ) : (
            <button className={styles.btn} onClick={() => setExpanded((v) => !v)}>
              {stepsVisible ? '收起步骤' : '查看安装步骤'}
            </button>
          )}

          <button className={styles.close} onClick={dismiss} aria-label="不再提示">
            ✕
          </button>
        </div>

        {stepsVisible && (
          <div className={styles.steps}>
            <div className={styles.stepsTitle}>{guide.title}</div>
            <ol>
              {guide.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>

            {(cannotInstall || !canPrompt) && (
              <div className={styles.actions}>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={copyLink}>
                  {copied ? '已复制 ✓' : '复制网址'}
                </button>
              </div>
            )}

            {tip && <div className={styles.tip}>{tip}</div>}
          </div>
        )}

        {!stepsVisible && waited && !canPrompt && (
          <div className={styles.tip}>
            {cannotInstall
              ? '当前浏览器不提供「安装应用」，请点「查看安装步骤」换到 Edge / Chrome。'
              : likelyAlreadyInstalled
                ? '本设备可能已经装过本应用（浏览器不再提供安装入口）。可先在主屏长按旧图标删除，再重新打开本页。'
              : '当前浏览器未提供自动安装入口，点「查看安装步骤」按提示操作即可。'}
          </div>
        )}

        {failed && !canPrompt && (
          <div className={styles.tip}>
            自动安装未完成。可以再试一次，或按上面的步骤用浏览器菜单安装。
          </div>
        )}
      </div>
    </div>
  )
}
