#!/usr/bin/env python3
"""Check the packaged and private installed runtime without importing Live code."""

import argparse
from datetime import datetime, timezone
import hashlib
import importlib
import importlib.metadata
import importlib.util
import json
from pathlib import Path
import stat
import sys
import tempfile

PIN = "70f7df9192b78d9bd9405f369c9e046c88f1610e"
FILES = {"server.py", "bridge.py", "validate.py", "Ableton_Live_MCP/bridge.py"}
VISUAL_DEPENDENCIES = (
    ("Pillow", "PIL.Image"),
    ("pyobjc-framework-Quartz", "Quartz"),
    ("pyobjc-framework-ScreenCaptureKit", "ScreenCaptureKit"),
)
M4L_FILES = {"agent_m4l_host.js", "agent_audio_tap.js", "AgentAudioTap.maxpat", "AgentAudioTap.amxd", "README.md"}


class M4LConflict(ValueError):
    """A recoverable upgrade conflict, distinct from an invalid installation."""


def verify_pin():
    distribution = importlib.metadata.distribution("ableton-live-mcp")
    origin = json.loads(distribution.read_text("direct_url.json") or "{}")
    url = origin.get("url", "")
    archive = url == "https://github.com/bschoepke/ableton-live-mcp/archive/" + PIN + ".zip"
    vcs = url in ("https://github.com/bschoepke/ableton-live-mcp", "https://github.com/bschoepke/ableton-live-mcp.git") and origin.get("vcs_info", {}).get("commit_id") == PIN
    if distribution.version != "0.1.1" or not (archive or vcs):
        raise ValueError("The private bridge is not the exact pinned upstream package")


def verify_dependencies(finder=None):
    """Check the three macOS visual dependencies without importing Live code."""
    finder = finder or importlib.util.find_spec
    missing = []
    for package, module in VISUAL_DEPENDENCIES:
        try:
            available = finder(module) is not None
        except (ImportError, AttributeError, ValueError):
            # find_spec("PIL.Image") raises when its parent PIL is missing.
            # Report that installation defect before patching or copying files.
            available = False
        if not available:
            missing.append(package + " (" + module + ")")
    if missing:
        raise ValueError("The private bridge is missing visual dependencies: " + ", ".join(missing)
                         + ". Install the pinned ableton-live-mcp[visual] package before continuing.")


def restore_m4l_assets(runtime_root, source):
    """Restore the pinned assets omitted by the upstream wheel, before sync."""
    manifest_path = source / "manifest.json"
    if source.is_symlink() or manifest_path.is_symlink():
        raise ValueError("M4L asset payload must not be a symlink")
    manifest = json.loads(manifest_path.read_text())
    entries = manifest.get("files", {})
    if manifest.get("pinned_commit") != PIN or set(entries) != M4L_FILES:
        raise ValueError("Incomplete or unpinned M4L asset manifest")
    destination = runtime_root.parent / "m4l"
    if destination.is_symlink() or (destination.exists() and not destination.is_dir()):
        raise ValueError("Private M4L asset directory is not a regular directory")
    pending = []
    # Check every input and any existing destination before writing any asset.
    for name in sorted(M4L_FILES):
        entry = entries[name]
        path = source / name
        if path.is_symlink() or not path.is_file() or entry.get("upstream_path") != "m4l/" + name:
            raise ValueError("Invalid pinned M4L asset: " + name)
        data = path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        blob = hashlib.sha1(("blob %d\0" % len(data)).encode("ascii") + data).hexdigest()
        if digest != entry.get("sha256") or blob != entry.get("git_blob_sha1"):
            raise ValueError("M4L asset does not match its pinned manifest: " + name)
        target = destination / name
        if target.is_symlink() or (target.exists() and (not target.is_file() or target.read_bytes() != data)):
            raise ValueError("Existing private M4L asset differs; refusing overwrite: " + name)
        pending.append((target, data, digest))
    destination.mkdir(parents=True, exist_ok=True)
    for target, data, expected in pending:
        if not target.exists():
            # Exclusive creation also protects an intervening unexpected file.
            with target.open("xb") as handle:
                handle.write(data)
        if target.is_symlink() or hashlib.sha256(target.read_bytes()).hexdigest() != expected:
            raise ValueError("Private M4L asset readback failed: " + target.name)
    print("Private M4L source assets match the pinned payload.")
    return destination


