// Msetter for the Mac: the web app in a native window.
// Adds what a browser cannot do: a real Save panel, opening .lcse files from Finder, and writing
// settings.lcse straight onto a mounted camera card (after copying the card's own file to Backups).
//
// Build: mac/build.sh   Self-test: "Msetter.app/Contents/MacOS/Msetter" --selftest out.png
import AppKit
import UniformTypeIdentifiers
import WebKit

let cardFile = "settings.lcse"

// Serves the bundled web files from profilemaker://app/ so the page has a stable origin (keeps its storage).
final class Files: NSObject, WKURLSchemeHandler {
    let root: URL
    init(root: URL) { self.root = root.standardizedFileURL }
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        let path = url.path.isEmpty || url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let file = root.appendingPathComponent(path).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else {
            task.didFailWithError(NSError(domain: NSURLErrorDomain, code: NSURLErrorFileDoesNotExist)); return
        }
        let types = ["html": "text/html", "js": "text/javascript", "css": "text/css", "json": "application/json", "png": "image/png", "svg": "image/svg+xml"]
        let type = (types[file.pathExtension] ?? "application/octet-stream") + "; charset=utf-8"
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": type])!)
        task.didReceive(data)
        task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class App: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var web: WKWebView!
    var ready = false
    var waiting: [URL] = []
    var selftest: String? = nil

