# Vincoli operativi e sicurezza in Ableton Live
## Cosa deve essere vero (vincoli non negoziabili)

- Un solo agente controlla Live alla volta e tutte le operazioni avvengono in sequenza.
- Prima di modificare il Set: validazione con runtime corrente e mutazioni sicure, lettura del riepilogo, registrazione della firma del Set.
- Ogni mutazione usa la firma più recente; dopo la mutazione si rileggono Set e oggetto interessato.
- Si lavora solo in Set non salvati e sacrificabili, salvo autorizzazione esplicita su un Set salvato.
- Una traccia MIDI riceve e verifica uno strumento prima delle note.
- Un timeout dopo l'invio ha esito ignoto: non ripetere il comando; controllare bridge e stato reale.
- Dialoghi modali, UI bloccata o Set in recupero fermano il lavoro.

## Principi (con il perché musicale, non solo il cosa)

La sicurezza protegge anche la qualità musicale. Se lo stato reale non è noto, una variazione può finire sulla traccia sbagliata, una clip può essere duplicata due volte o un fill può sovrascrivere materiale tenuto dall'utente. Live è l'autorità; il messaggio “successo” del comando non è prova.

La costruzione deve essere additiva. Duplicare una clip conserva il controllo dell'esperimento; sovrascriverla elimina il confronto e rende impossibile capire quale scelta funzionava.

## Metodo di lavoro (passi in ordine, cosa verificare a ogni passo)

1. Verificare che nessun altro driver stia usando Live.
2. Eseguire il preflight e richiedere entrambi gli indicatori di sicurezza positivi.
3. Leggere percorso del Set, tempo, tracce, device, clip di Session e Arrangement.
4. Fermarsi se il percorso non è vuoto e manca autorizzazione.
5. Prima di ogni modifica, usare la firma corrente.
6. Dopo ogni modifica persistente, rileggere il riepilogo e poi l'oggetto preciso.
7. Per le note, rileggere l'intero intervallo in pagine abbastanza piccole da evitare troncamenti.
8. Se l'utente o un controller cambia trasporto o clip durante il lavoro, interrompere le mutazioni e riallinearsi allo stato reale.

## Errori tipici da evitare (con l'esempio concreto)

- Reinvio dopo timeout: una seconda creazione può produrre due tracce anche se la prima risposta non è arrivata.
- Fidarsi della risposta di scrittura: “1867 note aggiunte” non sostituisce il conteggio completo delle note rilette.
- Toccare una traccia esistente perché sembra vuota: potrebbe essere stata preparata dall'utente per un'altra parte.
- Chiudere un Set non salvato per “ripulire”: la decisione di scartare appartiene all'utente.
