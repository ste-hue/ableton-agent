const laneColors=["#d8ff3e","#ff675c","#5fe5d1","#f5b85c","#c285ff","#6c8cff","#ff7eb6"];
function summaryText(){
  const profile=dawExportProfile(cfg.targetDaw),grammar=result.patternGrammar;
  return `<b>${cfg.style} · ${result.totalBars} bars · ${cfg.bpm} BPM.</b> ${result.tracks.length} instrument layers, ${grammar.kickPolicy.toLowerCase()}, ${String(cfg.build).toLowerCase()} build and a ${grammar.fillGenealogy.split(" · ")[0].toLowerCase()} master fill. Export is mapped for <b>${profile.label} · ${profile.device}</b>.`;
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
function renderSections(){
  const measured=arrangementEnergyBars();
  $("#sections").innerHTML=result.sections.map(section=>{
    const bars=Array.from({length:section.bars},(_,local)=>{
      const actual=measured[section.start+local]||0,previous=measured[Math.max(section.start,section.start+local-1)]||actual,next=measured[Math.min(section.start+section.bars-1,section.start+local+1)]||actual;
      const smoothed=actual*.58+previous*.21+next*.21,height=clamp(section.energy*.56+smoothed*38,8,100);
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
styles.forEach(style=>$("#style").insertAdjacentHTML("beforeend",`<option>${style}</option>`));$("#style").value=cfg.style;
$("#style").onchange=event=>{cfg.style=event.target.value;scheduleRender()};
$("#length").onchange=event=>{cfg.length=Number(event.target.value);scheduleRender()};
$("#build").onchange=event=>{cfg.build=event.target.value;scheduleRender()};
function setBpm(value){cfg.bpm=clamp(Number(value)||128,60,200);$("#bpm").value=cfg.bpm;$("#bpmNumber").value=cfg.bpm;scheduleRender()}
$("#bpm").oninput=event=>setBpm(event.target.value);$("#bpmNumber").onchange=event=>setBpm(event.target.value);
[["variation","variation","variationVal",""],["fill","fill","fillVal",""],["swing","swing","swingVal","%"]].forEach(([id,key,valueId,suffix])=>{$("#"+id).oninput=event=>{cfg[key]=Number(event.target.value);$("#"+valueId).textContent=cfg[key]+suffix;scheduleRender()}});
function bindSwitch(id,key){$(id).onclick=()=>{cfg[key]=!cfg[key];$(id).classList.toggle("active",cfg[key]);render()}}
bindSwitch("#doubleKick","doubleKick");bindSwitch("#pausona","pausona");
$$('#kitGrid .kitToggle').forEach(button=>button.onclick=()=>{const key=button.dataset.kit;cfg.kit[key]=!cfg.kit[key];button.classList.toggle("active",cfg.kit[key]);render()});
$("#targetDaw").onchange=event=>{cfg.targetDaw=event.target.value;$("#productionSummary").innerHTML=summaryText()};
$("#exportScope").onchange=refreshExportControls;$("#exportMode").onchange=refreshExportControls;$("#exportInstrument").onchange=refreshExportControls;
$("#generate").onclick=()=>{newSeed();render()};
$("#playBtn").onclick=playPreview;$("#pauseBtn").onclick=pausePreview;$("#stopBtn").onclick=()=>stopPreview(true);
$("#seek").addEventListener("input",event=>{const dur=durationSec(),wasPlaying=isPlaying;if(wasPlaying)pausePreview();transportOffset=dur*(Number(event.target.value)/1000);updateTransport();if(wasPlaying)playPreview()});
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
render();
window.RudimentApp=Object.freeze({snapshot:()=>({config:structuredClone(cfg),result:structuredClone(result)}),renderMidi:()=>encodeDawArrangement(result,cfg.targetDaw),renderMultitrackMidi:()=>encodeDawMultitrack(result,cfg.targetDaw),renderInstrumentMidi:key=>encodeDawInstrument(result,cfg.targetDaw,key),renderFillMidi:()=>encodeDawFillMaster(result,cfg.targetDaw),profiles:DAW_EXPORT_PROFILES,adapter:AbletonMcpAdapter});
