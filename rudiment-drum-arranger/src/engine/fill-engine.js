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
