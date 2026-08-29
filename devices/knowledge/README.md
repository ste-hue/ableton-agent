# Device knowledge base

Schemi dei parametri dei device stock di Live 12, raccolti **dal vivo** con
`live_device_parameters` su device appena caricati (mai copiati da doc esterne).
Per ogni parametro: nome, range (`min`/`max`), `default_value`, `is_quantized`,
`display` e — per gli enum — la lista completa `value_items`.

A cosa serve: quando l'agente deve fare sound design ("basso più cattivo",
"filtro più chiuso") consulta questi schemi invece di interrogare Live a
tentoni: sa già che `Filter Freq` di Operator è normalizzato 0–1 con display in
Hz, che i `value_items` di `Osc-A Wave` sono 23, che il Dry/Wet del Reverb di
mandata sta a 100%.

## Raccolti (2026-08-29)

| device | class_name | parametri |
|---|---|---|
| Operator | Operator | 195 |
| Wavetable | InstrumentVector | 93 |
| EQ Eight | Eq8 | 84 |
| Drift | Drift | 66 |
| Electric | LoungeLizard | 34 |
| Reverb | Reverb | 33 |
| Compressor | Compressor2 | 23 |
| Saturator | Saturator | 19 |

## Principio di raccolta

**Lazy harvest**: non si insegue la completezza — si fotografa un device la
prima volta che una sessione lo usa (caricare → dump → salvare qui → una voce
in questa tabella). Mancano ancora, tra gli altri: Analog, Simpler, Sampler,
Delay, Echo, Auto Filter, Utility, Glue Compressor, Drum Rack (macro).

Nota: i `value` catturati sono lo stato al momento del dump (di solito il
default di fabbrica, ma non sempre — fa fede `default_value`). La coppia
`value`/`display` serve da esempio concreto della mappatura normalizzato→display.
