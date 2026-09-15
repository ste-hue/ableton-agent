import AppKit

final class InstallerDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var statusLabel: NSTextField!
    private var detailLabel: NSTextField!
    private var installButton: NSButton!
    private var spinner: NSProgressIndicator!
    private var logButton: NSButton!
    private var process: Process?
    private var outputState = InstallerOutput()
    private var logURL: URL?
    private var logHandle: FileHandle?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        buildWindow()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    private func label(_ text: String, size: CGFloat, weight: NSFont.Weight, color: NSColor) -> NSTextField {
        let field = NSTextField(labelWithString: text)
        field.font = NSFont.systemFont(ofSize: size, weight: weight)
        field.textColor = color
        field.alignment = .center
        field.maximumNumberOfLines = 0
        field.lineBreakMode = .byWordWrapping
        return field
    }

    private func buildWindow() {
        let ink = NSColor(calibratedRed: 0.106, green: 0.090, blue: 0.125, alpha: 1)
        let muted = NSColor(calibratedRed: 0.345, green: 0.318, blue: 0.373, alpha: 1)
        let rust = NSColor(calibratedRed: 0.647, green: 0.396, blue: 0.329, alpha: 1)
        let mauve = NSColor(calibratedRed: 0.604, green: 0.565, blue: 0.620, alpha: 1)

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 540, height: 460),
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Install Tembro"
        window.center()
        window.isReleasedWhenClosed = false
        window.backgroundColor = mauve

        let container = NSView()
        container.translatesAutoresizingMaskIntoConstraints = false
        window.contentView = container

        let icon = NSImageView()
        icon.image = NSWorkspace.shared.icon(forFile: Bundle.main.bundlePath)
        icon.imageScaling = .scaleProportionallyUpOrDown
        icon.translatesAutoresizingMaskIntoConstraints = false

        let title = label("Tembro", size: 29, weight: .bold, color: ink)
        title.translatesAutoresizingMaskIntoConstraints = false

        let subtitle = label(
            "A small hand inside Ableton Live.",
            size: 14,
            weight: .medium,
            color: muted
        )
        subtitle.translatesAutoresizingMaskIntoConstraints = false

        statusLabel = label("Whenever you’re ready.", size: 15, weight: .semibold, color: ink)
        statusLabel.translatesAutoresizingMaskIntoConstraints = false

        detailLabel = label(
            "Install the Max for Live device and its local connection. Save your work and quit Ableton Live first.",
            size: 12,
            weight: .regular,
            color: muted
        )
        detailLabel.translatesAutoresizingMaskIntoConstraints = false

        spinner = NSProgressIndicator()
        spinner.style = .spinning
        spinner.controlSize = .small
        spinner.isDisplayedWhenStopped = false
        spinner.translatesAutoresizingMaskIntoConstraints = false

        installButton = NSButton(title: "Install Tembro", target: self, action: #selector(startInstall))
        installButton.bezelStyle = .rounded
        installButton.keyEquivalent = "\r"
        installButton.contentTintColor = ink
        installButton.wantsLayer = true
        installButton.layer?.backgroundColor = rust.cgColor
        installButton.layer?.cornerRadius = 8
        installButton.translatesAutoresizingMaskIntoConstraints = false

        logButton = NSButton(title: "Show installation log", target: self, action: #selector(showLog))
        logButton.bezelStyle = .inline
        logButton.isHidden = true
        logButton.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(icon)
        container.addSubview(title)
        container.addSubview(subtitle)
        container.addSubview(statusLabel)
        container.addSubview(detailLabel)
        container.addSubview(spinner)
        container.addSubview(installButton)
        container.addSubview(logButton)

        NSLayoutConstraint.activate([
            icon.topAnchor.constraint(equalTo: container.topAnchor, constant: 28),
            icon.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            icon.widthAnchor.constraint(equalToConstant: 112),
            icon.heightAnchor.constraint(equalToConstant: 112),

            title.topAnchor.constraint(equalTo: icon.bottomAnchor, constant: 5),
            title.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 32),
            title.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -32),

            subtitle.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 2),
            subtitle.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 32),
            subtitle.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -32),

            statusLabel.topAnchor.constraint(equalTo: subtitle.bottomAnchor, constant: 27),
            statusLabel.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 40),
            statusLabel.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -40),

            detailLabel.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 7),
            detailLabel.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 58),
            detailLabel.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -58),

            spinner.topAnchor.constraint(equalTo: detailLabel.bottomAnchor, constant: 14),
            spinner.centerXAnchor.constraint(equalTo: container.centerXAnchor),

            installButton.topAnchor.constraint(equalTo: spinner.bottomAnchor, constant: 13),
            installButton.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            installButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 160),
            installButton.heightAnchor.constraint(equalToConstant: 32),
            logButton.topAnchor.constraint(equalTo: installButton.bottomAnchor, constant: 12),
            logButton.centerXAnchor.constraint(equalTo: container.centerXAnchor)
        ])

        window.makeKeyAndOrderFront(nil)
    }

    @objc private func startInstall() {
        runInstall(backUpCompanions: false)
    }

    @objc private func backUpAndInstall() {
        runInstall(backUpCompanions: true)
    }

    @objc private func showLog() {
        if let logURL { NSWorkspace.shared.open(logURL) }
    }

    private func runInstall(backUpCompanions: Bool) {
        guard process == nil else { return }
        guard let script = Bundle.main.path(forResource: "Install Tembro", ofType: "command") else {
            finish(success: false, message: "The installer payload is missing. Download Tembro again.")
            return
        }

        installButton.isEnabled = false
        window.standardWindowButton(.closeButton)?.isEnabled = false
        installButton.title = "Installing…"
        statusLabel.stringValue = "Putting Tembro in the right places…"
        detailLabel.stringValue = "Keep Ableton Live closed until installation finishes."
        spinner.startAnimation(nil)

        outputState = InstallerOutput()
        do {
            let home = ProcessInfo.processInfo.environment["TEMBRO_INSTALL_HOME"] ?? NSHomeDirectory()
            let directory = URL(fileURLWithPath: home).appendingPathComponent(".tembro/logs", isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let url = directory.appendingPathComponent("install-\(UUID().uuidString).log")
            guard FileManager.default.createFile(atPath: url.path, contents: nil) else {
                throw NSError(domain: "Tembro", code: 1, userInfo: [NSLocalizedDescriptionKey: "The installation log could not be created."])
            }
            logHandle = try FileHandle(forWritingTo: url)
            logURL = url
            logButton.isHidden = false
        } catch {
            finish(success: false, message: error.localizedDescription)
            return
        }

        let output = Pipe()
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/zsh")
        task.arguments = [script, "--non-interactive"]
        if backUpCompanions { task.arguments?.append("--backup-existing-companions") }
        task.standardOutput = output
        task.standardError = output

        do {
            try task.run()
            process = task
            // Drain the pipe before finishing, so the final stderr message is
            // processed before the exit status. UI and log state stay on main.
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                while true {
                    let data = output.fileHandleForReading.availableData
                    if data.isEmpty { break }
                    DispatchQueue.main.async {
                        self?.outputState.append(data)
                        self?.logHandle?.write(data)
                        if let progress = self?.outputState.progress {
                            self?.statusLabel.stringValue = progress
                        }
                    }
                }
                task.waitUntilExit()
                DispatchQueue.main.async { self?.installationEnded(task.terminationStatus) }
            }
        } catch {
            finish(success: false, message: error.localizedDescription)
        }
    }

    private func installationEnded(_ code: Int32) {
        process = nil
        switch outputState.outcome(exitCode: code) {
        case .installed:
            finish(success: true, message: "Open Ableton Live, choose Ableton_Live_MCP as a Control Surface, then add Tembro from your User Library.")
        case .needsBackup:
            finish(success: false, message: "Custom Max for Live support files were found. Back up and update saves the originals, then replaces their custom behavior with Tembro’s supported version.")
            statusLabel.stringValue = "An existing customization needs your choice."
            installButton.title = "Back up and update"
            installButton.action = #selector(backUpAndInstall)
            installButton.keyEquivalent = ""
        case .failed:
            finish(success: false, message: String(outputState.failureMessage.prefix(350)))
        }
    }

    private func finish(success: Bool, message: String) {
        spinner.stopAnimation(nil)
        logHandle?.closeFile()
        logHandle = nil
        window.standardWindowButton(.closeButton)?.isEnabled = true
        statusLabel.stringValue = success ? "✓ Tembro is installed." : "Installation needs attention."
        detailLabel.stringValue = message
        installButton.isEnabled = true
        installButton.title = success ? "Done" : "Try Again"
        installButton.action = success ? #selector(closeApp) : #selector(startInstall)
        installButton.keyEquivalent = "\r"
    }

    @objc private func closeApp() {
        NSApp.terminate(nil)
    }
}

let app = NSApplication.shared
let delegate = InstallerDelegate()
app.delegate = delegate
app.run()
