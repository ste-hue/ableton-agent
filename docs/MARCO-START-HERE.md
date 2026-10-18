# Marco — parti da qui

Tu decidi cosa deve fare il prodotto e lo provi musicalmente. Il tuo agente gestisce
Git e prepara una modifica che Stefano può controllare e integrare.

Il tuo account è `dellapietram-lab`. Lo stato degli accessi e dell'onboarding resta
nell'[issue #72](https://github.com/ste-hue/ableton-agent/issues/72).
Questa pagina spiega il metodo; non certifica che il tuo computer sia già configurato.

## Le cinque cose da capire

| Parola | Cosa significa per te |
| --- | --- |
| `main` | La versione condivisa del codice; il prodotto installato può essere diverso. |
| Issue | Il problema o risultato su cui stai lavorando. |
| Branch | Il tuo spazio di lavoro per una sola modifica. |
| Commit / push | Salvataggio nella storia locale / invio dei commit a GitHub. |
| PR | La proposta di integrare la modifica, con test e discussione. |

Un commit locale non è ancora su GitHub. Una PR aperta non è ancora in `main`.
Il verde della CI indica che sono passati i controlli automatici eseguiti; non
certifica il comportamento musicale né una release pubblicata.

## Prima sessione: recuperiamo il lavoro che hai già

Apri Claude Code, Codex o il tuo agente **nella cartella dove lavori già**.
Incolla tutto questo, senza modificare prima la cartella:

> Sono Marco, account GitHub dellapietram-lab, collaboratore Tembro.
> Fammi l'onboarding partendo dal lavoro presente su questo computer.
> In questa prima fase non cambiare file o branch: niente checkout, pull, rebase,
> reset, clean, stash, commit, push, merge o deploy.
>
> 1. Identifica la repository e verifica quale account GitHub usa questa sessione
>    (con GitHub CLI, se disponibile, o con il connettore del tuo ambiente).
>    Controlla anche l'accesso Git del remote: browser, CLI e Git possono usare
>    credenziali diverse. Prima di qualsiasi scrittura su GitHub verifica che
>    l'account usato sia dellapietram-lab. Se è diverso, guidami a selezionare il
>    mio account; non usare quello di Stefano.
>    Non stampare token o URL che contengano credenziali.
>    Se serve autenticazione, guidami nel login ufficiale al mio account;
>    non chiedermi di incollare segreti in chat.
> 2. Leggi AGENTS.md, README.md, le istruzioni locali collegate e gli eventuali
>    AGENTS.md nelle cartelle pertinenti. Il manuale centrale è
>    https://github.com/ste-hue/ableton-agent/blob/main/docs/COLLABORATOR-QUICKSTART.md
>    e lo stato onboarding è https://github.com/ste-hue/ableton-agent/issues/72.
>    Per release, sito o pagamenti leggi anche
>    https://github.com/ste-hue/ableton-agent/issues/70 e i suoi commenti recenti.
> 3. Mostra repository canonica, branch, HEAD, modifiche locali e file non tracciati.
>    Verifica il remote prima di un normale fetch. Dopo il fetch identifica il
>    branch principale condiviso e confronta i commit locali e remoti: cosa esiste
>    solo qui, cosa è già su GitHub, cosa manca rispetto a main.
>    Se è una cartella senza Git o un fork, segnalalo e conserva tutto.
> 4. Cerca PR già aperte per questo branch o per lo stesso lavoro.
>    Non creare una seconda PR né sostituire un file intero con la mia copia.
> 5. Restituiscimi cinque righe: dove sto lavorando; cosa è solo locale;
>    cosa è già condiviso; quale issue/PR seguire; una prossima azione.
>    Se una verifica fallisce, indicane il limite senza dichiararla completata.
>
> Prima di integrare il lavoro locale serve una copia di recupero verificata,
> conservata localmente e fuori dal versionamento. Non sovrascrivere originali,
> librerie, preset o dati utente; non pubblicare segreti.

Il primo risultato è quel report. Conservalo nell'issue #72, senza percorsi privati
o segreti: la sessione successiva riparte da lì. Se manca una copia di recupero,
l'agente la prepara prima di spostare o integrare il lavoro.

## Ogni modifica successiva

Dopo il primo controllo, usa queste tre istruzioni:

| Tu dici | L'agente deve consegnare |
| --- | --- |
| «Voglio ottenere questo risultato musicale: …» | Una issue pertinente, una modifica isolata e una prova locale. |
| «Mandalo a Stefano» | Test previsti dalla repo, commit, push sul branch e link alla PR. |
| «A che punto siamo?» | Link issue/PR, risultato test, blocco eventuale e una prossima azione. |

Una cosa per branch. Se esiste già la PR, le correzioni vanno nello stesso branch.
Se parti da nuovo lavoro, l'agente usa il `main` condiviso aggiornato dopo aver
preservato le modifiche precedenti. Tu ascolti e verifichi il risultato; l'agente
riporta anche cosa non è riuscito a testare.

## Quale repository

| Prodotto | Codice condiviso | Attenzione |
| --- | --- | --- |
| Chordarium | [ste-hue/ChordBloom-v1](https://github.com/ste-hue/ChordBloom-v1) | Le modifiche musicali seguono il suo AGENTS.md. Stefano fa il merge: main pubblica il sito; il plugin richiede una nuova build. |
| Atlas | [ste-hue/atlas](https://github.com/ste-hue/atlas) | Leggere il suo AGENTS.md: build e installazione native hanno istruzioni specifiche. |
| Tembro for Live e sito Tembro | [ste-hue/ableton-agent](https://github.com/ste-hue/ableton-agent) | Codice, storefront e operazioni condivise; ogni intervento segue le proprie istruzioni. |
| Rudiment | [ste-hue/rudiment](https://github.com/ste-hue/rudiment) | Consultare il lifecycle nell'issue #70 prima di lavorarci; un repo archiviato non accetta modifiche. |

Prezzi, licenze, checkout, file per i clienti, release, firma e deploy seguono i
gate di Stefano nel [manuale completo](COLLABORATOR-QUICKSTART.md).
La prima PR di onboarding si consegna a Stefano per review: nessun merge automatico.
Le istruzioni specifiche della repository continuano a valere.

## Quando l'onboarding è riuscito

Hai completato un giro dal tuo account e dal tuo computer: recupero sicuro del
lavoro, branch, prova locale, PR, correzione della review e aggiornamento dopo il
merge autorizzato. La prova è il link alla PR nell'issue #72.

Da una nuova chat devi poter chiedere «leggi l'issue e dimmi la prossima azione»
senza ricostruire tutto a memoria.
