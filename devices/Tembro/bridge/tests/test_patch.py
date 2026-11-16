import importlib.util
import os
from pathlib import Path
import shutil
import sys
import tempfile
import threading
from types import ModuleType
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("patch_runtime", ROOT / "patch_runtime.py")
patcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patcher)
UPSTREAM = os.environ.get("TEMBRO_UPSTREAM_ROOT")


@unittest.skipUnless(UPSTREAM, "Set TEMBRO_UPSTREAM_ROOT to the exact pinned checkout for patch integration tests")
class PatchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for relative in patcher.BASE_HASHES:
            destination = self.root / relative
            destination.parent.mkdir(exist_ok=True, parents=True)
            shutil.copyfile(Path(UPSTREAM) / relative, destination)

    def tearDown(self):
        self.temp.cleanup()

    def test_exact_pin_apply_revert_roundtrip(self):
        before = {name: (self.root / name).read_bytes() for name in patcher.BASE_HASHES}
        result = patcher.run("check", self.root)
        self.assertFalse(result["installed_or_reloaded"])
        patcher.run("apply", self.root)
        for name in before:
            self.assertNotEqual((self.root / name).read_bytes(), before[name])
        patcher.run("revert", self.root)
        for name in before:
            self.assertEqual((self.root / name).read_bytes(), before[name])

    def test_export_materializes_same_release_bytes_without_changing_upstream(self):
        before = {name: (self.root / name).read_bytes() for name in patcher.BASE_HASHES}
        output = self.root / "release-overlay"
        report = patcher.export_overlay(self.root, output)
        for name in before:
            self.assertEqual((self.root / name).read_bytes(), before[name])
            self.assertEqual((output / name).read_bytes(), patcher.transform(name, before[name]))
            self.assertEqual(patcher.digest((output / name).read_bytes()), report["patched_sha256"][name])
        self.assertRaisesRegex(ValueError, "already exists", patcher.export_overlay, self.root, output)

    def test_modified_pin_refused_without_any_writes(self):
        target = self.root / "bridge.py"
        target.write_text(target.read_text() + "\n# user change\n")
        server_before = (self.root / "server.py").read_bytes()
        self.assertRaisesRegex(ValueError, "Exact pinned hash", patcher.run, "apply", self.root)
        self.assertEqual((self.root / "server.py").read_bytes(), server_before)

    def test_modified_patched_file_refuses_revert_without_overwrite(self):
        patcher.run("apply", self.root)
        target = self.root / "bridge.py"
        target.write_text(target.read_text() + "\n# user change\n")
        server_before = (self.root / "server.py").read_bytes()
        self.assertRaisesRegex(ValueError, "refusing revert", patcher.run, "revert", self.root)
        self.assertEqual((self.root / "server.py").read_bytes(), server_before)

    def test_interrupted_apply_can_revert_mixture_of_pinned_and_patched(self):
        patcher.run("apply", self.root)
        target = self.root / "server.py"
        target.write_bytes((Path(UPSTREAM) / "server.py").read_bytes())
        self.assertTrue(patcher.run("revert", self.root)["reverted"])

    def test_repeat_apply_checks_complete_current_output_and_retains_backup(self):
        patcher.run("apply", self.root)
        before = {name: (self.root / name).read_bytes() for name in patcher.BASE_HASHES}
        self.assertTrue(patcher.run("apply", self.root)["already_current"])
        for name in before:
            self.assertEqual((self.root / name).read_bytes(), before[name])

    def test_pinned_dependency_reinstall_can_reapply_using_valid_original_backup(self):
        patcher.run("apply", self.root)
        for name in patcher.BASE_HASHES:
            shutil.copyfile(Path(UPSTREAM) / name, self.root / name)
        result = patcher.run("apply", self.root)
        self.assertTrue(result["applied"])
        self.assertFalse(result["already_current"])

    def test_modified_backup_cannot_be_reused(self):
        patcher.run("apply", self.root)
        saved = self.root / ("." + patcher.MARKER + "-backup") / "bridge.py"
        saved.write_text(saved.read_text() + "\n# changed backup\n")
        self.assertRaisesRegex(ValueError, "Exact pinned hash", patcher.run, "apply", self.root)

    def test_runtime_fingerprint_includes_guarded_functions(self):
        patcher.run("apply", self.root)
        modules = {"Live": ModuleType("Live"), "_Framework": ModuleType("_Framework"),
                   "_Framework.ControlSurface": ModuleType("_Framework.ControlSurface")}
        modules["_Framework.ControlSurface"].ControlSurface = object
        with patch.dict(sys.modules, modules):
            source = (self.root / "Ableton_Live_MCP/bridge.py").read_text()
            namespace = {"__name__": "test_remote_bridge", "__file__": str(self.root / "Ableton_Live_MCP/bridge.py")}
            exec(compile(source, namespace["__file__"], "exec"), namespace)
        names = [name for name, _ in namespace["_runtime_function_signatures"](namespace)]
        self.assertIn("_tembro_check_held", names)
        self.assertIn("_tembro_clip_variation", names)
        self.assertIn("_rpc_clip_variation", dict(namespace["_runtime_function_signatures"](namespace["AbletonLiveMCP"].__dict__)))
        before = namespace["_runtime_code_fingerprint"]()
        installer_path = Path(UPSTREAM) / "install_remote_script.py"
        if installer_path.is_file():
            paths_module = ModuleType("ableton_paths")
            paths_module.remote_scripts_dir = lambda: self.root
            with patch.dict(sys.modules, {"ableton_paths": paths_module}):
                installer = {"__name__": "test_installer", "__file__": str(installer_path)}
                exec(installer_path.read_text(), installer)
            self.assertEqual(before, installer["_runtime_code_fingerprint"](self.root / "Ableton_Live_MCP/bridge.py"))
        namespace["_tembro_check_held"] = lambda *a: None
        self.assertNotEqual(before, namespace["_runtime_code_fingerprint"]())

    def test_existing_main_thread_dispatch_checks_signature_then_fixed_operation(self):
        patcher.run("apply", self.root)
        modules = {"Live": ModuleType("Live"), "_Framework": ModuleType("_Framework"),
                   "_Framework.ControlSurface": ModuleType("_Framework.ControlSurface")}
        modules["_Framework.ControlSurface"].ControlSurface = object
        with patch.dict(sys.modules, modules):
            namespace = {"__name__": "test_remote_bridge"}
            exec((self.root / "Ableton_Live_MCP/bridge.py").read_text(), namespace)
        host = namespace["AbletonLiveMCP"].__new__(namespace["AbletonLiveMCP"])
        host._main_thread_id = threading.current_thread().ident
        order = []
        host._check_expected_set_signature = lambda params: order.append("signature")
        namespace["_tembro_clip_variation"] = lambda h, p: order.append("guard-and-mutate") or {"ok": True, "notes": list(range(350))}
        result = host._run_on_main("clip_variation", {"expected_set_signature": "sig"})
        self.assertTrue(result["ok"])
        self.assertEqual(order, ["signature", "guard-and-mutate"])
        self.assertEqual(len(result["notes"]), 350)

    def test_sent_disconnect_is_never_retried_for_variation(self):
        patcher.run("apply", self.root)
        spec = importlib.util.spec_from_file_location("test_patched_client", self.root / "bridge.py")
        module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {spec.name: module}):
            spec.loader.exec_module(module)
        client = module.AbletonBridgeClient()
        class Socket:
            sends = 0
            def settimeout(self, timeout):
                pass
            def sendall(self, data):
                self.sends += 1
            def recv(self, size):
                return b""
            def close(self):
                pass
        for response in (b"", b'{"id":null,"error":{"message":"timed out"}}\n'):
            with self.subTest(response=response):
                client = module.AbletonBridgeClient()
                sock = Socket()
                sock.recv = lambda size: response
                client._socket = lambda: sock
                self.assertRaisesRegex(module.AbletonBridgeError, "not retried", client.request, "clip_variation", {"action": "create"})
                self.assertEqual(sock.sends, 1)


if __name__ == "__main__":
    unittest.main()
