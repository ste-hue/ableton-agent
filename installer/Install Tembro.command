#!/bin/zsh
set -euo pipefail

# TEMBRO_VERSION and OFFICIAL_API_URL are rewritten by tools/build_tembro_dmg.py
# at packaging time; these defaults only matter when running the script directly.
TEMBRO_VERSION="0.1.8-beta.1"
OFFICIAL_API_URL="https://gettembro.com"
UPSTREAM_COMMIT="70f7df9192b78d9bd9405f369c9e046c88f1610e"
UV_VERSION="0.12.7"
NON_INTERACTIVE=0

if [[ "${1:-}" == "--non-interactive" ]]; then
  NON_INTERACTIVE=1
fi

SCRIPT_DIR="${0:A:h}"
PAYLOAD_DIR="$SCRIPT_DIR/.tembro-payload"
DEVICE_SOURCE="$PAYLOAD_DIR/Tembro"
REMOTE_SOURCE="$PAYLOAD_DIR/Ableton_Live_MCP"
RUNTIME_OVERLAY="$PAYLOAD_DIR/variation-runtime"
RUNTIME_PATCHER="$DEVICE_SOURCE/bridge/patch_runtime.py"
INSTALL_HOME="${TEMBRO_INSTALL_HOME:-$HOME}"
DEVICE_TARGET="$INSTALL_HOME/Music/Ableton/User Library/Presets/MIDI Effects/Max MIDI Effect/Tembro"
REMOTE_TARGET="$INSTALL_HOME/Music/Ableton/User Library/Remote Scripts/Ableton_Live_MCP"
TEMBRO_HOME="$INSTALL_HOME/.tembro"
UV_HOME="$TEMBRO_HOME/uv"
UV_BIN="$UV_HOME/uv"
TOOL_BIN="$TEMBRO_HOME/bin"
TOOL_DIR="$TEMBRO_HOME/tools"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tembro-install.XXXXXX")"

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

pause_before_close() {
  if (( ! NON_INTERACTIVE )); then
    read -k1 "?Press any key to close."
    echo ""
  fi
}

if (( ! NON_INTERACTIVE )); then
  clear
fi
echo ""
echo "  Tembro ${TEMBRO_VERSION}"
echo "  ─────────────────────────────"
echo ""

if [[ ! -d "$DEVICE_SOURCE" || ! -d "$REMOTE_SOURCE" || ! -f "$RUNTIME_OVERLAY/manifest.json" || ! -f "$RUNTIME_PATCHER" || ! -f "$PAYLOAD_DIR/verify_tembro_runtime.py" || ! -f "$PAYLOAD_DIR/m4l/manifest.json" ]]; then
  echo "Installer payload is missing. Download the Tembro DMG again."
  pause_before_close
  exit 1
fi

if pgrep -f '/Ableton[^/]*/Contents/MacOS/Live([[:space:]]|$)' >/dev/null; then
  echo "Quit Ableton Live, then run this installer again."
  pause_before_close
  exit 1
fi

echo "• Checking the local installation…"
mkdir -p "$TEMBRO_HOME" "$TOOL_BIN" "$TOOL_DIR"

if [[ ! -x "$UV_BIN" ]]; then
  curl --fail --location --silent --show-error \
    "https://astral.sh/uv/${UV_VERSION}/install.sh" \
    --output "$TEMP_DIR/uv-install.sh"
  UV_UNMANAGED_INSTALL="$UV_HOME" sh "$TEMP_DIR/uv-install.sh" >/dev/null
fi

precheck_existing_companions() {
  local existing_runtime="$TOOL_DIR/ableton-live-mcp"
  local existing_python="$existing_runtime/bin/python"
  if [[ -e "$existing_runtime" || -L "$existing_runtime" ]]; then
    if [[ ! -d "$existing_runtime" || ! -x "$existing_python" ]]; then
      echo "The existing private bridge cannot be inspected. It has not been replaced."
      return 1
    fi
    # Inspect through the existing interpreter so its generated companion
    # directory is covered as well as the User Library targets.
    "$existing_python" "$PAYLOAD_DIR/verify_tembro_runtime.py" \
      --check-m4l-targets "$PAYLOAD_DIR/m4l"
  else
    # A fresh install may still have companions from another development setup.
    # Use an isolated pinned environment, never system Python or the private
    # tool destination. The wheel's missing m4l source does not prevent the
    # upstream filesystem inspector from enumerating User Library targets.
    "$UV_BIN" run --isolated --no-project --python 3.12 \
      --with "ableton-live-mcp[visual] @ https://github.com/bschoepke/ableton-live-mcp/archive/${UPSTREAM_COMMIT}.zip" \
      python "$PAYLOAD_DIR/verify_tembro_runtime.py" --check-m4l-targets "$PAYLOAD_DIR/m4l"
  fi
}

