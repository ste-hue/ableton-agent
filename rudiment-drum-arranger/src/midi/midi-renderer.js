function u32(n){return[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]}function u16(n){return[(n>>>8)&255,n&255]}function vlq(n){let buffer=n&0x7f,out=[];while((n>>=7)){buffer<<=8;buffer|=(n&0x7f)|0x80}while(true){out.push(buffer&255);if(buffer&0x80)buffer>>=8;else break}return out}function bytes(s){return[...new TextEncoder().encode(s)]}function chunk(type,data){return[...bytes(type),...u32(data.length),...data]}function metaText(type,val){const b=bytes(val);return[0,255,type,...vlq(b.length),...b]}function tempoTrack(bpm){const m=Math.round(60000000/bpm);return chunk("MTrk",[...metaText(3,"Tempo"),0,255,81,3,(m>>16)&255,(m>>8)&255,m&255,0,255,88,4,4,2,24,8,0,255,47,0])}function noteTrack(t){const events=[];t.notes.forEach(n=>{const ti=Math.max(0,Math.round(n.tick)),du=Math.max(1,Math.round(n.duration));events.push({tick:ti,order:1,b:[153,n.note&127,clamp(Math.round(n.velocity),1,127)]},{tick:ti+du,order:0,b:[137,n.note&127,0]})});events.sort((a,b)=>a.tick-b.tick||a.order-b.order);const d=[...metaText(3,t.name)];let last=0;events.forEach(e=>{d.push(...vlq(e.tick-last),...e.b);last=e.tick});d.push(0,255,47,0);return chunk("MTrk",d)}function encodeMidi(tracks){const h=chunk("MThd",[...u16(1),...u16(tracks.length+1),...u16(PPQ)]);return new Uint8Array([...h,...tempoTrack(cfg.bpm),...tracks.flatMap(noteTrack)])}function encodeSingle(t){const h=chunk("MThd",[...u16(1),...u16(2),...u16(PPQ)]);return new Uint8Array([...h,...tempoTrack(cfg.bpm),...noteTrack(t)])}function dl(name,data,type="audio/midi"){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}

function midiStemFilename(track,index){return `${String(index+1).padStart(2,"0")}-${slug(track.name)}.mid`}
// Ableton Core Library “909 Core Kit” pad layout, verified against the kit's
// note lanes. The kit has no dedicated percussion or shaker pads, so those
// roles intentionally reuse its three tom pads and closed hat respectively.
const ABLETON_909_CORE_MAP={kick:36,rim:37,snare:38,clap:39,closedHat:42,shaker:42,tomLow:44,percLow:44,tomMid:45,percMid:45,openHat:46,tomHigh:47,percHigh:47,crash:49,ride:51};
function semanticRoleForMappedNote(note){const map=profiles[cfg.device];return Object.keys(map).find(role=>map[role]===note)||null}
function ableton909CoreTrack(tracks){
  const notes=tracks.flatMap(track=>track.notes.map(note=>{
    const role=semanticRoleForMappedNote(note.note),mapped=ABLETON_909_CORE_MAP[role];
    return mapped==null?null:{...note,note:mapped};
  }).filter(Boolean)).sort((a,b)=>a.tick-b.tick||a.note-b.note);
  return {name:"RUDIMENT — 909 CORE KIT",notes};
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
