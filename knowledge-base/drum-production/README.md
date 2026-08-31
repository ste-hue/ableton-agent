# Drum Production Knowledge Base

Questa knowledge base trasforma quattro libri locali in un sistema consultabile per
composizione, sequencing, sound design e arrangiamento delle batterie elettroniche.
Non sostituisce le fonti: sintetizza concetti, registra limiti e rimanda sempre alla
pagina PDF pertinente.

L'indice usa il motore OCR Tesseract per le pagine scansionate, oltre al text layer
nativo dei PDF. In questo modo le ricerche possono raggiungere anche `book4.pdf`,
che contiene soprattutto griglie e scansioni.

## Accesso rapido

- [Catalogo delle fonti](sources.md)
- [Sequencing e groove](topics/01-rhythm-sequencing.md)
- [Kick e sound design](topics/02-kick-sound-design.md)
- [Arrangiamento, intro e transizioni](topics/03-arrangement-transitions.md)
- [Entropia, densità e creatività](topics/04-complexity-creativity.md)
- [Workflow, mix e completamento](topics/05-workflow-mixing.md)
- [Metodo per studiare pattern senza copiarli](topics/06-pattern-study-method.md)

## Ricerca pagina per pagina

`index/books.sqlite3` contiene il testo di ogni pagina e un indice full-text.
`index/book4-tesseract-ocr.json` conserva il risultato OCR pagina per pagina con la
confidence. Le griglie di `book4.pdf` restano da verificare visivamente nel PDF
originale: l'OCR indicizza etichette e didascalie ma non sostituisce la geometria dei
quadratini.

```bash
python3 knowledge-base/drum-production/scripts/search_kb.py \
  "drum loop swing fill"

python3 knowledge-base/drum-production/scripts/search_kb.py \
  "entropy repetition cadence" --source book1.pdf
```

Ogni risultato mostra titolo, file, pagina PDF e un estratto. Per una decisione
musicale importante, consultare almeno due fonti quando possibile: una pratica e
una teorica.

## Regola d'uso

Usare i libri come spazio di possibilità, non come ricettario. Le griglie storiche
servono a osservare funzioni, densità, interlocking, accenti e trasformazioni; non
devono essere ricopiate come pattern finali. Il criterio di riuscita è una batteria
riconoscibile, funzionale al genere e differente dalle generazioni precedenti.

## Rigenerazione

```bash
NODE_PATH=/path/to/node_modules node \
  knowledge-base/drum-production/scripts/ocr_book4.cjs \
  knowledge-base/books/book4.pdf \
  knowledge-base/drum-production/index/book4-tesseract-ocr.json \
  /path/to/python3

python3 knowledge-base/drum-production/scripts/build_index.py
python3 knowledge-base/drum-production/scripts/validate_kb.py
```
