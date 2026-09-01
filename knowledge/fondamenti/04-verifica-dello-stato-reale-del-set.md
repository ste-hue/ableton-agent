# Verifica dello stato reale del Set
## Cosa deve essere vero (vincoli non negoziabili)

- Il Set corrente viene riletto all'inizio di ogni richiesta; la conversazione precedente non è stato autorevole.
- Devono essere noti: tempo, metro, percorso file, trasporto, tracce, device, clip di Session, clip di Arrangement e ritorni rilevanti.
- Ogni device dichiarato presente deve comparire nel readback della traccia.
- Ogni clip dichiarata completa deve avere posizione, lunghezza e note verificate.
- La timeline Arrangement è il deliverable quando l'utente chiede di arrangiare.

## Principi (con il perché musicale, non solo il cosa)

L'utente può cancellare, spostare o modificare materiale tra due messaggi. Continuare da una fotografia mentale produce errori musicali e distruttivi. Anche Session e Arrangement possono divergere: una clip sorgente perfetta in Session non significa che il brano esista nella timeline.

Il readback è parte della composizione perché verifica relazioni: una nota nell'ottava sbagliata, un crash fuori dal confine di frase o un kit diverso cambiano il risultato pur lasciando formalmente valida la chiamata.

## Metodo di lavoro (passi in ordine, cosa verificare a ogni passo)

1. Leggere riepilogo del Set e proprietà globali.
2. Distinguere materiale dell'utente da tracce create dall'agente.
3. Per ogni traccia nuova, verificare nome, tipo, device, arm/mute/solo e clip.
4. Per ogni clip MIDI, leggere tutte le note per finestre temporali; verificare conteggio, pitch, start, durata, velocity e mute.
5. Per Arrangement, verificare clip iniziale a beat 0 quando richiesto, fine esatta e assenza di buchi involontari.
6. Per routing e parametri, rileggere destinazione e valore visualizzato, non soltanto il valore normalizzato.
7. Per giudizi sonori, catturare audio reale e confrontare sezioni a livello coerente.

## Errori tipici da evitare (con l'esempio concreto)

- Leggere soltanto i primi 200 eventi di una clip da 1800 note e chiamarla verificata.
- Confondere una clip lunga 512 beat in Session con un Arrangement di 128 battute.
- Assumere che il preset caricato sia quello cercato perché il Browser ha restituito un nome simile.
- Non controllare che una duplicazione in Arrangement abbia davvero destinazione beat 0.
