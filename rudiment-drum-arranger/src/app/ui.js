function render(){
  result=generate();
  const count=result.tracks.length;
  $("#barCount").textContent=result.totalBars;$("#eventCount").textContent=`${result.eventCount} MIDI EVENTS`;
  $("#q1").textContent=Math.round(result.totalBars*.25);$("#q2").textContent=Math.round(result.totalBars*.5);$("#q3").textContent=Math.round(result.totalBars*.75);$("#q4").textContent=result.totalBars;
  $("#sections").innerHTML=result.sections.map(s=>`<div class="section ${s.kind}" style="width:${s.bars/result.totalBars*100}%"><b>${s.name}</b><small>${s.bars}B</small><i style="height:${Math.max(8,s.energy*.56)}%"></i></div>`).join("");
  $("#lanes").innerHTML=result.tracks.map(t=>`<div class="lane"><div class="laneName"><span class="dot"></span>${t.name.replace("DRUMS — ","")}<small>${t.notes.length}</small></div><div class="laneGrid">${t.notes.slice(0,1200).map(n=>`<i style="left:${Math.min(99.7,n.tick/(result.totalBars*4*PPQ)*100)}%;opacity:${.32+n.velocity/190};height:${3+n.velocity/28}px"></i>`).join("")}</div></div>`).join("");
  $("#fillLogic").textContent=cfg.build.toUpperCase();$("#fillSubdiv").textContent=`GENEALOGY ${result.patternGrammar.fillGenealogy}`;
  $("#timingMode").textContent=cfg.swing===0?"GRID LOCKED":cfg.swing<5?"TIGHT":"LOOSE";
  $("#trackCount").textContent=`${count} TRACK${count===1?"":"S"}`; const ht=$("#heroTracks");if(ht)ht.textContent=count;
  const tsl=$("#trackSplitLabel");if(tsl)tsl.textContent=`${count} ON`;
  const summary=activeKitKeys().map(k=>KIT_DEFS[k].label).join(" · ")||"NO KIT FAMILIES ENABLED";$("#kitSummary").textContent=summary;
  const recipe=$("#activeKitRecipe");if(recipe)recipe.textContent=summary;
  const pr=$("#pausonaRecipe");if(pr)pr.textContent=cfg.pausona?`${cfg.pausonaLength} bars · ${String(cfg.pausonaShape).toLowerCase()} · ${String(cfg.pausonaIntensity).toLowerCase()}`:"OFF";
  $("#grammarMode").textContent="NARRATIVE FIRST";
  $("#grammarDetail").textContent=`soft = core−layers · main = soft+layer · ${result.patternGrammar.tomRimLanguage} · ${result.patternGrammar.crashLanguage}`;
  $("#manifestRows").innerHTML=result.tracks.map((t,i)=>`<div><span>${String(i+1).padStart(2,"0")}</span><b>${t.name.replace("DRUMS — ","")}</b><em>${t.notes.length}</em></div>`).join("");
  releaseMidiStemUrls();
  $("#stemButtons").innerHTML=result.tracks.map((t,i)=>`<a class="midiStem" data-i="${i}" draggable="true" title="Click to download · Drag into your DAW"><span class="stemGrip">⠿</span><span>↓ ${String(i+1).padStart(2,"0")} — ${t.name.replace("DRUMS — ","")}.mid</span><small>DRAG TO DAW</small></a>`).join("");
  $$('#stemButtons .midiStem').forEach(link=>{const i=+link.dataset.i;attachMidiStemDrag(link,result.tracks[i],i)});resetPreview();
}

