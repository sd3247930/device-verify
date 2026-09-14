import { useMemo, useState } from 'react'
import { genId } from '../utils/helpers'
import styles from './DataTransfer.module.css'

export interface TransferDevice {
  id: string
  name: string
  date: string
}

interface Props {
  devices: TransferDevice[]
  onChange: (list: TransferDevice[]) => void
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 解析导入文本：既接受 {"devices":[...]}，也接受裸数组 */
function parseDevices(text: string): TransferDevice[] {
  const raw = text.trim()
  if (!raw) throw new Error('内容为空')
  const json = JSON.parse(raw) as unknown
  const arr = Array.isArray(json)
    ? json
    : typeof json === 'object' && json !== null && Array.isArray((json as { devices?: unknown }).devices)
      ? ((json as { devices: unknown[] }).devices)
      : null
  if (!arr) throw new Error('格式不对：应为设备数组，或带 devices 字段的对象')

  const out: TransferDevice[] = []
  arr.forEach((item, i) => {
    if (typeof item !== 'object' || item === null) throw new Error(`第 ${i + 1} 条不是对象`)
    const it = item as Record<string, unknown>
    const name = typeof it.name === 'string' ? it.name.trim() : ''
    const date = typeof it.date === 'string' ? it.date.trim() : ''
    if (!name) throw new Error(`第 ${i + 1} 条缺少 name`)
    if (!DATE_RE.test(date)) throw new Error(`第 ${i + 1} 条的 date 不是 YYYY-MM-DD：${date}`)
    out.push({ id: typeof it.id === 'string' && it.id ? it.id : genId(), name, date })
  })
  return out
}

/**
 * 设备清单的导出 / 导入。
 * 用途：网页版与独立 APK 的本地存储互相隔离，靠这段 JSON 把数据搬过去（换手机同理）。
 */
export default function DataTransfer({ devices, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const exportText = useMemo(
    () =>
      JSON.stringify(
        { app: 'device-verify', version: 1, exportedAt: new Date().toISOString(), devices },
        null,
        2,
      ),
    [devices],
  )

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage('复制失败：请长按上面的文本手动全选复制')
    }
  }

  const downloadExport = () => {
    try {
      const blob = new Blob([exportText], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `设备校验清单-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMessage('已开始下载 JSON 文件')
    } catch {
      setMessage('下载失败：请改用「复制」')
    }
  }

  const doImport = (mode: 'merge' | 'replace') => {
    try {
      const incoming = parseDevices(importText)
      if (mode === 'replace') {
        onChange(incoming)
        setMessage(`已覆盖导入 ${incoming.length} 条`)
        setImportText('')
        return
      }
      // 不改动传入的数组，构造一份新的再交回去
      const result: TransferDevice[] = devices.map((d) => ({ ...d }))
      const byName = new Map(result.map((d) => [d.name, d]))
      let added = 0
      let updated = 0
      for (const d of incoming) {
        const exist = byName.get(d.name)
        if (exist) {
          if (exist.date !== d.date) updated++
          exist.date = d.date
        } else {
          const copy = { ...d }
          result.push(copy)
          byName.set(copy.name, copy)
          added++
        }
      }
      onChange(result)
      setMessage(`合并完成：新增 ${added} 条，更新 ${updated} 条`)
      setImportText('')
    } catch (e) {
      setMessage(`导入失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className={styles.wrap}>
      <button className={styles.toggle} onClick={() => setOpen((v) => !v)}>
        {open ? '收起导出 / 导入 ▴' : '导出 / 导入设备清单 ▾'}
      </button>

      {open && (
        <div className={styles.panel}>
          <p className={styles.hint}>
            网页版与手机 App 的本地数据互相独立，换设备或换应用时用这段 JSON 搬运。
          </p>

          <div className={styles.block}>
            <div className={styles.label}>导出（当前 {devices.length} 条）</div>
            <textarea className={styles.textarea} readOnly value={exportText} rows={6} />
            <div className={styles.btns}>
              <button className={styles.btn} onClick={copyExport}>
                {copied ? '已复制 ✓' : '复制'}
              </button>
              <button className={styles.btn} onClick={downloadExport}>
                下载 .json
              </button>
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.label}>导入</div>
            <textarea
              className={styles.textarea}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="把导出的 JSON 粘贴到这里"
              rows={6}
            />
            <div className={styles.btns}>
              <button
                className={`${styles.btn} ${styles.primary}`}
                onClick={() => doImport('merge')}
                disabled={!importText.trim()}
              >
                合并导入（同名更新日期）
              </button>
              <button
                className={`${styles.btn} ${styles.danger}`}
                onClick={() => doImport('replace')}
                disabled={!importText.trim()}
              >
                覆盖导入
              </button>
            </div>
          </div>

          {message && <div className={styles.message}>{message}</div>}
        </div>
      )}
    </div>
  )
}
