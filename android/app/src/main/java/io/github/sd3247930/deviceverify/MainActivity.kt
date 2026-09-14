package io.github.sd3247930.deviceverify

import android.app.Activity
import android.content.Intent
import android.content.res.AssetManager
import android.os.Bundle
import android.view.KeyEvent
import android.view.ViewGroup
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import java.io.IOException

/**
 * 设备校验提醒器 —— WebView 壳。
 *
 * 设计要点：
 * 1. 优先加载线上地址，网页内容改动不需要重新安装 APK；
 * 2. 断网时回退到 APK 内置的 assets/offline（沿用真实域名），
 *    保证兜底页面与线上页面同源，localStorage 不会分裂成两份；
 * 3. 非本站域名的链接交给系统浏览器，避免在应用内迷路。
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView
    private var usingLocalAssets = false

    companion object {
        private const val SITE_HOST = "sd3247930.github.io"
        private const val SITE_PATH = "/device-verify/"
        private const val REMOTE_URL = "https://$SITE_HOST$SITE_PATH"
        private const val OFFLINE_ASSET_PREFIX = "offline/"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadsImagesAutomatically = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = false
            setSupportZoom(false)
            builtInZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        // 给 WebView 的 UA 追加标记：网页据此识别「运行在 APK 内」，
        // 从而隐藏右上角「📲 安装」入口（避免在 App 里让用户再下载一次自己）。
        webView.settings.userAgentString = "${webView.settings.userAgentString} DeviceVerifyApp"

        webView.webViewClient = object : WebViewClient() {

            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest,
            ): WebResourceResponse? {
                // 正常联网时全部走网络，只有进入离线兜底后才用 APK 内置资源
                if (!usingLocalAssets) return null
                return openLocalAsset(request.url.host, request.url.path, assets)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val url = request.url
                val inApp = url.host == SITE_HOST && url.path?.startsWith(SITE_PATH) == true
                if (inApp) return false
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                    true
                } catch (_: Exception) {
                    true
                }
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
                // 主文档加载失败 → 切到 APK 内置页面
                if (request.isForMainFrame && !usingLocalAssets) {
                    usingLocalAssets = true
                    Toast.makeText(this@MainActivity, R.string.offline_hint, Toast.LENGTH_LONG).show()
                    view.loadUrl(REMOTE_URL)
                }
            }
        }

        setContentView(webView)
        webView.loadUrl(REMOTE_URL)
    }

    /**
     * 把 https://sd3247930.github.io/device-verify/xxx 映射到 APK 内的 assets/offline/xxx。
     * 自己实现而不用 WebViewAssetLoader，是为了让路径映射完全确定、不依赖库的版本差异。
     */
    private fun openLocalAsset(
        host: String?,
        path: String?,
        assetManager: AssetManager,
    ): WebResourceResponse? {
        if (host != SITE_HOST) return null
        if (path == null || !path.startsWith(SITE_PATH)) return null

        var relative = path.removePrefix(SITE_PATH)
        if (relative.isEmpty()) relative = "index.html"
        // 防止 ../ 之类的越权访问
        if (relative.contains("..")) return null

        return try {
            val stream = assetManager.open(OFFLINE_ASSET_PREFIX + relative, AssetManager.ACCESS_STREAMING)
            WebResourceResponse(mimeOf(relative), null, stream)
        } catch (_: IOException) {
            // 本地没有这个文件时返回 null，让 WebView 按普通流程处理
            null
        }
    }

    private fun mimeOf(path: String): String = when {
        path.endsWith(".html") -> "text/html"
        path.endsWith(".js") || path.endsWith(".mjs") -> "application/javascript"
        path.endsWith(".css") -> "text/css"
        path.endsWith(".json") || path.endsWith(".webmanifest") -> "application/manifest+json"
        path.endsWith(".png") -> "image/png"
        path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
        path.endsWith(".svg") -> "image/svg+xml"
        path.endsWith(".ico") -> "image/x-icon"
        path.endsWith(".woff2") -> "font/woff2"
        path.endsWith(".woff") -> "font/woff"
        path.endsWith(".txt") -> "text/plain"
        else -> "application/octet-stream"
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