    func applicationDidFinishLaunching(_ note: Notification) {
        let args = CommandLine.arguments
        if let i = args.firstIndex(of: "--selftest") { selftest = i + 1 < args.count ? args[i + 1] : "/tmp/msetter-selftest.png" }
        menus()
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(Files(root: Bundle.main.resourceURL!.appendingPathComponent("web")), forURLScheme: "profilemaker")
        config.userContentController.add(self, name: "native")
        web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = self
        web.navigationDelegate = self
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1440, height: 900),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Msetter"
        window.minSize = NSSize(width: 780, height: 560)
        window.contentView = web
        window.center()
        window.setFrameAutosaveName("Msetter")
        window.makeKeyAndOrderFront(nil)
        web.load(URLRequest(url: URL(string: "profilemaker://app/index.html")!))
        let ws = NSWorkspace.shared.notificationCenter
        ws.addObserver(self, selector: #selector(volumesChanged), name: NSWorkspace.didMountNotification, object: nil)
        ws.addObserver(self, selector: #selector(volumesChanged), name: NSWorkspace.didUnmountNotification, object: nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }

    func application(_ application: NSApplication, open urls: [URL]) {
        if ready { urls.forEach(openFile) } else { waiting += urls }
    }

    // ---------- menus ----------
    func menus() {
        let main = NSMenu()
        let appItem = NSMenuItem(); main.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Msetter", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide Msetter", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(withTitle: "Quit Msetter", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        let fileItem = NSMenuItem(); main.addItem(fileItem)
        let file = NSMenu(title: "File")
        file.addItem(withTitle: "Open\u{2026}", action: #selector(openPanel), keyEquivalent: "o")
        file.addItem(withTitle: "Save\u{2026}", action: #selector(saveSheet), keyEquivalent: "s")
        file.addItem(.separator())
        file.addItem(withTitle: "Show Backups", action: #selector(showBackups), keyEquivalent: "")
        file.addItem(withTitle: "Close", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        fileItem.submenu = file
        let editItem = NSMenuItem(); main.addItem(editItem)
        let edit = NSMenu(title: "Edit")
        edit.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = edit
        let windowItem = NSMenuItem(); main.addItem(windowItem)
        let win = NSMenu(title: "Window")
        win.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windowItem.submenu = win
        NSApp.mainMenu = main
        NSApp.windowsMenu = win
    }

    @objc func openPanel() {
        let p = NSOpenPanel()
        p.allowsMultipleSelection = false
        p.allowedContentTypes = ["lcse", "json"].compactMap { UTType(filenameExtension: $0) }
        p.message = "Choose a settings file exported from the camera (settings.lcse)."
        p.beginSheetModal(for: window) { r in if r == .OK, let u = p.url { self.openFile(u) } }
    }
    @objc func saveSheet() { web.evaluateJavaScript("ProfileMaker.saveSheet()") }
    @objc func showBackups() {
        try? FileManager.default.createDirectory(at: backups(), withIntermediateDirectories: true)
        NSWorkspace.shared.open(backups())
    }

    func openFile(_ url: URL) {
        let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
        guard size < 2_000_000, let text = try? String(contentsOf: url, encoding: .utf8) else { NSSound.beep(); return }  // a settings file is about 12 KB
        web.callAsyncJavaScript("ProfileMaker.openText(text, name)", arguments: ["text": text, "name": url.lastPathComponent], in: nil, in: .page)
    }

    // ---------- cards ----------
    // A camera card: a removable volume with a DCIM folder or a settings.lcse at the top. The Camera name in
    // that file says which camera made it.
    func cards() -> [[String: String]] {
        let keys: [URLResourceKey] = [.volumeIsRemovableKey, .volumeIsEjectableKey, .volumeNameKey]
        let vols = FileManager.default.mountedVolumeURLs(includingResourceValuesForKeys: keys, options: [.skipHiddenVolumes]) ?? []
        var out: [[String: String]] = []
        var candidates = vols
        if let fake = ProcessInfo.processInfo.environment["MSETTER_CARDS"] {  // tests: folders laid out like cards
            candidates += fake.split(separator: ":").map { URL(fileURLWithPath: String($0)) }
        }
        for v in candidates {
            let rv = try? v.resourceValues(forKeys: Set(keys))
            let isFake = !vols.contains(v)
            guard isFake || rv?.volumeIsRemovable == true else { continue }  // SD cards are removable media; backup drives and disk images are not
            let settings = v.appendingPathComponent(cardFile)
            let hasDCIM = FileManager.default.fileExists(atPath: v.appendingPathComponent("DCIM").path)
            guard hasDCIM || FileManager.default.fileExists(atPath: settings.path) else { continue }
            var camera = ""
            if let d = try? Data(contentsOf: settings), let j = try? JSONSerialization.jsonObject(with: d) as? [String: Any] { camera = j["Camera"] as? String ?? "" }
            out.append(["name": isFake ? v.lastPathComponent : (rv?.volumeName ?? v.lastPathComponent), "path": v.path, "camera": camera])
        }
        return out
    }
    @objc func volumesChanged() { pushCards() }
    func pushCards() {
        guard ready else { return }
        web.callAsyncJavaScript("ProfileMaker.setCards(list)", arguments: ["list": cards()], in: nil, in: .page)
    }

    func backups() -> URL {
        if let dir = ProcessInfo.processInfo.environment["MSETTER_BACKUPS"] { return URL(fileURLWithPath: dir) }  // tests
        return FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Documents/Msetter/Backups")
    }

    func writeCard(_ cardPath: String, _ text: String) -> String {
        let fm = FileManager.default
        let card = URL(fileURLWithPath: cardPath)
        guard let found = cards().first(where: { $0["path"] == cardPath }) else { return "no card" }
        let dest = card.appendingPathComponent(cardFile)
        // A card already holding another camera's file belongs to that camera: writing there would import nothing.
        let incoming = (try? JSONSerialization.jsonObject(with: Data(text.utf8)) as? [String: Any])?["Camera"] as? String ?? ""
        if let onCard = found["camera"], !onCard.isEmpty, !incoming.isEmpty, onCard != incoming { return "other camera" }
        do {
            if fm.fileExists(atPath: dest.path) {
                try fm.createDirectory(at: backups(), withIntermediateDirectories: true)
                let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd HHmmss.SSS"  // two writes in one second keep both backups
                let name = "\(card.lastPathComponent) \(f.string(from: Date())) \(cardFile)"
                try fm.copyItem(at: dest, to: backups().appendingPathComponent(name))
            }
            let data = Data(text.utf8)
            try data.write(to: dest, options: .atomic)
            guard (try? Data(contentsOf: dest)) == data else { return "failed" }
            pushCards()
            return "saved"
        } catch { return "failed" }
    }

    // ---------- page messages ----------
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        guard m.frameInfo.isMainFrame, m.frameInfo.request.url?.scheme == "profilemaker",
              let body = m.body as? [String: Any], let type = body["type"] as? String else { return }
        let id = body["id"] as? Int ?? 0
        switch type {
        case "ready":
            ready = true
            pushCards()
            waiting.forEach(openFile); waiting = []
            if let out = selftest { DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { self.runSelftest(out) } }
        case "save":
            let p = NSSavePanel()
            p.nameFieldStringValue = body["name"] as? String ?? cardFile
            p.message = "Put this file at the top level of the camera\u{2019}s card."
            p.beginSheetModal(for: window) { r in
                var result = "cancelled"
                if r == .OK, let u = p.url, let text = body["text"] as? String {
                    let folder = u.deletingLastPathComponent().standardizedFileURL.path
                    if u.lastPathComponent == cardFile, self.cards().contains(where: { $0["path"] == folder }) { result = self.writeCard(folder, text) }
                    else { result = (try? Data(text.utf8).write(to: u, options: .atomic)) != nil ? "saved" : "failed" }
                }
                self.reply(id, result)
            }
        case "writeCard":
            reply(id, writeCard(body["card"] as? String ?? "", body["text"] as? String ?? ""))
        default: break
        }
    }
    func reply(_ id: Int, _ result: String) {
        web.callAsyncJavaScript("ProfileMaker.nativeReply(id, r)", arguments: ["id": id, "r": result], in: nil, in: .page)
    }

    // <input type="file"> in the page
    // Links to the project page, docs and code open in the browser, not inside the app.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "http" || url.scheme == "https" { NSWorkspace.shared.open(url); decisionHandler(.cancel); return }
        decisionHandler(url.scheme == "profilemaker" ? .allow : .cancel)  // nothing else loads in the app's window
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url { NSWorkspace.shared.open(url) }
        return nil
    }

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let p = NSOpenPanel()
        p.allowsMultipleSelection = parameters.allowsMultipleSelection
        p.beginSheetModal(for: window) { r in completionHandler(r == .OK ? p.urls : nil) }
    }

    // ---------- self-test: proves the page loads and the engine works inside the app, then exits ----------
    func runSelftest(_ out: String) {
        let js = """
        const st = ProfileMaker.state, r = {};
        r.camera = Engine.toFile(st.doc).Camera;
        r.profiles = Engine.profiles(st.doc).map(p => Engine.profileName(st.doc, p));
        r.problems = Engine.check(st.doc).length;
        r.files = st.targets.map(t => { const d = ProfileMaker.prepare(t).doc, text = Engine.serialize(d); return [t, Engine.parse(text).model, Engine.check(Engine.parse(text)).length, text.length]; });
        r.rows = document.querySelectorAll('.glabel').length;
        r.sets = document.querySelectorAll('.set').length;
        r.screen = !!document.querySelector('.screen');
        r.native = !!(window.webkit && window.webkit.messageHandlers.native);
        return JSON.stringify(r);
        """
        web.callAsyncJavaScript(js, arguments: [:], in: nil, in: .page) { result in
            var ok = false
            switch result {
            case .success(let v): print(v as? String ?? "\(v)"); ok = (v as? String ?? "").contains("\"problems\":0")
            case .failure(let e): print("selftest error: \(e)")
            }
            print("cards \(self.cards())")
            let args = CommandLine.arguments
            if let i = args.firstIndex(of: "--card"), i + 1 < args.count {
                let card = args[i + 1]
                self.web.callAsyncJavaScript("return Engine.serialize(ProfileMaker.prepare('M-EV1').doc)", arguments: [:], in: nil, in: .page) { r in
                    if case .success(let t) = r, let text = t as? String {
                        let res = self.writeCard(card, text)
                        print("writeCard \(res)")
                        ok = ok && res == "saved"
                    }
                    self.finishSelftest(out, ok)
                }
                return
            }
            self.finishSelftest(out, ok)
        }
    }
    func finishSelftest(_ out: String, _ ok: Bool) {
        do {
            self.web.takeSnapshot(with: nil) { image, _ in
                if let img = image, let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff), let png = rep.representation(using: .png, properties: [:]) {
                    try? png.write(to: URL(fileURLWithPath: out)); print("snapshot \(out)")
                }
                exit(ok ? 0 : 1)
            }
        }
    }
}

let app = NSApplication.shared
let delegate = App()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
