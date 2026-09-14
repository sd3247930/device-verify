import { useEffect, useMemo, useState } from 'react'
import styles from './InstallGuide.module.css'

/** Chrome/Edge 的安装事件（Safari、安卓第三方浏览器与 WebView 不触发） */
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

/** 独立 APK 的下载页 */
const APK_URL = 'https://github.com/sd3247930/device-verify/releases/latest'

/**
 * 忽略标记独立命名，避免与同源的「四合一工具集」共用同一个 localStorage 键：
 * 同源 → 存储共享，若沿用 install_guide_dismissed，
 * 用户在工具集点过一次 ✕，本应用装上后就永远不会显示安装入口。
 */
const DISMISS_KEY = 'device_verify_install_guide_dismissed'

/** 等待 beforeinstallprompt 的兜底时间（只用于把 UI 从「等待中」切到「步骤」） */
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

function isAndroidDevice(): boolean {
  return /Android/i.test(navigator.userAgent)
}

function browserName(b: BrowserKind, android: boolean): string {
  if (b === 'edge' && android) return 'Edge 安卓版'
  if (b === 'chrome' && android) return 'Chrome 安卓版'
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

/**
 * 只有实现了 WebAPK 安装管线的浏览器才可能给出安装入口。
 *
 * 关键事实：**Edge 安卓版不实现 beforeinstallprompt**，也拿不到 WebAPK minting 服务，
 * 只能「创建快捷方式」（快捷方式仍在 Edge 里打开）。所以安卓上的 Edge 一律按「装不成独立应用」处理。
 * 出处：MicrosoftEdge/MSEdgeExplainers issue #660；本机真机实测见诊断报告。
 */
function supportsInstallToHomeScreen(browser: BrowserKind, android: boolean): boolean {
  if (browser === 'chrome') return true
  if (browser === 'samsung') return true
  if (browser === 'edge') return !android
  return false
}

interface ManualSteps {
  title: string
  steps: string[]
  showApkHint?: boolean
}

function manualSteps(browser: BrowserKind, isIOS: boolean, android: boolean): ManualSteps {
  if (IN_APP.includes(browser)) {
    return {
      title: `当前在 ${browserName(browser, android)} 中打开，无法安装`,
      steps: [
        '点右上角「···」→ 选择「在浏览器中打开」',
        '换到 Chrome 后，再点页面上的「安装到主屏」',
        '国产手机自带浏览器大多也装不成独立应用，建议直接用下方的 APK',
      ],
      showApkHint: android,
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
    case 'edge':
      return android
        ? {
            title: 'Edge 安卓版不提供「安装应用」能力',
            steps: [
              'Edge 安卓版没有实现安装事件，也拿不到 WebAPK 打包能力',
              '它的「安装」实际是创建快捷方式，点开仍在 Edge 里打开，不算独立应用',
              '想要独立图标：改用 Chrome，或直接安装下方的独立 APK',
            ],
            showApkHint: true,
          }
        : {
            title: 'Edge 安装步骤（桌面版）',
            steps: [
              '点地址栏右侧的「安装」图标，或右上角「…」→「应用」→「安装此站点为应用」',
              '在弹窗里点「安装」确认',
            ],
          }
    case 'chrome':
      return {
        title: 'Chrome 安装步骤',
        steps: ['点右上角「⋮」打开菜单', '选择「安装应用」或「添加到主屏幕」', '在弹窗里点「安装」确认'],
      }
    case 'honorbrowser':
      return {
        title: '荣耀 / 华为浏览器：只能建桌面快捷方式',
        steps: [
          '这种浏览器不提供真正的「安装应用」，装不成独立 App',
          '菜单里的「添加到桌面」只能得到书签，点开仍在浏览器里',
          '想要独立应用，请安装下方的 APK，或改用 Chrome',
        ],
        showApkHint: android,
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
        title: 'Firefox 不支持安装网页应用',
        steps: ['改用 Chrome 并点「安装到主屏」', '或直接安装下方的独立 APK'],
        showApkHint: android,
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
        showApkHint: android,
      }
  }
}

/** 国产 ROM 常见「装完不能独立启动/没有图标」的补充设置 */
const ROM_TIPS: Partial<Record<Brand, string>> = {
  honor: '荣耀/华为：安装 APK 时若提示「未经安全检测」或被纯净模式拦截，请选择继续安装。',
  huawei: '荣耀/华为：安装 APK 时若提示「未经安全检测」或被纯净模式拦截，请选择继续安装。',
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
  const android = useMemo(() => isAndroidDevice(), [])
  const inApp = IN_APP.includes(browser)

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [waited, setWaited] = useState(false)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [expanded, setExpanded] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  /** 「已安装」的唯一依据：getInstalledRelatedApps() 的返回结果 */
  const [installedApps, setInstalledApps] = useState<unknown[] | null>(null)
  const [barEl, setBarEl] = useState<HTMLDivElement | null>(null)

  /**
   * 底栏是 fixed 定位，会压住页面最底部的内容。
   * 把它真实高度写进 CSS 变量，由页脚预留等高空间。
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
      window.matchMedia('(display-mode: minimal-ui)'),
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

  /** 用真实 API 判断「是否已经装过」，而不是靠计时器猜 */
  useEffect(() => {
    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<unknown[]>
    }
    if (typeof nav.getInstalledRelatedApps !== 'function') {
      setInstalledApps(null)
      return
    }
    let cancelled = false
    nav
      .getInstalledRelatedApps()
      .then((apps) => {
        if (!cancelled) setInstalledApps(apps)
      })
      .catch(() => {
        if (!cancelled) setInstalledApps(null)
      })
    return () => {
      cancelled = true
    }
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
  // 明确知道当前浏览器装不了独立应用
  const cannotInstall =
    inApp || browser === 'firefox' || !supportsInstallToHomeScreen(browser, android)
  // 只有 API 真的返回了记录，才说「已经装过」
  const reallyInstalled = Array.isArray(installedApps) && installedApps.length > 0
  const guide = manualSteps(browser, isIOS, android)
  const tip = ROM_TIPS[brand]
  const stepsVisible = expanded || inApp

  // 用户点过「不再提示」后完全隐藏；顶栏「📲 安装」仍可唤回
  if (dismissed) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.card} ref={setBarEl}>
        <div className={styles.row}>
          <span className={styles.text}>
            {canPrompt
              ? '📲 安装到主屏，可离线使用'
              : `📲 安装到主屏（当前：${browserName(browser, android)}）`}
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

            <div className={styles.actions}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={copyLink}>
                {copied ? '已复制 ✓' : '复制网址'}
              </button>
              {(guide.showApkHint || cannotInstall) && (
                <a
                  className={`${styles.btn} ${styles.btnApk}`}
                  href={APK_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  ⬇ 下载独立 APK
                </a>
              )}
            </div>

            {tip && <div className={styles.tip}>{tip}</div>}
          </div>
        )}

        {!stepsVisible && waited && !canPrompt && (
          <div className={styles.tip}>
            {reallyInstalled
              ? '检测到本机已安装过本应用，所以浏览器不再提供安装入口。'
              : cannotInstall
                ? `${browserName(browser, android)} 不提供「安装应用」能力。点「查看安装步骤」换到 Chrome，或直接下载 APK。`
                : '当前浏览器未提供自动安装入口，点「查看安装步骤」按提示操作即可。'}
          </div>
        )}

        {failed && !canPrompt && (
          <div className={styles.tip}>
            自动安装未完成。可以再试一次，或按上面的步骤 / 下载 APK 安装。
          </div>
        )}
      </div>
    </div>
  )
}
