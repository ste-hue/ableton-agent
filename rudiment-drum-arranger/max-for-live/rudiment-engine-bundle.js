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

// STICK CONTROL GRAMMAR — abstract technique layer only.
// These operators never define song structure or the core groove. They may only transform
// already-existing cells at structurally justified moments.
const theoryBudgetBySection={intro:.03,soft:.05,main:.10,breakdown:.05,build:.24,drop:.12,outro:.04};
function theoryBudget(kind,energy=50){
  const base=theoryBudgetBySection[kind]??.08;
  const user=clamp(cfg.variation/100,0,1);
  return clamp(base*(.55+user*.65)*(kind==='build'?(1+energy/300):1),0,.35);
}
function stickCellFromFill(cell){
  const steps=(cell.steps||[0,2,3]).slice(0,4);
  const roles=(cell.roles||['snare','rim','tomMid']).slice();
  return {steps,roles};
}
function stickingPattern(type,len=4){
  if(type==='single')return Array.from({length:len},(_,i)=>i%2);
  if(type==='double')return Array.from({length:len},(_,i)=>Math.floor(i/2)%2);
  if(type==='triple')return Array.from({length:len},(_,i)=>Math.floor(i/3)%2);
  if(type==='quad')return Array.from({length:len},(_,i)=>Math.floor(i/4)%2);
  return Array.from({length:len},(_,i)=>i%2);
}
function invertSticking(seq){return seq.map(x=>x?0:1)}
function accentPermutation(len,rnd){
  const candidates=[[0],[0,2],[1,3],[0,3],[0,1,3]];
  return choose(candidates.filter(x=>Math.max(...x)<len),rnd)||[0];
}
function orchestrateSticking(seq,baseRoles,rnd,invert=false){
  const roles=baseRoles.length?baseRoles:['snare','rim'];
  const a=roles[0], b=roles[1]||roles[0], extra=roles[2]||b;
  const lr=invert?invertSticking(seq):seq;
  return lr.map((hand,i)=> hand===0?a:(i%4===3&&rnd()<.28?extra:b));
}
function applyFlamAtTick(ev,tick,role,velocity,group='fill'){
  const gap=Math.max(10,Math.round(PPQ/28));
  pushFill(ev,tick-gap,PPQ/28,role,clamp(velocity-30,1,127),32);
  pushFill(ev,tick,PPQ/14,role,velocity,32);
}
function renderStickControlTransform(ev,{startTick,durationTicks,sourceCell,kind,energy=70,rnd,intensity=.15,mode='fill'}){
  if(intensity<=0)return;
  const cell=stickCellFromFill(sourceCell), allowed=Math.max(0,Math.min(.35,intensity));
  // Pick ONE technical idea at a time. Complexity is intentionally budgeted.
  const ops=['single','double','accent','invert'];
  if(allowed>.16)ops.push('triple');
  if(allowed>.22)ops.push('flam');
  if(allowed>.27)ops.push('quad');
  const op=choose(ops,rnd);
  const div=(op==='triple'?12:(op==='quad'&&durationTicks>=PPQ?16:8));
  const stepTicks=PPQ*4/div;
  const slots=Math.max(2,Math.floor(durationTicks/stepTicks));
  const count=Math.min(slots,op==='quad'?8:op==='triple'?6:4);
  const seq=stickingPattern(op==='accent'||op==='invert'||op==='flam'?'single':op,count);
  const roles=orchestrateSticking(seq,cell.roles,rnd,op==='invert');
  const accents=new Set(accentPermutation(count,rnd));
  for(let i=0;i<count;i++) {
    const tick=startTick+i*stepTicks;
    const velocity=clamp(70+Math.round(energy*.22)+i*2+(accents.has(i)?12:0),1,116);
    if(op==='flam'&&i===count-1)applyFlamAtTick(ev,tick,roles[i],velocity,mode);
    else pushFill(ev,tick,stepTicks*.46,roles[i],velocity,div);
  }
}