def verify_m4l_host():
    # This is the upstream filesystem-only inspection used by its validator;
    # it does not contact Live or reload any generated device.
    status = importlib.import_module("agent_m4l").agent_m4l_host_status()
    if not isinstance(status, dict) or status.get("current") is not True:
        raise ValueError("Generated M4L host companions are not current; the official sync must succeed before installation")


def m4l_sync_conflicts(source):
    """Inspect the source and companions without modifying them."""
    manifest_path = source / "manifest.json"
    asset = source / "agent_m4l_host.js"
    if source.is_symlink() or manifest_path.is_symlink() or asset.is_symlink():
        raise ValueError("M4L asset payload must not be a symlink")
    manifest = json.loads(manifest_path.read_text())
    entries = manifest.get("files", {})
    if manifest.get("pinned_commit") != PIN or set(entries) != M4L_FILES:
        raise ValueError("Incomplete or unpinned M4L asset manifest")
    expected = entries["agent_m4l_host.js"].get("sha256")
    if hashlib.sha256(asset.read_bytes()).hexdigest() != expected:
        raise ValueError("Packaged M4L host does not match its manifest")
    status = importlib.import_module("agent_m4l").agent_m4l_host_status()
    targets = status.get("targets") if isinstance(status, dict) else None
    if not isinstance(targets, list) or status.get("targets_checked") != len(targets):
        raise ValueError("Could not inspect every generated M4L companion before sync")
    conflicts = []
    for target in targets:
        raw_path = target.get("path")
        if not isinstance(raw_path, str) or not Path(raw_path).is_absolute() or type(target.get("installed")) is not bool:
            raise ValueError("Incomplete generated M4L companion status")
        path = Path(raw_path)
        if path.is_symlink():
            conflicts.append(raw_path)
        elif target["installed"]:
            if not path.is_file() or target.get("target_sha256") != expected or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                conflicts.append(raw_path)
        elif path.exists() or target.get("target_sha256") is not None:
            conflicts.append(raw_path)
    raw_source = status.get("source")
    if raw_source is not None:
        if not isinstance(raw_source, str) or not Path(raw_source).is_absolute():
            raise ValueError("Incomplete M4L source status")
        path = Path(raw_source)
        if path.is_symlink() or (path.exists() and (not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected)):
            conflicts.insert(0, raw_source)
    return list(dict.fromkeys(conflicts))


def check_m4l_sync_targets(source):
    """Refuse custom companions before source restoration or the sync writes."""
    conflicts = m4l_sync_conflicts(source)
    if conflicts:
        raise M4LConflict("Existing M4L companions differ from the pinned source or changed during inspection; left untouched: "
                         + ", ".join(conflicts) + ". Sync and installation were not started.")
    print("Existing M4L companions match the pinned source; missing companions may be created.")


def replace_file(path, data, mode):
    """Replace one regular file atomically, keeping its original permissions."""
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".tembro-update-", delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(data)
    try:
        temporary.chmod(mode)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def backup_and_replace_m4l_targets(source, backup_root):
    """Explicit user-selected upgrade: verify every backup before any replacement."""
    conflicts = m4l_sync_conflicts(source)
    if not conflicts:
        check_m4l_sync_targets(source)
        return None
    originals = []
    for raw_path in conflicts:
        path = Path(raw_path)
        if path.is_symlink() or not path.is_file():
            raise ValueError("A linked or non-file M4L companion cannot be upgraded automatically: " + str(path))
        originals.append((path, path.read_bytes(), stat.S_IMODE(path.stat().st_mode)))
    if backup_root.is_symlink():
        raise ValueError("The backup directory must not be a symlink")
    backup_root.mkdir(parents=True, exist_ok=True)
    backup = Path(tempfile.mkdtemp(prefix=datetime.now(timezone.utc).strftime("m4l-%Y%m%dT%H%M%SZ-"), dir=backup_root))
    records = []
    for index, (path, data, mode) in enumerate(originals):
        name = "%02d-agent_m4l_host.js" % index
        target = backup / name
        target.write_bytes(data)
        digest = hashlib.sha256(data).hexdigest()
        if hashlib.sha256(target.read_bytes()).hexdigest() != digest:
            raise ValueError("M4L backup readback failed; original files were left untouched")
        records.append({"path": str(path), "backup": name, "sha256": digest, "mode": mode})
    manifest = {"schema": "tembro.m4l-upgrade-backup.v1", "pinned_commit": PIN,
                "status": "prepared", "files": records}
    manifest_path = backup / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    replacement = (source / "agent_m4l_host.js").read_bytes()
    # Detect intervening edits after all backups have been verified.
    for path, data, _mode in originals:
        if path.is_symlink() or path.read_bytes() != data:
            raise ValueError("M4L companion changed while preparing the backup; no replacement started: " + str(path))
    replaced = []
    try:
        for path, data, mode in originals:
            if path.is_symlink() or path.read_bytes() != data:
                raise ValueError("M4L companion changed during the upgrade: " + str(path))
            replace_file(path, replacement, mode)
            replaced.append((path, data, mode))
        check_m4l_sync_targets(source)
        manifest["status"] = "updated"
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    except Exception as error:
        rollback_errors = []
        for path, data, mode in reversed(replaced):
            try:
                if path.is_symlink() or not path.is_file() or path.read_bytes() != replacement:
                    rollback_errors.append(str(path) + ": changed or removed during upgrade; left untouched")
                    continue
                replace_file(path, data, mode)
            except OSError as rollback_error:
                rollback_errors.append(str(path) + ": " + str(rollback_error))
        manifest["status"] = "failed"
        manifest["rollback_errors"] = rollback_errors
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
        if rollback_errors:
            raise RuntimeError(str(error) + ". Some files changed during recovery; verified originals are in " + str(backup)) from error
        raise
    print("TEMBRO_BACKUP: " + str(backup))
    return backup


