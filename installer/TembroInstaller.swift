import AppKit

final class InstallerDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var statusLabel: NSTextField!
    private var detailLabel: NSTextField!
    private var installButton: NSButton!
    private var spinner: NSProgressIndicator!
    private var process: Process?

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
        let ink = NSColor(calibratedRed: 0.188, green: 0.169, blue: 0.224, alpha: 1)
        let muted = NSColor(calibratedRed: 0.506, green: 0.467, blue: 0.561, alpha: 1)
        let lavender = NSColor(calibratedRed: 0.624, green: 0.557, blue: 0.910, alpha: 1)
        let cream = NSColor(calibratedRed: 1.0, green: 0.98, blue: 0.945, alpha: 1)

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 520, height: 390),
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Install Tembro"
        window.center()
        window.isReleasedWhenClosed = false
        window.backgroundColor = cream

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
            "Your AI copilot inside Ableton Live",
            size: 14,
            weight: .medium,
            color: muted
        )
        subtitle.translatesAutoresizingMaskIntoConstraints = false

        statusLabel = label("Ready to install", size: 15, weight: .semibold, color: ink)
        statusLabel.translatesAutoresizingMaskIntoConstraints = false

        detailLabel = label(
            "One click installs the device and its private local bridge. Updates replace the same copy — no duplicate files.",
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
        installButton.contentTintColor = lavender
        installButton.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(icon)
        container.addSubview(title)
        container.addSubview(subtitle)
        container.addSubview(statusLabel)
        container.addSubview(detailLabel)
        container.addSubview(spinner)
        container.addSubview(installButton)

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
            installButton.heightAnchor.constraint(equalToConstant: 32)
        ])

        window.makeKeyAndOrderFront(nil)
    }

    @objc private func startInstall() {
        guard process == nil else { return }
        guard let script = Bundle.main.path(forResource: "Install Tembro", ofType: "command") else {
            finish(success: false, message: "The installer payload is missing. Download Tembro again.")
            return
        }

        installButton.isEnabled = false
        installButton.title = "Installing…"
        statusLabel.stringValue = "Installing Tembro…"
        detailLabel.stringValue = "This can take a minute the first time. Keep Ableton Live closed."
        spinner.startAnimation(nil)

        let output = Pipe()
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/zsh")
        task.arguments = [script, "--non-interactive"]
        task.standardOutput = output
        task.standardError = output

        output.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            let lines = text.split(separator: "\n").map(String.init)
            guard let last = lines.last(where: { !$0.trimmingCharacters(in: .whitespaces).isEmpty }) else { return }
            DispatchQueue.main.async {
                if last.hasPrefix("•") {
                    self?.statusLabel.stringValue = last.replacingOccurrences(of: "• ", with: "")
                }
            }
        }

        task.terminationHandler = { [weak self] finished in
            output.fileHandleForReading.readabilityHandler = nil
            DispatchQueue.main.async {
                self?.process = nil
                if finished.terminationStatus == 0 {
                    self?.finish(
                        success: true,
                        message: "Open Ableton Live, select Ableton_Live_MCP as a Control Surface, then add Tembro from your User Library."
                    )
                } else {
                    self?.finish(
                        success: false,
                        message: "Installation did not finish. Check your internet connection and try again."
                    )
                }
            }
        }

        do {
            try task.run()
            process = task
        } catch {
            finish(success: false, message: error.localizedDescription)
        }
    }

    private func finish(success: Bool, message: String) {
        spinner.stopAnimation(nil)
        statusLabel.stringValue = success ? "✓ Tembro is installed" : "Couldn’t install Tembro"
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
