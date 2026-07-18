import Flutter
import CryptoKit
import DeviceCheck
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    guard let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "HrmsIntegrityChannel") else {
      return
    }
    let channel = FlutterMethodChannel(
      name: "hrms/integrity",
      binaryMessenger: registrar.messenger()
    )
    channel.setMethodCallHandler { [weak self] call, result in
      guard call.method == "generateEvidence" else {
        result(FlutterMethodNotImplemented)
        return
      }
      guard
        let arguments = call.arguments as? [String: Any],
        let nonce = arguments["nonce"] as? String,
        !nonce.isEmpty
      else {
        result(FlutterError(code: "INTEGRITY_CONFIG_INVALID", message: "Integrity nonce is missing", details: nil))
        return
      }
      self?.generateAppAttestEvidence(nonce: nonce, result: result)
    }
  }

  private func generateAppAttestEvidence(
    nonce: String,
    result: @escaping FlutterResult
  ) {
    let service = DCAppAttestService.shared
    guard service.isSupported else {
      result(FlutterError(code: "APP_ATTEST_UNSUPPORTED", message: "App Attest is unavailable on this device", details: nil))
      return
    }
    let clientDataHash = Data(SHA256.hash(data: Data(nonce.utf8)))
    if let keyId = UserDefaults.standard.string(forKey: Self.appAttestKeyId) {
      service.generateAssertion(keyId, clientDataHash: clientDataHash) { assertion, error in
        DispatchQueue.main.async {
          guard let assertion else {
            result(FlutterError(code: "APP_ATTEST_ASSERTION_FAILED", message: error?.localizedDescription, details: nil))
            return
          }
          result([
            "evidence": assertion.base64EncodedString(),
            "mode": "ASSERTION",
            "keyId": keyId,
          ])
        }
      }
      return
    }
    service.generateKey { keyId, keyError in
      guard let keyId else {
        DispatchQueue.main.async {
          result(FlutterError(code: "APP_ATTEST_KEY_FAILED", message: keyError?.localizedDescription, details: nil))
        }
        return
      }
      service.attestKey(keyId, clientDataHash: clientDataHash) { attestation, error in
        DispatchQueue.main.async {
          guard let attestation else {
            result(FlutterError(code: "APP_ATTEST_ATTESTATION_FAILED", message: error?.localizedDescription, details: nil))
            return
          }
          UserDefaults.standard.set(keyId, forKey: Self.appAttestKeyId)
          result([
            "evidence": attestation.base64EncodedString(),
            "mode": "ATTESTATION",
            "keyId": keyId,
          ])
        }
      }
    }
  }

  private static let appAttestKeyId = "hrms.app-attest.key-id"
}
