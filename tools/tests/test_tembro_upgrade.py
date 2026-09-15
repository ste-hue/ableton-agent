"""Exercise custom-companion upgrades on real temporary files."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from types import ModuleType
import unittest
from unittest.mock import patch

from test_tembro_release import ROOT, m4l_payload, verifier


class CompanionUpgradeTests(unittest.TestCase):
    def fixture(self, root):
        payload = m4l_payload(root / "payload")
        paths = [root / name / "agent_m4l_host.js" for name in ("source", "generated", "audio", "midi")]
        for index, path in enumerate(paths):
            path.parent.mkdir()
            path.write_bytes(("custom floating window %d" % index).encode())
        module = ModuleType("agent_m4l")
        def status():
            return {"source": str(paths[0]), "targets_checked": 3, "targets": [
                {"path": str(path), "installed": path.is_file(),
                 "target_sha256": hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None}
                for path in paths[1:]]}
        module.agent_m4l_host_status = status
        return payload, paths, module

    def test_explicit_upgrade_keeps_verified_backups_before_replacing_custom_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload, paths, module = self.fixture(root)
            originals = {str(path): path.read_bytes() for path in paths}
            with patch.object(verifier.importlib, "import_module", return_value=module):
                self.assertTrue(callable(getattr(verifier, "backup_and_replace_m4l_targets", None)),
                                "installer needs an explicit backup-and-update path")
                backup = verifier.backup_and_replace_m4l_targets(payload, root / "backups")
                verifier.check_m4l_sync_targets(payload)
            manifest = json.loads((backup / "manifest.json").read_text())
            self.assertEqual(manifest["status"], "updated")
            self.assertEqual({item["path"] for item in manifest["files"]}, set(originals))
            for item in manifest["files"]:
                stored = (backup / item["backup"]).read_bytes()
                self.assertEqual(stored, originals[item["path"]])
                self.assertEqual(hashlib.sha256(stored).hexdigest(), item["sha256"])
            for path in paths:
                self.assertEqual(path.read_bytes(), (payload / "agent_m4l_host.js").read_bytes())

    def test_failed_backup_does_not_replace_any_custom_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload, paths, module = self.fixture(root)
            originals = {path: path.read_bytes() for path in paths}
            self.assertTrue(callable(getattr(verifier, "backup_and_replace_m4l_targets", None)))
            with patch.object(verifier.importlib, "import_module", return_value=module), \
                 patch.object(Path, "write_bytes", side_effect=OSError("disk full")):
                with self.assertRaisesRegex(OSError, "disk full"):
                    verifier.backup_and_replace_m4l_targets(payload, root / "backups")
            self.assertEqual({path: path.read_bytes() for path in paths}, originals)

    def test_partial_replace_failure_restores_earlier_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload, paths, module = self.fixture(root)
            originals = {path: path.read_bytes() for path in paths}
            self.assertTrue(callable(getattr(verifier, "backup_and_replace_m4l_targets", None)))
            replace = Path.replace
            calls = []
            def fail_second(source, target):
                calls.append(str(target))
                if len(calls) == 2:
                    raise OSError("replacement failed")
                return replace(source, target)
            with patch.object(verifier.importlib, "import_module", return_value=module), \
                 patch.object(Path, "replace", fail_second):
                with self.assertRaisesRegex(OSError, "replacement failed"):
                    verifier.backup_and_replace_m4l_targets(payload, root / "backups")
            self.assertGreaterEqual(len(calls), 3)
            self.assertEqual({path: path.read_bytes() for path in paths}, originals)

    def test_linked_custom_file_is_not_overwritten_by_upgrade(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload, paths, module = self.fixture(root)
            external = root / "external.js"
            external.write_bytes(b"external user data")
            paths[2].unlink()
            paths[2].symlink_to(external)
            self.assertTrue(callable(getattr(verifier, "backup_and_replace_m4l_targets", None)))
            with patch.object(verifier.importlib, "import_module", return_value=module):
                with self.assertRaisesRegex(ValueError, "[Ss]ymlink|linked"):
                    verifier.backup_and_replace_m4l_targets(payload, root / "backups")
            self.assertEqual(external.read_bytes(), b"external user data")
            self.assertTrue(paths[2].is_symlink())

    def test_rollback_continues_when_one_replaced_file_disappears(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload, paths, module = self.fixture(root)
            originals = {path: path.read_bytes() for path in paths}
            def failed_readback(_source):
                paths[-1].unlink()
                raise ValueError("another process removed a target")
            with patch.object(verifier.importlib, "import_module", return_value=module), \
                 patch.object(verifier, "check_m4l_sync_targets", side_effect=failed_readback):
                with self.assertRaises(Exception):
                    verifier.backup_and_replace_m4l_targets(payload, root / "backups")
            for path in paths[:-1]:
                self.assertEqual(path.read_bytes(), originals[path])
            self.assertFalse(paths[-1].exists(), "do not recreate a concurrently removed user file")
            manifest = json.loads(next((root / "backups").glob("*/manifest.json")).read_text())
            self.assertEqual(manifest["status"], "failed")
            self.assertTrue(manifest["rollback_errors"])

    def test_installer_requires_explicit_backup_flag_to_continue_after_conflict(self):
        script = (ROOT / "installer/Install Tembro.command").read_text()
        gate = script[script.index("precheck_existing_companions() {"):
                      script.index('if [[ ! -x "$TOOL_BIN/ableton-live-mcp" ]]')]
        for approved in (False, True):
            with self.subTest(approved=approved), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                interpreter = root / "tools/ableton-live-mcp/bin/python"
                interpreter.parent.mkdir(parents=True)
                calls = root / "calls"
                interpreter.write_text('#!/bin/sh\n'
                    'printf "%s\\n" "$*" >> "$GATE_LOG"\n'
                    'case "$*" in *--backup-m4l-targets*) exit 0;; *) exit 20;; esac\n')
                interpreter.chmod(0o755)
                uv = root / "uv"
                uv.write_text('#!/bin/sh\nprintf "reinstall\\n" >> "$GATE_LOG"\n')
                uv.chmod(0o755)
                env = dict(os.environ, TEMBRO_HOME=str(root), TOOL_DIR=str(root / "tools"),
                           TOOL_BIN=str(root / "bin"), UV_BIN=str(uv), PAYLOAD_DIR=str(root / "payload"),
                           UPSTREAM_COMMIT=verifier.PIN, OFFICIAL_API_URL="https://gettembro.com",
                           GATE_LOG=str(calls), BACKUP_EXISTING_COMPANIONS=str(int(approved)))
                result = subprocess.run(["bash", "-c", "set -euo pipefail\npause_before_close() { :; }\n" + gate],
                                        env=env, text=True, capture_output=True, timeout=5)
                self.assertEqual(result.returncode, 0 if approved else 20, result.stdout + result.stderr)
                log = calls.read_text()
                self.assertEqual("reinstall" in log, approved)
                self.assertEqual("--backup-m4l-targets" in log, approved)


if __name__ == "__main__":
    unittest.main()
