import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) keystorePropsFile.inputStream().use { load(it) }
}

fun secret(envName: String, propName: String): String? =
    System.getenv(envName) ?: keystoreProps.getProperty(propName)

android {
    namespace = "io.github.sd3247930.deviceverify"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.sd3247930.deviceverify"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        resourceConfigurations += listOf("zh", "en")
    }

    val storePath = secret("SIGNING_STORE_FILE", "storeFile")
    val hasKeystore = storePath != null && file(storePath).exists()

    signingConfigs {
        if (hasKeystore) {
            create("release") {
                storeFile = file(storePath!!)
                storePassword = secret("SIGNING_STORE_PASSWORD", "storePassword")
                keyAlias = secret("SIGNING_KEY_ALIAS", "keyAlias")
                keyPassword = secret("SIGNING_KEY_PASSWORD", "keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            // 没有签名配置时退回 debug 签名，保证本地也能出包
            signingConfig =
                if (hasKeystore) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources.excludes += setOf("META-INF/*.kotlin_module")
    }
}

/**
 * 把网页构建产物 (../dist) 复制进 assets/www，作为断网时的兜底页面。
 * 目录不存在时直接跳过（例如尚未执行 npm run build）。
 */
val webDist = rootProject.projectDir.parentFile.resolve("dist")
val copyWebAssets = tasks.register<Copy>("copyWebAssets") {
    onlyIf { webDist.isDirectory }
    from(webDist)
    into(layout.projectDirectory.dir("src/main/assets/www"))
}

tasks.matching { it.name == "preBuild" }.configureEach {
    dependsOn(copyWebAssets)
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.webkit:webkit:1.12.1")
}
