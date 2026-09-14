import { useMemo, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { formatDate, genId, getDaysDiff, getRemindLevel } from '../utils/helpers'
import styles from './ReminderPage.module.css'

/** 设备数据结构 */
interface Device {
  id: string
  name: string
  date: string // YYYY-MM-DD
}

/** 待确认的危险操作 */
type PendingAction =
  | { kind: 'delete'; id: string; name: string }
  | { kind: 'clearAll'; count: number }
  | null

/**
 * 设备校验提醒器。
 * 与工具集版本的区别：不再使用 alert / confirm / prompt ——
 * PWA 独立窗口里原生对话框体验差，改为页内提示与页内确认。
 */
export default function ReminderPage() {
  // 与工具集共用同一个键：同源 localStorage，两边的数据自动一致
  const [devices, setDevices] = useLocalStorage<Device[]>('device_calibration_list', [])

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDate, setEditingDate] = useState('')
  const [pending, setPending] = useState<PendingAction>(null)

  /** 按校验日期从近到远排序 */
  const sorted = useMemo(
    () => [...devices].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [devices],
  )

  /** 概览统计 */
  const summary = useMemo(() => {
    let expired = 0
    let urgent = 0
    let warning = 0
    for (const d of devices) {
      const days = getDaysDiff(d.date)
      if (days < 0) expired++
      else if (days <= 7) urgent++
      else if (days <= 30) warning++
    }
    return { total: devices.length, expired, urgent, warning }
  }, [devices])

  const addDevice = () => {
    const n = name.trim()
    if (!n) {
      setError('请填写设备名称')
      return
    }
    if (!date) {
      setError('请选择校验日期')
      return
    }
    if (devices.some((d) => d.name === n)) {
      setError(`设备「${n}」已存在，请改用其它名称或先删除原记录`)
      return
    }
    setDevices([...devices, { id: genId(), name: n, date }])
    setName('')
    setDate('')
    setError('')
  }

  const startEdit = (dev: Device) => {
    setEditingId(dev.id)
    setEditingDate(dev.date)
    setError('')
  }

  const commitEdit = () => {
    if (!editingId) return
    if (!editingDate) {
      setError('请选择新的校验日期')
      return
    }
    setDevices(devices.map((d) => (d.id === editingId ? { ...d, date: editingDate } : d)))
    setEditingId(null)
    setEditingDate('')
    setError('')
  }

  const confirmPending = () => {
    if (!pending) return
    if (pending.kind === 'delete') {
      setDevices(devices.filter((d) => d.id !== pending.id))
    } else {
      setDevices([])
    }
    setPending(null)
  }

  const renderDevice = (dev: Device) => {
    const days = getDaysDiff(dev.date)
    const level = getRemindLevel(days)
    const editing = editingId === dev.id

    let statusText = ''
    let statusClass = ''
    if (days < 0) {
      statusText = `⚠️ 已过期 ${Math.abs(days)} 天`
      statusClass = styles.urgent
    } else if (level === 'urgent') {
      statusText = `🔴 紧急！仅剩 ${days} 天`
      statusClass = styles.urgent
    } else if (level === 'warning') {
      statusText = `🟠 即将到期（剩 ${days} 天）`
      statusClass = styles.warning
    } else {
      statusText = `✅ 剩余 ${days} 天`
    }

    const itemClass =
      days < 0 ? styles.itemUrgent : level === 'urgent' ? styles.itemUrgent : level === 'warning' ? styles.itemWarning : ''

    return (
      <div key={dev.id} className={`${styles.item} ${itemClass}`}>
        <div className={styles.info}>
          <div className={styles.name}>🔧 {dev.name}</div>
          {editing ? (
            <div className={styles.editRow}>
              <input
                className="input"
                type="date"
                value={editingDate}
                onChange={(e) => setEditingDate(e.target.value)}
              />
              <button className={styles.smallBtnPrimary} onClick={commitEdit}>
                保存
              </button>
              <button className={styles.smallBtn} onClick={() => setEditingId(null)}>
                取消
              </button>
            </div>
          ) : (
            <div className={styles.date}>📅 校验日期：{formatDate(dev.date)}</div>
          )}
        </div>

        <div className={`${styles.status} ${statusClass}`}>{statusText}</div>

        {!editing && (
          <div className={styles.actions}>
            <button className={styles.smallBtn} onClick={() => startEdit(dev)}>
              ✏️ 改期
            </button>
            <button
              className={`${styles.smallBtn} ${styles.del}`}
              onClick={() => setPending({ kind: 'delete', id: dev.id, name: dev.name })}
            >
              🗑️ 删除
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.h1}>📋 设备校验提醒器</h1>
        <p className={styles.sub}>✅ 提前 30 天高亮提醒 · 数据保存在本机</p>
      </div>

      {/* 添加表单 */}
      <div className="card">
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="dev-name">
              设备名称
            </label>
            <input
              id="dev-name"
              className="input"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="例：高压灭菌锅"
              autoComplete="off"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="dev-date">
              下次校验日期
            </label>
            <input
              id="dev-date"
              className="input"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setError('')
              }}
            />
          </div>
          <button className="btn btn-primary" onClick={addDevice}>
            ➕ 添加设备
          </button>
        </div>
        {error && <div className={styles.error}>⚠️ {error}</div>}
      </div>

      {/* 概览 */}
      {summary.total > 0 && (
        <div className={styles.summary}>
          <span>共 {summary.total} 台</span>
          {summary.expired > 0 && <span className={styles.sumUrgent}>已过期 {summary.expired}</span>}
          {summary.urgent > 0 && <span className={styles.sumUrgent}>≤7 天 {summary.urgent}</span>}
          {summary.warning > 0 && <span className={styles.sumWarning}>≤30 天 {summary.warning}</span>}
        </div>
      )}

      {/* 设备清单 */}
      <div className="card">
        <div className={styles.listHead}>
          <h3 className={styles.listTitle}>📌 设备清单</h3>
          {devices.length > 0 && (
            <button
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              onClick={() => setPending({ kind: 'clearAll', count: devices.length })}
            >
              清空全部
            </button>
          )}
        </div>
        {sorted.length === 0 ? (
          <div className="empty-tip">✨ 暂无设备，请在上方添加 ✨</div>
        ) : (
          <div className={styles.list}>{sorted.map(renderDevice)}</div>
        )}
      </div>

      <div className={styles.note}>
        ⏰ 距离校验日 ≤30 天显示橙色预警，≤7 天红色预警。
        <br />
        数据保存在本机浏览器中，关闭页面不丢失。
      </div>

      {/* 页内确认对话框（替代原生 confirm） */}
      {pending && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.dialog}>
            <div className={styles.dialogTitle}>
              {pending.kind === 'delete' ? '删除这台设备？' : '确定删除全部设备？'}
            </div>
            <div className={styles.dialogBody}>
              {pending.kind === 'delete'
                ? `「${pending.name}」的校验记录将被删除，不可撤销。`
                : `共 ${pending.count} 台设备的记录将被删除，不可撤销。`}
            </div>
            <div className={styles.dialogActions}>
              <button className={styles.dialogCancel} onClick={() => setPending(null)}>
                取消
              </button>
              <button className={styles.dialogDanger} onClick={confirmPending}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
