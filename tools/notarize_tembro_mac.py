#!/usr/bin/env python3
"""Verify an immutable Tembro checkout, then sign/notarize in a secure Mac TTY.

Source manifest: {"schema":"tembro.release-source.v1", "source_commit":"<40 hex>",
"version":"<package version>", "files":[{"path":"<tracked relative path>",
"sha256":"<64 hex>"}]}. Every tracked file must be listed exactly once.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parent.parent
IDENTITY = "Developer ID Application: STEFANO DELLA PIETRA (6GK4ZCNTUX)"
PROFILE = "ste-hue"
VERSION_PATTERN = r"[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*)?"


def sha256(file: Path) -> str:
    digest = hashlib.sha256()
    with file.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=ROOT)


def no_link_path(path: Path) -> None:
    for item in [path, *path.parents]:
        if item.is_symlink():
            raise RuntimeError("Symlink is not allowed in a release source path: " + str(item))
        if item == ROOT:
            break


def package_version() -> str:
    version = json.loads((ROOT / "devices/Tembro/package.json").read_text())["version"]
    if not isinstance(version, str) or not re.fullmatch(VERSION_PATTERN, version):
        raise RuntimeError("Invalid package version")
    markers = [
        ("devices/Tembro/code/tembro_main.js", r'const DEVICE_VERSION = "([^"\n]+)";'),
        ("devices/Tembro/code/mcp_client.js", r'clientInfo:\s*\{\s*name:\s*"tembro",\s*version:\s*"([^"\n]+)"\s*\}'),
        ("installer/Install Tembro.command", r'^TEMBRO_VERSION="([^"\n]+)"$'),
    ]
    for relative, pattern in markers:
        matches = re.findall(pattern, (ROOT / relative).read_text(), re.M)
        if matches != [version]:
            raise RuntimeError("Release version marker differs from package: " + relative)
    return version


def check_source(manifest_path: Path, expected_commit: str, version: str,
                 expected_manifest_hash: str | None = None) -> int:
    if git("rev-parse", "HEAD").decode().strip() != expected_commit:
        raise RuntimeError("HEAD differs from --expected-commit")
    if git("status", "--porcelain=v1", "--untracked-files=all"):
        raise RuntimeError("Checkout must be clean, including untracked files that are not ignored")
    no_link_path(manifest_path)
    manifest_bytes = manifest_path.read_bytes()
    if expected_manifest_hash and hashlib.sha256(manifest_bytes).hexdigest() != expected_manifest_hash:
        raise RuntimeError("Source manifest changed during release")
    manifest = json.loads(manifest_bytes)
    if not isinstance(manifest, dict) or manifest.get("schema") != "tembro.release-source.v1":
        raise RuntimeError("Unsupported source manifest schema")
    if manifest.get("source_commit") != expected_commit or manifest.get("version") != version:
        raise RuntimeError("Source manifest commit/version differs from the requested release")
    if package_version() != version:
        raise RuntimeError("Package version changed during release")
    entries = manifest.get("files")
    if not isinstance(entries, list) or not entries:
        raise RuntimeError("Source manifest files must be a nonempty list")
    expected_paths = set(git("ls-files", "-z").decode().split("\0")) - {""}
    paths = set()
    for item in entries:
        if not isinstance(item, dict) or set(item) != {"path", "sha256"}:
            raise RuntimeError("Invalid source manifest entry")
        name, expected_hash = item["path"], item["sha256"]
        if not isinstance(name, str) or not name or "\\" in name:
            raise RuntimeError("Invalid source manifest path")
        relative = Path(name)
        if relative.is_absolute() or ".." in relative.parts or str(relative) != name or name in paths:
            raise RuntimeError("Invalid or duplicate source manifest path: " + name)
        if not isinstance(expected_hash, str) or not re.fullmatch(r"[a-f0-9]{64}", expected_hash):
            raise RuntimeError("Invalid source hash: " + name)
        file = ROOT / relative
        no_link_path(file)
        if not file.is_file() or sha256(file) != expected_hash:
            raise RuntimeError("Source differs from the tested build: " + name)
        paths.add(name)
    if paths != expected_paths:
        raise RuntimeError("Manifest must cover exactly every tracked file in this checkout")
    return len(paths)


def command_for(version: str, m4l_source: Path, identity: str, profile: str) -> list[str]:
    python = ROOT / ".venv/bin/python"
    upstream = ROOT / ".venv/lib/python3.12/site-packages"
    if not python.is_file() or not os.access(python, os.X_OK):
        raise RuntimeError("The checkout's executable .venv/bin/python is required")
    if not upstream.is_dir() or not m4l_source.is_dir():
        raise RuntimeError("The pinned .venv site-packages and --m4l-source directories are required")
    return [str(python), str(ROOT / "tools/build_tembro_dmg.py"),
            "--version", version, "--variation-upstream-root", str(upstream),
            "--m4l-source", str(m4l_source), "--output", str(ROOT / "dist" / f"Tembro-{version}.dmg"),
            "--sign-identity", identity, "--notary-profile", profile]


def write_result(path: Path, result: dict) -> None:
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    with temporary.open("x") as handle:
        handle.write(json.dumps(result, indent=2) + "\n")
    temporary.replace(path)


def stream(command: list[str], logfile) -> None:
    print("> " + " ".join(command), flush=True)
    logfile.write("> " + " ".join(command) + "\n")
    logfile.flush()
    child = subprocess.Popen(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                             text=True, env=dict(os.environ, PYTHONUNBUFFERED="1"))
    try:
        for line in child.stdout:
            print(line, end="", flush=True)
            logfile.write(line)
            logfile.flush()
        if child.wait() != 0:
            raise RuntimeError("Command failed: " + command[0])
    except BaseException:
        if child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()
        raise
    finally:
        child.stdout.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expected-commit", required=True)
    parser.add_argument("--source-manifest", required=True, type=Path)
    parser.add_argument("--m4l-source", required=True, type=Path)
    parser.add_argument("--sign-identity", default=IDENTITY)
    parser.add_argument("--notary-profile", default=PROFILE)
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-f0-9]{40}", args.expected_commit):
        parser.error("--expected-commit must be a complete lowercase 40-character Git commit")
    if not args.sign_identity.strip() or not args.notary_profile.strip():
        parser.error("signing identity and notary profile must be nonempty")
    # Preserve symlink evidence until check_source has examined the path.
    manifest_path = Path(os.path.abspath(args.source_manifest))
    m4l_source = args.m4l_source.resolve()
    version_error = None
    try:
        version = package_version()
    except Exception as error:
        if args.check_only:
            raise
        version, version_error = "unverified", error
    if args.check_only:
        manifest_hash = sha256(manifest_path)
        count = check_source(manifest_path, args.expected_commit, version, manifest_hash)
        command = command_for(version, m4l_source, args.sign_identity, args.notary_profile)
        print(json.dumps({"ok": True, "source_commit": args.expected_commit, "version": version,
                          "source_manifest": str(manifest_path), "source_files_verified": count,
                          "source_manifest_sha256": manifest_hash,
                          "command": command, "unlocks_or_submits": False}, indent=2))
        return 0

    release_dir = ROOT / "dist/notarization" / version
    no_link_path(release_dir)
    release_dir.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    attempt = release_dir / run_id
    attempt.mkdir()
    log_path, result_path = attempt / "build.log", attempt / "result.json"
    latest = release_dir / "latest-result.json"
    result = {"ok": False, "status": "running", "run_id": run_id,
              "source_commit": args.expected_commit, "version": version,
              "signed": False, "notarized": False, "gatekeeper_accepted": False,
              "file": str(ROOT / "dist" / f"Tembro-{version}.dmg"),
              "sha256": None, "bytes": None, "log": str(log_path), "result": str(result_path)}
    lock, owns_lock = None, False
    try:
        import fcntl
        no_link_path(release_dir / "release.lock")
        lock = (release_dir / "release.lock").open("a")
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        owns_lock = True
        # Invalidate the previous latest receipt before any credential action.
        write_result(result_path, result)
        write_result(latest, result)
        if version_error:
            raise version_error
        manifest_hash = sha256(manifest_path)
        count = check_source(manifest_path, args.expected_commit, version, manifest_hash)
        result.update(source_manifest_sha256=manifest_hash, source_files_verified=count)
        command = command_for(version, m4l_source, args.sign_identity, args.notary_profile)
        if sys.platform != "darwin" or not sys.stdin.isatty():
            raise RuntimeError("Signing requires an interactive Mac terminal (for SSH use ssh -t)")
        check_source(manifest_path, args.expected_commit, version, manifest_hash)
        print(f"Tembro {version}: unlock, sign and notarize commit {args.expected_commit}.", flush=True)
        print("Enter the Mac keychain password at security's secure terminal prompt.", flush=True)
        # security owns the TTY prompt. Never read, capture, log or pass the password.
        subprocess.run(["/usr/bin/security", "unlock-keychain",
                        str(Path.home() / "Library/Keychains/login.keychain-db")], check=True)
        check_source(manifest_path, args.expected_commit, version, manifest_hash)
        dmg = Path(result["file"])
        with log_path.open("w") as logfile:
            stream(command, logfile)
            check_source(manifest_path, args.expected_commit, version, manifest_hash)
            before = sha256(dmg)
            stream(["/usr/bin/codesign", "--verify", "--strict", "--verbose=2", str(dmg)], logfile)
            stream(["/usr/bin/xcrun", "stapler", "validate", str(dmg)], logfile)
            stream(["/usr/sbin/spctl", "--assess", "--type", "open", "--context",
                    "context:primary-signature", "--verbose=2", str(dmg)], logfile)
            stream(["/usr/bin/hdiutil", "verify", str(dmg)], logfile)
        if sha256(dmg) != before:
            raise RuntimeError("Disk image changed during verification")
        check_source(manifest_path, args.expected_commit, version, manifest_hash)
        result.update(ok=True, status="verified", signed=True, notarized=True,
                      gatekeeper_accepted=True, sha256=before, bytes=dmg.stat().st_size)
    except (Exception, KeyboardInterrupt) as exc:
        result.update(status="failed", error=str(exc) or type(exc).__name__)
    finally:
        result["finished_utc"] = datetime.now(timezone.utc).isoformat()
        write_result(result_path, result)
        # A concurrent process that did not acquire the lock cannot overwrite
        # the active run's latest receipt.
        if owns_lock:
            write_result(latest, result)
        if lock is not None:
            lock.close()
    print(json.dumps(result, indent=2), flush=True)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (Exception, KeyboardInterrupt) as error:
        print("STOP: " + (str(error) or type(error).__name__), file=sys.stderr)
        sys.exit(1)
