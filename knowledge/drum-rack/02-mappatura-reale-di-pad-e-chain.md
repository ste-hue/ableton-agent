# Mappatura reale di pad e chain
## Cosa deve essere vero (vincoli non negoziabili)

- Non assumere mai General MIDI, nemmeno con preset stock.
- Per ogni pad popolato si leggono almeno nota MIDI e nome del pad.
- Per ogni chain si leggono nome, in-note, out-note e choke group.
- Pad vuoti vengono ignorati; layer multipli sullo stesso pad vengono conservati.
- Le note vengono scritte solo dopo aver associato pitch reale e ruolo musicale.

## Principi (con il perché musicale, non solo il cosa)

Il pitch in un Drum Rack seleziona un pad, non un'altezza musicale. Una nota formalmente valida può quindi produrre un tom al posto del kick. La convenzione General MIDI è un'ipotesi utile per orientarsi, mai una prova.

Nome del pad e routing della chain descrivono funzioni diverse: il pad indica la nota ricevuta, la chain rivela trasformazioni interne, layer e choke. Suonare il pad e indovinare a orecchio non sostituisce questa lettura.

## Metodo di lavoro (passi in ordine, cosa verificare a ogni passo)

1. Identificare esattamente preset e device.
2. Enumerare tutti i drum pad con almeno una chain.
3. Registrare coppia nota/nome.
4. Per ogni chain, leggere nome, in-note, out-note e choke group.
5. Validare note 0-127, unicità dei pad e nomi non vuoti.
6. Derivare ruoli semantici dai nomi senza sovrascrivere i dati grezzi.
7. Costruire il pattern usando soltanto pitch verificati.
8. Rileggere le note e confrontarle con la mappa.

## Errori tipici da evitare (con l'esempio concreto)

- “Kick = 36” scritto senza ispezione: nel rack corrente 36 può essere una texture.
- Considerare chain 0 uguale a pitch 36: il rack può iniziare altrove.
- Perdere il secondo layer di un pad perché si legge soltanto la prima chain.
- Classificare un suono ascoltandolo e ignorare che la chain rimappa l'out-note.