function narrativeFillBars(rank){
  if(rank<=0)return 0;
  const map=cfg.build==="Huge"?[0,2,4,8]:cfg.build==="Mid"?[0,1,2,4]:[0,.5,1,2];
  return map[rank]||0;
}
function makeFillGenome(tomContour,rnd){
  // ONE FILL STYLE PER SONG.
  // A canonical four-measure fill phrase is composed once, then every 16/32/64 boundary
  // derives from those SAME measures by truncation / duplication / re-ordering.
  // We do NOT change the perceived tempo of the fill to create hierarchy.
  const type=choose(["RELAXED ARC","CALL RESPONSE","ROLLING CELL","SPARSE PUNCTUATION"],rnd);
  const primaryRoles=type==="RELAXED ARC"?[tomContour[0],tomContour[1],"rim","snare"]:
    type==="CALL RESPONSE"?["rim","snare",tomContour[1],tomContour[2]]:
    type==="ROLLING CELL"?["snare","rim",tomContour[1],"snare"]:
    ["rim",tomContour[1],"snare",tomContour[2]];
  const steps=type==="RELAXED ARC"?[0,4,7,11]:
    type==="CALL RESPONSE"?[0,3,8,11]:
    type==="ROLLING CELL"?[0,2,3,6]:[0,5,9,12];
  const densityBias=type==="ROLLING CELL"?1.0:type==="CALL RESPONSE"?.72:type==="RELAXED ARC"?.48:.38;
  const spaceBias=type==="SPARSE PUNCTUATION"?1:type==="RELAXED ARC"?.82:.55;
  const baseSubdivision=type==="ROLLING CELL"?16:8;
  const derivationMode=choose(["PAIR DOUBLE","FIRST CELL","THIRD REPEAT","FOURTH REPEAT"],rnd);

  // Build four related measures from the same cell. These are not four unrelated fills.
  const masterBars=[];
  for(let m=0;m<4;m++){
    const events=[];
    for(let i=0;i<steps.length;i++){
      let step=steps[i];
      let role=primaryRoles[(i+(m===1?1:0))%primaryRoles.length];
      // Controlled within-genome development. Structural identity remains obvious.
      if(m===1 && i===steps.length-1) step=Math.min(15,step+1);
      if(m===2 && i===1 && type!=="SPARSE PUNCTUATION") step=Math.min(15,step+2);
      if(m===3 && i===steps.length-1) role="snare";
      events.push({step,role,weight:i<2?.35:i===steps.length-1?.7:.55,vel:i===0?4:i===steps.length-1?10:0});
    }
    // Later source measures may contain ONE optional ornament from the same DNA.
    if(m>=2 && type!=="SPARSE PUNCTUATION"){
      const anchor=steps[Math.min(steps.length-1,2)];
      events.push({step:Math.min(15,anchor+(m===2?2:3)),role:primaryRoles[(m+1)%primaryRoles.length],weight:.82,vel:2});
    }
    masterBars.push(events);
  }
  return {id:type,steps,roles:primaryRoles,densityBias,spaceBias,accentMap:[0,3],baseSubdivision,derivationMode,masterBars};
}
function fillMeasureSequence(genome,bars){
  // Measure-level derivation. No subdivision acceleration here.
  // Examples: take the first two and duplicate them, take the first and repeat it,
  // or repeat the third/fourth measure to create a larger version of the SAME fill.
  const n=Math.max(1,Math.ceil(bars));
  const mode=genome.derivationMode;
  let seq;
  if(mode==="FIRST CELL"){
    seq=n<=1?[0]:n===2?[0,0]:n===4?[0,0,0,0]:[0,0,0,0,1,2,3,3];
  }else if(mode==="THIRD REPEAT"){
    seq=n<=1?[0]:n===2?[0,1]:n===4?[0,1,2,2]:[0,1,2,2,0,1,3,3];
  }else if(mode==="FOURTH REPEAT"){
    seq=n<=1?[0]:n===2?[0,1]:n===4?[0,1,3,3]:[0,1,2,3,0,1,3,3];
  }else{ // PAIR DOUBLE
    seq=n<=1?[0]:n===2?[0,1]:n===4?[0,1,0,1]:[0,1,0,1,2,3,2,3];
  }
  while(seq.length<n)seq.push(seq[seq.length%Math.max(1,seq.length)]||0);
  return seq.slice(0,n);
}
function renderGenomeMicroFill(ev,bar,plan,rnd){
  const g=plan.fillGenome;
  // 8-bar punctuation = a tiny excerpt from measure 1 of the canonical fill.
  const src=g.masterBars[0]||[];
  const sub=g.baseSubdivision, st=PPQ*4/sub;
  const start=beat(bar,3.5), windowTicks=PPQ*.5;
  src.filter(e=>e.weight<=.55).slice(0,2).forEach((e,i)=>{
    const local=(e.step/16)*windowTicks;
    pushFill(ev,start+local,st*.55,e.role,66+i*7+e.vel,sub);
  });
}
function makeNarrativePlan(sections,family,rnd){
  const transitions=[];
  for(let i=0;i<sections.length-1;i++){
    const sec=sections[i],next=sections[i+1],end=sec.start+sec.bars,rank=boundaryRank(end);
    if(rank>0){
      transitions.push({end,rank,bars:narrativeFillBars(rank),from:sec.kind,to:next.kind});
    }
  }
  const crashRunMode=cfg.build==="Huge"?(rnd()<.7?4:2):cfg.build==="Mid"?(rnd()<.52?4:2):(rnd()<.35?2:0);
  const tomDirection=rnd()<.5?"DESCENDING":"ASCENDING";
  const tomContour=tomDirection==="DESCENDING"?["tomHigh","tomMid","tomLow"]:["tomLow","tomMid","tomHigh"];
  const rimMode=choose(["BACKBEAT SHADOW","SYNCOPATED RESPONSE","PHRASE PUNCTUATION"],rnd);
  const fillGenome=makeFillGenome(tomContour,rnd);
  const fillCell={steps:fillGenome.steps.slice(0,3).map(v=>Math.round(v/4)),roles:fillGenome.roles.slice(0,3)};
  return {transitions,crashRunMode,fillGenome,fillCell,tomDirection,tomContour,rimMode,theorySeed:Math.floor(rnd()*0x7fffffff)};
}
function renderNarrativeFill(ev,endBarExclusive,bars,rank,plan,rnd){
  if(!bars||bars<=0)return;
  const g=plan.fillGenome;
  const cell=plan.fillCell;
  const wholeBars=Math.max(1,Math.ceil(bars));
  const startBar=Math.max(0,endBarExclusive-bars);
  const seq=fillMeasureSequence(g,bars);
  const partial=bars<1?bars:1;

  for(let j=0;j<wholeBars;j++){
    const sourceIndex=seq[j%seq.length]||0;
    const source=g.masterBars[sourceIndex]||g.masterBars[0]||[];
    const actualBar=Math.floor(startBar+j);
    const rel=j/Math.max(1,wholeBars-1);
    const sub=g.baseSubdivision;
    const st=PPQ*4/sub;
    const rankThreshold=rank<=1?.48:rank===2?.68:.9;
    const durationBars=(j===0&&bars<1)?partial:1;
    const barTicks=PPQ*4*durationBars;
    const barStart=beat(actualBar, j===0&&bars<1 ? 4-durationBars*4 : 0);

    // Intensity changes by REVEALING more detail from the same source measure,
    // not by changing the measure's rhythmic rate.
    source.forEach((e,i)=>{
      if(e.weight>rankThreshold) return;
      const local=(e.step/16)*barTicks;
      if(local>=barTicks) return;
      const accent=(i===0||i===source.length-1)?4:0;
      const velocity=clamp(62+rank*7+Math.round(rel*12)+e.vel+accent,1,116);
      pushFill(ev,barStart+local,st*(g.id==="RELAXED ARC"?.75:.55),e.role,velocity,sub);
    });

    // A single controlled articulation on the final measure only.
    if(j===wholeBars-1 && rank>=2 && rnd()<(.16+cfg.fill/100*.10)){
      const tailRole=g.roles[(sourceIndex+1)%g.roles.length];
      const tailTick=barStart+barTicks-PPQ*.5;
      pushFill(ev,tailTick,PPQ*.22,tailRole,clamp(78+rank*8,1,116),8);
    }
  }

  // Tiny technical signature only at the strongest 64-bar destination.
  // It uses the existing source cell and does not redefine the fill's tempo or identity.
  if(rank>=3 && rnd()<.12){
    const lastBar=Math.floor(endBarExclusive-1);
    renderStickControlTransform(ev,{startTick:beat(lastBar,3.5),durationTicks:PPQ*.5,sourceCell:cell,kind:'build',energy:86,rnd,intensity:.12,mode:'fill'});
  }
}

