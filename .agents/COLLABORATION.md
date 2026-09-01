# Patto di collaborazione musicale

Questo file descrive come Stefano vuole lavorare con l'agente in Ableton Live.
Vale insieme alle regole di sicurezza in `AGENTS.md`; se le due fonti sembrano in
conflitto, prevalgono le regole di sicurezza.

## Comunicazione

- Parlare in italiano, in modo diretto, breve e musicale. Evitare gergo LOM/MCP e
  resoconti tecnici salvo quando servono a spiegare un limite o un errore.
- Quando il brief e' sufficiente, agire senza trasformare la sessione in
  un'intervista. Chiedere soltanto quando una scelta cambierebbe materialmente il
  risultato o rischierebbe di toccare lavoro da conservare.
- Durante il lavoro dare aggiornamenti brevi; alla fine dire cosa e' stato creato,
  cosa e' stato preservato e cosa resta da ascoltare o decidere.
- Non dire di avere "sentito" il brano senza una vera cattura audio. Distinguere
  sempre fra readback MIDI/stato di Live e valutazione sonora reale.
- Per `MAKEDRUMS`, eseguire i controlli tecnici obbligatori in modo compatto e
  silenzioso: niente cronaca di preflight, firme o readback quando tutto procede
  normalmente. Comunicare soltanto risultato finale oppure un vero blocco.

## Interpretazione delle richieste

- Il linguaggio dell'utente descrive il risultato musicale, non le operazioni DAW.
  Tradurlo autonomamente in tracce, clip, strumenti, effetti e automazioni.
- "Arrangia" significa scrivere materiale nella timeline Arrangement con una forma
  udibile, non soltanto creare una clip lunga in Session View. Le clip sorgente in
  Session possono essere conservate come ricetta o materiale alternativo.
- "Crea altre batterie" significa creare layer con ruoli distinti. Evitare tre
  tracce che duplicano la stessa funzione: separare fondazione, backbeat/fill e
  movimento/colore.
- "Classic" in un contesto house/tech-house orienta verso 808/909, rim, clap/snare,
  ghost notes, shaker e percussioni interlocking. Non implica riempire ogni spazio.
- Una variazione richiesta a 8/16/32 battute deve essere percepibile nella frase:
  micro a 8, media a 16, macro a 32, con il basso che risponde ai fill e lascia
  spazio alle sospensioni della cassa.

## Conservazione e iterazione

- Il Set corrente e' la verita'. All'inizio di ogni richiesta rileggere tracce,
  clip, dispositivi e Arrangement: l'utente puo' avere cancellato o modificato
  materiale fra due messaggi.
- `MAKEDRUMS` e' un caso rapido e additivo: controllare solo lo stato minimo
  necessario, creare sempre una nuova traccia e non analizzare musicalmente le
  tracce esistenti. Le verifiche di sicurezza imposte da `AGENTS.md` restano
  obbligatorie, ma vanno mantenute fuori dalla conversazione salvo errori.
- I MIDI del catalogo `MAKEDRUMS` devono dichiarare il kit destinatario e usare la
  convenzione `BPM-genere-beat-NNNN-ableton-kit.mid`. Il manifest resta la fonte
  autorevole: lega file, preset esatto e mappa pad verificata, così generi diversi
  possono ruotare fra kit adatti senza assumere sempre il 909.
- Ogni traccia creata da `MAKEDRUMS` si chiama `Drum genere NNN`, con genere in
  minuscolo e seriale progressivo separato per genere: `Drum techno 001`,
  `Drum techno 002`, `Drum house 001`.
- `PADREMAP` costruisce la memoria reale dei preset al primo avvio: apre ogni
  preset supportato su una traccia temporanea dedicata, non analizza un Drum Rack
  casuale gia' presente sul canale. Salva la cache per hash del preset; se la
  mappa reale differisce dal contratto del MIDI, `MAKEDRUMS` rimappa l'output per
  ruolo prima del caricamento e si ferma se il ruolo non e' traducibile.
- Preservare esplicitamente cio' che l'utente dice di aver tenuto. Creare nuove
  tracce o varianti; non sovrascrivere, cancellare o ripristinare parti eliminate
  senza richiesta esplicita.
- Dare nomi musicalmente leggibili a tracce e clip, includendo ruolo e lunghezza
  quando utile.
- Non dichiarare il pezzo finito. Dopo una realizzazione sostanziale lasciare che
  l'utente ascolti e dica cosa tenere, togliere o spingere.

## Groove e sound design

- Per tech-house/garage privilegiare cassa stabile, sedicesimi con swing controllato,
  accenti su piu' livelli, ghost notes reali e basso sincopato negli spazi della
  cassa. La densita' deve cambiare fra sezioni.
- Inserire silenzi e sospensioni intenzionali alle chiuse di frase. I fill devono
  preparare il cambio e non suonare come decorazione casuale.
- Una traccia MIDI nuova deve ricevere uno strumento verificato prima delle note.
- Quando si aggiungono Reverb o Delay in insert, non lasciare automaticamente i
  valori factory. Impostare un Dry/Wet prudente in base al ruolo e verificare il
  parametro; la fondazione resta piu' asciutta dei layer di colore.
- Preferire dispositivi stock disponibili nel Set. Se un suono non corrisponde al
  ruolo, verificare il drum rack o il preset invece di assumere la mappa.

## Trasporto e controller MIDI

- Un Akai Fire puo' essere collegato come ingresso MIDI USB anche se non appare fra
  le Control Surface di Live. La sua presenza non autorizza a rimappare porte,
  controlli, LED o preferenze.
- L'utente puo' usare il Fire per avviare o fermare Live mentre l'agente lavora.
  Non combattere il controller con ripetuti comandi di transport. Prima di un
  ascolto sincronizzato leggere lo stato; usare un solo lancio di scena e poi
  osservare.
- Se il trasporto o le clip cambiano in modo incompatibile con l'operazione in
  corso, fermare le mutazioni, rileggere il Set e spiegare il conflitto.

## Miglioramento continuo

Quando Stefano corregge una scelta ricorrente, proporre un aggiornamento piccolo e
specifico a questo file. Non trasformare una preferenza occasionale in una regola
universale senza conferma.
