#!/usr/bin/env python3
"""Reversible exact-pin patch. Never installs or reloads a Control Surface."""

import argparse
import difflib
import hashlib
import json
import os
from pathlib import Path

PIN = "70f7df9192b78d9bd9405f369c9e046c88f1610e"
BASE_HASHES = {
    "server.py": "7e0621e8feb8be5054c3efa184b0a04df0bf45308fae7c226400ba456e72e82b",
    "bridge.py": "e700cb6faed56fbea2de2e0078901b7cdd7ff3cd9ad7c0ea72caa35b5c400232",
    "validate.py": "c8caa9c69ab8bd92ccc59263cc02b34ce778e432d309ac94a3e782d5db25a26a",
    "Ableton_Live_MCP/bridge.py": "63e9a56afa8a995bc171046083f1fff179651718e05fbb08fade71198f7e5f41",
}
HERE = Path(__file__).resolve().parent
MARKER = "tembro-clip-variation-v1"
TOOL_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "action": {"type": "string", "enum": ["capture", "create", "thin", "audition_source", "audition_candidate", "keep", "discard", "status"]},
        "owner_id": {"type": "string", "minLength": 16, "maxLength": 128, "pattern": "^[A-Za-z0-9_-]+$"},
        "source": {"type": "object", "properties": {"id": {"type": "integer"}}, "required": ["id"], "additionalProperties": False},
        "pitch": {"type": "integer", "minimum": 0, "maximum": 127},
        "expected_set_signature": {"type": "string", "minLength": 1},
        "timeout": {"type": "number", "minimum": 1},
    },
    "required": ["action", "owner_id"],
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def atomic_write(path, data):
    temporary = path.with_name(path.name + ".tembro-patch-tmp")
    with temporary.open("xb") as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


def once(text, old, new):
    if text.count(old) != 1:
        raise ValueError("Pinned patch anchor is missing or ambiguous")
    return text.replace(old, new, 1)


def transform(relative, original):
    text = original.decode("utf-8")
    if relative == "server.py":
        registration = "    server.add_tool(Tool(\"live_clip_variation\", \"Fixed Tembro controller action; explicit user controls only.\", %r, forward(\"clip_variation\")))\n" % TOOL_SCHEMA
        return once(text, "    timeout_control = ", registration + "    timeout_control = ").encode("utf-8")
    if relative == "Ableton_Live_MCP/bridge.py":
        runtime = (HERE / "variation_runtime.py").read_text(encoding="utf-8")
        text = once(text, 'REMOTE_SCRIPT_RUNTIME_VERSION = "transport-stop-settle-1"', 'REMOTE_SCRIPT_RUNTIME_VERSION = "transport-stop-settle-1+' + MARKER + '"')
        text = once(text, "class AbletonLiveMCP(ControlSurface):", runtime + "\n\nclass AbletonLiveMCP(ControlSurface):")
        if text.count("isinstance(value, _EncodedResult)") != 2:
            raise ValueError("Pinned response-encoding anchors changed")
        text = text.replace("isinstance(value, _EncodedResult)", "isinstance(value, (_EncodedResult, _TembroVariationResult))")
        return once(text, "    def _rpc_clip_notes(self, params):", "    def _rpc_clip_variation(self, params):\n        return _TembroVariationResult(_tembro_clip_variation(self, params))\n\n    def _rpc_clip_notes(self, params):").encode("utf-8")
    if relative == "bridge.py":
        old = "        sock.sendall(line)\n        response = self._read_line(sock, self.config.max_response_bytes, time.monotonic() + request_timeout)"
        new = '''        try:
            sock.sendall(line)
            response = self._read_line(sock, self.config.max_response_bytes, time.monotonic() + request_timeout)
        except OSError as exc:
            # The fixed variation operation may have reached Live even if a
            # disconnect/partial write loses its response. Never resend it.
            if payload.get("method") == "clip_variation":
                raise _BridgeReadTimeout("Tembro operation has unknown sent outcome; do not retry") from exc
            raise'''
        text = once(text, old, new)
        stale = '''        if self._is_stale_idle_timeout(message, payload["id"]):
            if method == "clip_variation":
                self._mark_client_stall(method, params)
                self.close()
                raise AbletonBridgeError("Tembro request was sent but response correlation was lost; it was not retried automatically")
'''
        return once(text, '        if self._is_stale_idle_timeout(message, payload["id"]):\n', stale).encode("utf-8")
    if relative == "validate.py":
        expectation = '''        "live_clip_variation": {
            "properties": ["action", "owner_id", "source", "pitch", "expected_set_signature", "timeout"],
            "required": ["action", "owner_id"],
            "enums": {"action": ["capture", "create", "thin", "audition_source", "audition_candidate", "keep", "discard", "status"]},
        },
'''
        return once(text, "    expectations = {\n", "    expectations = {\n" + expectation).encode("utf-8")
    raise ValueError("Unknown patch file: " + relative)


