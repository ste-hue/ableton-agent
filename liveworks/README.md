# Liveworks — cockpit M4L e finestra flottante

Artefatti del cockpit Liveworks (device Max for Live che mostra in tempo reale le
operazioni LOM dell'agente) e della feature `float_window` aggiunta all'host
upstream il 2026-08-28.

## File

- `agent_m4l_host_float_window.patch` — diff contro l'`agent_m4l_host.js`
  upstream (commit pinnato `70f7df9`). Aggiunge il supporto
  `float_window` alla spec delle webui: crea un sottopatcher con una seconda
  jweb sulla stessa pagina, un bottone sul device e il cablaggio
  `button → inlet → message(front) → thispatcher` che apre la finestra.
- `cockpit.html` — la pagina del cockpit (v0g): HUD di stato, log operazioni
  cliccabile (click → spiegazione oggetto LOM + "apri la doc nel browser" via
  marker clipboard), bottone copia-log, layout responsive (sotto i 250px di
  larghezza mostra solo la striscia di stato — è la vista usata dal device
  inline, mentre la finestra flottante mostra il cockpit completo).
- `build_cockpit_page.py` — generatore della pagina (da adattare: la costante
  `HTML` è la fonte; `cockpit.html` è l'output già con bootstrap iniettato da
  `write_webui`).

## Lezioni apprese (pagate care)

1. **Live apre finestre M4L solo da un gesto utente.** `wind.visible = 1` e
   `thispatcher front` da loadbang/scheduler vengono ignorati in silenzio
   (`float_visible: 0`, nessuna finestra a livello OS). Lo stesso messaggio
   `front` innescato dal click di un bottone funziona. Da qui il bottoncino sul
   device.
2. **Live ruba la tastiera alle jweb.** Digitare in un campo di una pagina jweb
   è inaffidabile (i tasti vanno alle scorciatoie/al MIDI da tastiera di Live);
   il mouse passa sempre. Tutte le interazioni del cockpit sono a click.
   L'input testuale in-device richiede un oggetto nativo (`textedit`) — spike
   rimandato.
3. **Il canale pagina→host muore dopo il load.** `window.max.outlet` esiste e
   non lancia errori, ma i messaggi non arrivano al js (nemmeno i tick del
   bootstrap). Solo i messaggi al momento del load (`web_ready`, `url`,
   `title`) attraversano. Non risolto — il cockpit è display-only, e il canale
   pagina→fuori è il clipboard (marker `LIVEWORKS_OPEN:<ts>:<url>` letto da un
   demone di sessione che apre solo URL `docs.cycling74.com`).
4. **Un solo instance_id per file di comando.** Due device con lo stesso
   `instance_id` si contendono command/status file (comandi presi a caso,
   stato sovrascritto). Mai caricare due copie del device.
5. **`web_reload` non ricarica la pagina** (readfile schedulato ma DOM
   invariato); l'unico refresh affidabile è ricreare la webview
   (`reuse: false` nel patch).
6. **I valori di stato lunghi vengono troncati** (~300 byte) nella compazione:
   `trace_bulk` deve restare compatto; le righe si mandano una alla volta con
   pause ≥1.2s (i push ravvicinati vengono coalescati).
7. **Motore audio spento = host congelato.** Metro/qmetro/Task M4L girano sul
   motore audio di Live: audio off → niente polling, clip eternamente
   "triggered", MIDI muto. Spia: triangolo rosa nella barra di stato.

## Ripristino da zero

```bash
# 1. riapplica la patch all'host upstream
cd .venv/lib/python3.12/site-packages/m4l
patch -p0 agent_m4l_host.js < <repo>/liveworks/agent_m4l_host_float_window.patch

# 2. sincronizza host generato + User Library
.venv/bin/ableton-live-mcp-sync-m4l-host

# 3. (ri)costruisci e installa il device
.venv/bin/ableton-live-mcp-build-m4l-device --role midi_effect liveworks

# 4. scrivi la pagina webui (usa build_cockpit_page.py / cockpit.html)
# 5. carica il device su una traccia (live_load_device) e manda il patch con:
#    webuis: [{id:"ui", object:"jweb", reuse:false,
#              presentation_rect:[0,0,234,166], html_path:<generated index.html>,
#              float_window:{rect:[860,120,760,430], title:"LIVEWORKS",
#                            button_rect:[238,4]}}]
#    + le 9 sorgenti bind_src_* e le ui_bindings (vedi build_cockpit_page.py)
# 6. l'utente clicca il bottoncino sul device -> si apre la finestra flottante
```

La patch è candidata a una PR upstream (`ableton-live-mcp`).
