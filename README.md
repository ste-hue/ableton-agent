# Ableton Agent

Parli in italiano (o inglese), l'AI suona Ableton. La catena completa —
linguaggio naturale → LLM → MCP → Live Object Model → Ableton vero — è già
installata e validata su questo Mac.

## Tembro beta

La versione per musicisti si scarica da [gettembro.com](https://gettembro.com)
come un solo DMG. Apri `Install Tembro.app`: il device Max for Live e il bridge
locale vengono installati nelle cartelle corrette e gli aggiornamenti
sostituiscono sempre la stessa copia. Non serve clonare il repo, installare
Xcode, usare il Terminale o possedere una chiave OpenAI.

Il beta unsigned può richiedere tasto destro → **Open** al primo avvio. La build
è già predisposta per Developer ID e notarizzazione quando l'account Apple sarà
attivo.

## Setup per sviluppatori su un altro Mac (dopo il clone)

Il repo non contiene l'ambiente Python né il Remote Script: li ricrea lo script di
setup. Servono: macOS, [Ableton Live 12](https://www.ableton.com/trial/) (Trial ok),
`uv` (`brew install uv`) e almeno uno tra Claude Code (`npm i -g @anthropic-ai/claude-code`,
con account Claude) o Codex CLI (con account OpenAI).

```bash
git clone <url-del-repo> ableton-agent
cd ableton-agent
./setup.sh
```

Lo script installa il server MCP pinnato in `.venv`, riscrive le config con i path
del nuovo Mac, installa il Remote Script nella User Library di Ableton, ti guida
nella selezione della Control Surface (una volta sola) e valida il bridge. Tutto
gira in locale: il bridge è solo su `127.0.0.1` e non va mai esposto in rete.

## Come si usa (quickstart)

1. **Apri Ableton Live 12** (Trial). La Control Surface `Ableton_Live_MCP` è già
   configurata; se l'agente dice che il bridge non risponde, controlla in
   `Live → Settings → Link, Tempo & MIDI` che una riga Control Surface sia su
   `Ableton_Live_MCP` (Input e Output su None).
2. **Apri un nuovo Live Set vuoto e non salvarlo.** L'agente lavora solo su Set
   usa-e-getta: se il Set non ti piace, si butta; se ti piace, decidi tu se salvarlo.
3. **Apri il Terminale in questa cartella** (`~/dev/Projects/ableton-agent`) e lancia
   uno dei due agenti — mai tutti e due insieme:
   - `claude` (Claude Code)
   - `codex` (Codex CLI)
4. **Parla in termini musicali.** Esempi che funzionano:
   - "Crea un loop di 8 battute in C minore con batteria, basso, accordi e melodia"
   - "Metti una batteria hip-hop a 88 BPM"
   - "Fammi sentire" / "Ferma tutto"
   - "Troppo pieno, togli delle note" / "Più scuro" / "Cambia gli accordi"
   - "Non mi piace, torna indietro" (undo)
5. **Approva le richieste.** L'agente chiede conferma prima di ogni modifica al Set:
   le letture passano da sole, le modifiche mostrano un prompt. È voluto.

## Regole della casa

- **Un agente alla volta.** Claude e Codex sono intercambiabili ma non simultanei.
- **Le tracce MIDI nuove sono mute** finché l'agente non carica uno strumento —
  se non senti niente, chiedigli "carica uno strumento sulla traccia".
- L'agente non può eseguire codice arbitrario dentro Live (bloccato in config).
- Non può chiudere Set, cliccare dialoghi o salvare senza il tuo ok esplicito.
- **Quando salvi un brano**, va in `~/Music/Ableton/Projects/`, una cartella per
  brano col nome `YYYY-MM-DD_nome-breve` (es. `2026-08-26_primo-prova`) e il file
  `.als` con lo stesso nome (`_v01`, `_v02`… per le versioni). Gli esperimenti in
  `Projects/Sketches/`. Mai salvare brani dentro la User Library.

## Cosa c'è dentro

| Percorso | Cosa |
| --- | --- |
| `setup.sh` | Setup completo su un nuovo Mac dopo il clone |
| `docs/architecture.md` | Architettura e confini di sicurezza |
| `docs/validation-plan.md` | Procedura di validazione end-to-end (superata il 2026-08-26) |
| `AGENTS.md` | Regole operative condivise da tutti gli agenti |
| `.agents/skills/ableton-lom/` | Riferimento completo del Live Object Model |
| `.mcp.json.example`, `.claude/settings.json` | Config Claude Code (`.mcp.json` è generato da `setup.sh`, non versionato) |
| `.codex/config.toml.example` | Config Codex (`.codex/config.toml` è generato da `setup.sh`, non versionato) |
| `.venv/` | Server MCP `ableton-live-mcp` pinnato (non toccare) |
