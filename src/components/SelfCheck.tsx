import { useEffect, useState } from 'react'
import styles from './SelfCheck.module.css'

interface Row {
  label: string
  value: string
  ok?: boolean
}

/**
 * 安装自检面板：把手机上无法安装时需要的判断依据一次显示出来，
 * 不必再来回截图排查。仅在用户展开时渲染。
 */
export default function SelfCheck() {
  const [rows, setRows] = useState<Row[]>([])
  const [manifestJson, setManifestJson] = useState('')

  useEffect(() => {
    let cancelled = false

    const build = async () => {
      const out: Row[] = []
      const ua = navigator.userAgent

      out.push({ label: '浏览器 UA', value: ua })
      out.push({ label: '页面地址', value: location.href })
      out.push({
        label: '安全上下文（HTTPS）',
        value: String(window.isSecureContext),
        ok: window.isSecureContext,
      })
      out.push({
        label: '独立窗口运行中',
        value: String(
          window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as Navigator & { standalone?: boolean }).standalone === true,
        ),
      })

      // Service Worker
      const swSupported = 'serviceWorker' in navigator
      out.push({ label: '支持 Service Worker', value: String(swSupported), ok: swSupported })
      if (swSupported) {
        let controller = navigator.serviceWorker.controller
        if (!controller) {
          try {
            const reg = await navigator.serviceWorker.getRegistration()
            controller = reg?.active ?? null
          } catch {
            /* ignore */
          }
        }
        out.push({
          label: 'SW 已激活并控制页面',
          value: controller ? controller.scriptURL : '否（首次访问或未注册）',
          ok: !!controller,
        })
      }

      // manifest
      const link = document.querySelector<HTMLLinkElement>('link[rel=manifest]')
      const href = link ? link.href : ''
      out.push({ label: 'manifest 地址', value: href || '未找到', ok: !!href })

      if (href) {
        try {
          const res = await fetch(href, { cache: 'no-cache' })
          const text = await res.text()
          const json = JSON.parse(text) as Record<string, unknown>
          if (!cancelled)
            setManifestJson(
              `id: ${json.id}\nstart_url: ${json.start_url}\nscope: ${json.scope}\ndisplay: ${json.display}\nname: ${json.name}`,
            )
          out.push({ label: 'manifest 可解析', value: '是', ok: true })
        } catch (e) {
          out.push({ label: 'manifest 可解析', value: `否：${String(e)}`, ok: false })
        }
      }

      if (!cancelled) setRows(out)
    }

    void build()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className={styles.panel}>
      <div className={styles.title}>🔍 安装自检</div>
      <table className={styles.table}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th>{r.label}</th>
              <td className={r.ok === false ? styles.bad : r.ok ? styles.good : ''}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.blockTitle}>manifest 内容</div>
      <pre className={styles.pre}>{manifestJson || '读取中…'}</pre>

      <div className={styles.blockTitle}>安装事件</div>
      <p className={styles.hint}>
        若底部提示条显示「安装到主屏」，说明浏览器已提供安装能力；
        若只显示「查看安装步骤」，说明当前浏览器没有触发 <code>beforeinstallprompt</code>
        （国产自带浏览器、微信内打开，或该应用已经安装过）。
      </p>
    </div>
  )
}
