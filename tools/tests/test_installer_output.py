"""Compile and execute the same output parser used by the macOS installer."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


@unittest.skipUnless(shutil.which("swiftc"), "Swift compiler is required")
class InstallerOutputTests(unittest.TestCase):
    def test_real_swift_parser_preserves_failure_cause_and_upgrade_choice(self):
        source = ROOT / "installer/InstallerOutput.swift"
        self.assertTrue(source.is_file(), "installer needs a tested parser for its actual errors")
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            main = root / "main.swift"
            main.write_text('''import Foundation
var output = InstallerOutput()
let text = "• Checking companions…\\nTEMBRO_ERROR: Quit Ableton Live, then run this installer again.\\n"
let bytes = Array(text.utf8)
for byte in bytes { output.append(Data([byte])) }
precondition(output.progress == "Checking companions…")
precondition(output.failureMessage == "Quit Ableton Live, then run this installer again.")
precondition(output.outcome(exitCode: 1) == .failed)
precondition(output.outcome(exitCode: 20) == .needsBackup)
precondition(output.outcome(exitCode: 0) == .installed)
var network = InstallerOutput()
network.append(Data("error: Download failed: certificate verify failed\\n".utf8))
precondition(network.failureMessage.contains("certificate verify failed"))
var backup = InstallerOutput()
backup.append(Data("TEMBRO_BACKUP: /tmp/Tembro backups/session 1\\n".utf8))
precondition(backup.backupPath == "/tmp/Tembro backups/session 1")
var empty = InstallerOutput()
precondition(!empty.failureMessage.isEmpty)
empty.append(Data(repeating: 65, count: 300000))
empty.append(Data("\\nTEMBRO_ERROR: final error after a long install\\n".utf8))
precondition(empty.failureMessage == "final error after a long install")
precondition(empty.text.utf8.count < 150000)
print("Installer output checks passed")
''')
            binary = root / "installer-output-test"
            compiled = subprocess.run(["swiftc", "-module-cache-path", str(root / "cache"),
                                       str(source), str(main), "-o", str(binary)], capture_output=True, text=True)
            self.assertEqual(compiled.returncode, 0, compiled.stdout + compiled.stderr)
            run = subprocess.run([str(binary)], capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
            self.assertIn("Installer output checks passed", run.stdout)
