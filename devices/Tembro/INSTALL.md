# Tembro 0.1.8-beta.1 — prova privata su macOS

Tembro è un dispositivo Max for Live. Serve Ableton Live con Max for Live
disponibile e una connessione Internet durante l'installazione e l'uso della chat.

1. Salva il lavoro e chiudi Ableton Live.
2. Apri `Tembro-0.1.8-beta.1.dmg` e avvia **Install Tembro**. Se macOS blocca
   l'apertura, conserva il messaggio e contatta Tembro.
3. Attendi la conferma dell'installer. Installa il dispositivo, il collegamento
   locale e la Control Surface nelle cartelle corrette. Non servono Xcode,
   Homebrew, Git o una chiave API OpenAI.
4. Riapri Live. In **Settings → Link, Tempo & MIDI**, seleziona
   `Ableton_Live_MCP` come Control Surface; lascia Input e Output su None.
5. Dalla **User Library → Presets → MIDI Effects → Max MIDI Effect → Tembro**,
   trascina `Tembro.amxd` su una traccia MIDI in un nuovo Set vuoto.
6. Accedi con la tua email e la chiave di licenza Tembro, oppure con il codice
   beta se ti è stato fornito.

Gli aggiornamenti sostituiscono la stessa cartella Tembro. L'installer controlla
prima eventuali companion Max for Live personalizzati: se segnala differenze o
non riesce a verificarli, si ferma prima di sostituire il bridge esistente.
Conserva il messaggio; non rimuovere i file segnalati per forzare l'installazione.

## Prima prova dei motori

Chordarium può preparare accordi, basso correlato, arpeggio e pad; Rudiment genera
batterie. La generazione offline è verificata. Installazione fresca, funzionamento
dentro il dispositivo e ascolto in Live restano da provare con questa beta.

I nuovi comandi della chat richiedono anche l'aggiornamento del servizio Tembro.
Se non sono ancora disponibili, segnala il messaggio: reinstallare il dispositivo
non abilita il servizio.

Quando disponibili, prova nella chat:

> Usa Chordarium e Rudiment per preparare 8 battute house in La minore a 124 BPM,
> seed 4242: accordi, basso derivato e batteria completa, densità 60 e sincopi 55.
> Mostrami la proposta senza inserirla ancora nel Set.

La proposta contiene note generate: non significa che siano già state inserite o
riprodotte in Live. Prima dell'ascolto scegli gli strumenti e un Drum Rack reale;
la batteria deve essere associata ai suoi pad. Se compare un esito sconosciuto,
fermati senza ripetere il comando.
