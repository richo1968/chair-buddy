import UIKit
import Capacitor

/// Bridge view controller that registers Chair Buddy's in-app plugins.
class ChairBuddyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PrinterPlugin())
    }
}

/// window.print() is a no-op inside WKWebView, so the web app calls this
/// instead. It prints the web view with print-media CSS applied, which means
/// GamePrintView renders exactly as it does in Safari. The iOS print sheet
/// offers AirPrint, plus Share > Save to Files for a PDF.
@objc(PrinterPlugin)
public class PrinterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrinterPlugin"
    public let jsName = "Printer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise)
    ]

    @objc func print(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView else {
                call.reject("Web view unavailable")
                return
            }
            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = call.getString("jobName") ?? "Chair Buddy"
            info.orientation = .portrait

            let controller = UIPrintInteractionController.shared
            controller.printInfo = info
            controller.printFormatter = webView.viewPrintFormatter()

            let completion: UIPrintInteractionController.CompletionHandler = { _, completed, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve(["completed": completed])
                }
            }
            if UIDevice.current.userInterfaceIdiom == .pad, let view = self.bridge?.viewController?.view {
                let anchor = CGRect(x: view.bounds.midX, y: view.bounds.minY + 80, width: 1, height: 1)
                controller.present(from: anchor, in: view, animated: true, completionHandler: completion)
            } else {
                controller.present(animated: true, completionHandler: completion)
            }
        }
    }
}
