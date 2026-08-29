# La stanza suona

Primo pezzo scritto interamente parlando: nessuna nota inserita a mano, nessun
click nel piano roll. Il testo racconta esattamente il modo in cui è stato fatto.

- **Data:** 2026-08-29
- **Tonalità:** Fa minore
- **Progetto Ableton:** `~/Music/Ableton/Projects/2026-08-29_la-stanza-suona/2026-08-29_la-stanza-suona.als`

## Due versioni dello stesso pezzo

Il Set tiene entrambe le versioni in Session view, una per scena. Il tempo è
globale, quindi si cambia a mano passando dall'una all'altra.

| | Scena 1 — boom bap | Scena 2 — trap |
|---|---|---|
| Tempo | 88 | 142 (mezzo tempo percepito → 71) |
| Batteria | `bb-drums` su **BB Drums** (Boom Bap Kit) | `trap-drums` su **TRAP Drums** (808 Core Kit) |
| Basso | `bb-bass` su **BB Bass** (Hip-Hop Sub Bass) | `trap-808` — stessa traccia, slot 2 |
| Armonia | `bb-keys` su **BB Keys** (E-Piano MKI Mellow) | `trap-keys` — stessa traccia, slot 2 |

Tutte le clip sono lunghe 8 movimenti (2 battute) e vanno in loop.

**Come suonano diverse.** Il boom bap tiene il rullante sul 2 e sul 4 e lascia
spazio in mezzo — è costruito attorno alla voce. Il trap sposta il rullante sul
solo terzo movimento (mezzo tempo) e riempie il vuoto con i charleston, che
diventano la voce ritmica principale; l'808 tiene note lunghe che scendono.

**Come si rida' il ritmo del trap** con il compilatore delle skill
(`.agents/skills/beat-making/scripts/groove.py`, griglia in trentaduesimi):

```
kick    X...............x...............   X.......x...............x.......
snare   ................X...............   ................X...............
clap    ................X...............   ................X...............
hat     x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.   x.x.x.x.x.x.x.x.xxxxxxxxx.x.x.x.
```

```bash
python3 .agents/skills/beat-making/scripts/groove.py pattern.txt \
  --grid 32 --swing 50 --humanize 3 --name trap-drums --summary
```

---

## Testo

Il beat è a mezzo tempo percepito: **un giro del loop = una barra di rap**
(circa 3,4 secondi a 142). Ogni riga qui sotto sta su un giro.

### Ritornello
*(quattro giri, entra sul rullante)*

> Parlo — e la stanza suona
> Non muovo un dito, la stanza suona
> Otto-zero-otto sotto, trema la zona
> Parlo, e la stanza suona

### Strofa
*(sedici giri)*

> Non so dov'è il tasto, so solo cosa mi deve arrivare
> sto fermo sulla sedia e la cassa si mette a parlare
> mio fratello dice *"'sta roba qua non si può spiegare"*
> vent'anni dentro a una mano — ha ragione, ma io non devo spiegare
>
> Devo dire soltanto *più scuro*, *più stretto*, *più vuoto*
> e il vuoto si apre di netto come una porta sul retro
> fantasmi sul rullante, quarantacinque di velocity
> non li senti, li respiri — sono loro che ti tengono il petto
>
> Non leggo lo spartito, leggo la faccia che fai
> se non ti muovi il piede da solo, fratello, rifai
> ottantotto per due, centoquarantadue
> ho raddoppiato il tempo ma il passo è rimasto il tuo
>
> Ogni cosa che tocco resta scritta dentro a un file
> la macchina non ricorda a orecchio, ricorda per righe
> domani apro e la stanza è identica a com'era prima
> il gusto non si formalizza — ma il gesto sì, e rimane

### Note per l'interpretazione

- Il ritornello entra sul rullante (terzo movimento).
- Le barre della strofa partono sul davanti e cadono sull'808 grave: l'ultima
  sillaba di ogni riga va sul Mib basso che scende, e ti spinge dentro alla riga
  dopo.
- La mono-rima in *-are* nelle prime quattro barre è voluta — trap classico,
  lascia respirare.
