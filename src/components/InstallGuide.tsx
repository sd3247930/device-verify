import { useEffect, useState } from 'react'
import { isInApp } from '../utils/env'
import styles from './InstallGuide.module.css'

/** 顶栏「安装」按钮通过该事件唤起引导面板 */
export const OPEN_INSTALL_GUIDE = 'device-verify-open-install-guide'

/**
 * 独立 APK 直链：固定名产物 device-verify.apk（CI 额外产出一份固定名），
 * 走 releases/latest 路径 → 以后升版不必再改这里。
 */
const APK_URL =
  'https://github.com/sd3247930/device-verify/releases/latest/download/device-verify.apk'

/** 下载时保存的文件名 */
const APK_FILENAME = 'device-verify.apk'

/**
 * 历史版本用过的「不再提示」标记键名。
 * 面板已改为「点击右上角安装按钮才弹出」，该标记废弃；
 * 仍在挂载时清理一次，避免老用户刷新后以为安装入口消失了。
 */
const DISMISS_KEY = 'device_verify_install_guide_dismissed'

/**
 * 面板标题：统一为「📥 下载应用」（方案甲）。
 * 原先按浏览器能力分支显示「📲 安装到主屏，可离线使用」的逻辑已弃用，见文件末尾注释块。
 */
const PANEL_TITLE = '📥 下载应用'

/** 说明区文案：2 段（照文档原文，引号统一用中文引号） */
const NOTE_PARAGRAPHS: Array<{ title: string; body: string }> = [
  {
    title: '为什么要安装：',
    body: '浏览器只能生成“快捷方式”，点开仍在浏览器里运行。要让它像独立 App 一样启动，需要安装 APK。安装后主屏会出现独立图标，打开后无地址栏，断网也能用，数据仍保存在本机。',
  },
  {
    title: '数据迁移与安装提示：',
    body: '先在本页点“下载应用（APK）”，装好 APK 后，在 APK 里点“导入设备清单”即可完成数据迁移。安装时若被 MagicOS、MIUI、ColorOS 等国产 ROM 拦截，请允许“安装未知应用”并选择继续安装。',
  },
]

/**
 * 安装/下载引导面板。
 *
 * 方案甲后的职责只有一件：告诉用户「怎么把网页数据搬进独立 APK，并把 APK 下回来」。
 * - 默认不渲染，只有点击右上角「📲 安装」才弹出，不会遮挡表单；
 * - 主按钮是 APK 直链，点了直接下载，不再跳 GitHub Release 页；
 * - APK 内（UA 带 DeviceVerifyApp）与已独立运行（standalone）时不显示任何入口。
 */