def verify_runtime(runtime_root, overlay_dir, remote_source):
    manifest = json.loads((overlay_dir / "manifest.json").read_text())
    if manifest.get("pinned_commit") != PIN or manifest.get("protocol") != "tembro.clip-variation.v1":
        raise ValueError("Unexpected packaged runtime manifest")
    hashes = manifest.get("patched_sha256", {})
    if set(hashes) != FILES or set(manifest.get("source_sha256", {})) != FILES:
        raise ValueError("Incomplete packaged runtime manifest")
    for name, expected in hashes.items():
        if not isinstance(expected, str) or len(expected) != 64:
            raise ValueError("Invalid packaged runtime hash")
        for root in (runtime_root, overlay_dir):
            target = root / name
            if target.is_symlink() or hashlib.sha256(target.read_bytes()).hexdigest() != expected:
                raise ValueError("Runtime readback does not match the installer: " + name)
    bridge = remote_source / "bridge.py"
    if bridge.is_symlink() or hashlib.sha256(bridge.read_bytes()).hexdigest() != hashes["Ableton_Live_MCP/bridge.py"]:
        raise ValueError("The Remote Script does not match the private runtime")
    print("Private bridge and packaged Remote Script match the checked variation runtime.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group()
    action.add_argument("--pin-only", action="store_true")
    action.add_argument("--restore-m4l-assets", type=Path)
    action.add_argument("--check-m4l-targets", type=Path)
    action.add_argument("--backup-m4l-targets", type=Path)
    parser.add_argument("--backup-root", type=Path)
    parser.add_argument("--runtime-root", type=Path)
    parser.add_argument("--overlay-dir", type=Path)
    parser.add_argument("--remote-source", type=Path)
    args = parser.parse_args(argv)
    verify_pin()
    verify_dependencies()
    if args.backup_m4l_targets:
        if args.backup_root is None:
            parser.error("backup-root is required for an explicit M4L upgrade")
        backup_and_replace_m4l_targets(args.backup_m4l_targets, args.backup_root)
        return 0
    if args.check_m4l_targets:
        check_m4l_sync_targets(args.check_m4l_targets)
        return 0
    if args.restore_m4l_assets:
        if args.runtime_root is None:
            parser.error("runtime-root is required to restore M4L assets")
        restore_m4l_assets(args.runtime_root, args.restore_m4l_assets)
        return 0
    if not args.pin_only:
        if not all((args.runtime_root, args.overlay_dir, args.remote_source)):
            parser.error("runtime-root, overlay-dir and remote-source are required")
        verify_runtime(args.runtime_root, args.overlay_dir, args.remote_source)
        verify_m4l_host()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except M4LConflict as error:
        print("TEMBRO_ERROR: " + str(error), file=sys.stderr)
        raise SystemExit(20)
    except Exception as error:
        print("TEMBRO_ERROR: " + str(error), file=sys.stderr)
        raise SystemExit(1)