// PAUSONA ENGINE — intentionally simple.
// One macro gesture, one destination, maximum two transformations at once.
// It never rewrites the song DNA. It overlays a controlled roll on the established build,
// then creates a short landing silence before the strongest drop.
function strongestDropPlan(sections){
  let best=null;
  for(let i=0;i<sections.length;i++){
    const sec=sections[i]; if(sec.kind!=="drop")continue;
    const prev=sections[i-1]||null;
    const score=sec.energy+(prev&&prev.kind==="build"?18:0)+i*.2;
    if(!best||score>best.score)best={drop:sec,prev,index:i,score};
  }
  return best;
}
function pausonaPrimaryRole(){
  if(cfg.kit.snare)return "snare";
  if(cfg.kit.toms)return "rim";
  if(cfg.kit.perc)return "percHigh";
  return null;
}
function pausonaAccentRole(primary){
  if(cfg.kit.toms)return primary==="rim"?"tomMid":"rim";
  if(cfg.kit.snare&&primary!=="snare")return "snare";
  if(cfg.kit.perc)return "percMid";
  return null;
}
function pausonaRateFor(shape,phase,intensity){
  // Divisions per whole note. Fast values are reserved for the end of an intentional acceleration.
  if(shape==="Accelerate"){
    if(phase<.5)return 8;
    if(phase<.88)return 16;
    return intensity==="Huge"?32:16;
  }
  if(shape==="Decelerate"){
    if(phase<.45)return 16;
    if(phase<.78)return 8;
    return 4;
  }
  if(shape==="Syncopated")return intensity==="Huge"&&phase>.8?16:8;
  return 16; // Straight
}
function pausonaSyncopatedKeep(i,div){
  // Grid-locked 3+3+2 style accent/omission language. No tick displacement.
  const p=div>=16?[1,0,1,1,0,1,1,0]:[1,0,1,1,0,1,0,1];
  return !!p[i%p.length];
}
function pausonaVelocity(phase,i,div,intensity){
  const limits={Low:[50,101],Mid:[48,114],Huge:[46,122]};
  const [lo,hi]=limits[intensity]||limits.Mid;
  const accent=(i%(div>=16?4:2)===0)?6:0;
  return clamp(Math.round(lo+(hi-lo)*phase+accent),1,123);
}
function renderPausona(ev,sections,plan,rnd){
  if(!cfg.pausona)return null;
  const target=strongestDropPlan(sections); if(!target)return null;
  const primary=pausonaPrimaryRole(); if(!primary)return null;
  const accentRole=pausonaAccentRole(primary);
  const length=Math.max(8,Math.min(16,Number(cfg.pausonaLength)||8));
  const endBar=target.drop.start,startBar=Math.max(0,endBar-length);
  const total=Math.max(1,endBar-startBar);
  const shape=cfg.pausonaShape||"Straight";
  const intensity=cfg.pausonaIntensity||"Mid";

  // Preserve the build underneath. Only remove the ordinary backbeat so the macro snare has one clear voice.
  // Huge intensity also clears hats in the final bar. Nothing else is rewritten.
  ev.splice(0,ev.length,...ev.filter(e=>{
    const bar=e.tick/(PPQ*4); if(bar<startBar||bar>=endBar)return true;
    if(e.group==="backbeat")return false;
    if(intensity==="Huge"&&bar>=endBar-1&&e.group==="hat")return false;
    return true;
  }));

  for(let bar=startBar;bar<endBar;bar++){
    const barPhase=(bar-startBar)/total;
    const div=pausonaRateFor(shape,barPhase,intensity);
    const step=PPQ*4/div;
    // The gesture grows by duration, not by spraying more instruments.
    const startQ=intensity==="Low"?(barPhase<.5?3:2):intensity==="Huge"?(barPhase<.25?2:0):(barPhase<.35?2:1);
    const hits=Math.max(1,Math.floor((4-startQ)*div/4));
    for(let i=0;i<hits;i++){
      if(shape==="Syncopated"&&!pausonaSyncopatedKeep(i,div))continue;
      const q=startQ+i*(4/div);
      const tick=beat(bar,q);
      const phase=clamp((bar-startBar+(q/4))/total,0,1);
      const velocity=pausonaVelocity(phase,i,div,intensity);
      // Secondary voice is punctuation only: max one accent every 2 beats and only in the second half.
      const canAccent=accentRole&&phase>.55&&i>0&&i%(Math.max(2,Math.floor(div/2)))===0;
      pushFill(ev,tick,step*.38,canAccent?accentRole:primary,velocity,div);
    }
  }

  // One final narrative operation: silence before impact. No cymbal runway is created here;
  // cymbals remain the responsibility of the global Narrative/Cymbal engine.
  const silenceBeats=intensity==="Huge"?2:1;
  const silenceStart=beat(endBar-1,4-silenceBeats);
  ev.splice(0,ev.length,...ev.filter(e=>!(e.tick>=silenceStart&&e.tick<beat(endBar,0)&&e.group!=="cymbal")));
  return {enabled:true,startBar,endBar,length,shape,intensity,primaryRole:primary};
}

