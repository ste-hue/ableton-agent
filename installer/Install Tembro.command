#!/bin/zsh
set -euo pipefail

# TEMBRO_VERSION and OFFICIAL_API_URL are rewritten by tools/build_tembro_dmg.py
# at packaging time; these defaults only matter when running the script directly.
TEMBRO_VERSION="0.1.6-beta"
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

if [[ ! -d "$DEVICE_SOURCE" || ! -d "$REMOTE_SOURCE" ]]; then
  echo "Installer payload is missing. Download the Tembro DMG again."
  pause_before_close
  exit 1
fi

echo "• Installing the Max for Live device…"
mkdir -p "$DEVICE_TARGET"
ditto "$DEVICE_SOURCE" "$DEVICE_TARGET"

echo "• Installing the Ableton control surface…"
mkdir -p "$REMOTE_TARGET"
ditto "$REMOTE_SOURCE" "$REMOTE_TARGET"

echo "• Installing Tembro's private local bridge…"
mkdir -p "$TEMBRO_HOME" "$TOOL_BIN" "$TOOL_DIR"

# A leftover test config with a different api_base overrides the official URL
# baked into the device and leaves the chat unable to connect (seen in the
# field as getaddrinfo ENOTFOUND on a dead test hostname). Set it aside.
CONFIG_FILE="$TEMBRO_HOME/config.json"
if [[ -f "$CONFIG_FILE" ]] && grep -q '"api_base"' "$CONFIG_FILE" \
  && ! grep -q "\"api_base\"[[:space:]]*:[[:space:]]*\"${OFFICIAL_API_URL}\"" "$CONFIG_FILE"; then
  mv "$CONFIG_FILE" "$CONFIG_FILE.bak"
  echo "• Set aside an old test config (config.json → config.json.bak)"
fi
if [[ ! -x "$UV_BIN" ]]; then
  curl --fail --location --silent --show-error \
    "https://astral.sh/uv/${UV_VERSION}/install.sh" \
    --output "$TEMP_DIR/uv-install.sh"
  UV_UNMANAGED_INSTALL="$UV_HOME" sh "$TEMP_DIR/uv-install.sh" >/dev/null
fi

UV_TOOL_BIN_DIR="$TOOL_BIN" \
UV_TOOL_DIR="$TOOL_DIR" \
  "$UV_BIN" tool install --force --python 3.12 \
  "ableton-live-mcp @ https://github.com/bschoepke/ableton-live-mcp/archive/${UPSTREAM_COMMIT}.zip"

if [[ ! -x "$TOOL_BIN/ableton-live-mcp" ]]; then
  echo "Tembro's local bridge did not install correctly."
  pause_before_close
  exit 1
fi

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
