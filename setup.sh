#!/usr/bin/env bash
# Ableton Agent — setup su un nuovo Mac dopo il clone del repo.
# Ricrea l'ambiente pinnato, riscrive le config con i path locali,
# installa il Remote Script nella User Library di Ableton e valida.
set -euo pipefail

PIN="70f7df9192b78d9bd9405f369c9e046c88f1610e"
UPSTREAM="git+https://github.com/bschoepke/ableton-live-mcp.git@${PIN}"

cd "$(cd "$(dirname "$0")" && pwd)"
ROOT="$(pwd)"

step() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
fail() { printf '\033[31mERRORE: %s\033[0m\n' "$1" >&2; exit 1; }

step "Prerequisiti"
[[ "$(uname)" == "Darwin" ]] || fail "questo setup supporta solo macOS"

LIVE_APP="$(find /Applications "$HOME/Applications" -maxdepth 1 -type d -iname 'Ableton Live 12*.app' 2>/dev/null | head -1 || true)"
if [[ -n "$LIVE_APP" ]]; then
  echo "Ableton trovato: $LIVE_APP"
else
  echo "ATTENZIONE: Ableton Live 12 non trovato in /Applications."
  echo "Installalo (va bene la Trial: https://www.ableton.com/trial/) e rilancia questo script."
  exit 1
fi

step "Ambiente Python pinnato (.venv)"
if [[ ! -x .venv/bin/ableton-live-mcp ]]; then
  if command -v uv >/dev/null 2>&1; then
    uv venv --python 3.12 .venv
    uv pip install --python .venv/bin/python "ableton-live-mcp @ ${UPSTREAM}" 'Pillow>=10'
  elif command -v python3.12 >/dev/null 2>&1; then
    python3.12 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install "ableton-live-mcp @ ${UPSTREAM}" 'Pillow>=10'
  else
    fail "serve 'uv' (brew install uv) oppure python3.12 (brew install python@3.12)"
  fi
else
  echo ".venv già presente, salto l'installazione"
fi

# Verifica che il commit installato sia davvero quello pinnato (PEP 610)
DIRECT_URL="$(find .venv -name direct_url.json -path '*ableton_live_mcp*' | head -1 || true)"
if [[ -n "$DIRECT_URL" ]] && ! grep -q "$PIN" "$DIRECT_URL"; then
  fail "il pacchetto installato non corrisponde al commit pinnato ${PIN}"
fi
echo "ableton-live-mcp installato e pinnato a ${PIN}"

step "Config host con path locali"
cat > .mcp.json <<EOF
{
  "mcpServers": {
    "ableton_live": {
      "command": "${ROOT}/.venv/bin/ableton-live-mcp",
      "args": [],
      "env": {}
    }
  }
}
EOF
echo "scritto .mcp.json (Claude Code)"

cat > .codex/config.toml <<EOF
[mcp_servers.ableton_live]
command = "${ROOT}/.venv/bin/ableton-live-mcp"
cwd = "${ROOT}"
startup_timeout_sec = 20
tool_timeout_sec = 45
enabled = true
required = false
default_tools_approval_mode = "prompt"
enabled_tools = [
  "live_ping",
  "live_bridge_status",
  "live_get",
  "live_set_summary",
  "live_set",
  "live_call",
  "live_children",
  "live_clip_add_notes",
  "live_clip_update_notes",
  "live_clip_notes",
  "live_transport",
  "live_browser_roots",
  "live_browser_capabilities",
  "live_browser_search",
  "live_browser_load",
  "live_load_device",
  "live_track_insert_device",
  "live_device_parameters",
  "live_parameter_set",
]
EOF
echo "scritto .codex/config.toml (Codex)"

step "Remote Script nella User Library di Ableton"
if pgrep -qf "Ableton Live" 2>/dev/null; then
  echo "Chiudi Ableton Live e premi INVIO per continuare..."
  read -r
fi
.venv/bin/ableton-live-mcp-install-remote-script --update
echo "Remote Script installato in ~/Music/Ableton/User Library/Remote Scripts/Ableton_Live_MCP"

step "Passi manuali (una volta sola)"
cat <<'EOF'
1. Apri Ableton Live 12.
2. Live -> Settings -> Link, Tempo & MIDI.
3. In una riga "Control Surface" seleziona: Ableton_Live_MCP
   (Input = None, Output = None). Chiudi Settings.
4. Apri un nuovo Live Set vuoto e NON salvarlo.
EOF
echo "Quando hai fatto, premi INVIO per validare il bridge..."
read -r

step "Validazione bridge"
.venv/bin/ableton-live-mcp-validate --allow-stale-m4l-host --allow-missing-visual-capture --timeout 45 \
  && printf '\n\033[32mTutto pronto. Lancia "claude" (o "codex") in questa cartella e parla in italiano.\033[0m\n' \
  || fail "validazione fallita: controlla che Live sia aperto e la Control Surface selezionata"