function renderTomRimNarrative(ev,bar,sec,local,phase,energy,plan,rnd){
  const is8=(bar+1)%8===0,is16=(bar+1)%16===0;
  // Toms/rims never generate a new section identity: they comment on the existing phrase.
  if(sec.kind==="soft"&&is8&&local>1){
    add(ev,bar,3.5,"rim",72,"tomrim",PPQ/10);
  }
  if(sec.kind==="main"&&is16){
    // Short phrase-end answer: direction chosen once for the entire song.
    const roles=plan.tomContour, qs=[3.25,3.5,3.75];
    qs.forEach((q,i)=>add(ev,bar,q,roles[i],78+i*6,"tomrim",PPQ/9));
    if(plan.rimMode==="PHRASE PUNCTUATION")add(ev,bar,3.875,"rim",96,"tomrim",PPQ/12);
  }
  if(sec.kind==="breakdown"){
    // Echoes expose space: never more than one low-density gesture per 4-bar cell.
    if(local%4===3){
      add(ev,bar,2.75,"rim",58,"tomrim",PPQ/10);
      const r=plan.tomDirection==="DESCENDING"?"tomLow":"tomHigh";
      add(ev,bar,3.5,r,64,"tomrim",PPQ/8);
    }
  }
  if(sec.kind==="build"){
    // Build cascade = same contour repeated/expanded near the destination, not random tom hits.
    const barsFromEnd=sec.bars-local;
    if(barsFromEnd<=Math.min(4,sec.bars)){
      const roles=plan.tomContour;
      if(barsFromEnd===4)add(ev,bar,3.5,roles[0],68,"tomrim",PPQ/8);
      if(barsFromEnd===3){add(ev,bar,3.25,roles[0],72,"tomrim",PPQ/8);add(ev,bar,3.75,roles[1],78,"tomrim",PPQ/8)}
      if(barsFromEnd===2){[3,3.5,3.75].forEach((q,i)=>add(ev,bar,q,roles[i%3],78+i*5,"tomrim",PPQ/10))}
      if(barsFromEnd===1){[2.75,3.0,3.25,3.5].forEach((q,i)=>add(ev,bar,q,roles[i%3],82+i*5,"tomrim",PPQ/12));add(ev,bar,3.75,"rim",102,"tomrim",PPQ/12)}
    }
  }
  if(sec.kind==="drop"&&local>0&&local%8===7&&energy>88){
    // Drop punctuation recalls the established contour at low density.
    add(ev,bar,3.5,plan.tomContour[1],82,"tomrim",PPQ/10);
    add(ev,bar,3.75,"rim",92,"tomrim",PPQ/12);
  }
}
function add(ev,bar,q,role,velocity,group,duration=PPQ/8){ev.push({tick:beat(bar,q),duration,role,velocity,group})}
function pushFill(ev,tick,duration,role,velocity,subdivision){
  // Fill events are grid-priority: never stack the same voice on the same tick.
  const minGap=Math.max(1,Math.round(PPQ*4/64));
  const collision=ev.some(e=>e.group==="fill"&&e.role===role&&Math.abs(e.tick-tick)<minGap*.45);
  if(collision)return;
  ev.push({tick:Math.round(tick),duration:Math.max(4,Math.round(duration)),role,velocity:clamp(Math.round(velocity),1,127),group:"fill",subdivision,timingLocked:true});
}
function fill(ev,bar,importance,rnd,breakBias="cell-mutation"){
  const div=importance>=3?32:importance===2?16:8;
  const step=PPQ*4/div;
  const roles=breakBias.includes("tom")?["snare","tomHigh","tomMid","tomLow"]:breakBias.includes("perc")?["rim","percHigh","percMid","percLow"]:["snare","rim","tomMid","percHigh"];
  // Micro / mid / maxi fills occupy progressively larger phrase-end windows, but remain readable.
  const windowBeats=importance>=3?1.5:importance===2?1:.5;
  const start=beat(bar,4-windowBeats);
  const slots=Math.max(2,Math.round(windowBeats*div/4));
  // A compact source cell, then repetition/development. No modulo wrapping = no accidental stacked notes.
  const source=[0,1,Math.max(2,Math.floor(slots*.45)),Math.max(3,Math.floor(slots*.72))].filter((v,i,a)=>v<slots&&a.indexOf(v)===i);
  const repeats=importance>=3?2:1;
  for(let r=0;r<repeats;r++){
    const offset=r*Math.ceil(slots/repeats);
    const span=Math.ceil(slots/repeats);
    for(let i=0;i<source.length;i++){
      const local=Math.floor(source[i]*span/Math.max(1,slots));
      const slot=offset+local;
      if(slot>=slots)continue;
      let role=roles[(i+r)%roles.length];
      if(r>0&&i===source.length-1&&rnd()<.55)role=["rim","tomLow","percMid","snare"][Math.floor(rnd()*4)];
      pushFill(ev,start+slot*step,step*.56,role,70+r*9+i*5,div);
    }
  }
  // Peak burst: intentionally very short. 1/64 is an accent gesture, never a long machine-gun roll.
  if(importance>=3){
    const use64=cfg.build==="Huge"&&rnd()<.58;
    const burstDiv=use64?64:32, st=PPQ*4/burstDiv;
    const n=use64?4:3;
    const burstStart=beat(bar,4)-n*st;
    for(let i=0;i<n;i++){
      const role=i===n-1?"snare":(i%2?"rim":"snare");
      pushFill(ev,burstStart+i*st,st*.48,role,86+i*8,burstDiv);
    }
  }
}

