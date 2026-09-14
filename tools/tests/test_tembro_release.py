"""Packaging checks; every runtime write is confined to a temporary directory."""

import importlib.util
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
from types import ModuleType
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[2]
UPSTREAM = os.environ.get("TEMBRO_UPSTREAM_ROOT")


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# These tests inspect payload composition, not AMXD encoding, native Swift, or
# icon generation. Substitute only those platform/dependency boundaries.
amxd = ModuleType("agent_m4l")
amxd.build_amxd = lambda source, target, kind: target.write_bytes(source.read_bytes())
amxd.extract_ptch_chunk = lambda data: data
pil = ModuleType("PIL")
pil.Image = object
with patch.dict(sys.modules, {"agent_m4l": amxd, "PIL": pil}):
    release = load("build_tembro_release", ROOT / "tools/build_tembro_release.py")
    with patch.dict(sys.modules, {"build_tembro_release": release}):
        dmg = load("build_tembro_dmg", ROOT / "tools/build_tembro_dmg.py")
verifier = load("verify_tembro_runtime", ROOT / "installer/verify_tembro_runtime.py")
patcher = load("test_release_patch", ROOT / "devices/Tembro/bridge/patch_runtime.py")


def m4l_payload(directory):
    directory.mkdir()
    entries = {}
    for name in verifier.M4L_FILES:
        data = ("test fixture: " + name).encode()
        (directory / name).write_bytes(data)
        entries[name] = {"sha256": hashlib.sha256(data).hexdigest(),
                         "git_blob_sha1": hashlib.sha1(("blob %d\0" % len(data)).encode() + data).hexdigest(),
                         "upstream_path": "m4l/" + name}
    (directory / "manifest.json").write_text(json.dumps({"pinned_commit": verifier.PIN, "files": entries}))
    return directory


def engine_code_fixture(directory):
    directory.mkdir()
    for name in release.REQUIRED_CODE:
        (directory / name).write_text('const base = cfg.api_base || "http://127.0.0.1:8787";\n')
    for relative in release.ENGINE_ASSETS:
        source = release.CODE_DIR / "engines" / relative
        target = directory / "engines" / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read_bytes())
    return directory


