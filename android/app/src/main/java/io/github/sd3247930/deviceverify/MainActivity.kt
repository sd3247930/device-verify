package io.github.sd3247930.deviceverify

import android.app.Activity
import android.content.Intent
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
import androidx.webkit.WebViewAssetLoader

/**
 * 设备校验提醒器 —— WebView 壳。
 *
 * 设计要点：
 * 1. 优先加载线上地址，内容改动无需重新安装 APK；
 * 2. 断网时回退到打包进 APK 的 assets/www（同一域名，localStorage 不会分裂成两份）；
 * 3. 非本站域名的链接交给系统浏览器，避免在应用内迷路。
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var usingLocalAssets = false

    companion object {
        private const val SITE_HOST = "sd3247930.github.io"
        private const val SITE_PATH = "/device-verify/"
        private const val REMOTE_URL = "https://$SITE_HOST$SITE_PATH"
        private const val LOCAL_ENTRY = "https://$SITE_HOST${SITE_PATH}index.html"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 用真实域名做 WebViewAssetLoader 的 domain：
        // 兜底页面与线上页面同源，localStorage 才是同一份
        assetLoader = WebViewAssetLoader.Builder()
            .setDomain(SITE_HOST)
            .addPathHandler(SITE_PATH, WebViewAssetLoader.AssetsPathHandler(this, "www"))
            .build()

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

        webView.webViewClient = object : WebViewClient() {

            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest,
            ): WebResourceResponse? {
                // 只有进入离线兜底模式后才用本地资源，正常联网时全部走网络
                if (!usingLocalAssets) return null
                return assetLoader.shouldInterceptRequest(request.url)
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
                    view.loadUrl(LOCAL_ENTRY)
                }
            }
        }

        setContentView(webView)
        webView.loadUrl(REMOTE_URL)
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