styles.forEach(x=>$("#style").insertAdjacentHTML("beforeend",`<option>${x}</option>`));Object.keys(profiles).forEach(x=>$("#device").insertAdjacentHTML("beforeend",`<option>${x}</option>`));
[["bpm","bpm"],["style","style"],["device","device"],["build","build"],["length","length"],["swing","swing"],["fill","fill"],["variation","variation"],["pausonaLength","pausonaLength"],["pausonaShape","pausonaShape"],["pausonaIntensity","pausonaIntensity"]].forEach(([id,key])=>$("#"+id).addEventListener("input",e=>{
  if(key==="pausonaLength")cfg[key]=parseInt(e.target.value,10)||8;
  else cfg[key]=["bpm","swing","fill","variation","seed"].includes(key)?Number(e.target.value)||1:e.target.value;
  $("#bpmVal").textContent=cfg.bpm;const br=$("#bpmReadout");if(br)br.textContent=cfg.bpm;$("#swingVal").textContent=cfg.swing+"/10";$("#fillVal").textContent=cfg.fill+"%";$("#variationVal").textContent=cfg.variation+"%";
}));
function toggle(id,key){$(id).onclick=()=>{cfg[key]=!cfg[key];$(id).classList.toggle("active",cfg[key]);$(id).querySelector("i").textContent=cfg[key]?"ON":"OFF"}}toggle("#doubleKick","doubleKick");toggle("#groove","groove");
$("#pausona").onclick=()=>{cfg.pausona=!cfg.pausona;$("#pausona").classList.toggle("active",cfg.pausona);$("#pausona").querySelector("i").textContent=cfg.pausona?"ON · one clear gesture into the strongest drop":"OFF";$("#pausonaVal").textContent=cfg.pausona?"ON":"OFF"};
$$('#kitGrid .kitToggle').forEach(b=>b.onclick=()=>{const key=b.dataset.kit;cfg.kit[key]=!cfg.kit[key];b.classList.toggle('active',cfg.kit[key]);const i=b.querySelector('i');if(i)i.textContent=(cfg.kit[key]?'ON':'OFF')+' · '+({kick:'foundation',snare:'backbeat',hats:'pulse',shaker:'motion',perc:'interlock',toms:'fills / punctuation',cymbals:'structure'}[key]);render()});
function newSeed(){let next;do{next=Math.floor(Math.random()*999999999)+1}while(next===cfg.seed);cfg.seed=next;$("#seed").value=cfg.seed;return next}
$("#randomSeed").onclick=()=>{newSeed();render()};$("#generate").onclick=()=>{newSeed();render()};$("#playBtn").onclick=playPreview;$("#pauseBtn").onclick=pausePreview;$("#stopBtn").onclick=()=>stopPreview(true);$("#seek").addEventListener("input",e=>{const dur=durationSec(),wasPlaying=isPlaying;if(wasPlaying)pausePreview();transportOffset=dur*(Number(e.target.value)/1000);updateTransport();if(wasPlaying)playPreview()});$("#downloadAll").onclick=()=>dl(`rudiment-${slug(cfg.style)}-${cfg.bpm}bpm.mid`,encodeMidi(result.tracks));$("#downloadManifest").onclick=()=>{const manifest={version:"1.0",bpm:cfg.bpm,style:cfg.style,deviceProfile:cfg.device,deviceMap:profiles[cfg.device],swing:cfg.swing,abletonGrooveRequested:cfg.groove,groovePolicy:"Apply only in Ableton/MCP adapter to groove-eligible non-kick tracks",patternGrammar:result.patternGrammar,archetypeBankVersion:"1.0-abstract",doubleKick:cfg.doubleKick,build:cfg.build,pausona:{enabled:cfg.pausona,lengthBars:cfg.pausonaLength,shape:cfg.pausonaShape,intensity:cfg.pausonaIntensity},sections:result.sections,activeKit:activeKitKeys().map(k=>KIT_DEFS[k].label),tracks:result.tracks.map(t=>({name:t.name,noteCount:t.notes.length})),seed:cfg.seed};dl(`rudiment-${slug(cfg.style)}-manifest.json`,JSON.stringify(manifest,null,2),"application/json")};render();
$("#downloadLivePayload").onclick=()=>{const payload=AbletonMcpAdapter.buildLivePayload(cfg,result);dl(`rudiment-${slug(cfg.style)}-${cfg.seed}-live.json`,JSON.stringify(payload,null,2),"application/json")};
$("#download909Clip").onclick=()=>dl(`rudiment-${slug(cfg.style)}-${cfg.bpm}bpm-909-core.mid`,encodeAbleton909CoreClip(result.tracks));

// Small read-only inspection surface for regression tests and future adapters.
window.RudimentApp=Object.freeze({
  snapshot:()=>({config:structuredClone(cfg),result:structuredClone(result)}),
  renderMidi:()=>encodeMidi(result.tracks),
  render909CoreMidi:()=>encodeAbleton909CoreClip(result.tracks),
  livePayload:()=>AbletonMcpAdapter.buildLivePayload(cfg,result),
  adapter:AbletonMcpAdapter,
});
