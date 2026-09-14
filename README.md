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

## 安装

手机用 **Edge 或 Chrome** 打开本页 → 点页面上的「安装到主屏」。

荣耀/华为自带浏览器、微信/QQ/钉钉内置浏览器不提供真正的应用到主屏安装，
只能建书签快捷方式；此时请点页面上的「复制网址」，换到 Edge / Chrome 再装。

页面底部有「安装自检」面板，可显示 UA、`beforeinstallprompt`、Service Worker 状态、
`display-mode` 与 manifest 解析结果，用于定位装不上的具体环节。

## 开发

```bash
npm install
npm run dev
npm run build     # tsc --noEmit && vite build
npm run preview
```

推送 `main` 后由 GitHub Actions 自动部署。
