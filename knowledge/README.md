# Knowledge base musicale

Corpus curato che alimenta l'agente Tembro. Il testo qui dentro viene distillato
in `server/src/knowledge.ts` e servito al modello nel system prompt (interamente
in prompt cache, quindi il costo per turno è trascurabile). Quando il corpus
supererà la dimensione utile del prompt, passerà dietro un layer di retrieval.

## Struttura

- `drums/` — produzione ritmica: sequencing, kick design, arrangiamento e
  transizioni, complessità, workflow/mix, metodo di studio dei pattern,
  sequencing generativo.
- `sources.md` — bibliografia dei testi studiati. I libri sono opere protette:
  NON vanno mai committati in questo repository (che è pubblico). Restano negli
  archivi privati dei contributor; qui entrano solo sintesi e principi, con i
  riferimenti di pagina.

## Come contribuire

1. Scrivi principi e metodi con parole tue: sintesi, non trascrizioni. Le
   convenzioni stilistiche sono priors storici, non istruzioni da riprodurre —
   lo stesso criterio delle skill in `.agents/skills/`.
2. Cita le fonti per titolo e pagina in `sources.md`; niente PDF, scansioni,
   OCR o indici del testo originale nel repo.
3. Apri una PR verso `main` (serve una review, o la merge dell'owner).
