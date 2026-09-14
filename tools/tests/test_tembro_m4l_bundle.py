"""Verify exact upstream M4L resources are included without copying local work."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

from test_tembro_release import dmg

M4L_SOURCE = os.environ.get("TEMBRO_M4L_SOURCE")


class MissingM4LTests(unittest.TestCase):
    def test_missing_host_fails_before_creating_payload(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, payload = root / "source", root / "payload"
            source.mkdir()
            payload.mkdir()
            with self.assertRaisesRegex(RuntimeError, "missing or linked: agent_m4l_host.js"):
                dmg.stage_m4l_assets(payload, source)
            self.assertEqual(list(payload.iterdir()), [])


@unittest.skipUnless(M4L_SOURCE, "Set TEMBRO_M4L_SOURCE to the exact pinned upstream m4l directory")
class M4LBundleTests(unittest.TestCase):
    def test_exact_assets_and_binary_roundtrip_exclude_generated_devices(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, payload = root / "source", root / "payload"
            shutil.copytree(M4L_SOURCE, source)
            payload.mkdir()
            (source / "generated").mkdir()
            (source / "generated/AgentM4L_personal.amxd").write_bytes(b"personal working device")
            before = {name: (source / name).read_bytes() for name in dmg.M4L_ASSETS}
            dmg.stage_m4l_assets(payload, source)
            manifest = json.loads((payload / "m4l/manifest.json").read_text())
            self.assertEqual(manifest["pinned_commit"], dmg.UPSTREAM_PIN)
            self.assertEqual(set(p.name for p in (payload / "m4l").iterdir()), set(dmg.M4L_ASSETS) | {"manifest.json"})
            for name, data in before.items():
                self.assertEqual((payload / "m4l" / name).read_bytes(), data)
                self.assertEqual((source / name).read_bytes(), data)
                self.assertEqual(manifest["files"][name]["sha256"], hashlib.sha256(data).hexdigest())
                self.assertEqual(manifest["files"][name]["upstream_path"], "m4l/" + name)

    def test_last_asset_mismatch_leaves_no_partial_m4l_payload(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, payload = root / "source", root / "payload"
            shutil.copytree(M4L_SOURCE, source)
            payload.mkdir()
            (source / "README.md").write_text("local modification\n")
            with self.assertRaisesRegex(RuntimeError, "differs from pinned upstream: README.md"):
                dmg.stage_m4l_assets(payload, source)
            self.assertEqual(list(payload.iterdir()), [])

    def test_symlink_source_is_rejected_even_when_contents_match(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, payload = root / "source", root / "payload"
            shutil.copytree(M4L_SOURCE, source)
            payload.mkdir()
            target = source / "agent_m4l_host.js"
            target.unlink()
            target.symlink_to(Path(M4L_SOURCE).resolve() / "agent_m4l_host.js")
            with self.assertRaisesRegex(RuntimeError, "missing or linked"):
                dmg.stage_m4l_assets(payload, source)
            self.assertEqual(list(payload.iterdir()), [])

    def test_installer_app_contains_checked_resources(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            device = root / "device"
            device.mkdir()
            (device / "Tembro.amxd").write_bytes(b"test device")
            license_file = root / "LICENSE"
            license_file.write_text("MIT")
            def native_tool(*args):
                if args[0] == "lipo":
                    Path(args[-1]).write_bytes(b"test universal executable")
            with patch.object(dmg.shutil, "which", return_value="/usr/bin/test-tool"), \
                 patch.object(dmg, "DEVICE_DIR", device), \
                 patch.object(dmg, "UPSTREAM_LICENSE", license_file), \
                 patch.object(dmg, "stage_variation_runtime"), \
                 patch.object(dmg, "build_icon", side_effect=lambda file: file.write_bytes(b"test icon")), \
                 patch.object(dmg, "run", side_effect=native_tool):
                dmg.compile_installer(root / "Install Tembro.app", root, "https://gettembro.com", m4l_source=Path(M4L_SOURCE))
            assets = root / "Install Tembro.app/Contents/Resources/.tembro-payload/m4l"
            self.assertTrue((assets / "manifest.json").is_file())
            self.assertEqual((assets / "AgentAudioTap.amxd").read_bytes(), (Path(M4L_SOURCE) / "AgentAudioTap.amxd").read_bytes())


if __name__ == "__main__":
    unittest.main()
