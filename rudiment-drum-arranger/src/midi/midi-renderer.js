function u32(n){return[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]}function u16(n){return[(n>>>8)&255,n&255]}function vlq(n){let buffer=n&0x7f,out=[];while((n>>=7)){buffer<<=8;buffer|=(n&0x7f)|0x80}while(true){out.push(buffer&255);if(buffer&0x80)buffer>>=8;else break}return out}function bytes(s){return[...new TextEncoder().encode(s)]}function chunk(type,data){return[...bytes(type),...u32(data.length),...data]}function metaText(type,val){const b=bytes(val);return[0,255,type,...vlq(b.length),...b]}function tempoTrack(bpm){const m=Math.round(60000000/bpm);return chunk("MTrk",[...metaText(3,"Tempo"),0,255,81,3,(m>>16)&255,(m>>8)&255,m&255,0,255,88,4,4,2,24,8,0,255,47,0])}function noteTrack(t,channel=9){const events=[],on=0x90|(channel&15),off=0x80|(channel&15);t.notes.forEach(n=>{const ti=Math.max(0,Math.round(n.tick)),du=Math.max(1,Math.round(n.duration));events.push({tick:ti,order:1,b:[on,n.note&127,clamp(Math.round(n.velocity),1,127)]},{tick:ti+du,order:0,b:[off,n.note&127,0]})});events.sort((a,b)=>a.tick-b.tick||a.order-b.order);const d=[...metaText(3,t.name)];let last=0;events.forEach(e=>{d.push(...vlq(e.tick-last),...e.b);last=e.tick});d.push(0,255,47,0);return chunk("MTrk",d)}function encodeMidi(tracks){const h=chunk("MThd",[...u16(1),...u16(tracks.length+1),...u16(PPQ)]);return new Uint8Array([...h,...tempoTrack(cfg.bpm),...tracks.flatMap(track=>noteTrack(track,9))])}function encodeSingle(t,channel=9){const h=chunk("MThd",[...u16(1),...u16(2),...u16(PPQ)]);return new Uint8Array([...h,...tempoTrack(cfg.bpm),...noteTrack(t,channel)])}function dl(name,data,type="audio/midi"){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}

function midiStemFilename(track,index){return `${String(index+1).padStart(2,"0")}-${slug(track.name)}.mid`}
const GM_DRUM_MAP={kick:36,rim:37,snare:38,clap:39,tomLow:45,closedHat:42,tomMid:47,shaker:82,tomHigh:50,openHat:46,percLow:64,percMid:63,percHigh:62,crash:49,ride:51};
const DAW_EXPORT_PROFILES={
  "ableton-909":{
    label:"Ableton Live",device:"909 Core Kit",slug:"ableton-909-core",channel:9,
    map:{kick:36,rim:37,snare:38,clap:39,closedHat:42,shaker:42,tomLow:44,percLow:44,tomMid:45,percMid:45,openHat:46,tomHigh:47,percHigh:47,crash:49,ride:51}
  },
  "bitwig-gm":{label:"Bitwig Studio",device:"Drum Machine · GM layout",slug:"bitwig-drum-machine-gm",channel:9,map:GM_DRUM_MAP},
  "logic-dkd":{label:"Logic Pro",device:"Drum Kit Designer · Default Preset · GM",slug:"logic-drum-kit-designer-default",channel:0,map:GM_DRUM_MAP}
};
function dawExportProfile(id){return DAW_EXPORT_PROFILES[id]||DAW_EXPORT_PROFILES["ableton-909"]}
function mappedSemanticTrack(events,profileId,name){
  const profile=dawExportProfile(profileId);
  const notes=events.map(event=>profile.map[event.role]==null?null:{tick:event.tick,duration:event.duration,note:profile.map[event.role],velocity:event.velocity}).filter(Boolean).sort((a,b)=>a.tick-b.tick||a.note-b.note);
  return {name,notes};
}
function encodeDawArrangement(generated,profileId){const profile=dawExportProfile(profileId);return encodeSingle(mappedSemanticTrack(generated.semanticEvents,profileId,"RUDIMENT — FULL ARRANGEMENT"),profile.channel)}
function encodeDawFillMaster(generated,profileId){const profile=dawExportProfile(profileId);return encodeSingle(mappedSemanticTrack(generated.fillMasterEvents,profileId,"RUDIMENT — MASTER FILL · 4 BARS"),profile.channel)}
function semanticEventsForKit(generated,kitKey){const roles=KIT_DEFS[kitKey]?.roles||[];return generated.semanticEvents.filter(event=>roles.includes(event.role))}
function dawInstrumentTrack(generated,profileId,kitKey){return mappedSemanticTrack(semanticEventsForKit(generated,kitKey),profileId,`RUDIMENT — ${KIT_DEFS[kitKey]?.label||kitKey}`)}
function encodeDawInstrument(generated,profileId,kitKey){const profile=dawExportProfile(profileId);return encodeSingle(dawInstrumentTrack(generated,profileId,kitKey),profile.channel)}
function encodeDawMultitrack(generated,profileId){
  const profile=dawExportProfile(profileId),tracks=activeKitKeys().map(key=>dawInstrumentTrack(generated,profileId,key)).filter(track=>track.notes.length);
  const header=chunk("MThd",[...u16(1),...u16(tracks.length+1),...u16(PPQ)]);
  return new Uint8Array([...header,...tempoTrack(cfg.bpm),...tracks.flatMap(track=>noteTrack(track,profile.channel))]);
}
function ableton909CoreTrack(tracks){
  const sourceMap=profiles[cfg.device],events=tracks.flatMap(track=>track.notes.map(note=>({ ...note,role:Object.keys(sourceMap).find(role=>sourceMap[role]===note.note)}))).filter(event=>event.role);
  return mappedSemanticTrack(events,"ableton-909","RUDIMENT — 909 CORE KIT");
}
function encodeAbleton909CoreClip(tracks){return encodeSingle(ableton909CoreTrack(tracks))}
let activeStemUrls=[];
function releaseMidiStemUrls(){activeStemUrls.forEach(url=>URL.revokeObjectURL(url));activeStemUrls=[]}
function attachMidiStemDrag(link,track,index){
  const name=midiStemFilename(track,index),blob=new Blob([encodeSingle(track)],{type:"audio/midi"}),url=URL.createObjectURL(blob);
  activeStemUrls.push(url);link.href=url;link.download=name;link.draggable=true;
  link.addEventListener("dragstart",event=>{
    const file=new File([blob],name,{type:"audio/midi"});
    link.classList.add("dragging");
    event.dataTransfer.effectAllowed="copy";
    try{event.dataTransfer.items.add(file)}catch(e){}
    event.dataTransfer.setData("DownloadURL",`audio/midi:${name}:${url}`);
    event.dataTransfer.setData("text/uri-list",url);
    event.dataTransfer.setData("text/plain",name);
  });
  link.addEventListener("dragend",()=>link.classList.remove("dragging"));
}
