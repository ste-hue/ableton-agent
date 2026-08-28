#!/usr/bin/env python3
"""Cockpit v0d: log LOM cliccabile -> pannello con spiegazione locale
+ doc ufficiale Cycling74 in iframe. Reload UI-only + ripush stato."""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, "/Users/stefanodellapietra/dev/Projects/ableton-agent/.venv/lib/python3.12/site-packages")
from agent_m4l import write_webui  # noqa: E402

HOME = Path.home()
CMD = HOME / ".ableton-live-mcp" / "agent_m4l_liveworks.json"
STATUS = HOME / ".ableton-live-mcp" / "agent_m4l_liveworks_status.json"
TRACE = HOME / ".ableton-live-mcp" / "liveworks_trace.jsonl"

HTML = '''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#14161a;color:#cfd6e4;font:10px "SF Mono",Menlo,monospace;height:100%;overflow:hidden}
#wrap{display:flex;flex-direction:column;height:100%}
.row{display:flex;align-items:center;gap:8px;padding:3px 7px;white-space:nowrap}
#hdr1{background:#1c2027}
#hdr2{background:#1c2027;border-bottom:1px solid #2a2f38;padding-top:0}
#logo{color:#7ee0a3;font-weight:bold;letter-spacing:2px}
.dot{width:7px;height:7px;border-radius:50%;display:inline-block;background:#5a6270}
.dot.busy{background:#e0a95a}.dot.idle{background:#7ee0a3}
#op{flex:1;overflow:hidden;text-overflow:ellipsis;color:#9fb6d8}
#sig{color:#6d7686}#res{color:#7ee0a3;margin-left:auto}
#copybtn{cursor:pointer;color:#9fb6d8;border:1px solid #2a2f38;border-radius:3px;padding:1px 6px}
#copybtn:hover{background:#2a2f38}#copybtn.ok{color:#7ee0a3;border-color:#7ee0a3}
#log{flex:1;overflow-y:auto;padding:2px 7px}
.tr{padding:1px 0;border-bottom:1px dotted #23272f;color:#8fa0b8}
.tr.ck{color:#7ee0a3;cursor:pointer}
.tr.ck:hover{background:#1c2430;color:#aef0c8}
#doc{position:absolute;inset:0;background:#14161a;display:none;flex-direction:column;z-index:9}
#doc.open{display:flex}
#dochdr{display:flex;align-items:center;gap:8px;padding:4px 8px;background:#1c2027;border-bottom:1px solid #2a2f38}
#doctitle{color:#7ee0a3;font-weight:bold}
#docx{margin-left:auto;cursor:pointer;color:#e0a95a;padding:2px 8px;border:1px solid #2a2f38;border-radius:3px}
#docx:hover{background:#2a2f38}
#docbody{padding:6px 8px;color:#9fb6d8;line-height:1.5;border-bottom:1px solid #2a2f38}
#docprops{color:#6d7686}
#dockey{color:#7ee0a3}
#docbody{font-size:11px}
#docopen{margin:8px;padding:8px;text-align:center;font-size:12px;color:#7ee0a3;border:1px solid #7ee0a3;border-radius:4px;cursor:pointer}
#docopen:hover{background:#1c2f24}#docopen.sent{color:#e0a95a;border-color:#e0a95a}
</style></head><body><div id="wrap">
<div class="row" id="hdr1"><span id="logo">LIVEWORKS</span><span id="dot" class="dot idle"></span><span id="st">boot</span><span id="res">&#8212;</span><span id="copybtn" title="copia tutto il log">&#9112; copia</span></div>
<div class="row" id="hdr2"><span id="op">cockpit v0f</span><span id="sig">&#8212;</span></div>
<div id="log"></div>
</div>
<div id="doc"><div id="dochdr"><span id="doctitle">LOM</span><span id="docx">chiudi &#10005;</span></div><div id="docbody"></div><div id="docopen">apri la doc nel browser &#8599;</div></div>
<script>
(function(){
var seq=null;
var LOM={
 Song:{url:"https://docs.cycling74.com/apiref/lom/song/",
  txt:"<span id=dockey>Song</span> &egrave; il Set intero: tempo (BPM), metrica, transport, undo/redo. Path LOM: <b>live_set</b>.",
  props:"usati qui: tempo, signature_numerator/denominator, create_midi_track, create_scene"},
 Track:{url:"https://docs.cycling74.com/apiref/lom/track/",
  txt:"<span id=dockey>Track</span> &egrave; una traccia: nome, colore, volume, mute/solo/arm, catena device, clip slots. Path: <b>live_set tracks N</b>.",
  props:"usati qui: name, color_index, mixer_device.volume, delete_device"},
 Device:{url:"https://docs.cycling74.com/apiref/lom/device/",
  txt:"<span id=dockey>Device</span> &egrave; uno strumento o effetto sulla traccia: Electric, Operator, questo stesso device M4L. Path: <b>tracks N devices M</b>.",
  props:"usati qui: name, class_name, parameters (DeviceParameter: value/min/max)"},
 Clip:{url:"https://docs.cycling74.com/apiref/lom/clip/",
  txt:"<span id=dockey>Clip</span> &egrave; una clip MIDI o audio: note (pitch/start/durata/velocity), loop, quantizzazione di lancio. Path: <b>tracks N clip_slots S clip</b>.",
  props:"usati qui: name, add_new_notes, get_notes_extended, fire, stop, is_playing"},
 Scene:{url:"https://docs.cycling74.com/apiref/lom/scene/",
  txt:"<span id=dockey>Scene</span> &egrave; una riga della Session view: lancia insieme tutte le clip della riga; pu&ograve; avere tempo proprio. Path: <b>live_set scenes N</b>.",
  props:"usati qui: name, fire, create_scene"}
};
function classify(step){
 if(step.indexOf(".clips[")>=0)return "Clip";
 if(step.indexOf(".devices[")>=0)return "Device";
 if(step.indexOf("scenes")>=0)return "Scene";
 if(step.indexOf("tracks")>=0||step.indexOf("cleanup")>=0)return "Track";
 if(step.indexOf("song")>=0)return "Song";
 return null;
}
function el(i){return document.getElementById(i);}
function openDoc(step){
 var k=classify(step);
 if(!k)return;
 var d=LOM[k];
 el('doctitle').textContent=k+"  \\u2014  "+step;
 el('docbody').innerHTML=d.txt+"<br><span id=docprops>"+d.props+"</span>";
 el('doc').className="open";
 el('docopen').onclick=function(){
  var marker='LIVEWORKS_OPEN:'+Date.now()+':'+d.url;
  function done(ok){var b=el('docopen');b.textContent=ok?'richiesta inviata... si apre tra un attimo':'errore appunti';b.className=ok?'sent':'';setTimeout(function(){b.textContent='apri la doc nel browser \u2197';b.className='';},3000);}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(marker).then(function(){done(true);},function(){done(false);});}else{try{var t=document.createElement('textarea');t.value=marker;document.body.appendChild(t);t.select();var ok=document.execCommand('copy');document.body.removeChild(t);done(ok);}catch(e){done(false);}}
 };
}
el('docx')?null:null;
function copyLog(){
 var lines=[].map.call(document.querySelectorAll('#log .tr'),function(d){return d.textContent;}).join('\n');
 function done(ok){var b=el('copybtn');b.textContent=ok?'\u2713 copiato':'\u2717 errore';b.className=ok?'ok':'';setTimeout(function(){b.textContent='\u2398 copia';b.className='';},2000);}
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(lines).then(function(){done(true);},function(){fallback();});}else{fallback();}
 function fallback(){try{var t=document.createElement('textarea');t.value=lines;document.body.appendChild(t);t.select();var ok=document.execCommand('copy');document.body.removeChild(t);done(ok);}catch(e){done(false);}}
}
document.getElementById('copybtn').addEventListener('click',copyLog);
document.getElementById('docx').addEventListener('click',function(){el('doc').className="";});
function add(t,ck){var d=document.createElement('div');d.className='tr'+(ck?' ck':'');d.textContent=t;
 if(ck){d.title="clicca per la doc LOM";d.addEventListener('click',function(){var m=t.match(/recipe\\.[A-Za-z0-9_.\\[\\]-]+/);openDoc(m?m[0]:t);});}
 var l=el('log');l.appendChild(d);while(l.children.length>80)l.removeChild(l.firstChild);l.scrollTop=l.scrollHeight;}
function onState(s){try{
if(!s)return;
if(s.agent_status!==undefined){el('st').textContent=String(s.agent_status);el('dot').className='dot '+(String(s.agent_status)==='working'?'busy':'idle');}
if(s.current_op!==undefined)el('op').textContent=String(s.current_op);
if(s.set_signature!==undefined)el('sig').textContent=String(s.set_signature);
if(s.last_result!==undefined)el('res').textContent=String(s.last_result);
if(s.trace_bulk!==undefined&&s.trace_bulk!==onState._bulk){onState._bulk=s.trace_bulk;el('log').innerHTML='';try{JSON.parse(String(s.trace_bulk)).forEach(function(e){add(typeof e==='string'?e:JSON.stringify(e),true);});}catch(err){add(String(s.trace_bulk),true);}}
if(s.trace_seq!==undefined&&s.trace_seq!==seq&&s.trace_append!==undefined){seq=s.trace_seq;add(String(s.trace_append),true);}
}catch(err){}}
window.agentM4L=window.agentM4L||{};
window.agentM4L.onstate=onState;
document.addEventListener('agentm4lstate',function(ev){onState(ev.detail||{});});
add('Liveworks cockpit v0f - clicca una riga verde per la doc LOM',false);
})();
</script></body></html>'''


