import Foundation

enum InstallerOutcome {
    case installed, needsBackup, failed
}

struct InstallerOutput {
    private var bytes = Data()

    mutating func append(_ data: Data) {
        bytes.append(data)
        if bytes.count > 128 * 1024 {
            bytes.removeFirst(bytes.count - 128 * 1024)
        }
    }

    var text: String { String(decoding: bytes, as: UTF8.self) }

    private var lines: [String] {
        text.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }
    }

    var progress: String? {
        lines.last(where: { $0.hasPrefix("• ") }).map { String($0.dropFirst(2)) }
    }

    var backupPath: String? {
        lines.last(where: { $0.hasPrefix("TEMBRO_BACKUP: ") }).map { String($0.dropFirst(15)) }
    }

    var failureMessage: String {
        if let error = lines.last(where: { $0.hasPrefix("TEMBRO_ERROR: ") }) {
            return String(error.dropFirst(14))
        }
        if let error = lines.last(where: { $0.hasPrefix("error:") || $0.hasPrefix("curl:") }) {
            return error
        }
        return lines.last(where: { !$0.isEmpty && !$0.hasPrefix("•") })
            ?? "Installation stopped before completion. Open the installation log for details."
    }

    func outcome(exitCode: Int32) -> InstallerOutcome {
        switch exitCode {
        case 0: return .installed
        case 20: return .needsBackup
        default: return .failed
        }
    }
}
