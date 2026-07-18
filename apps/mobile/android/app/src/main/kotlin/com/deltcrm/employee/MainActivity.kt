package com.deltcrm.employee

import android.util.Base64
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.StandardIntegrityManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.security.MessageDigest

class MainActivity : FlutterActivity() {
    private var tokenProvider: StandardIntegrityManager.StandardIntegrityTokenProvider? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            if (call.method != "generateEvidence") {
                result.notImplemented()
                return@setMethodCallHandler
            }
            val nonce = call.argument<String>("nonce")
            val projectNumber = call.argument<String>("cloudProjectNumber")?.toLongOrNull()
            if (nonce.isNullOrBlank() || projectNumber == null) {
                result.error("INTEGRITY_CONFIG_INVALID", "Play Integrity project number or nonce is missing", null)
                return@setMethodCallHandler
            }
            requestToken(projectNumber, nonce, result)
        }
    }

    private fun requestToken(
        projectNumber: Long,
        nonce: String,
        result: MethodChannel.Result,
    ) {
        val requestHash = Base64.encodeToString(
            MessageDigest.getInstance("SHA-256").digest(nonce.toByteArray(Charsets.UTF_8)),
            Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING,
        )
        val prepared = tokenProvider
        if (prepared != null) {
            issue(prepared, requestHash, result)
            return
        }
        IntegrityManagerFactory.createStandard(applicationContext)
            .prepareIntegrityToken(
                StandardIntegrityManager.PrepareIntegrityTokenRequest.builder()
                    .setCloudProjectNumber(projectNumber)
                    .build(),
            )
            .addOnSuccessListener { provider ->
                tokenProvider = provider
                issue(provider, requestHash, result)
            }
            .addOnFailureListener { error ->
                result.error("PLAY_INTEGRITY_PREPARE_FAILED", error.message, null)
            }
    }

    private fun issue(
        provider: StandardIntegrityManager.StandardIntegrityTokenProvider,
        requestHash: String,
        result: MethodChannel.Result,
    ) {
        provider.request(
            StandardIntegrityManager.StandardIntegrityTokenRequest.builder()
                .setRequestHash(requestHash)
                .build(),
        )
            .addOnSuccessListener { response ->
                result.success(
                    mapOf(
                        "evidence" to response.token(),
                        "mode" to "STANDARD",
                    ),
                )
            }
            .addOnFailureListener { error ->
                tokenProvider = null
                result.error("PLAY_INTEGRITY_REQUEST_FAILED", error.message, null)
            }
    }

    companion object {
        private const val CHANNEL = "hrms/integrity"
    }
}
