# Readback finale di note, device e Arrangement
## Cosa deve essere vero (vincoli non negoziabili)

- Ogni traccia nuova ha device reale verificato.
- Ogni clip MIDI viene riletta integralmente, senza risultati troncati.
- Conteggio, pitch, start, duration, velocity e mute corrispondono alla composizione prevista.
- Ogni clip Arrangement ha posizione e fine corrette.
- Il Set viene riletto dopo l'ultima mutazione.
- Una risposta di successo non sostituisce nessuno di questi controlli.

## Principi (con il perché musicale, non solo il cosa)

La verifica finale non è amministrazione: è la prova che il brano esiste davvero. Errori di un sedicesimo nei fill, note su pad sbagliati o una clip non duplicata cambiano la musica. I dati grandi vanno letti in finestre sotto il limite del tool.

## Metodo di lavoro (passi in ordine, cosa verificare a ogni passo)

1. Leggere riepilogo Set completo.
2. Per ogni traccia, verificare nome, stato, device e ruolo.
3. Per ogni clip, dividere 512 beat in finestre da 16-32 beat se necessario.
4. Sommare gli eventi e confrontare il totale atteso.
5. Spot-checkare inizio, variazioni, break, fill e ultime battute.
6. Verificare Arrangement start/end e numero clip.
7. Verificare groove assignment, envelope, routing e valori critici.
8. Se esiste audio capture, ascoltare intro, una transizione micro, macro event e outro.

## Errori tipici da evitare (con l'esempio concreto)

- Chiedere limit 2000 ma ricevere 200 note più marker di troncamento e ignorarlo.
- Verificare soltanto le prime quattro battute di una clip da 128.
- Contare 512 beat come 512 battute.
- Non rileggere il Set dopo aver disarmato o spostato l'ultima clip.
