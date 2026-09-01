# Cache dei preset e remapping per ruolo
## Cosa deve essere vero (vincoli non negoziabili)

- Una mappa riutilizzabile è legata a identità del preset, hash SHA-256, versione di Live e scansione LOM.
- Una cache viene riusata soltanto se hash e versione compatibile corrispondono.
- Il manifest collega ogni MIDI al preset esatto e al contratto pitch-ruolo.
- In caso di differenza, si rimappa il pitch per ruolo preservando timing, durata, velocity, mute e numero di note.
- Se un ruolo non ha destinazione univoca, il processo si ferma.

## Principi (con il perché musicale, non solo il cosa)

Una libreria MIDI è riproducibile soltanto se conosce il kit destinatario. Il nome del file aiuta l'umano, ma il manifest e la mappa verificata sono l'autorità. Rimappare per vicinanza numerica senza ruolo può trasformare un clap in tom mantenendo un file tecnicamente valido.

La cache evita nuove scansioni, non congela una verità eterna: aggiornare un preset può cambiare pad e chain, quindi cambia la mappa.

## Metodo di lavoro (passi in ordine, cosa verificare a ogni passo)

1. Risolvere il preset dal manifest.
2. Calcolare o leggere l'hash del preset installato.
3. Cercare una scansione per preset, hash e versione Live.
4. Se manca, caricare il preset su traccia temporanea in un Set sacrificabile e scansionare pad/chain.
5. Salvare la mappa e rileggere il suo hash canonico.
6. Confrontare ogni ruolo sorgente con i ruoli del pad target.
7. Preservare il pitch se il ruolo coincide; altrimenti scegliere deterministicamente un pad compatibile.
8. Abortire se il ruolo è assente o ambiguo.

## Errori tipici da evitare (con l'esempio concreto)

- Copiare la mappa della 909 sulla 808 perché entrambe sembrano GM.
- Riutilizzare una cache dopo aggiornamento del preset senza controllare l'hash.
- Cambiare anche velocity durante il remapping: la trasformazione non è più soltanto di mapping.
- Caricare il MIDI originale “per vedere cosa succede” quando manca il clap target.
