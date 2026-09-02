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

