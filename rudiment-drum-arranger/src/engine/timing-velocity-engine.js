function swingOffset(event,rnd){
  if(cfg.swing<=0||event.timingLocked||event.group==="fill")return 0;
  // Four-on-the-floor kick is a timing reference: absolutely grid-locked.
  if(event.group==="kick"&&!sp[cfg.style].breakbeat)return 0;
  const amt=cfg.swing/10,tick=event.tick,eighth=PPQ/2,idx=Math.round(tick/eighth),off=idx%2===1;
  const group=event.group,range=group==="kick"?2:group==="backbeat"?8:group==="hat"?18:group==="perc"?22:8;
  return Math.round((off?range*amt*.7:0)+(rnd()-.5)*range*amt*.3);
}
