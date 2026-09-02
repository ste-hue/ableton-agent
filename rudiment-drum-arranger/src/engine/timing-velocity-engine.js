function swingOffset(event,rnd){
  if(cfg.swing<=0||cfg.swing>=100||event.timingLocked||event.group==="fill")return 0;
  // Four-on-the-floor kick is a timing reference: absolutely grid-locked.
  if(event.group==="kick"&&!sp[cfg.style].breakbeat)return 0;
  // Circular percentage: 0% and 100% are both on-grid. At 50%, every
  // second sixteenth is delayed by half a grid cell, the strongest swing.
  const percent=clamp(cfg.swing,0,100),phase=(percent<=50?percent:100-percent)/100;
  const sixteenth=PPQ/4,idx=Math.round(event.tick/sixteenth),off=idx%2===1;
  const group=event.group,humanRange=group==="kick"?1:group==="backbeat"?3:group==="hat"?5:group==="perc"?7:3;
  return Math.round((off?sixteenth*phase:0)+(rnd()-.5)*humanRange*(phase*2));
}
