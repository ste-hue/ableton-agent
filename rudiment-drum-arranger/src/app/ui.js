const laneColors=["#d8ff3e","#ff675c","#5fe5d1","#f5b85c","#c285ff","#6c8cff","#ff7eb6"];
function summaryText(){
  const profile=dawExportProfile(cfg.targetDaw),grammar=result.patternGrammar;
  const form=result.sections[0]?.formId||"NARRATIVE ARC";
  return `<b>${cfg.style} · ${result.totalBars} bars · ${cfg.bpm} BPM · ${form}.</b> ${result.tracks.length} layers, ${grammar.kickPolicy.toLowerCase()}; ${grammar.backbeatLanguage.toLowerCase()}. ${grammar.creativeLanguage.toLowerCase()}. ${String(cfg.build).toLowerCase()} build with a ${grammar.fillGenealogy.split(" · ")[0].toLowerCase()} master fill. Export: <b>${profile.label} · ${profile.device}</b>.`;
}
function roleLabel(role){return role.replace(/([A-Z])/g," $1").toUpperCase()}
function renderFillClip(){
  const roleOrder=["snare","rim","tomHigh","tomMid","tomLow","percHigh","percMid","percLow","clap"],events=result.fillPreviewEvents;
  const roles=roleOrder.filter(role=>events.some(event=>event.role===role));
  $("#fillViewerTitle").textContent=`${result.patternGrammar.fillGenealogy.split(" · ")[0]} · 8-BAR DERIVATION`;
  $("#fillClip").innerHTML=roles.map((role,index)=>{
    const notes=events.filter(event=>event.role===role).map(event=>`<i class="fillNote" style="left:${event.tick/(8*4*PPQ)*100}%;width:${Math.max(.45,event.duration/(8*4*PPQ)*100)}%;opacity:${.45+event.velocity/210}"></i>`).join("");
    return `<div class="fillLane" style="--fill-color:${laneColors[(index+1)%laneColors.length]}"><div class="fillLaneName">${roleLabel(role)}</div><div class="fillLaneGrid">${notes}</div></div>`;
  }).join("");
}
function arrangementEnergyBars(){
  const roleWeight={kick:1,snare:.9,clap:.86,rim:.58,closedHat:.34,openHat:.46,shaker:.24,percLow:.48,percMid:.5,percHigh:.52,tomLow:.62,tomMid:.66,tomHigh:.7,crash:.82,ride:.5};
  const raw=Array.from({length:result.totalBars},(_,bar)=>result.semanticEvents.filter(event=>Math.floor(event.tick/(PPQ*4))===bar).reduce((sum,event)=>sum+event.velocity*(roleWeight[event.role]||.4),0));
  const peak=Math.max(1,...raw);
  return raw.map(value=>value/peak);
}
function visualEnergyShape(section,local){
  const phase=section.bars<=1?1:local/(section.bars-1),pulse=Math.sin(phase*Math.PI*3)*.055;
  if(section.kind==="intro")return .18+phase*.58+pulse;
  if(section.kind==="soft")return .42+phase*.14+pulse;
  if(section.kind==="main")return .62+phase*.13+pulse;
  if(section.kind==="breakdown")return .42-phase*.22+Math.sin(phase*Math.PI)*.08;
  if(section.kind==="build")return .24+Math.pow(phase,1.35)*.72;
  if(section.kind==="drop")return .83+pulse;
  if(section.kind==="outro")return .62-phase*.48+pulse;
  return .5+pulse;
}
function renderSections(){
  const measured=arrangementEnergyBars();
  $("#sections").innerHTML=result.sections.map(section=>{
    const bars=Array.from({length:section.bars},(_,local)=>{
      const actual=measured[section.start+local]||0,previous=measured[Math.max(section.start,section.start+local-1)]||actual,next=measured[Math.min(section.start+section.bars-1,section.start+local+1)]||actual;
      const smoothed=actual*.58+previous*.21+next*.21,narrative=visualEnergyShape(section,local);
      const height=clamp(8+narrative*82+(smoothed-.5)*12,7,98);
      return `<i style="height:${height}%"></i>`;
    }).join("");
    return `<div class="section ${section.kind}" style="width:${section.bars/result.totalBars*100}%"><b>${section.name}</b><small>${section.bars}</small><div class="energyTrace" style="grid-template-columns:repeat(${section.bars},1fr)">${bars}</div></div>`;
  }).join("");
}
function refreshExportControls(){
  const scope=$("#exportScope").value||"full",instrumentMode=scope==="instrument";
  $("#exportModeField").hidden=instrumentMode;$("#instrumentField").hidden=!instrumentMode;
  const instrument=$("#exportInstrument"),previous=instrument.value,keys=activeKitKeys();
  instrument.innerHTML=keys.map(key=>`<option value="${key}">${KIT_DEFS[key].label}</option>`).join("");
  instrument.value=keys.includes(previous)?previous:(keys[0]||"");
  const label=$("#exportArrangement").querySelector("span");
  if(instrumentMode)label.textContent=instrument.value?KIT_DEFS[instrument.value].label:"NO INSTRUMENT";
  else label.textContent=$("#exportMode").value==="multitrack"?"FULL DRUMS · TRACKS":"FULL DRUMS · ONE CLIP";
  $("#exportArrangement").disabled=instrumentMode&&!instrument.value;
}
function render(){
  result=generate();
  $("#barCount").textContent=result.totalBars;$("#bpmReadout").textContent=cfg.bpm;$("#seedLabel").textContent=`SEED ${cfg.seed}`;
  $("#q1").textContent=Math.max(1,Math.round(result.totalBars*.25));$("#q2").textContent=Math.max(1,Math.round(result.totalBars*.5));$("#q3").textContent=Math.max(1,Math.round(result.totalBars*.75));$("#q4").textContent=result.totalBars;
  renderSections();
  $("#lanes").innerHTML=result.tracks.map((track,index)=>`<div class="lane" style="--lane-color:${laneColors[index%laneColors.length]}"><div class="laneName"><i></i>${track.name.replace("DRUMS — ","")}</div><div class="laneGrid">${track.notes.slice(0,1800).map(note=>`<i style="left:${Math.min(99.8,note.tick/(result.totalBars*4*PPQ)*100)}%;opacity:${.3+note.velocity/175};height:${3+note.velocity/25}px"></i>`).join("")}</div></div>`).join("");
  renderFillClip();
  $("#productionSummary").innerHTML=summaryText();
  refreshExportControls();
  resetPreview();
}
function newSeed(){let next;do{next=Math.floor(Math.random()*999999999)+1}while(next===cfg.seed);cfg.seed=next;$("#seed").value=next}
let renderTimer=null;function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(render,70)}
function installFunctionHints(){
  const hints={
    style:"Sceglie il linguaggio ritmico e il patrimonio musicale usato dal drummer.",length:"Durata esatta dell’arrangiamento, bloccata su forme musicali complete.",bpmNumber:"Tempo dell’arrangiamento e del file MIDI esportato.",bpm:"Regolazione rapida del tempo in BPM.",build:"Dimensione e intensità della trasformazione che conduce al drop.",variation:"Frequenza delle variazioni B senza sostituire il groove principale.",fill:"Quantità e presenza dei fill nei confini importanti della frase.",swing:"Spostamento circolare: 0% e 100% sono dritti, 50% è lo swing massimo.",density:"Aggiunge o sottrae shaker, percussion e altri layer secondari.",syncopation:"Sposta soltanto kick accessori, percussioni e ghost; gli anchor restano fissi.",hatMotion:"Da ottavi minimali a sedicesimi più mobili, inclusa la presenza degli open hat.",ghostNotes:"Quantità delle ghost note dello snare, sempre sotto una velocity protetta.",creativity:"Distanza musicale tra il pattern identitario A, la risposta B e lo sviluppo C.",motifMemory:"Quanto B e C conservano e riutilizzano i motivi già presentati.",controlledDisplacement:"Probabilità di spostare insieme un gruppo accessorio di un sedicesimo.",variationScope:"Decide se la creatività può modificare dettagli, groove o l’intera frase.",phraseShape:"Sceglie anche catene esplicite AAAB, ABAB e AABB, oltre agli sviluppi con C.",kickVocabulary:"Tipo di gesto usato dai kick accessori; i quattro kick principali restano protetti.",backbeatEmbellishment:"Scrittura aggiuntiva dello snare: ghost pickup, drag, flam, risposta o mini roll.",hatPhrasing:"Disegno musicale degli hat: spazi, archi, accenti ciclici o crescendo.",sectionMutation:"Decide quanto ogni sezione può rivelare le varianti B e C.",percussionMotion:"Forma del dialogo tra le voci percussive senza cambiare la struttura del brano.",fillOrchestration:"Distribuisce lo stesso phrasing del master fill su snare/rim, tom o percussion.",fillDirection:"Muove verticalmente il fill sui pad senza modificarne il ritmo.",phraseEvolution:"Intervallo di 8, 16 o 32 battute usato per completare lo sviluppo A/B/C.",velocityCharacter:"Cambia accenti e dinamica senza spostare la posizione delle note.",sectionContrast:"Intensità della differenza fra intro, breakdown, build, drop e outro.",doubleKick:"Abilita piccoli pickup di cassa ai confini della frase.",pausona:"Abilita il Main Roll narrativo prima del drop principale.",generate:"Crea un nuovo seed e un arrangiamento completamente nuovo.",playBtn:"Riproduce la preview dalla posizione corrente.",pauseBtn:"Mette in pausa conservando la posizione.",stopBtn:"Ferma la preview e riporta la testina all’inizio.",seek:"Trascina per ascoltare qualsiasi punto dell’arrangiamento.",targetDaw:"Rimappa le note MIDI sui pad corretti del kit scelto.",exportScope:"Esporta tutta la batteria oppure un solo strumento.",exportMode:"Crea una clip unica oppure un file MIDI con tracce separate.",exportInstrument:"Sceglie la singola pista da esportare.",exportArrangement:"Scarica l’arrangiamento MIDI con il mapping DAW selezionato.",exportFill:"Scarica le quattro battute sorgente del master fill.",creativeSummary:"Apre o chiude i controlli avanzati del sistema A/B/C."
  };
  for(const [id,hint] of Object.entries(hints)){const element=id==="creativeSummary"?document.querySelector(".creativePanel summary"):document.getElementById(id);if(element){const target=element.matches("input,select")&&element.closest("label")?element.closest("label"):element;target.dataset.hint=hint;element.setAttribute("aria-describedby","functionHint")}}
  $$("#kitGrid .kitToggle").forEach(button=>button.dataset.hint=`Attiva o esclude la famiglia ${button.textContent.trim()} dalla generazione, dalla preview e dall’export.`);
  const tooltip=document.createElement("div");tooltip.className="functionHint";tooltip.setAttribute("role","tooltip");document.body.appendChild(tooltip);
  let timer=null,current=null;
  const hide=()=>{clearTimeout(timer);timer=null;current=null;tooltip.classList.remove("visible")};
  const show=element=>{if(!element||current!==element)return;tooltip.textContent=element.dataset.hint;tooltip.classList.add("visible");requestAnimationFrame(()=>{const rect=element.getBoundingClientRect(),tip=tooltip.getBoundingClientRect(),left=clamp(rect.left+rect.width/2-tip.width/2,10,window.innerWidth-tip.width-10),above=rect.top-tip.height-10;tooltip.style.left=`${left}px`;tooltip.style.top=`${above>8?above:Math.min(window.innerHeight-tip.height-8,rect.bottom+10)}px`})};
  $$('[data-hint]').forEach(element=>{element.addEventListener("pointerenter",()=>{hide();current=element;timer=setTimeout(()=>show(element),2500)});element.addEventListener("pointerleave",hide);element.addEventListener("focusin",()=>{hide();current=element;timer=setTimeout(()=>show(element),250)});element.addEventListener("focusout",hide)});
  tooltip.id="functionHint";window.addEventListener("scroll",hide,{passive:true});window.addEventListener("resize",hide);
}
styles.forEach(style=>$("#style").insertAdjacentHTML("beforeend",`<option>${style}</option>`));$("#style").value=cfg.style;
$("#style").onchange=event=>{cfg.style=event.target.value;scheduleRender()};
$("#length").onchange=event=>{cfg.length=Number(event.target.value);scheduleRender()};
$("#build").onchange=event=>{cfg.build=event.target.value;scheduleRender()};
function setBpm(value){cfg.bpm=clamp(Number(value)||128,60,200);$("#bpm").value=cfg.bpm;$("#bpmNumber").value=cfg.bpm;scheduleRender()}
$("#bpm").oninput=event=>setBpm(event.target.value);$("#bpmNumber").onchange=event=>setBpm(event.target.value);
const steppedNames={0:"OFF",20:"LOW",40:"MED",60:"HIGH",80:"V.HIGH",100:"MAX"};
[["variation","variation","variationVal"],["fill","fill","fillVal"],["density","density","densityVal"],["syncopation","syncopation","syncopationVal"],["hatMotion","hatMotion","hatMotionVal"],["ghostNotes","ghostNotes","ghostNotesVal"],["creativity","creativity","creativityVal"],["motifMemory","motifMemory","motifMemoryVal"],["controlledDisplacement","controlledDisplacement","controlledDisplacementVal"],["sectionContrast","sectionContrast","sectionContrastVal"]].forEach(([id,key,valueId])=>{$("#"+id).oninput=event=>{cfg[key]=Number(event.target.value);$("#"+valueId).textContent=steppedNames[cfg[key]];scheduleRender()}});
$("#swing").oninput=event=>{cfg.swing=Number(event.target.value);$("#swingVal").textContent=cfg.swing+"%";scheduleRender()};
[["variationScope","variationScope",false],["phraseShape","phraseShape",false],["kickVocabulary","kickVocabulary",false],["backbeatEmbellishment","backbeatEmbellishment",false],["hatPhrasing","hatPhrasing",false],["sectionMutation","sectionMutation",false],["percussionMotion","percussionMotion",false],["fillOrchestration","fillOrchestration",false],["fillDirection","fillDirection",false],["phraseEvolution","phraseEvolution",true],["velocityCharacter","velocityCharacter",false]].forEach(([id,key,numeric])=>{$("#"+id).onchange=event=>{cfg[key]=numeric?Number(event.target.value):event.target.value;scheduleRender()}});
function bindSwitch(id,key){$(id).onclick=()=>{cfg[key]=!cfg[key];$(id).classList.toggle("active",cfg[key]);render()}}
bindSwitch("#doubleKick","doubleKick");bindSwitch("#pausona","pausona");
$$('#kitGrid .kitToggle').forEach(button=>button.onclick=()=>{const key=button.dataset.kit;cfg.kit[key]=!cfg.kit[key];button.classList.toggle("active",cfg.kit[key]);render()});
$("#targetDaw").onchange=event=>{cfg.targetDaw=event.target.value;$("#productionSummary").innerHTML=summaryText()};
$("#exportScope").onchange=refreshExportControls;$("#exportMode").onchange=refreshExportControls;$("#exportInstrument").onchange=refreshExportControls;
$("#generate").onclick=()=>{newSeed();render()};
$("#playBtn").onclick=playPreview;$("#pauseBtn").onclick=pausePreview;$("#stopBtn").onclick=()=>stopPreview(true);
$("#seek").addEventListener("input",event=>seekPreview(event.target.value));
$("#exportArrangement").onclick=()=>{
  const profile=dawExportProfile(cfg.targetDaw),base=`rudiment-${slug(cfg.style)}-${result.totalBars}bars-${cfg.bpm}bpm-${profile.slug}`;
  if($("#exportScope").value==="instrument"){
    const key=$("#exportInstrument").value;if(!key)return;
    dl(`${base}-${slug(KIT_DEFS[key].label)}.mid`,encodeDawInstrument(result,cfg.targetDaw,key));return;
  }
  if($("#exportMode").value==="multitrack")dl(`${base}-tracks.mid`,encodeDawMultitrack(result,cfg.targetDaw));
  else dl(`${base}-one-clip.mid`,encodeDawArrangement(result,cfg.targetDaw));
};
$("#exportFill").onclick=()=>{const profile=dawExportProfile(cfg.targetDaw);dl(`rudiment-${slug(cfg.style)}-master-fill-4bars-${profile.slug}.mid`,encodeDawFillMaster(result,cfg.targetDaw))};
installFunctionHints();render();
window.RudimentApp=Object.freeze({snapshot:()=>({config:structuredClone(cfg),result:structuredClone(result)}),renderMidi:()=>encodeDawArrangement(result,cfg.targetDaw),renderMultitrackMidi:()=>encodeDawMultitrack(result,cfg.targetDaw),renderInstrumentMidi:key=>encodeDawInstrument(result,cfg.targetDaw,key),renderFillMidi:()=>encodeDawFillMaster(result,cfg.targetDaw),profiles:DAW_EXPORT_PROFILES,adapter:AbletonMcpAdapter});