def prepare(root):
    root = root.resolve()
    result = {}
    for relative, expected in BASE_HASHES.items():
        target = root / relative
        original = target.read_bytes()
        if target.is_symlink() or not target.resolve().is_relative_to(root) or digest(original) != expected:
            raise ValueError("Exact pinned hash required: " + relative)
        patched = transform(relative, original)
        compile(patched, str(target), "exec")
        result[relative] = (original, patched)
    return result


def export_overlay(upstream_root, output_dir):
    """Materialize release bytes without modifying the pinned source checkout."""
    upstream_root, output_dir = Path(upstream_root).resolve(), Path(output_dir)
    pending = prepare(upstream_root)
    if output_dir.exists():
        raise ValueError("Overlay output already exists; refusing overwrite")
    report = {"pinned_commit": PIN, "protocol": "tembro.clip-variation.v1",
              "source_sha256": dict(BASE_HASHES),
              "patched_sha256": {relative: digest(pair[1]) for relative, pair in pending.items()},
              "installed_or_reloaded": False}
    output_dir.mkdir(parents=True)
    for relative, (_, patched) in pending.items():
        target = output_dir / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(patched)
    (output_dir / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def run(action, root):
    root = root.resolve()
    backup = root / ("." + MARKER + "-backup")
    if action == "revert":
        if backup.is_symlink() or (backup / "manifest.json").is_symlink():
            raise ValueError("Unsafe backup path")
        manifest = json.loads((backup / "manifest.json").read_text())
        pending = []
        for relative, expected in BASE_HASHES.items():
            target, saved = root / relative, backup / relative
            original = saved.read_bytes()
            if target.is_symlink() or saved.is_symlink() or not target.resolve().is_relative_to(root) or not saved.resolve().is_relative_to(backup) or digest(original) != expected:
                raise ValueError("Invalid pinned backup: " + relative)
            if digest(target.read_bytes()) not in (expected, manifest["patched_sha256"].get(relative)):
                raise ValueError("Patched file changed; refusing revert: " + relative)
            pending.append((target, original))
        for target, original in pending:
            atomic_write(target, original)
        return {"reverted": True, "backup_retained": str(backup)}
    already_current = False
    if backup.exists() and action in ("check", "apply"):
        # A forced pinned dependency reinstall may leave our hidden backup.
        # Reuse it only if it still contains the exact complete pinned baseline.
        if backup.is_symlink() or (backup / "manifest.json").is_symlink():
            raise ValueError("Backup must not be a symlink")
        pending = prepare(backup)
        actual = {}
        for relative in pending:
            target = root / relative
            if target.is_symlink() or not target.resolve().is_relative_to(root):
                raise ValueError("Unsafe target path: " + relative)
            actual[relative] = digest(target.read_bytes())
        original_hashes = {name: digest(pair[0]) for name, pair in pending.items()}
        patched_hashes = {name: digest(pair[1]) for name, pair in pending.items()}
        if actual == patched_hashes:
            already_current = True
        elif actual != original_hashes:
            raise ValueError("Installed files are changed or mixed; inspect and use guarded revert")
    else:
        pending = prepare(root)
    report = {"pinned_commit": PIN, "root": str(root), "files": list(pending),
              "patched_sha256": {relative: digest(pair[1]) for relative, pair in pending.items()},
              "installed_or_reloaded": False, "already_current": already_current}
    if action == "diff":
        return "".join("".join(difflib.unified_diff(original.decode().splitlines(True), patched.decode().splitlines(True), "a/" + relative, "b/" + relative)) for relative, (original, patched) in pending.items())
    if action == "apply":
        if not backup.exists():
            backup.mkdir()
            for relative, (original, _) in pending.items():
                saved = backup / relative
                saved.parent.mkdir(parents=True, exist_ok=True)
                saved.write_bytes(original)
        (backup / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
        # Every file and transformed Python unit was checked before any mutation.
        if not already_current:
            for relative, (_, patched) in pending.items():
                atomic_write(root / relative, patched)
        report["applied"] = True
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["check", "diff", "apply", "revert", "export"])
    parser.add_argument("--upstream-root", type=Path, required=True, help="Directory containing the four exact pinned Python files")
    parser.add_argument("--output-dir", type=Path, help="New output directory for export only")
    args = parser.parse_args()
    if args.action == "export" and args.output_dir is None:
        parser.error("export requires --output-dir")
    result = export_overlay(args.upstream_root, args.output_dir) if args.action == "export" else run(args.action, args.upstream_root)
    print(result if isinstance(result, str) else json.dumps(result, indent=2))
