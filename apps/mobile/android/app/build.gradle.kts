plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val storeRelease = providers.gradleProperty("storeRelease").orNull == "true"
val uploadStoreFile = providers.gradleProperty("DELTCRM_UPLOAD_STORE_FILE").orNull
val uploadStorePassword = providers.gradleProperty("DELTCRM_UPLOAD_STORE_PASSWORD").orNull
val uploadKeyAlias = providers.gradleProperty("DELTCRM_UPLOAD_KEY_ALIAS").orNull
val uploadKeyPassword = providers.gradleProperty("DELTCRM_UPLOAD_KEY_PASSWORD").orNull
val releaseSigningConfigured = listOf(
    uploadStoreFile,
    uploadStorePassword,
    uploadKeyAlias,
    uploadKeyPassword,
).all { !it.isNullOrBlank() }

if (storeRelease && !releaseSigningConfigured) {
    throw GradleException(
        "Store release requires DELTCRM_UPLOAD_STORE_FILE, DELTCRM_UPLOAD_STORE_PASSWORD, " +
            "DELTCRM_UPLOAD_KEY_ALIAS, and DELTCRM_UPLOAD_KEY_PASSWORD Gradle properties.",
    )
}

android {
    namespace = "com.deltcrm.employee"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.deltcrm.employee"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (releaseSigningConfigured) {
            create("release") {
                storeFile = file(uploadStoreFile!!)
                storePassword = uploadStorePassword
                keyAlias = uploadKeyAlias
                keyPassword = uploadKeyPassword
            }
        }
    }

    buildTypes {
        release {
            // Local release builds may use the debug key. Store builds must pass
            // -PstoreRelease=true and the four upload-key properties above.
            signingConfig = signingConfigs.getByName(
                if (releaseSigningConfigured) "release" else "debug",
            )
        }
    }
}

dependencies {
    implementation("com.google.android.play:integrity:1.6.0")
}

flutter {
    source = "../.."
}