// Pattern-chain grammar: one-bar motifs become complementary A/B patterns; phrase-end bars become BREAK variants.
// The source book's idea is used as compositional grammar, not as a literal pattern transcription.
function uniq(a){return [...new Set(a.filter(x=>x>=0&&x<16).map(x=>Math.round(x)))]}
function mutateSteps(src,rnd,amount=.22,allowed=[1,2,3,5,6,7,9,10,11,13,14,15]){let out=[...src];if(rnd()<amount&&out.length>2)out.splice(Math.floor(rnd()*out.length),1);if(rnd()<amount){const x=allowed[Math.floor(rnd()*allowed.length)];if(!out.includes(x))out.push(x)}return uniq(out).sort((a,b)=>a-b)}
function makePatternFamily(p,rnd){
  const lineage=buildArchetypeLineage(p,rnd), A=lineage.primary, B=lineage.secondary, bias=lineage.bias;
  // ARRANGEMENT-FIRST POLICY:
  // Archetypes provide vocabulary, not bar-by-bar behaviour. One stable A motif is created,
  // then B is a restrained sibling. The same motifs are reused across the song.
  let kickA, kickB;
  if(!p.breakbeat){kickA=[0,4,8,12];kickB=[0,4,8,12]}
  else{
    const base=unionWeighted(A.kick.anchor,B.kick.anchor,rnd,bias);
    const sync=unionWeighted(A.kick.sync,B.kick.sync,rnd,bias).filter(()=>rnd()<.22+p.sync*.12);
    kickA=uniq([...base,...sync]).sort((a,b)=>a-b);
    kickB=mutateSteps(kickA,rnd,.18,[2,3,6,7,10,11,14,15]);
  }

  const backA=!p.breakbeat?[4,12]:unionWeighted(A.back.anchor,B.back.anchor,rnd,bias);
  let backB=[...backA];
  if(p.breakbeat)backB=mutateSteps(backA,rnd,.16,[3,4,7,10,11,12,15]);
  // Ghosts are selected once for the entire song, and only at restrained variation settings.
  const ghostPool=unionWeighted(A.back.ghost,B.back.ghost,rnd,bias);
  const varAmt=clamp(cfg.variation/100,0,1);
  if(ghostPool.length&&rnd()<p.ghost*.35*varAmt)backB=uniq([...backB,choose(ghostPool,rnd)]).sort((a,b)=>a-b);

  const hatKind=rnd()<bias?A.hats.pulse:B.hats.pulse;
  let hatA=hatTemplate(hatKind,rnd);
  const targetHatDensity=(A.hats.density*bias+B.hats.density*(1-bias))*p.hat;
  // Density is decided once here, not randomly re-decided every bar.
  hatA=hatA.filter((_,i)=>i===0||rnd()<clamp(.62+targetHatDensity*.38,0,1));
  const hatB=mutateSteps(hatA,rnd,.10+varAmt*.16,[1,2,3,5,6,7,9,10,11,13,14,15]);

  const percTrait=rnd()<bias?A.perc.contour:B.perc.contour;
  let percA=percTemplate(percTrait,rnd);
  // Keep percussion sparse enough to leave room for arrangement.
  const maxPerc=p.perc>.85?4:p.perc>.65?3:2;
  percA=percA.slice(0,maxPerc);
  const percB=mutateSteps(percA,rnd,.10+varAmt*.18);

  const openBias=(A.hats.openBias*bias+B.hats.openBias*(1-bias))*p.open;
  const openCandidates=hatA.filter(x=>[2,6,10,14].includes(x));
  let openA=(openCandidates.length?openCandidates:[6,14]).filter(()=>rnd()<clamp(.18+openBias*.34,0,.65));
  if(openA.length>2)openA=openA.slice(0,2);
  const openB=mutateSteps(openA,rnd,.08+varAmt*.10,[2,6,10,14]);

  const accentA=uniq(unionWeighted(A.accents.strong,B.accents.strong,rnd,bias));
  const accentB=uniq([...accentA,...unionWeighted(A.accents.weak,B.accents.weak,rnd,bias).filter(()=>rnd()<.18*varAmt)]);
  // Predictable phrase grammar: A establishes identity; B appears only as a controlled complement.
  const chain=rnd()<.5?["A","A","B","A","A","A","B","BREAK"]:["A","B","A","A","A","B","A","BREAK"];
  const backRole=p.breakbeat?"snare":(rnd()<.55?"clap":"snare");
  return {A:{kick:kickA,back:backA,hat:hatA,perc:percA,open:openA,accent:accentA},B:{kick:kickB,back:backB,hat:hatB,perc:percB,open:openB,accent:accentB},chain,lineage,backRole};
}
function addFlam(ev,bar,step,role,velocity,group){const q=step/4,t=beat(bar,q),gap=Math.max(12,Math.round(PPQ/24));ev.push({tick:Math.max(0,t-gap),duration:PPQ/20,role,velocity:clamp(velocity-28,1,127),group});ev.push({tick:t,duration:PPQ/10,role,velocity,group})}
function renderPatternBar(ev,bar,pattern,p,rnd,energy,opts={}){
  const accent=new Set(pattern.accent||[]);
  const v=(base,step,spread=4)=>vel(base+(accent.has(step)?9:0),rnd,spread);
  const phase=opts.sectionBars?opts.local/Math.max(1,opts.sectionBars-1):0;
  const layers=opts.layers||sectionLayers(opts.kind||"main",phase);

  // KICK: the strongest invariant in four-on-the-floor styles.
  if(layers.kick){
    for(const st of pattern.kick){
      if(opts.build&&opts.isLast&&st>=12&&cfg.build!=="Small")continue;
      add(ev,bar,st/4,"kick",v(116,st,3),"kick",PPQ/6);
    }
  }

  // BACKBEAT: same motif across sections, only removed/reintroduced by arrangement.
  if(layers.back){
    for(const st of pattern.back){
      const role=opts.backRole||"clap";
      const tb=theoryBudget(opts.kind||"main",energy);
      if(opts.allowOrnament&&tb>.08&&rnd()<Math.min(.10,p.flam*.16*tb*4)&&st>=8)addFlam(ev,bar,st,role,v(102,st,4),"backbeat");
      else add(ev,bar,st/4,role,v(102,st,4),"backbeat",PPQ/9);
    }
  }

  // HATS: same core line; intro/outro may use mathematically reduced versions (÷2 / ÷4).
  if(layers.hat){
    let hats=[...pattern.hat];
    if(opts.kind==="intro"&&phase<.34)hats=hats.filter((_,i)=>i%4===0);
    else if(opts.kind==="intro"&&phase<.7)hats=hats.filter((_,i)=>i%2===0);
    if(opts.kind==="breakdown")hats=hats.filter((_,i)=>i%2===0);
    if(opts.kind==="outro"&&phase>.5)hats=hats.filter((_,i)=>i%2===0);
    for(const st of hats)add(ev,bar,st/4,"closedHat",v(st%4===2?82:70,st,5),"hat",PPQ/12);
  }

  if(layers.open){
    for(const st of pattern.open)add(ev,bar,st/4,"openHat",v(88,st,4),"hat",PPQ/5);
  }

  const shakerAllowed=opts.kind==="main"||opts.kind==="drop"||opts.kind==="build"||(opts.kind==="soft"&&phase>.55)||(opts.kind==="intro"&&phase>.72);
  if(shakerAllowed){
    const shakerDensity=opts.kind==="drop"?.9:opts.kind==="build"?.72:.58;
    [1,3,5,7,9,11,13,15].forEach((st,i)=>{if(rnd()<shakerDensity)add(ev,bar,st/4,"shaker",vel(57+(i%2?5:0)+Math.round(energy*.05),rnd,5),"shaker",PPQ/14)});
  }

  if(layers.perc){
    const roles=["percLow","percMid","rim","percHigh"];
    pattern.perc.forEach((st,i)=>{
      const role=roles[(i+(pattern===opts.familyB?1:0))%roles.length];
      add(ev,bar,st/4,role,v(76+i*2,st,5),"perc",PPQ/10);
    });
  }
}
function generate(){
  const rnd=mulberry32(Number(cfg.seed)||1),sections=sectionTemplate(cfg.length),totalBars=sections.reduce((a,s)=>a+s.bars,0),p=sp[cfg.style],ev=[],family=makePatternFamily(p,rnd);
  const narrative=makeNarrativePlan(sections,family,rnd);

  for(let si=0;si<sections.length;si++){
    const sec=sections[si], next=sections[si+1]||null;
    for(let local=0;local<sec.bars;local++){
      const bar=sec.start+local, phase=sec.bars<=1?1:local/(sec.bars-1);
      const energy=sec.kind==="build"?55+phase*43:sec.energy;
      const isLast=local===sec.bars-1, b8=(bar+1)%8===0, b16=(bar+1)%16===0;
      const token=family.chain[bar%8], pattern=token==="B"?family.B:family.A;
      const layers=sectionLayers(sec.kind,phase);

      // NARRATIVE RULE: every section renders the same A/B DNA with a layer mask.
      // No section gets a fresh groove. Difference = add, subtract, x2 or ÷2.
      renderPatternBar(ev,bar,pattern,p,rnd,energy,{
        kind:sec.kind,layers,build:sec.kind==="build",isLast,local,sectionBars:sec.bars,
        familyB:family.B,backRole:family.backRole,
        allowOrnament:(b16||isLast)&&cfg.variation>58&&sec.kind!=="breakdown"
      });
      // Dedicated tom/rim grammar: phrase punctuation, contour, call-response and build cascades.
      renderTomRimNarrative(ev,bar,sec,local,phase,energy,narrative,rnd);

      // Double kick is a phrase punctuation only, never a new kick language.
      if(cfg.doubleKick&&!p.breakbeat&&sec.kind!=="build"&&sec.kind!=="breakdown"&&b8&&rnd()<.22){
        add(ev,bar,3.75,"kick",104,"kick",PPQ/8);
      }

      // CYMBAL NARRATIVE.
      // 1) Major arrivals always get a crash on beat 1.
      if(local===0&&(sec.kind==="drop"||sec.kind==="main"||sec.kind==="soft")){
        if(sec.kind==="drop"||sec.start%16===0)add(ev,bar,0,"crash",sec.kind==="drop"?116:100,"cymbal",PPQ);
      }
      // 2) Ride is an additive energy layer and appears in 4-bar blocks, never randomly per bar.
      if(sec.kind==="drop"&&layers.cym&&p.ride>.16&&Math.floor(local/4)%2===1){
        for(let q=.5;q<4;q+=1)add(ev,bar,q,"ride",vel(76,rnd,3),"cymbal",PPQ/4);
      }
      // 3) Optional pre-drop crash run: one crash on beat 1 of the last 2/4 build bars.
      if(sec.kind==="build"&&next&&next.kind==="drop"&&narrative.crashRunMode>0){
        const barsFromEnd=sec.bars-local;
        if(barsFromEnd<=narrative.crashRunMode)add(ev,bar,0,"crash",92+(narrative.crashRunMode-barsFromEnd)*6,"cymbal",PPQ*.8);
      }
      // 4) End-of-large-cycle cymbal punctuation, but only if it will not collide with a drop crash.
      const ending=bar+1, rank=boundaryRank(ending);
      if(isLast&&rank>=2&&(!next||next.kind!=="drop")&&sec.kind!=="breakdown"){
        add(ev,bar,3.5,"crash",rank===3?112:102,"cymbal",PPQ*.7);
      }

      // BUILD = transformation of existing material, not an unrelated fill generator.
      if(sec.kind==="build"){
        const barsFromEnd=sec.bars-local;
        let stages=[];
        if(cfg.build==="Small"&&barsFromEnd===1)stages=[[3.5,4,8]];
        if(cfg.build==="Mid"){
          if(barsFromEnd===2)stages=[[3.5,4,8]];
          if(barsFromEnd===1)stages=[[3,3.5,8],[3.5,4,16]];
        }
        if(cfg.build==="Huge"){
          if(barsFromEnd===4)stages=[[3.5,4,8]];
          if(barsFromEnd===3)stages=[[3,4,8]];
          if(barsFromEnd===2)stages=[[3,4,16]];
          if(barsFromEnd===1)stages=[[3,3.5,16],[3.5,4,32]];
        }
        for(const [from,to,div] of stages){
          const st=4/div;let hit=0;
          for(let q=from;q<to-1e-6;q+=st){
            const role=narrative.fillCell.roles[hit%narrative.fillCell.roles.length];
            pushFill(ev,beat(bar,q),PPQ*4/div*.46,role,clamp(66+phase*34+hit*2,1,118),div);hit++;
          }
        }
        // One controlled Stone-derived transformation may decorate the final build cell.
        // It inherits the existing fill cell and cannot change the build structure.
        const tb=theoryBudget('build',energy);
        if(barsFromEnd===1&&tb>.12&&rnd()<tb*.75){
          const dur=cfg.build==='Huge'?PPQ:PPQ*.5;
          renderStickControlTransform(ev,{startTick:beat(bar,4)-dur,durationTicks:dur,sourceCell:narrative.fillCell,kind:'build',energy,rnd,intensity:tb,mode:'fill'});
        }
      }

      // Small 8-bar punctuation only. Larger fills are handled by the genealogy engine below.
      if(b8&&!b16&&!isLast&&sec.kind!=="build"&&sec.kind!=="breakdown"&&cfg.fill>20){
        if(rnd()<(.06+cfg.fill/100*.10))renderGenomeMicroFill(ev,bar,narrative,rnd);
      }
    }
  }

  // FILL GENEALOGY PASS.
  // A 64-bar transition can be x4 of the 16-bar idea; 32-bar is x2; same cell, same orchestration family.
  for(const tr of narrative.transitions){
    // Build→drop already contains a structured acceleration; the genealogy augments it only for major ranks.
    if(tr.from==="build"&&tr.to==="drop"&&tr.rank<2)continue;
    renderNarrativeFill(ev,tr.end,tr.bars,tr.rank,narrative,rnd);
  }

  // PAUSONA PASS — after the ordinary fill genealogy, because it is a single macro narrative event.
  // It may subtract competing layers and then write one coherent long roll into the strongest drop.
  const pausonaPlan=renderPausona(ev,sections,narrative,rnd);

  // Validation / timing pass. First enforce the active-kit policy, then timing.
  // Disabled families do not create tracks. Fill/rudiment voices are re-orchestrated only onto compatible enabled families.
  const kitFiltered=applyKitPolicy(ev);
  const mapped=kitFiltered.map(e=>({...e,tick:Math.max(0,e.tick+swingOffset(e,rnd))})),map=profiles[cfg.device];
  const groups=activeKitKeys().map(key=>{
    const def=KIT_DEFS[key];
    return [`DRUMS — ${def.label}`,r=>def.roles.includes(r)];
  });
  const tracks=groups.map(g=>({name:g[0],notes:mapped.filter(e=>g[1](e.role)).map(e=>({tick:e.tick,duration:e.duration,note:map[e.role],velocity:e.velocity})).sort((a,b)=>a.tick-b.tick)}));
  return {sections,totalBars,tracks,eventCount:mapped.length,patternGrammar:{
    heritage:p.heritage,grid:p.grid,chain:family.chain.join("-"),archetypes:family.lineage.names,lineage:family.lineage.label,
    breakBias:family.lineage.primary.breakBias,kickPolicy:p.breakbeat?"BREAKBEAT CONTROLLED":"4x4 LOCKED",
    architecture:"NARRATIVE FIRST",theoryRole:"STICK CONTROL GRAMMAR · SUBORDINATE VOCABULARY",
    theoryBudget:"INTRO 3% · SOFT 5% · MAIN 10% · BREAKDOWN 5% · BUILD 24% · DROP 12% · OUTRO 4%",
    stickOperators:"single/double/triple/quad groupings · inversion · accent permutation · flam · orchestration symmetry",
    pausona:pausonaPlan?`ON · ${pausonaPlan.length} bars · ${pausonaPlan.shape.toUpperCase()} · ${pausonaPlan.intensity.toUpperCase()}`:"OFF",
    pausonaTheory:"single macro gesture · max two transformations · progressive velocity · grid-priority · final landing silence",
    narrative:"INTRO → SOFT = CORE − LAYERS → MAIN = SOFT + LAYER → BREAKDOWN = SUBTRACTION → BUILD = TRANSFORMATION → DROP = RETURN + ENERGY",
    fillGenealogy:`${narrative.fillGenome.id} · ${narrative.fillGenome.derivationMode} · master 4 bars → 16:${narrativeFillBars(1)}b / 32:${narrativeFillBars(2)}b / 64:${narrativeFillBars(3)}b`,
    crashLanguage:narrative.crashRunMode?`PRE-DROP ${narrative.crashRunMode}-BAR CRASH RUN + MAJOR ARRIVAL CRASHES`:"MAJOR ARRIVAL CRASHES",
    tomRimLanguage:`${narrative.tomDirection} TOM CONTOUR · ${narrative.rimMode}`,
    activeKit:activeKitKeys().map(k=>KIT_DEFS[k].label)
  }};
}
function swingOffset(event,rnd){
  if(cfg.swing<=0||event.timingLocked||event.group==="fill")return 0;
  // Four-on-the-floor kick is a timing reference: absolutely grid-locked.
  if(event.group==="kick"&&!sp[cfg.style].breakbeat)return 0;
  const amt=cfg.swing/10,tick=event.tick,eighth=PPQ/2,idx=Math.round(tick/eighth),off=idx%2===1;
  const group=event.group,range=group==="kick"?2:group==="backbeat"?8:group==="hat"?18:group==="perc"?22:8;
  return Math.round((off?range*amt*.7:0)+(rnd()-.5)*range*amt*.3);
}