def read_status():
    try:
        return json.loads(STATUS.read_text())
    except Exception:
        return {}


def send(pid, payload, check, timeout=25):
    payload = dict(payload, id=pid, instance_id="liveworks")
    CMD.write_text(json.dumps(payload))
    t = time.time() + timeout
    while time.time() < t:
        st = read_status()
        if st.get("command_id") == pid and check(st):
            return st
        time.sleep(0.4)
    sys.exit(f"timeout {pid}: {json.dumps(read_status())[:250]}")


write_webui("liveworks", {
    "id": "ui", "object": "jweb",
    "presentation_rect": [0, 0, 416, 166],
    "html": HTML,
})
prev_ready = read_status().get("state", {}).get("web_ready")
send("lw-cmd-19", {"command": "web_reload"}, lambda st: True)
for _ in range(30):
    time.sleep(1)
    s = read_status().get("state", {})
    if s.get("web_ready") not in (None, prev_ready):
        print("pagina v0d caricata, web_ready:", s.get("web_ready"))
        break
else:
    print("web_ready invariato (reload non confermato dal canale di ritorno; verifico coi pixel)")

time.sleep(1)
send("lw-cmd-20", {"command": "set", "values": [
    {"id": "agent_status", "value": "idle"},
    {"id": "current_op", "value": "clicca una riga verde per aprire la doc LOM"},
    {"id": "set_signature", "value": "175ee65fa0287868"},
    {"id": "last_result", "value": "ok"},
    {"id": "trace_bulk", "value": "[]"},
]}, lambda st: st.get("state", {}).get("trace_bulk") == "[]")
time.sleep(1.5)
entries = []
for line in TRACE.read_text().splitlines():
    if line.strip():
        e = json.loads(line)
        entries.append(f"{e['ts'].split('T')[1].rstrip('Z')}  {e['step']}  [checkpoint]")
for i, entry in enumerate(entries, start=1):
    send(f"lw-cmd-20-{i}", {"command": "set", "values": [
        {"id": "trace_append", "value": entry},
        {"id": "trace_seq", "value": i}]},
        lambda st, i=i: st.get("state", {}).get("trace_seq") == i)
    time.sleep(1.5)
s = read_status().get("state", {})
print(json.dumps({k: s.get(k) for k in ("web_ready", "trace_seq", "web_state_pushes")}))
