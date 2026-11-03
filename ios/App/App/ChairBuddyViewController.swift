import UIKit
import Capacitor
import AVFoundation
import Speech
import Vision
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Bridge view controller that registers Chair Buddy's in-app plugins.
class ChairBuddyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PrinterPlugin())
        bridge?.registerPluginInstance(VoicePlugin())
        bridge?.registerPluginInstance(RosterScanPlugin())
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

/// Hands-free voice entry (Chair Buddy Pro). Listens continuously with Apple's
/// speech recogniser (on-device where the iPad supports it) and emits one
/// "utterance" event per spoken phrase, split on a short pause. Works with the
/// built-in mic or AirPods (Bluetooth HFP route).
@objc(VoicePlugin)
public class VoicePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VoicePlugin"
    public let jsName = "Voice"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "interpret", returnType: CAPPluginReturnPromise)
    ]

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-AU"))
        ?? SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var listening = false
    private var hints: [String] = []
    private var lastText = ""
    private var pauseTimer: Timer?
    /// Bumped each time a recognition task is replaced, so callbacks from a
    /// finished task can't emit or restart anything.
    private var generation = 0
    /// Apple's server recogniser is noticeably more accurate (especially over
    /// AirPods); fall back to on-device for the rest of the session if it errors
    /// (e.g. no internet at the stadium).
    private var forceOnDevice = false

    @objc func requestAccess(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else {
                call.resolve(["granted": false, "reason": "speech"])
                return
            }
            let done: (Bool) -> Void = { ok in
                call.resolve(["granted": ok, "reason": ok ? "" : "microphone"])
            }
            if #available(iOS 17.0, *) {
                AVAudioApplication.requestRecordPermission(completionHandler: done)
            } else {
                AVAudioSession.sharedInstance().requestRecordPermission(done)
            }
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        hints = (call.getArray("hints") as? [String]) ?? []
        DispatchQueue.main.async {
            do {
                try self.beginSession()
                self.listening = true
                try self.beginTask()
                call.resolve(["onDevice": self.recognizer?.supportsOnDeviceRecognition ?? false])
            } catch {
                self.teardown()
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.flush()
            self.teardown()
            call.resolve()
        }
    }

    private func beginSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default,
                                options: [.allowBluetoothHFP, .defaultToSpeaker, .mixWithOthers])
        try session.setActive(true, options: .notifyOthersOnDeactivation)
        let input = engine.inputNode
        input.removeTap(onBus: 0)
        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }
        engine.prepare()
        try engine.start()
    }

    private func beginTask() throws {
        guard let recognizer = recognizer, recognizer.isAvailable else {
            throw NSError(domain: "Voice", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Speech recognition is not available right now."])
        }
        generation += 1
        let gen = generation
        task?.cancel()
        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        req.contextualStrings = hints
        req.taskHint = .dictation
        req.requiresOnDeviceRecognition = forceOnDevice && recognizer.supportsOnDeviceRecognition
        if #available(iOS 16.0, *) { req.addsPunctuation = false }
        request = req
        lastText = ""
        task = recognizer.recognitionTask(with: req) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self = self, gen == self.generation, self.listening else { return }
                if let result = result {
                    let text = result.bestTranscription.formattedString
                    if text != self.lastText {
                        self.lastText = text
                        self.notifyListeners("partial", data: ["text": text])
                        self.schedulePause()
                    }
                    if result.isFinal { self.flush(); self.restart() }
                } else if let error = error as NSError? {
                    let text = "\(error.domain) \(error.localizedDescription)".lowercased()
                    let offline = error.domain == NSURLErrorDomain || text.contains("network") || text.contains("connection") || text.contains("internet")
                    if offline, !self.forceOnDevice, self.recognizer?.supportsOnDeviceRecognition == true {
                        self.forceOnDevice = true
                    }
                    self.flush()
                    self.restart()
                }
            }
        }
    }

    /// A phrase ends after ~1.6 s of no new words (long enough for "foul red 6 … two shots").
    private func schedulePause() {
        pauseTimer?.invalidate()
        pauseTimer = Timer.scheduledTimer(withTimeInterval: 1.6, repeats: false) { [weak self] _ in
            guard let self = self, self.listening else { return }
            self.flush()
            self.restart()
        }
    }

    private func flush() {
        pauseTimer?.invalidate()
        pauseTimer = nil
        let text = lastText.trimmingCharacters(in: .whitespacesAndNewlines)
        lastText = ""
        if !text.isEmpty { notifyListeners("utterance", data: ["text": text]) }
    }

    private func restart() {
        guard listening else { return }
        request?.endAudio()
        do { try beginTask() } catch {
            notifyListeners("error", data: ["message": error.localizedDescription])
        }
    }

    private func teardown() {
        listening = false
        generation += 1
        pauseTimer?.invalidate()
        task?.cancel()
        task = nil
        request?.endAudio()
        request = nil
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    /// Rewrites a messy spoken phrase into Chair Buddy's command phrasing using
    /// Apple Intelligence (on-device Foundation Models, iOS 26+). Resolves
    /// {available:false} on iPads without Apple Intelligence.
    @objc func interpret(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        let context = call.getString("context") ?? ""
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            guard case .available = SystemLanguageModel.default.availability else {
                call.resolve(["available": false])
                return
            }
            Task {
                do {
                    let session = LanguageModelSession(instructions: context)
                    let reply = try await session.respond(to: text)
                    call.resolve(["available": true, "text": reply.content])
                } catch {
                    call.resolve(["available": true, "text": "", "error": error.localizedDescription])
                }
            }
            return
        }
        #endif
        call.resolve(["available": false])
    }
}

