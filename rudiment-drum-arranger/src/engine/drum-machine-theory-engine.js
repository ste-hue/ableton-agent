// DRUM-MACHINE COMPOSITION GRAMMAR
// Abstracted from the user's privately supplied study material and expressed as
// original generative primitives. No page, named pattern, catalogue sequence or
// facsimile is stored here. These cells describe common musical relationships.
const machineTheoryProfiles={
  disco:{
    kickCells:[[3,7,11,15],[6,14],[3,10,15]],
    hatCells:[[0,2,4,6,8,10,12,14],[0,1,2,4,6,8,9,10,12,14,15],[2,6,10,14]],
    percCells:[[3,7,11,15],[2,5,9,13],[3,6,10,14]],openCells:[[6,14],[2,10],[6,10,14]]
  },
  funk:{
    kickCells:[[3,6,10,15],[0,3,7,10,14],[2,6,9,15]],
    hatCells:[[0,2,3,6,8,10,11,14],[0,1,3,4,6,8,9,11,12,14],[0,3,6,8,11,14]],
    percCells:[[2,5,9,14],[3,6,10,13],[1,7,11,15]],openCells:[[6,14],[3,11],[7,15]]
  },
  pop:{
    kickCells:[[6,14],[3,8,14],[0,7,10]],
    hatCells:[[0,2,4,6,8,10,12,14],[0,2,4,6,8,10,14],[2,6,10,14]],
    percCells:[[7,14],[3,10,15],[6,13]],openCells:[[6,14],[14],[10,14]]
  },
  broken:{
    kickCells:[[0,3,6,10,14],[0,7,10,15],[2,6,9,13]],
    hatCells:[[0,2,3,6,8,10,11,14],[0,3,6,8,11,14],[1,4,7,10,13]],
    percCells:[[3,7,10,13],[2,6,11,15],[1,5,9,14]],openCells:[[6,14],[3,11],[7,15]]
  },
  latin:{
    kickCells:[[0,6,10,14],[0,7,10,15],[3,6,11,14]],
    hatCells:[[0,2,4,6,8,10,12,14],[0,3,6,8,11,14],[0,2,3,6,8,10,11,14]],
    percCells:[[0,3,6,10,12],[2,5,8,11,14],[0,4,7,10,13]],openCells:[[6,14],[2,10],[7,15]]
  }
};
const machineStyleProfile={"Tech House":"disco","House":"disco","Disco House":"disco","Techno":"pop","Melodic Techno":"pop","Minimal / Deep Tech":"funk","Hypnotic Techno":"funk","Hardgroove":"latin","Electro":"broken","Breakbeat":"broken"};
function machineTheoryProfile(style,rnd){
  const id=machineStyleProfile[style]||"funk",profile=machineTheoryProfiles[id];
  return {id,kick:[...choose(profile.kickCells,rnd)],hat:[...choose(profile.hatCells,rnd)],perc:[...choose(profile.percCells,rnd)],open:[...choose(profile.openCells,rnd)]};
}
function machineTheoryMerge(current,reference,rnd,amount,memory=.7,max=12){
  if(amount<.24)return [...current];
  const keep=Math.max(1,Math.round(current.length*(.45+memory*.5))),base=current.slice(0,keep);
  const candidates=reference.filter(step=>!base.includes(step)),addCount=amount>.78?Math.min(3,candidates.length):amount>.48?Math.min(2,candidates.length):Math.min(1,candidates.length);
  const offset=candidates.length?Math.floor(rnd()*candidates.length):0,add=Array.from({length:addCount},(_,i)=>candidates[(offset+i)%candidates.length]);
  return uniq([...base,...add]).sort((a,b)=>a-b).slice(0,max);
}
function machineTheoryDevelop(pattern,profile,rnd,amount,memory){
  return {
    hat:machineTheoryMerge(pattern.hat,profile.hat,rnd,amount,memory,14),
    perc:machineTheoryMerge(pattern.perc,profile.perc,rnd,amount,memory,6),
    open:machineTheoryMerge(pattern.open,profile.open,rnd,amount*.72,memory,3)
  };
}
const machineFillFamilies=[
  {id:"REGISTER CASCADE",steps:[0,3,6,9,12,14],roles:["snare","rim","tomHigh","tomMid","tomLow","snare"],densityBias:.72,spaceBias:.5,baseSubdivision:16},
  {id:"SPLIT RESPONSE",steps:[0,2,7,8,11,14],roles:["snare","rim","snare","tomHigh","tomMid","tomLow"],densityBias:.66,spaceBias:.58,baseSubdivision:16},
  {id:"SYNCOPATED TURN",steps:[0,3,7,10,14],roles:["rim","snare","tomMid","tomLow","snare"],densityBias:.58,spaceBias:.68,baseSubdivision:16},
  {id:"TOM TRANSFER",steps:[0,4,7,10,12,15],roles:["snare","tomHigh","tomMid","tomLow","rim","snare"],densityBias:.62,spaceBias:.6,baseSubdivision:16},
  {id:"SPARSE CADENCE",steps:[0,5,9,13,15],roles:["rim","tomMid","snare","tomLow","snare"],densityBias:.42,spaceBias:.88,baseSubdivision:8}
];
function machineFillBlueprint(tomContour,rnd){
  const source=choose(machineFillFamilies,rnd),roles=source.roles.map(role=>role==="tomHigh"?tomContour[0]:role==="tomMid"?tomContour[1]:role==="tomLow"?tomContour[2]:role);
  return {...source,steps:[...source.steps],roles};
}