export default function InstallGuide() {
  const [open, setOpen] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [cardEl, setCardEl] = useState<HTMLDivElement | null>(null)

  /** 清掉历史版本的「不再提示」标记：保证刷新后安装入口照常显示 */
  useEffect(() => {
    try {
      localStorage.removeItem(DISMISS_KEY)
    } catch {
      /* 隐私模式忽略 */
    }
  }, [])

  /** 已作为独立窗口运行（PWA 已安装 / APK 内）时不再提示 */
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

  /** 顶栏「安装」按钮唤起面板（唯一打开入口） */
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_INSTALL_GUIDE, onOpen)
    return () => window.removeEventListener(OPEN_INSTALL_GUIDE, onOpen)
  }, [])

  /**
   * 面板打开时把真实高度写进 CSS 变量，页脚据此预留空间；
   * 面板关闭后清除变量，页面底部不再长期留白。
   */
  useEffect(() => {
    const root = document.documentElement
    if (!cardEl || !open) {
      root.style.removeProperty('--install-bar-height')
      return
    }
    const sync = () => {
      const h = cardEl.getBoundingClientRect().height
      root.style.setProperty('--install-bar-height', `${Math.ceil(h) + 26}px`)
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(cardEl)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--install-bar-height')
    }
  }, [cardEl, open])

  /** 关闭面板：只关本次，不写任何持久标记 */
  const close = () => setOpen(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText('https://sd3247930.github.io/device-verify/')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  // APK 内不显示任何安装/下载入口，避免「自己下载自己」
  if (isInApp()) return null
  if (standalone) return null
  if (!open) return null

  return (
    <div className={styles.wrap}>
      {/* 遮罩：点空白处关闭 */}
      <div className={styles.backdrop} onClick={close} />

      <div
        className={styles.card}
        ref={setCardEl}
        role="dialog"
        aria-modal="true"
        aria-label="下载应用"
      >
        <div className={styles.row}>
          <span className={styles.text}>{PANEL_TITLE}</span>
          <button className={styles.close} onClick={close} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className={styles.actions}>
          <a
            className={`${styles.btn} ${styles.btnDownload}`}
            href={APK_URL}
            download={APK_FILENAME}
            rel="noreferrer"
          >
            📥 下载应用（APK）
          </a>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={copyLink}>
            {copied ? '已复制 ✓' : '复制网址'}
          </button>
        </div>

        <div className={styles.notes}>
          {NOTE_PARAGRAPHS.map((p) => (
            <p key={p.title}>
              <strong>{p.title}</strong>
              {p.body}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ===== 弃用逻辑（安装到主屏 / 按浏览器分支引导）整块注释保留，需要时取消注释即可恢复 =====

原理说明：安卓 Edge 不实现 beforeinstallprompt，也拿不到 WebAPK 打包能力，
所谓「安装」只会创建快捷方式；因此产品上改为统一引导下载独立 APK（方案甲）。

// —— 类型 ——
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
type Brand = 'honor' | 'huawei' | 'xiaomi' | 'oppo' | 'vivo' | 'samsung' | 'other'
type BrowserKind =
  | 'chrome' | 'edge' | 'samsung' | 'miui' | 'heytap' | 'honorbrowser'
  | 'wechat' | 'qq' | 'dingtalk' | 'firefox' | 'safari' | 'other'

// —— 环境识别 ——
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
    chrome: 'Chrome', edge: 'Edge', samsung: '三星浏览器', miui: '小米浏览器',
    heytap: 'OPPO / 一加浏览器', honorbrowser: '荣耀 / 华为浏览器',
    wechat: '微信内置浏览器', qq: 'QQ 内置浏览器', dingtalk: '钉钉内置浏览器',
    firefox: 'Firefox', safari: 'Safari', other: '当前浏览器',
  }
  return map[b]
}
const IN_APP: BrowserKind[] = ['wechat', 'qq', 'dingtalk']
function supportsInstallToHomeScreen(browser: BrowserKind, android: boolean): boolean {
  if (browser === 'chrome') return true
  if (browser === 'samsung') return true
  if (browser === 'edge') return !android
  return false
}

// —— 分浏览器步骤引导 ——
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
        '点底部中间（iOS 15+ 在地址栏左侧）的「分享」按钮',
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

// —— 国产 ROM 补充提示 ——
const ROM_TIPS: Partial<Record<Brand, string>> = {
  honor: '荣耀/华为：安装 APK 时若提示「未经安全检测」或被纯净模式拦截，请选择继续安装。',
  huawei: '荣耀/华为：安装 APK 时若提示「未经安全检测」或被纯净模式拦截，请选择继续安装。',
  xiaomi: '小米：安装时若弹出「允许创建快捷方式」，请点允许，否则主屏不会出现图标。',
  oppo: 'OPPO/一加：若主屏没有图标，请到「设置 → 应用管理」确认应用已创建。',
  vivo: 'vivo：若主屏没有图标，请到「设置 → 应用管理」确认应用已创建。',
  samsung: '三星：若装完无法独立启动，请在「设置 → 应用程序 → 该应用 → 电池」取消限制。',
}

// —— 原生安装事件与安装动作 ——
const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
const [failed, setFailed] = useState(false)

useEffect(() => {
  const onPrompt = (e: Event) => {
    e.preventDefault()
    setDeferred(e as BeforeInstallPromptEvent)
  }
  const onInstalled = () => setDeferred(null)
  window.addEventListener('beforeinstallprompt', onPrompt)
  window.addEventListener('appinstalled', onInstalled)
  return () => {
    window.removeEventListener('beforeinstallprompt', onPrompt)
    window.removeEventListener('appinstalled', onInstalled)
  }
}, [])

const install = async () => {
  if (!deferred) return
  try {
    await deferred.prompt()
    const choice = await deferred.userChoice
    setDeferred(null)
    if (choice.outcome !== 'accepted') setFailed(true)
  } catch {
    setDeferred(null)
    setFailed(true)
  }
}

// —— 原面板中的相关片段 ——
const canPrompt = !!deferred && !IN_APP.includes(detectBrowser(navigator.userAgent)) && !isIOSDevice()
const titleByEnv = canPrompt || isIOSDevice() ? '📲 安装到主屏，可离线使用' : '📥 下载独立 APK 安装'
const guide = manualSteps(detectBrowser(navigator.userAgent), isIOSDevice(), isAndroidDevice())
const tip = ROM_TIPS[detectBrand(navigator.userAgent)]

{canPrompt && (
  <button className={styles.btn} onClick={install}>
    安装到主屏
  </button>
)}

<div className={styles.steps}>
  <div className={styles.stepsTitle}>{guide.title}</div>
  <ol>
    {guide.steps.map((s) => (
      <li key={s}>{s}</li>
    ))}
  </ol>
</div>

{tip && <div className={styles.tip}>{tip}</div>}

===== 弃用逻辑结束 ===== */
