/**
 * 运行环境判断。
 *
 * APK 壳（android/app/.../MainActivity.kt）会在 WebView 的 UA 末尾追加
 * `DeviceVerifyApp` 标记；网页版浏览器不会带这个标记，
 * 因此可以用它区分「网页版」与「APK 内」，按环境裁剪 UI。
 */
const IN_APP_MARK = 'DeviceVerifyApp'

/** 是否运行在独立 APK（WebView 壳）内 */
export function isInApp(): boolean {
  return navigator.userAgent.includes(IN_APP_MARK)
}

/** 当前运行环境的可读名称，便于排查问题时展示 */
export function runtimeName(): string {
  return isInApp() ? 'APK' : '浏览器'
}
