# Setup da zero (nuovo Mac)

Cosa serve per usare l'agente Ableton su un'altra macchina — ad esempio: cloni
il repo sul Mac di tuo fratello e segui questi passi. Tempo stimato: 20–30 min.

## Prerequisiti (non nel repo)

- macOS con **Ableton Live 12** (Suite o trial: serve Max for Live per il cockpit)
- **Python 3.12**
- **Claude Code** (o Codex CLI) con il **proprio** account
- git

## 1. Clona e crea l'ambiente

```bash
git clone <url-del-repo> ableton-agent
cd ableton-agent
python3.12 -m venv .venv
.venv/bin/python3 -m ensurepip --upgrade
.venv/bin/python3 -m pip install \
  "git+https://github.com/bschoepke/ableton-live-mcp@70f7df9192b78d9bd9405f369c9e046c88f1610e"
```

Il commit è pinnato (vedi `docs/architecture.md`); non aggiornare senza rifare
la validazione.

## 2. Ripara il layout M4L upstream (bug noto)

L'upstream si aspetta i file M4L in `python3.12/m4l/` ma li installa in
`site-packages/m4l/`:

```bash
ln -s site-packages/m4l .venv/lib/python3.12/m4l
```

## 3. Applica la patch float_window (nostra)

```bash
cd .venv/lib/python3.12/site-packages/m4l
patch -p0 agent_m4l_host.js < ../../../../../liveworks/agent_m4l_host_float_window.patch
cd -
```

## 4. Installa Remote Script e host M4L

```bash
.venv/bin/ableton-live-mcp-install-remote-script
.venv/bin/ableton-live-mcp-sync-m4l-host
.venv/bin/ableton-live-mcp-build-m4l-device --role midi_effect liveworks
```

Poi **in Live**: `Settings → Link/Tempo/MIDI → Control Surface` → seleziona
`Ableton_Live_MCP`. Riavvia Live.

## 5. Valida

Con Live aperto su un Set vuoto:

```bash
.venv/bin/ableton-live-mcp-validate
```

Deve uscire con exit 0 e `"runtime_current": true`, `"live_mutations_safe": true`.

## 6. Apri l'agente

```bash
claude   # dentro la cartella del repo
```

`.mcp.json` e `.claude/settings.json` sono già nel repo: tool di lettura
pre-approvati, mutazioni con conferma, `live_exec`/`live_eval`/`live_batch`
negati. Le regole operative sono in `AGENTS.md` e valgono per qualunque host.

Primo comando da provare: *"crea una traccia con un piano elettrico e un giro
di quattro accordi, poi fammi sentire"*.

## 7. Cockpit (facoltativo ma consigliato)

Chiedi all'agente di caricare il device cockpit e mandare il patch (la
procedura completa è in `liveworks/README.md`). Poi clicca il bottoncino sul
device: si apre la finestra flottante col log LOM cliccabile.

## 8. Voce (facoltativo)

Se usi superwhisper: copia `extras/superwhisper-ableton-ita.json` in
`~/Documents/superwhisper/modes/` e riavvia superwhisper — compare il mode
"Ableton ITA" che riscrive il parlato in richieste per l'agente.

## Note

- Ogni Mac guida **il proprio** Live: le regole di AGENTS.md (un guidatore
  alla volta) valgono per ciascuna macchina, non tra macchine.
- Il dataset (`devices/knowledge/`) e le ricette (`recipes/`) arrivano col
  clone e funzionano ovunque: sono file, non stato di una macchina.
- Se qualcosa non torna: `liveworks/README.md` ha le lezioni apprese (motore
  audio spento = M4L congelato, mai due copie del device, ecc.).