class ReleaseTests(unittest.TestCase):
    def test_release_zip_contains_required_js_and_nested_runtime_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            code = engine_code_fixture(root / "code")
            # A source tree may contain tests and build notes. Only explicitly
            # checked runtime assets belong beside the flattened JS modules.
            (code / "engines/rudiment/golden-parity.json").write_text('{"test":true}')
            (code / "engines/chordarium/README.md").write_text("development notes")
            (code / "engines/chordarium/tools").mkdir()
            (code / "engines/chordarium/tools/build.js").write_text("// build only")
            with patch.object(release, "CODE_DIR", code):
                release.build(root / "Tembro", root / "Tembro.zip", "https://gettembro.com")
            with zipfile.ZipFile(root / "Tembro.zip") as archive:
                for name in release.REQUIRED_CODE:
                    self.assertIn("Tembro/" + name, archive.namelist())
                for name in release.REQUIRED_BRIDGE:
                    self.assertEqual(archive.read("Tembro/bridge/" + name), (release.BRIDGE_DIR / name).read_bytes())
                self.assertIn(b'https://gettembro.com', archive.read("Tembro/tembro_main.js"))
                expected = {"Tembro/engines/" + name for name in release.ENGINE_ASSETS}
                self.assertEqual({name for name in archive.namelist() if name.startswith("Tembro/engines/")}, expected)
                for relative in release.ENGINE_ASSETS:
                    data = (code / "engines" / relative).read_bytes()
                    self.assertEqual(archive.read("Tembro/engines/" + relative), data)
                    self.assertEqual((root / "Tembro/engines" / relative).read_bytes(), data)

    def test_missing_engine_asset_fails_before_creating_any_release_output(self):
        for relative in release.ENGINE_ASSETS:
            with self.subTest(asset=relative), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                code = engine_code_fixture(root / "code")
                (code / "engines" / relative).unlink()
                with patch.object(release, "CODE_DIR", code):
                    with self.assertRaisesRegex(RuntimeError, "required engine release asset"):
                        release.build(root / "Tembro", root / "Tembro.zip")
                self.assertFalse((root / "Tembro").exists())
                self.assertFalse((root / "Tembro.zip").exists())

    def test_corrupt_bundle_manifest_or_trusted_pin_fails_before_creating_output(self):
        for relative in release.ENGINE_ASSETS:
            with self.subTest(asset=relative), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                code = engine_code_fixture(root / "code")
                source = code / "engines" / relative
                source.write_bytes(source.read_bytes() + b"\n")
                with patch.object(release, "CODE_DIR", code):
                    with self.assertRaisesRegex(RuntimeError, "does not match its reviewed pin"):
                        release.build(root / "Tembro", root / "Tembro.zip")
                self.assertFalse((root / "Tembro").exists())
                self.assertFalse((root / "Tembro.zip").exists())

    def test_symlinked_engine_source_is_rejected_even_if_its_bytes_match(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            code = engine_code_fixture(root / "code")
            source = code / "engines/rudiment/engine.bundle.js"
            outside = root / "outside.js"
            source.rename(outside)
            source.symlink_to(outside)
            with patch.object(release, "CODE_DIR", code):
                with self.assertRaisesRegex(RuntimeError, "missing or linked"):
                    release.build(root / "Tembro", root / "Tembro.zip")
            self.assertFalse((root / "Tembro").exists())

    def test_reused_output_cannot_include_old_engine_test_fixtures(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            code = engine_code_fixture(root / "code")
            stale = root / "Tembro/engines/rudiment/golden-parity.json"
            stale.parent.mkdir(parents=True)
            stale.write_text('{"old_fixture":true}')
            with patch.object(release, "CODE_DIR", code):
                with self.assertRaisesRegex(RuntimeError, "unexpected existing engine release asset"):
                    release.build(root / "Tembro", root / "Tembro.zip")
            self.assertEqual(stale.read_text(), '{"old_fixture":true}')
            self.assertFalse((root / "Tembro.zip").exists())
            self.assertFalse((root / "Tembro/Tembro.amxd").exists())

    def test_incomplete_device_fails_before_creating_a_release(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(release, "CODE_DIR", root):
                with self.assertRaisesRegex(RuntimeError, "required Tembro runtime"):
                    release.build(root / "output", root / "release.zip")
            self.assertFalse((root / "output").exists())
            self.assertFalse((root / "release.zip").exists())

    def test_test_version_is_stamped_and_invalid_version_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "installer.command"
            dmg.stamp_installer(output, "https://gettembro.com", "0.1.7-beta.1")
            self.assertIn('TEMBRO_VERSION="0.1.7-beta.1"', output.read_text())
            self.assertIn('"ableton-live-mcp[visual] @ https://github.com/bschoepke/ableton-live-mcp/archive/${UPSTREAM_COMMIT}.zip"', output.read_text())
            with self.assertRaises(ValueError):
                dmg.stamp_installer(output, "https://gettembro.com", '../bad"version')

    def test_distribution_provenance_requires_exact_upstream_pin(self):
        class Distribution:
            version = "0.1.1"
            def read_text(self, name):
                return json.dumps({"url": "https://github.com/bschoepke/ableton-live-mcp/archive/" + verifier.PIN + ".zip"})
        with patch.object(verifier.importlib.metadata, "distribution", return_value=Distribution()):
            verifier.verify_pin()
            Distribution.version = "0.1.2"
            with self.assertRaises(ValueError):
                verifier.verify_pin()

    def test_missing_pil_parent_is_reported_before_runtime_installation_checks(self):
        checked = []
        def finder(module):
            checked.append(module)
            if module == "PIL.Image":
                raise ModuleNotFoundError("No module named 'PIL'")
            return object()
        with patch.object(verifier, "verify_pin") as pin, \
             patch.object(verifier.importlib.util, "find_spec", side_effect=finder), \
             patch.object(verifier, "verify_runtime") as runtime:
            with self.assertRaisesRegex(ValueError, r"missing visual dependencies: Pillow \(PIL.Image\)"):
                verifier.main(["--runtime-root", "/unused/private", "--overlay-dir", "/unused/overlay",
                               "--remote-source", "/unused/remote"])
            pin.assert_called_once()
            runtime.assert_not_called()
        self.assertEqual(checked, ["PIL.Image", "Quartz", "ScreenCaptureKit"])

    def test_pin_only_gate_also_requires_visual_dependencies_before_patching(self):
        order = []
        def dependencies():
            order.append("dependencies")
            raise ValueError("missing visual dependencies")
        with patch.object(verifier, "verify_pin", side_effect=lambda: order.append("pin")), \
             patch.object(verifier, "verify_dependencies", side_effect=dependencies), \
             patch.object(verifier, "verify_runtime") as runtime:
            with self.assertRaisesRegex(ValueError, "missing visual dependencies"):
                verifier.main(["--pin-only"])
            runtime.assert_not_called()
        self.assertEqual(order, ["pin", "dependencies"])

    def test_complete_visual_dependencies_allow_cli_pin_gate_without_live_imports(self):
        with patch.object(verifier, "verify_pin"), \
             patch.object(verifier.importlib.util, "find_spec", return_value=object()) as finder, \
             patch.object(verifier, "verify_runtime") as runtime:
            self.assertEqual(verifier.main(["--pin-only"]), 0)
            runtime.assert_not_called()
        self.assertEqual([call.args[0] for call in finder.call_args_list], ["PIL.Image", "Quartz", "ScreenCaptureKit"])

    def test_missing_wheel_m4l_assets_restore_to_upstream_expected_parent_path(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = m4l_payload(root / "payload")
            purelib = root / "private/lib/python3.12/site-packages"
            purelib.mkdir(parents=True)
            restored = verifier.restore_m4l_assets(purelib, payload)
            self.assertEqual(restored, purelib.parent / "m4l")
            for name in verifier.M4L_FILES:
                self.assertEqual((restored / name).read_bytes(), (payload / name).read_bytes())
            # An already identical private source is accepted without changes.
            self.assertEqual(verifier.restore_m4l_assets(purelib, payload), restored)

    def test_all_m4l_payload_hashes_are_checked_before_creating_private_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = m4l_payload(root / "payload")
            (payload / "agent_m4l_host.js").write_bytes(b"altered payload")
            purelib = root / "private/site-packages"
            purelib.mkdir(parents=True)
            with self.assertRaisesRegex(ValueError, "pinned manifest"):
                verifier.restore_m4l_assets(purelib, payload)
            self.assertFalse((purelib.parent / "m4l").exists())

    def test_differing_existing_m4l_source_is_preserved_without_partial_restore(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = m4l_payload(root / "payload")
            purelib = root / "private/site-packages"
            purelib.mkdir(parents=True)
            existing = purelib.parent / "m4l"
            existing.mkdir()
            (existing / "agent_m4l_host.js").write_bytes(b"existing local modification")
            with self.assertRaisesRegex(ValueError, "refusing overwrite"):
                verifier.restore_m4l_assets(purelib, payload)
            self.assertEqual(list(existing.iterdir()), [existing / "agent_m4l_host.js"])
            self.assertEqual((existing / "agent_m4l_host.js").read_bytes(), b"existing local modification")

    def test_m4l_host_staleness_fails_even_if_sync_cli_previously_returned_success(self):
        module = ModuleType("agent_m4l")
        module.agent_m4l_host_status = lambda: {"current": False}
        with patch.object(verifier.importlib, "import_module", return_value=module):
            with self.assertRaisesRegex(ValueError, "host companions are not current"):
                verifier.verify_m4l_host()
            module.agent_m4l_host_status = lambda: {"current": True}
            verifier.verify_m4l_host()

    def test_cli_checks_m4l_host_after_runtime_hash_verification(self):
        order = []
        with patch.object(verifier, "verify_pin", side_effect=lambda: order.append("pin")), \
             patch.object(verifier, "verify_dependencies", side_effect=lambda: order.append("dependencies")), \
             patch.object(verifier, "verify_runtime", side_effect=lambda *args: order.append("runtime")), \
             patch.object(verifier, "verify_m4l_host", side_effect=lambda: order.append("host")):
            self.assertEqual(verifier.main(["--runtime-root", "/unused/private", "--overlay-dir", "/unused/overlay",
                                            "--remote-source", "/unused/remote"]), 0)
        self.assertEqual(order, ["pin", "dependencies", "runtime", "host"])

    def test_custom_m4l_companion_blocks_sync_gate_without_writing_any_target(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = m4l_payload(root / "payload")
            original = root / "custom.js"
            original.write_bytes(b"custom user companion")
            missing = root / "missing.js"
            module = ModuleType("agent_m4l")
            module.agent_m4l_host_status = lambda: {"targets_checked": 2, "targets": [
                {"path": str(missing), "installed": False, "target_sha256": None},
                {"path": str(original), "installed": True, "target_sha256": hashlib.sha256(original.read_bytes()).hexdigest()},
            ]}
            with patch.object(verifier.importlib, "import_module", return_value=module), \
                 patch.object(verifier, "verify_pin"), patch.object(verifier, "verify_dependencies"), \
                 patch.object(verifier, "restore_m4l_assets") as restore:
                with self.assertRaisesRegex(ValueError, "left untouched"):
                    verifier.main(["--check-m4l-targets", str(payload)])
                restore.assert_not_called()
            self.assertFalse(missing.exists())
            self.assertEqual(original.read_bytes(), b"custom user companion")

    def test_sync_gate_accepts_all_matching_and_missing_companions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = m4l_payload(root / "payload")
            existing, missing = root / "existing.js", root / "missing.js"
            existing.write_bytes((payload / "agent_m4l_host.js").read_bytes())
            module = ModuleType("agent_m4l")
            module.agent_m4l_host_status = lambda: {"targets_checked": 2, "targets": [
                {"path": str(existing), "installed": True, "target_sha256": hashlib.sha256(existing.read_bytes()).hexdigest()},
                {"path": str(missing), "installed": False, "target_sha256": None},
            ]}
            with patch.object(verifier.importlib, "import_module", return_value=module):
                verifier.check_m4l_sync_targets(payload)
            self.assertFalse(missing.exists(), "the preservation gate never invokes sync or writes files")


@unittest.skipUnless(UPSTREAM, "Set TEMBRO_UPSTREAM_ROOT to exact pinned package files")
class RuntimePackagingTests(unittest.TestCase):
    def test_staged_payload_matches_fresh_private_install_without_changing_source(self):
        source = Path(UPSTREAM)
        before = {name: (source / name).read_bytes() for name in patcher.BASE_HASHES}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload, installed = root / "payload", root / "private-runtime"
            payload.mkdir()
            shutil.copytree(source, installed)
            dmg.stage_variation_runtime(payload, source)
            self.assertEqual(sorted(p.name for p in (payload / "Ableton_Live_MCP").iterdir()), ["__init__.py", "bridge.py"])
            patcher.run("apply", installed)
            verifier.verify_runtime(installed, payload / "variation-runtime", payload / "Ableton_Live_MCP")
            (installed / "server.py").write_text("# altered after installation\n")
            with self.assertRaisesRegex(ValueError, "Runtime readback"):
                verifier.verify_runtime(installed, payload / "variation-runtime", payload / "Ableton_Live_MCP")
        self.assertEqual(before, {name: (source / name).read_bytes() for name in before})

    def test_unknown_remote_initializer_is_rejected_before_export(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, payload = root / "source", root / "payload"
            shutil.copytree(UPSTREAM, source)
            payload.mkdir()
            (source / "Ableton_Live_MCP/__init__.py").write_text("# unexpected runtime\n")
            with self.assertRaisesRegex(RuntimeError, "exact pinned"):
                dmg.stage_variation_runtime(payload, source)
            self.assertEqual(list(payload.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
