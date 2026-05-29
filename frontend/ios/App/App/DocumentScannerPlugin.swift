import Foundation
import Capacitor
import VisionKit

/**
 * Capacitor plugin wrapping Apple's VNDocumentCameraViewController.
 *
 * - Available on iOS 13+ (VisionKit framework)
 * - Uses the native document scanner UI
 * - User manually captures each page (no auto-scan)
 * - Returns scanned pages as JPEG base64 data URLs
 * - Gracefully rejects if VNDocumentCameraViewController is not available
 */
@objc(DocumentScannerPlugin)
public class DocumentScannerPlugin: CAPPlugin, CAPBridgedPlugin, VNDocumentCameraViewControllerDelegate {

    public let identifier = "DocumentScannerPlugin"
    public let jsName = "DocumentScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise)
    ]

    private var savedCall: CAPPluginCall?

    @objc func scan(_ call: CAPPluginCall) {
        guard VNDocumentCameraViewController.isSupported else {
            call.reject("Document scanner not available on this device")
            return
        }

        savedCall = call

        DispatchQueue.main.async { [weak self] in
            let scanner = VNDocumentCameraViewController()
            scanner.delegate = self
            self?.bridge?.viewController?.present(scanner, animated: true)
        }
    }

    // MARK: - VNDocumentCameraViewControllerDelegate

    public func documentCameraViewController(
        _ controller: VNDocumentCameraViewController,
        didFinishWith scan: VNDocumentCameraScan
    ) {
        controller.dismiss(animated: true)

        guard let call = savedCall else { return }
        savedCall = nil

        var pages: [String] = []
        for i in 0..<scan.pageCount {
            let image = scan.imageOfPage(at: i)
            if let jpegData = image.jpegData(compressionQuality: 0.92) {
                let base64 = jpegData.base64EncodedString()
                pages.append("data:image/jpeg;base64,\(base64)")
            }
        }

        if pages.isEmpty {
            call.reject("No pages scanned")
        } else {
            call.resolve(["pages": pages])
        }
    }

    public func documentCameraViewControllerDidCancel(
        _ controller: VNDocumentCameraViewController
    ) {
        controller.dismiss(animated: true)
        savedCall?.reject("Scan cancelled")
        savedCall = nil
    }

    public func documentCameraViewController(
        _ controller: VNDocumentCameraViewController,
        didFailWithError error: Error
    ) {
        controller.dismiss(animated: true)
        savedCall?.reject("Scanner error: \(error.localizedDescription)")
        savedCall = nil
    }
}
