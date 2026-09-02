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

  // SHAKER: an independent, quieter motion layer. It follows the section
  // narrative but never replaces the closed/open-hat pulse.
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
  const fillMasterEvents=applyKitPolicy(buildFillMasterEvents(narrative.fillGenome));
  const groups=activeKitKeys().map(key=>{
    const def=KIT_DEFS[key];
    return [`DRUMS — ${def.label}`,r=>def.roles.includes(r)];
  });
  const tracks=groups.map(g=>({name:g[0],notes:mapped.filter(e=>g[1](e.role)).map(e=>({tick:e.tick,duration:e.duration,note:map[e.role],velocity:e.velocity})).sort((a,b)=>a.tick-b.tick)}));
  return {sections,totalBars,tracks,eventCount:mapped.length,semanticEvents:mapped,fillMasterEvents,patternGrammar:{
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