/// Photographs a team sheet and reads it with Apple's on-device text
/// recognition (Vision). Returns the text row by row, left to right, so a
/// "number  name" table comes back as "4 Jane Smith" lines.
@objc(RosterScanPlugin)
public class RosterScanPlugin: CAPPlugin, CAPBridgedPlugin, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    public let identifier = "RosterScanPlugin"
    public let jsName = "RosterScan"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise)
    ]
    private var pending: CAPPluginCall?

    @objc func scan(_ call: CAPPluginCall) {
        let wantCamera = (call.getString("source") ?? "camera") == "camera"
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else {
                call.reject("No view controller")
                return
            }
            let picker = UIImagePickerController()
            picker.sourceType = wantCamera && UIImagePickerController.isSourceTypeAvailable(.camera) ? .camera : .photoLibrary
            picker.delegate = self
            picker.modalPresentationStyle = .fullScreen
            self.pending = call
            vc.present(picker, animated: true)
        }
    }

    public func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
        pending?.resolve(["cancelled": true, "lines": []])
        pending = nil
    }

    public func imagePickerController(_ picker: UIImagePickerController,
                                      didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        picker.dismiss(animated: true)
        guard let call = pending else { return }
        pending = nil
        guard let image = info[.originalImage] as? UIImage, let cg = image.cgImage else {
            call.reject("No image")
            return
        }
        let request = VNRecognizeTextRequest { req, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            let obs = (req.results as? [VNRecognizedTextObservation]) ?? []
            call.resolve(["cancelled": false, "lines": Self.rows(from: obs)])
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        let orientation = CGImagePropertyOrientation(image.imageOrientation)
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try VNImageRequestHandler(cgImage: cg, orientation: orientation).perform([request])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    /// Groups text boxes into rows by vertical position, then reads each row left to right.
    static func rows(from obs: [VNRecognizedTextObservation]) -> [String] {
        let items = obs.compactMap { o -> (y: CGFloat, x: CGFloat, h: CGFloat, text: String)? in
            guard let t = o.topCandidates(1).first?.string else { return nil }
            return (o.boundingBox.midY, o.boundingBox.minX, o.boundingBox.height, t)
        }.sorted { $0.y > $1.y }
        var rows: [[(y: CGFloat, x: CGFloat, h: CGFloat, text: String)]] = []
        for it in items {
            if let last = rows.last?.first, abs(last.y - it.y) < max(last.h, it.h) * 0.6 {
                rows[rows.count - 1].append(it)
            } else {
                rows.append([it])
            }
        }
        return rows.map { $0.sorted { $0.x < $1.x }.map { $0.text }.joined(separator: " ") }
    }
}

extension CGImagePropertyOrientation {
    init(_ o: UIImage.Orientation) {
        switch o {
        case .up: self = .up
        case .down: self = .down
        case .left: self = .left
        case .right: self = .right
        case .upMirrored: self = .upMirrored
        case .downMirrored: self = .downMirrored
        case .leftMirrored: self = .leftMirrored
        case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
}
