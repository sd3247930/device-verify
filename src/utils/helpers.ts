/** 通用工具函数（移植自 web-toolbox，去掉本应用用不到的部分） */

/** 计算 dateStr（YYYY-MM-DD）距离今天的天数（负数表示已过期） */
export function getDaysDiff(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/** 提醒等级：'urgent'（≤7 天）、'warning'（≤30 天）、'normal' */
export type RemindLevel = 'urgent' | 'warning' | 'normal'

export function getRemindLevel(daysDiff: number): RemindLevel {
  if (daysDiff <= 7 && daysDiff >= 0) return 'urgent'
  if (daysDiff <= 30 && daysDiff >= 0) return 'warning'
  return 'normal'
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${y}年${m}月${d}日`
}

/** 生成唯一 id */
export function genId(): string {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}