# This must run before --force: a rejected custom companion must leave the
# existing bridge, device, Remote Script and connection configuration intact.
echo "• Checking existing Max for Live companions…"
if ! precheck_existing_companions; then
  echo "Installation stopped before replacing the existing bridge. Keep this message for support."
  pause_before_close
  exit 1
fi

# A leftover test config with a different api_base overrides the official URL
# baked into the device and leaves the chat unable to connect. Set it aside only
# after the preservation gate has passed.
CONFIG_FILE="$TEMBRO_HOME/config.json"
if [[ -f "$CONFIG_FILE" ]] && grep -q '"api_base"' "$CONFIG_FILE" \
  && ! grep -q "\"api_base\"[[:space:]]*:[[:space:]]*\"${OFFICIAL_API_URL}\"" "$CONFIG_FILE"; then
  mv "$CONFIG_FILE" "$CONFIG_FILE.bak"
  echo "• Set aside an old test config (config.json → config.json.bak)"
fi

echo "• Installing Tembro's private local bridge…"
UV_TOOL_BIN_DIR="$TOOL_BIN" \
UV_TOOL_DIR="$TOOL_DIR" \
  "$UV_BIN" tool install --force --python 3.12 \
  "ableton-live-mcp[visual] @ https://github.com/bschoepke/ableton-live-mcp/archive/${UPSTREAM_COMMIT}.zip"

if [[ ! -x "$TOOL_BIN/ableton-live-mcp" ]]; then
  echo "Tembro's local bridge did not install correctly."
  pause_before_close
  exit 1
fi

# Patch only the private, pinned bridge installed above. The patch checks all
# source hashes before writing and retains a verified backup for reversal.
# Copy the device and Control Surface only after runtime readback agrees with
# the exact files generated at packaging time.
BRIDGE_PYTHON="$TOOL_DIR/ableton-live-mcp/bin/python"
if [[ ! -x "$BRIDGE_PYTHON" ]]; then
  echo "Tembro's private Python runtime is missing."
  pause_before_close
  exit 1
fi
BRIDGE_ROOT="$("$BRIDGE_PYTHON" -c 'import sysconfig; print(sysconfig.get_path("purelib"))')"
echo "• Preparing clip variation controls…"
"$BRIDGE_PYTHON" "$PAYLOAD_DIR/verify_tembro_runtime.py" --pin-only
"$BRIDGE_PYTHON" "$PAYLOAD_DIR/verify_tembro_runtime.py" --check-m4l-targets "$PAYLOAD_DIR/m4l"
"$BRIDGE_PYTHON" "$RUNTIME_PATCHER" apply --upstream-root "$BRIDGE_ROOT"
"$BRIDGE_PYTHON" "$PAYLOAD_DIR/verify_tembro_runtime.py" \
  --restore-m4l-assets "$PAYLOAD_DIR/m4l" --runtime-root "$BRIDGE_ROOT"
if [[ ! -x "$TOOL_BIN/ableton-live-mcp-sync-m4l-host" ]]; then
  echo "Tembro's M4L companion sync tool is missing. Installation stopped before copying the device."
  pause_before_close
  exit 1
fi
"$TOOL_BIN/ableton-live-mcp-sync-m4l-host" --no-repair-wrappers
"$BRIDGE_PYTHON" "$PAYLOAD_DIR/verify_tembro_runtime.py" \
  --runtime-root "$BRIDGE_ROOT" --overlay-dir "$RUNTIME_OVERLAY" --remote-source "$REMOTE_SOURCE"

echo "• Installing the Max for Live device…"
mkdir -p "$DEVICE_TARGET"
ditto "$DEVICE_SOURCE" "$DEVICE_TARGET"

echo "• Installing the Ableton control surface…"
mkdir -p "$REMOTE_TARGET"
ditto "$REMOTE_SOURCE" "$REMOTE_TARGET"

echo ""
echo "  ✓ Tembro is installed"
echo ""
echo "Next time you open Ableton Live:"
echo "  1. Settings → Link, Tempo & MIDI"
echo "  2. Choose Ableton_Live_MCP as a Control Surface"
echo "  3. Add Tembro from User Library → Max MIDI Effect"
echo ""
echo "Updates always replace this same Tembro installation."
echo ""
pause_before_close