function configureOfflineEngine(next){
  next=next||{};
  Object.keys(next).forEach(function(key){
    if(key==="kit")cfg.kit=Object.assign({},cfg.kit,next.kit);
    else if(Object.prototype.hasOwnProperty.call(cfg,key))cfg[key]=next[key];
  });
  return JSON.parse(JSON.stringify(cfg));
}

function offlineLivePayload(){
  var arrangement=generate();
  var labels={};
  Object.keys(KIT_DEFS).forEach(function(key){labels[KIT_DEFS[key].label]=key});
  var colors={kick:14679951,snare:16741976,hats:6612177,shaker:11922143,perc:10192639,toms:16756056,cymbals:16053230};
  return {
    schema:"rudiment.live-arrangement/v1",
    id:"rudiment-"+cfg.seed,
    name:"Rudiment "+cfg.style+" "+cfg.seed,
    seed:cfg.seed,
    tempo:cfg.bpm,
    deviceProfile:cfg.device,
    musicalGrammar:arrangement.patternGrammar,
    arrangement:{
      startBeat:0,
      lengthBeats:arrangement.totalBars*4,
      tracks:arrangement.tracks.map(function(track){
        var label=track.name.replace("DRUMS — ","");
        var family=labels[label];
        return {family:family,label:label,color:colors[family],nativeDevice:"Drum Rack",notes:track.notes.map(function(note){
          return {pitch:note.note,start:note.tick/PPQ,duration:note.duration/PPQ,velocity:note.velocity};
        })};
      })
    }
  };
}

if(typeof module!=="undefined")module.exports={
  configure:configureOfflineEngine,
  generatePayload:offlineLivePayload,
  getConfig:function(){return JSON.parse(JSON.stringify(cfg))},
  profiles:profiles,
  styles:styles
};
