const PPQ=480;
const styles=["Tech House","Minimal / Deep Tech","House","Disco House","Techno","Hypnotic Techno","Hardgroove","Melodic Techno","Electro","Breakbeat"];
const profiles={
"Ableton Drum Rack — GM / Core":{kick:36,snare:38,clap:39,rim:37,closedHat:42,openHat:46,ride:51,crash:49,tomLow:45,tomMid:47,tomHigh:50,percLow:64,percMid:63,percHigh:62,shaker:70},
"808 Core Kit":{kick:36,snare:38,clap:39,rim:37,closedHat:42,openHat:46,ride:51,crash:49,tomLow:41,tomMid:45,tomHigh:48,percLow:64,percMid:63,percHigh:62,shaker:70},
"909 Core Kit":{kick:36,snare:38,clap:39,rim:37,closedHat:42,openHat:46,ride:51,crash:49,tomLow:41,tomMid:45,tomHigh:48,percLow:64,percMid:63,percHigh:62,shaker:70},
"707 / Classic Drum Rack":{kick:36,snare:38,clap:39,rim:37,closedHat:42,openHat:46,ride:51,crash:49,tomLow:41,tomMid:45,tomHigh:48,percLow:64,percMid:63,percHigh:62,shaker:70}
};

const archetypeBank={
  DISCO:{
    kick:{anchor:[0,4,8,12],sync:[15],stability:.92},
    back:{anchor:[4,12],ghost:[11,15],stability:.9},
    hats:{pulse:"offbeat-or-8ths",density:.88,openBias:.74},
    perc:{sync:.34,contour:"light",rotation:.22},
    accents:{strong:[0,8,12],weak:[6,14]},breakBias:"tom-rise",swingBias:.08
  },
  FUNK:{
    kick:{anchor:[0,6,10],sync:[3,7,14,15],stability:.58},
    back:{anchor:[4,12],ghost:[3,7,10,15],stability:.72},
    hats:{pulse:"16th-gaps",density:.76,openBias:.38},
    perc:{sync:.82,contour:"interlock",rotation:.72},
    accents:{strong:[0,6,10,12],weak:[3,7,15]},breakBias:"cell-mutation",swingBias:.22
  },
  SAMBA:{
    kick:{anchor:[0,8],sync:[6,10,14],stability:.7},
    back:{anchor:[4,12],ghost:[7,15],stability:.6},
    hats:{pulse:"sync-16ths",density:.82,openBias:.26},
    perc:{sync:.94,contour:"interlock",rotation:.86},
    accents:{strong:[0,6,8,14],weak:[3,10]},breakBias:"perc-cascade",swingBias:.16
  },
  "R&B":{
    kick:{anchor:[0,8],sync:[3,6,10,14],stability:.64},
    back:{anchor:[4,12],ghost:[11,15],stability:.78},
    hats:{pulse:"8ths-with-gaps",density:.66,openBias:.3},
    perc:{sync:.62,contour:"answer",rotation:.58},
    accents:{strong:[0,4,12],weak:[7,10,15]},breakBias:"snare-answer",swingBias:.18
  },
  ROCK:{
    kick:{anchor:[0,8],sync:[6,14],stability:.78},
    back:{anchor:[4,12],ghost:[15],stability:.94},
    hats:{pulse:"8ths",density:.8,openBias:.2},
    perc:{sync:.28,contour:"tom",rotation:.3},
    accents:{strong:[0,4,8,12],weak:[14]},breakBias:"tom-descent",swingBias:.05
  },
  POP:{
    kick:{anchor:[0,8],sync:[6,14],stability:.84},
    back:{anchor:[4,12],ghost:[15],stability:.9},
    hats:{pulse:"8ths",density:.7,openBias:.28},
    perc:{sync:.3,contour:"sparse",rotation:.24},
    accents:{strong:[0,8,12],weak:[6,14]},breakBias:"clean-turnaround",swingBias:.04
  },
  SHUFFLE:{
    kick:{anchor:[0,8],sync:[6,14],stability:.72},
    back:{anchor:[4,12],ghost:[10],stability:.86},
    hats:{pulse:"triplet-implied",density:.68,openBias:.3},
    perc:{sync:.5,contour:"triplet",rotation:.5},
    accents:{strong:[0,8,12],weak:[6,10]},breakBias:"triplet-turn",swingBias:.72
  },
  SWING:{
    kick:{anchor:[0,8],sync:[14],stability:.62},
    back:{anchor:[4,12],ghost:[10,15],stability:.7},
    hats:{pulse:"triplet-implied",density:.62,openBias:.18},
    perc:{sync:.48,contour:"answer",rotation:.54},
    accents:{strong:[0,8],weak:[6,10,14]},breakBias:"triplet-answer",swingBias:.88
  }
};
function heritageNames(p){return p.heritage.split('/').map(x=>x.trim()).filter(Boolean)}
function choose(arr,rnd){return arr[Math.floor(rnd()*arr.length)]}
function unionWeighted(a,b,rnd,bias=.5){const out=[];for(const x of a)if(rnd()<bias)out.push(x);for(const x of b)if(rnd()>=bias)out.push(x);return uniq(out)}
function hatTemplate(kind,rnd){
  if(kind==="offbeat-or-8ths")return rnd()<.55?[2,6,10,14]:[0,2,4,6,8,10,12,14];
  if(kind==="16th-gaps")return [0,2,3,6,8,10,11,14].filter(()=>rnd()>.12);
  if(kind==="sync-16ths")return [0,2,3,6,8,10,11,14,15].filter(()=>rnd()>.08);
  if(kind==="triplet-implied")return [0,3,6,8,11,14];
  if(kind==="8ths-with-gaps")return [0,2,4,6,8,10,12,14].filter(()=>rnd()>.18);
  return [0,2,4,6,8,10,12,14];
}
function percTemplate(trait,rnd){
  const pools={interlock:[[3,7,10,13],[2,5,9,14],[3,6,11,15]],answer:[[3,7,11,15],[2,6,10,14]],tom:[[6,10,14],[7,11,15]],sparse:[[7,14],[6,13]],triplet:[[3,6,11,14],[2,6,10,14]],light:[[3,10,14],[6,13]]};
  return [...choose(pools[trait]||pools.answer,rnd)]
}
function buildArchetypeLineage(p,rnd){
  const names=heritageNames(p), primary=archetypeBank[names[0]]||archetypeBank.FUNK, secondary=archetypeBank[names[1]]||primary;
  const bias=names.length>1?(.38+rnd()*.24):1;
  return {names,primary,secondary,bias,label:names.length>1?`${names[0]} ${Math.round(bias*100)}% + ${names[1]} ${100-Math.round(bias*100)}%`:names[0]};
}
const sp={
"Tech House":{hat:.78,perc:.65,open:.48,sync:.52,ride:.18,heritage:"DISCO/FUNK",grid:16,flam:.05,ghost:.18},
"Minimal / Deep Tech":{hat:.66,perc:.78,open:.34,sync:.72,ride:.08,heritage:"FUNK",grid:16,flam:.08,ghost:.28},
"House":{hat:.82,perc:.5,open:.55,sync:.4,ride:.16,heritage:"DISCO",grid:16,flam:.04,ghost:.12},
"Disco House":{hat:.9,perc:.55,open:.64,sync:.36,ride:.28,heritage:"DISCO",grid:16,flam:.03,ghost:.1},
"Techno":{hat:.84,perc:.55,open:.42,sync:.46,ride:.38,heritage:"ROCK/DISCO",grid:16,flam:.04,ghost:.1},
"Hypnotic Techno":{hat:.82,perc:.82,open:.36,sync:.72,ride:.3,heritage:"FUNK/SAMBA",grid:16,flam:.07,ghost:.24},
"Hardgroove":{hat:.88,perc:.94,open:.48,sync:.84,ride:.4,heritage:"FUNK/SAMBA",grid:16,flam:.1,ghost:.32},
"Melodic Techno":{hat:.72,perc:.42,open:.36,sync:.38,ride:.2,heritage:"POP/DISCO",grid:16,flam:.03,ghost:.08},
"Electro":{hat:.72,perc:.62,open:.42,sync:.82,ride:.08,breakbeat:true,heritage:"FUNK/R&B",grid:16,flam:.09,ghost:.28},
"Breakbeat":{hat:.76,perc:.7,open:.44,sync:.9,ride:.08,breakbeat:true,heritage:"FUNK/ROCK",grid:16,flam:.11,ghost:.34}
};
let cfg={bpm:128,style:"Tech House",device:Object.keys(profiles)[0],build:"Mid",doubleKick:true,swing:3,groove:true,length:"Standard",variation:32,fill:38,seed:20260901,pausona:true,pausonaLength:8,pausonaShape:"Straight",pausonaIntensity:"Mid",kit:{kick:true,snare:true,hats:true,shaker:true,perc:true,toms:true,cymbals:true}};
let result=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)); const beat=(bar,q)=>((bar*4)+q)*PPQ;
function vel(base,rnd,spread=8){return clamp(Math.round(base+(rnd()-.5)*spread),1,127)}
const KIT_DEFS={
  kick:{label:"KICK",roles:["kick"]},
  snare:{label:"SNARE / CLAP",roles:["snare","clap"]},
  hats:{label:"HATS",roles:["closedHat","openHat"]},
  shaker:{label:"SHAKER",roles:["shaker"]},
  perc:{label:"PERCUSSION",roles:["percLow","percMid","percHigh"]},
  toms:{label:"TOMS / RIMS",roles:["tomLow","tomMid","tomHigh","rim"]},
  cymbals:{label:"CYMBALS",roles:["ride","crash"]}
};
function activeKitKeys(){return Object.keys(KIT_DEFS).filter(k=>cfg.kit[k])}
function kitCount(){return activeKitKeys().length}
function categoryForRole(role){for(const [k,d] of Object.entries(KIT_DEFS))if(d.roles.includes(role))return k;return null}
function compatibleRole(role){
  const cat=categoryForRole(role); if(cat&&cfg.kit[cat])return role;
  // Foundation material is omitted rather than fabricated when its family is disabled.
  if(role==="kick")return null;
  // Backbeat can become a rim/tom articulation only if SNARE/CLAP is disabled and TOMS/RIMS is active.
  if(["snare","clap"].includes(role))return cfg.kit.toms?"rim":null;
  // Rims prefer snare, then percussion; toms prefer percussion, then snare. This keeps fill direction intelligible.
  if(role==="rim")return cfg.kit.snare?"snare":cfg.kit.perc?"percHigh":null;
  if(["tomLow","tomMid","tomHigh"].includes(role)){
    if(cfg.kit.perc)return role==="tomLow"?"percLow":role==="tomHigh"?"percHigh":"percMid";
    if(cfg.kit.snare)return role==="tomHigh"?"rim":"snare";
    return null;
  }
  if(["percLow","percMid","percHigh"].includes(role))return cfg.kit.toms?(role==="percLow"?"tomLow":role==="percHigh"?"tomHigh":"tomMid"):cfg.kit.snare?"rim":null;
  if(["closedHat","openHat","shaker"].includes(role))return null;
  if(["ride","crash"].includes(role))return null;
  return null;
}
function applyKitPolicy(events){return events.map(e=>{const role=compatibleRole(e.role);return role?{...e,role}:null}).filter(Boolean)}
function sectionTemplate(length){
  // Narrative-first forms. Every section is derived from the same core groove by addition/subtraction.
  const raw=length==="Short"?
    [["INTRO",8,28,"intro"],["SOFT LOOP",8,48,"soft"],["MAIN LOOP",8,64,"main"],["BREAKDOWN",8,24,"breakdown"],["BUILD",4,82,"build"],["DROP",12,96,"drop"],["BUILD 2",4,88,"build"],["DROP 2",8,100,"drop"],["OUTRO",4,30,"outro"]]:
    length==="Standard"?
    [["INTRO",8,28,"intro"],["SOFT LOOP",8,48,"soft"],["MAIN LOOP",16,66,"main"],["BREAKDOWN",8,24,"breakdown"],["BUILD",8,84,"build"],["DROP A",16,96,"drop"],["BREAKDOWN 2",8,28,"breakdown"],["BUILD 2",8,92,"build"],["DROP B",8,100,"drop"],["OUTRO",8,32,"outro"]]:
    [["INTRO",16,26,"intro"],["SOFT LOOP",16,46,"soft"],["MAIN LOOP",16,66,"main"],["BREAKDOWN",16,22,"breakdown"],["BUILD",8,84,"build"],["DROP A",24,95,"drop"],["BREAKDOWN 2",8,26,"breakdown"],["BUILD 2",8,92,"build"],["DROP B",16,100,"drop"],["OUTRO",8,30,"outro"]];
  let pos=0;return raw.map((x,i)=>{const sec={name:x[0],start:pos,bars:x[1],energy:x[2],kind:x[3],index:i};pos+=x[1];return sec})
}
function sectionLayers(kind,phase){
  // Same song DNA, revealed by addition/subtraction. No section invents a new groove.
  if(kind==="intro") return {kick:true,back:phase>.38,hat:true,open:false,perc:phase>.62,cym:false};
  if(kind==="soft") return {kick:true,back:true,hat:true,open:false,perc:false,cym:false};
  if(kind==="main") return {kick:true,back:true,hat:true,open:true,perc:true,cym:false};
  if(kind==="drop") return {kick:true,back:true,hat:true,open:true,perc:true,cym:true};
  if(kind==="breakdown") return {kick:phase>.68,back:phase>.78,hat:true,open:phase>.55,perc:phase<.72,cym:false};
  if(kind==="build") return {kick:phase<.72,back:true,hat:true,open:phase>.32,perc:phase>.18,cym:phase>.62};
  if(kind==="outro") return {kick:phase<.72,back:phase<.5,hat:true,open:false,perc:phase<.28,cym:false};
  return {kick:true,back:true,hat:true,open:true,perc:true,cym:false};
}
function boundaryRank(barNumber){return barNumber%64===0?3:barNumber%32===0?2:barNumber%16===0?1:0}
