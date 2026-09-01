# Nomenclatura, salvataggio e portabilità dei progetti
## Cosa deve essere vero (vincoli non negoziabili)

- Il salvataggio del Set è un gesto dell'utente.
- Root dei progetti: /Users/stefanodellapietra/Music/Ableton/Projects/.
- Cartella per brano: YYYY-MM-DD_project-slug in lowercase kebab-case.
- Il file ALS usa lo stesso basename; versioni successive aggiungono _v01, _v02 e così via.
- Sketch sacrificabili vanno sotto Projects/Sketches/.
- Un progetto è portabile soltanto dopo Collect All and Save.
- I progetti non vengono salvati nella User Library.

## Principi (con il perché musicale, non solo il cosa)

Una nomenclatura stabile mantiene insieme Set, Samples, Backup e Ableton Project Info e permette di capire data, identità e versione senza aprire Live. La User Library serve a preset, device e Remote Scripts; mescolarvi i brani compromette portabilità e manutenzione.

La ricetta dichiarativa conserva decisioni riproducibili oltre il singolo ALS, ma non sostituisce file audio, plugin state non leggibile o Groove Pool non serializzato.

## Metodo di lavoro (passi in ordine, cosa verificare a ogni passo)

1. Quando l'utente chiede di salvare, proporre slug descrittivo.
2. Creare percorso data-slug sotto Projects.
3. Usare stesso basename per la prima ALS; aggiungere _vNN alle revisioni.
4. Mantenere cartelle Ableton generate dentro il progetto.
5. Eseguire Collect All and Save per trasferimento.
6. Salvare una recipe separata con tempo, scala, tracce, device, parametri e note quando richiesto.
7. Validare recipe e annotare omissioni non riproducibili.

## Errori tipici da evitare (con l'esempio concreto)

- Salvare un brano in User Library/Presets.
- File “final_final2.als” senza data o progetto.
- Copiare soltanto l'ALS e perdere sample esterni.
- Chiudere un Set non salvato per fare pulizia senza autorizzazione.
