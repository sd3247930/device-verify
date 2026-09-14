# 设备校验提醒器（device-verify）

只包含「设备校验提醒器」的独立 PWA，地址：

**https://sd3247930.github.io/device-verify/**

## 为什么单独一个仓库

原来的「四合一工具集」部署在 `/web-toolbox/`，它的 Service Worker 配了
`navigateFallback: '/web-toolbox/index.html'`，会把该作用域下**所有子路径导航**都返回工具集首页。
因此没法在 `/web-toolbox/verify/` 下再挂一个独立应用（会被劫持）。

本仓库是独立站点，与工具集**路径作用域天然隔离**，互不影响。

## 与工具集的关系

两者同在 `sd3247930.github.io` 这一个源（origin）下，因此：

- **localStorage 共享**：设备清单键 `device_calibration_list` 保持一致，两个应用的数据自动同步；
- 但忽略标记必须用独立键 `device_verify_install_guide_dismissed`，
  否则用户在工具集点过「✕」，本应用的安装入口就被一起隐藏了；
- 清理数据时注意：清除 `sd3247930.github.io` 的站点数据会同时清掉两个应用的本地数据。

## 网页版怎么用

手机浏览器打开 **https://sd3247930.github.io/device-verify/** → 点右上角 **「📲 安装」** →
弹出「📥 下载应用」面板 → 点 **「📥 下载应用（APK）」** 直接下载安装包（不再跳转 GitHub 页面）。

面板里只做一件事：把 APK 下回来，并说明数据怎么搬过去。它**默认不显示**，
只有点击右上角按钮才弹出，因此不会遮挡页面表单。

> 说明区文案（2 段）：
> - **为什么要安装**：浏览器只能生成“快捷方式”，独立 App 需要安装 APK；装好后主屏有独立图标、无地址栏、断网可用。
> - **数据迁移与安装提示**：先在本页点“下载应用（APK）”，装好 APK 后在 APK 内点“导入设备清单”；国产 ROM 拦截时允许“安装未知应用”。

## 独立 APK（v1.0.1）

固定名直链（始终指向最新版）：

**https://github.com/sd3247930/device-verify/releases/latest/download/device-verify.apk**

APK 是 WebView 壳：优先加载线上页面（网页改动无需重装），断网时回退到内置 `assets/offline`。
它会给 WebView 的 UA 追加 `DeviceVerifyApp` 标记，网页据此**隐藏「📲 安装」入口**，
避免在 App 里让用户再下载一次自己。

> 注意：APK 内的本地存储与浏览器**彼此隔离**，数据需要在网页端「导出设备清单」后，
> 在 APK 内「导入设备清单」完成迁移（或直接导出 JSON 再导入）。

## 移动端适配

- 以 **393×852** 为基准实测：无固定元素遮挡页面内容；面板为按需弹出的底部抽屉；
- 触摸目标统一 **≥44px**（顶栏安装按钮、面板按钮、关闭键）；
- `viewport` 带 `maximum-scale=1`，输入框聚焦不缩放；
- 页面底部预留 `calc(48px + env(safe-area-inset-bottom))`，避免被浏览器工具栏盖住。

## 版本历史

| 版本 | 内容 |
| --- | --- |
| v1.0.0 | 首个独立 PWA + WebView 壳 APK |
| v1.0.1 | 安装面板改为点击弹出；「📥 下载应用（APK）」直链；网页删除「安装自检」；APK 内按 UA 隐藏安装按钮；CI 产出固定名 `device-verify.apk` |
| v1.0.2（仅网页） | 面板简化为纯下载面板（去掉「安装到主屏」按钮与 Edge 说明块）；说明区改为 2 段；修复 ✕ 换行错位、底部被工具栏遮挡、JSON 框首行裁切、日期框无提示 |

## 开发

```bash
npm install
npm run dev
npm run build     # tsc --noEmit && vite build
npm run preview
```

推送 `main` 后由 GitHub Actions 自动部署。
