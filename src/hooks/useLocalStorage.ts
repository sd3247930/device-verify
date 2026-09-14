import { useEffect, useState } from 'react'

/**
 * 读写 localStorage 的 JSON 值。
 *
 * 注意：本应用与「四合一工具集」同源（sd3247930.github.io），
 * localStorage 是同一份，因此设备清单的键 device_calibration_list 保持与工具集一致，
 * 用户在任一应用里维护的设备都会自动同步到另一个。
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // 忽略存储失败（如隐私模式）
    }
  }, [key, value])

  return [value, setValue] as const
}
