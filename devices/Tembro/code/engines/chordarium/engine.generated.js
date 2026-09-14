/* House Piano Engine v23: Scaler-informed harmonic intent and interdependent performance layers.
   MIDI examples are study material, not a mandatory transition database. */
(function(root){
'use strict';
const PPQ=480,STEP=120,BAR=1920;
const PCS={C:0,'C#':1,D:2,Eb:3,E:4,F:5,'F#':6,G:7,Ab:8,A:9,Bb:10,B:11},NAMES=Object.keys(PCS);
const mod=(n,m)=>((n%m)+m)%m,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),copy=x=>JSON.parse(JSON.stringify(x));
const SCALER_SETS=root.SCALER_CHORD_SETS||(typeof SCALER_CHORD_SETS!=='undefined'?SCALER_CHORD_SETS:(typeof module!=='undefined'&&module.exports?require('./scaler-chord-sets.json').sets:[]));
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){return ()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function stream(c,layer,rev=0){return rng((c.seed^hash(layer)^Math.imul(rev,2654435761))>>>0);}
const pick=(a,r)=>a[Math.floor(r()*a.length)];
const QUALITIES={
 major:{pcs:[0,4,7],upper:[4,7,12],label:''},minor:{pcs:[0,3,7],upper:[3,7,12],label:'m'},
 add9:{pcs:[0,2,4,7],upper:[4,7,12,14],label:'add9'},madd9:{pcs:[0,2,3,7],upper:[3,7,12,14],label:'m(add9)'},
 '6':{pcs:[0,4,7,9],upper:[4,7,9,12],label:'6'},m7:{pcs:[0,3,7,10],upper:[3,7,10,12],label:'m7'},
 maj7:{pcs:[0,4,7,11],upper:[4,7,11,12],label:'maj7'},'7':{pcs:[0,4,7,10],upper:[4,7,10,12],label:'7'},
 m9:{pcs:[0,2,3,7,10],upper:[3,7,10,14],label:'m9'},maj9:{pcs:[0,2,4,7,11],upper:[4,7,11,14],label:'maj9'},
 '9':{pcs:[0,2,4,7,10],upper:[4,7,10,14],label:'9'},sus:{pcs:[0,5,7,10],upper:[5,7,10,12],label:'7sus4'},
 '9sus':{pcs:[0,2,5,7,10],upper:[5,7,10,14],label:'9sus4'},
 m11:{pcs:[0,2,3,5,7,10],upper:[3,10,14,17],label:'m11'},
 '7b9':{pcs:[0,1,4,7,10],upper:[4,7,10,13],label:'7♭9'},
 '7#5b9':{pcs:[0,1,4,8,10],upper:[4,8,10,13],label:'7♯5♭9'},
 '7#9':{pcs:[0,3,4,7,10],upper:[4,7,10,15],label:'7♯9'},
 '13sus':{pcs:[0,2,5,9,10],upper:[5,9,10,14],label:'13sus4(no5)'},
 '9no3':{pcs:[0,2,7,10],upper:[2,7,10,12],label:'9(no3)'},
 'maj9no3':{pcs:[0,2,7,11],upper:[2,7,11,12],label:'maj9(no3)'},
 dim7:{pcs:[0,3,6,9],upper:[3,6,9,12],label:'dim7'},m7b5:{pcs:[0,3,6,10],upper:[3,6,10,12],label:'m7♭5'}
 ,sus2:{pcs:[0,2,7],upper:[2,7,12],label:'sus2'},m6:{pcs:[0,3,7,9],upper:[3,7,9,12],label:'m6'}
 ,mMaj7:{pcs:[0,3,7,11],upper:[3,7,11,12],label:'m(maj7)'},'maj7#11':{pcs:[0,4,6,7,11],upper:[4,7,11,18],label:'maj7♯11'}
 ,'13':{pcs:[0,2,4,9,10],upper:[4,10,14,21],label:'13(no5)'},'7b13':{pcs:[0,4,7,8,10],upper:[4,8,10,12],label:'7♭13'}
 ,'6/9':{pcs:[0,2,4,7,9],upper:[4,9,14,19],label:'6/9'},'m6/9':{pcs:[0,2,3,7,9],upper:[3,9,14,19],label:'m6/9'}
 ,m7sus4:{pcs:[0,2,5,7,10],upper:[5,10,14,19],label:'m7sus4'},'11':{pcs:[0,2,4,5,7,10],upper:[4,10,14,17],label:'11(no5)'}
 ,'13b9':{pcs:[0,1,4,7,9,10],upper:[4,10,13,21],label:'13♭9(no5)'},'7#5':{pcs:[0,4,8,10],upper:[4,8,10,16],label:'7♯5'}
 ,'7b5':{pcs:[0,4,6,10],upper:[4,6,10,16],label:'7♭5'},aug:{pcs:[0,4,8],upper:[4,8,12],label:'aug'},augMaj7:{pcs:[0,4,8,11],upper:[4,8,11,16],label:'aug(maj7)'}
 };
// Degree relative to tonic, chord quality, duration in beats.
const LIBRARY={
 Minor:[
 {id:'minor-colour',chords:[[0,'m7',4],[8,'maj7',4],[3,'maj7',4],[10,'major',4]]},
 {id:'minor-plagal',chords:[[0,'m7',8],[5,'m7',4],[0,'m7',4]]},
 {id:'minor-return',chords:[[0,'m9',6],[5,'m9',2],[8,'maj7',4],[7,'7',4]]},
 {id:'minor-cadence',chords:[[0,'m7',4],[5,'m7',4],[2,'m7b5',4],[7,'7',4]]}],
 Major:[
 {id:'major-soul',chords:[[0,'maj7',4],[9,'m7',4],[2,'m7',4],[7,'7',4]]},
 {id:'major-plagal',chords:[[0,'maj9',8],[5,'maj9',4],[0,'maj9',4]]},
 {id:'major-lift',chords:[[5,'maj7',4],[7,'major',4],[4,'m7',4],[9,'m7',4]]},
 {id:'major-turn',chords:[[0,'maj9',6],[9,'m7',2],[2,'m9',4],[7,'9',4]]}]
};
/* Eight-bar harmonic scenes. Each half is a four-bar dramatic unit. Rows are
   [root offset, quality, beats, roman numeral, function, technique]. The
   renderer adapts these arcs to the requested length instead of looping one
   four-chord list unchanged. */
const EXPRESSIVE_SCENES={
 Major:[
  {id:'radiant-ascent',emotion:'aperto e luminoso',voicing:'arch',tags:['diatonic-schema','cadential-return'],core:[[0,'add9',4,'Iadd9','tonic','diatonic'],[7,'major',4,'V','dominant-area','diatonic'],[9,'m7',4,'vi7','tonic-substitute','relative-minor'],[5,'maj9',4,'IVmaj9','predominant','plagal']],development:[[2,'m9',4,'ii9','predominant','descending-fifths'],[5,'maj9',4,'IVmaj9','predominant','plagal'],[7,'13sus',2,'V13sus','suspension','dominant-suspension'],[7,'7',2,'V7','dominant','authentic-cadence'],[0,'maj9',4,'Imaj9','tonic','resolution']]},
  {id:'bittersweet-plagal',emotion:'dolceamaro e nostalgico',voicing:'wave',tags:['modal-mixture','secondary-dominant'],core:[[0,'maj9',4,'Imaj9','tonic','diatonic'],[4,'m7',4,'iii7','tonic-substitute','mediant'],[5,'maj9',4,'IVmaj9','predominant','plagal'],[5,'m9',4,'iv9','borrowed-predominant','modal-mixture']],development:[[0,'6/9',4,'I6/9','tonic','resolution'],[4,'7',4,'V7/vi','applied-dominant','secondary-dominant'],[9,'m9',4,'vi9','temporary-tonic','tonicization'],[5,'m9',4,'iv9','borrowed-predominant','modal-mixture']]},
  {id:'gospel-circle',emotion:'soulful e risolutivo',voicing:'lift',tags:['circle-of-fifths','secondary-dominants'],core:[[0,'6/9',4,'I6/9','tonic','gospel-tonic'],[4,'7',4,'V7/vi','applied-dominant','secondary-dominant'],[9,'m7',4,'vi7','temporary-tonic','tonicization'],[2,'9',4,'V9/V','applied-dominant','secondary-dominant']],development:[[2,'m9',4,'ii9','predominant','descending-fifths'],[7,'13sus',2,'V13sus','suspension','dominant-suspension'],[7,'7',2,'V7','dominant','authentic-cadence'],[0,'6/9',8,'I6/9','tonic','resolution']]},
  {id:'backdoor-soul',emotion:'caldo e sofisticato',voicing:'common-tone',tags:['backdoor-cadence','modal-mixture'],core:[[0,'maj9',4,'Imaj9','tonic','diatonic'],[9,'m9',4,'vi9','tonic-substitute','relative-minor'],[5,'m9',4,'iv9','borrowed-predominant','modal-mixture'],[10,'9',4,'♭VII9','backdoor-dominant','backdoor-cadence']],development:[[4,'m7',4,'iii7','tonic-substitute','mediant'],[9,'7',4,'V7/ii','applied-dominant','secondary-dominant'],[2,'m9',4,'ii9','predominant','descending-fifths'],[7,'7',4,'V7','dominant','authentic-cadence']]},
  {id:'lydian-sky',emotion:'sospeso e ascendente',voicing:'ascent',tags:['lydian-schema','chromatic-colour'],core:[[0,'maj7#11',4,'Imaj7♯11','tonic','lydian-colour'],[2,'add9',4,'IIadd9','lydian-colour','lydian-schema'],[5,'maj9',4,'IVmaj9','predominant','plagal'],[0,'add9',4,'Iadd9','tonic','resolution']],development:[[9,'m7',4,'vi7','tonic-substitute','relative-minor'],[2,'9',4,'V9/V','applied-dominant','secondary-dominant'],[5,'maj9',4,'IVmaj9','predominant','plagal'],[0,'maj7#11',4,'Imaj7♯11','tonic','lydian-return']]},
  {id:'cinematic-mediants',emotion:'ampio e cinematografico',voicing:'cinematic',tags:['chromatic-mediant','modal-mixture'],core:[[0,'maj9',4,'Imaj9','tonic','diatonic'],[8,'maj7',4,'♭VImaj7','chromatic-mediant','chromatic-mediant'],[4,'add9',4,'IIIadd9','chromatic-mediant','chromatic-mediant'],[5,'m9',4,'iv9','borrowed-predominant','modal-mixture']],development:[[9,'m9',4,'vi9','tonic-substitute','relative-minor'],[1,'maj7',4,'♭IImaj7','chromatic-predominant','neapolitan-colour'],[7,'7b13',4,'V7♭13','dominant','altered-dominant'],[0,'maj9',4,'Imaj9','tonic','resolution']]},
  {id:'deceptive-lift',emotion:'emotivo con risoluzione negata',voicing:'arch',tags:['deceptive-cadence','plagal-return'],core:[[0,'add9',4,'Iadd9','tonic','diatonic'],[5,'maj7',4,'IVmaj7','predominant','plagal'],[7,'7',4,'V7','dominant','cadential-preparation'],[9,'m9',4,'vi9','deceptive-tonic','deceptive-cadence']],development:[[2,'m7',4,'ii7','predominant','descending-fifths'],[7,'7',4,'V7','dominant','cadential-preparation'],[9,'m7',4,'vi7','deceptive-tonic','deceptive-cadence'],[5,'maj9',4,'IVmaj9','predominant','plagal-loop']]},
  {id:'descending-fifths',emotion:'fluido e inevitabile',voicing:'descent',tags:['descending-fifths','tonicization'],core:[[0,'maj7',4,'Imaj7','tonic','diatonic'],[9,'m7',4,'vi7','tonic-substitute','descending-fifths'],[2,'m7',4,'ii7','predominant','descending-fifths'],[7,'7',4,'V7','dominant','authentic-cadence']],development:[[4,'m7',4,'iii7','tonic-substitute','descending-fifths'],[9,'7',4,'V7/ii','applied-dominant','secondary-dominant'],[2,'m9',4,'ii9','predominant','descending-fifths'],[7,'7b13',4,'V7♭13','dominant','altered-dominant']]},
 {id:'suspended-horizon',emotion:'spazioso e contemplativo',voicing:'pedal-top',tags:['suspension','common-tone'],core:[[0,'maj9',8,'Imaj9','tonic','tonic-prolongation'],[7,'13sus',4,'V13sus','suspension','dominant-suspension'],[5,'maj9',4,'IVmaj9','predominant','plagal']],development:[[2,'m9',4,'ii9','predominant','descending-fifths'],[7,'13sus',4,'V13sus','suspension','dominant-suspension'],[0,'maj7#11',8,'Imaj7♯11','tonic','lydian-resolution']]},
  {id:'grounded-plagal',emotion:'appoggiato, aperto e diretto',voicing:'grounded',tags:['tonic-return','plagal-motion','open-dominant'],core:[[0,'add9',4,'Iadd9','tonic','tonic-support',{bassLock:true}],[5,'major',4,'IV','predominant','plagal',{bassLock:true}],[0,'add9',4,'Iadd9','tonic','tonic-return',{bassLock:true}],[7,'add9',4,'Vadd9','modal-dominant','open-dominant',{bassLock:true}]],development:[[9,'m7',4,'vi7','tonic-substitute','relative-minor',{bassLock:true}],[5,'add9',4,'IVadd9','predominant','plagal',{bassLock:true}],[0,'6/9',4,'I6/9','tonic','tonic-return',{bassLock:true}],[7,'9sus',4,'V9sus','suspension','dominant-suspension',{bassLock:true}]]},
  {id:'colour-mediant',emotion:'sorprendente ma cantabile',voicing:'wide-wave',tags:['neo-riemannian','chromatic-mediant'],core:[[0,'maj7',4,'Imaj7','tonic','diatonic'],[4,'major',4,'III','chromatic-mediant','chromatic-mediant'],[9,'m7',4,'vi7','tonic-substitute','relative-minor'],[8,'maj7',4,'♭VImaj7','chromatic-mediant','chromatic-mediant']],development:[[5,'m9',4,'iv9','borrowed-predominant','modal-mixture'],[0,'6',4,'I6','tonic','common-tone'],[2,'9',4,'V9/V','applied-dominant','secondary-dominant'],[7,'7',4,'V7','dominant','authentic-cadence']]}
 ],
 Minor:[
  {id:'minor-anthem',emotion:'epico e malinconico',voicing:'arch',tags:['aeolian-schema','altered-dominant'],core:[[0,'madd9',4,'i(add9)','tonic','aeolian'],[8,'maj9',4,'VImaj9','submediant','aeolian'],[3,'maj7',4,'IIImaj7','relative-tonic','relative-major'],[10,'add9',4,'VIIadd9','modal-dominant','aeolian']],development:[[5,'m9',4,'iv9','predominant','minor-predominant'],[8,'maj7',4,'VImaj7','submediant','emotional-lift'],[7,'sus',2,'Vsus','suspension','dominant-suspension'],[7,'7b9',2,'V7♭9','dominant','altered-dominant'],[0,'m9',4,'i9','tonic','resolution']]},
  {id:'lament-return',emotion:'profondo e discendente',voicing:'descent',tags:['lament','minor-cadence'],core:[[0,'m9',8,'i9','tonic','tonic-prolongation'],[10,'major',4,'VII','modal-dominant','lament'],[8,'maj7',4,'VImaj7','submediant','lament']],development:[[5,'m7',4,'iv7','predominant','minor-predominant'],[2,'m7b5',4,'iiø7','predominant','minor-cadence'],[7,'7b9',4,'V7♭9','dominant','altered-dominant'],[0,'m9',4,'i9','tonic','resolution']]},
  {id:'minor-circle',emotion:'intenso e narrativo',voicing:'wave',tags:['descending-fifths','authentic-cadence'],core:[[0,'m7',4,'i7','tonic','minor-tonic'],[5,'m7',4,'iv7','predominant','descending-fifths'],[10,'7',4,'VII7/III','applied-dominant','secondary-dominant'],[3,'maj7',4,'IIImaj7','temporary-tonic','relative-major']],development:[[8,'maj7',4,'VImaj7','submediant','descending-fifths'],[2,'m7b5',4,'iiø7','predominant','minor-cadence'],[7,'7b9',4,'V7♭9','dominant','altered-dominant'],[0,'m9',4,'i9','tonic','resolution']]},
  {id:'dorian-hope',emotion:'minore ma luminoso',voicing:'ascent',tags:['dorian-schema','modal-harmony'],core:[[0,'m9',4,'i9','tonic','dorian'],[5,'13',4,'IV13','modal-colour','dorian-schema'],[10,'maj7',4,'VIImaj7','modal-dominant','modal-harmony'],[0,'m9',4,'i9','tonic','resolution']],development:[[8,'maj7',4,'VImaj7','submediant','aeolian-colour'],[5,'13',4,'IV13','modal-colour','dorian-schema'],[10,'add9',4,'VIIadd9','modal-dominant','modal-harmony'],[0,'m6/9',4,'i6/9','tonic','dorian-resolution']]},
  {id:'neapolitan-night',emotion:'scuro e teatrale',voicing:'cinematic',tags:['neapolitan','altered-dominant'],core:[[0,'mMaj7',4,'i(maj7)','tonic','minor-tonic-colour'],[1,'maj7',4,'♭IImaj7','chromatic-predominant','neapolitan'],[7,'7b9',4,'V7♭9','dominant','altered-dominant'],[0,'m9',4,'i9','tonic','resolution']],development:[[8,'maj9',4,'VImaj9','submediant','emotional-lift'],[2,'m7b5',4,'iiø7','predominant','minor-cadence'],[7,'7#5b9',4,'V7♯5♭9','dominant','altered-dominant'],[0,'m9',4,'i9','tonic','resolution']]},
  {id:'minor-gospel',emotion:'soulful con forte ritorno',voicing:'lift',tags:['gospel-turnaround','secondary-dominant'],core:[[0,'m7',4,'i7','tonic','minor-tonic'],[8,'7',4,'VI7','colour-dominant','gospel-colour'],[2,'m7b5',4,'iiø7','predominant','minor-cadence'],[7,'7b9',4,'V7♭9','dominant','altered-dominant']],development:[[0,'m9',8,'i9','tonic','tonic-prolongation'],[5,'m9',4,'iv9','predominant','minor-predominant'],[7,'13b9',4,'V13♭9','dominant','altered-dominant']]},
  {id:'aeolian-rise',emotion:'incalzante e modale',voicing:'wide-wave',tags:['aeolian-schema','modal-return'],core:[[0,'madd9',4,'i(add9)','tonic','aeolian'],[10,'add9',4,'VIIadd9','modal-dominant','aeolian'],[8,'maj7',4,'VImaj7','submediant','aeolian'],[10,'major',4,'VII','modal-dominant','aeolian-cadence']],development:[[0,'m9',4,'i9','tonic','resolution'],[3,'maj7',4,'IIImaj7','relative-tonic','relative-major'],[5,'13',4,'IV13','modal-colour','dorian-borrowing'],[7,'7b9',4,'V7♭9','dominant','altered-dominant']]},
  {id:'borrowed-light',emotion:'nostalgico con apertura',voicing:'common-tone',tags:['modal-mixture','relative-major'],core:[[0,'m9',4,'i9','tonic','minor-tonic'],[3,'maj9',4,'IIImaj9','relative-tonic','relative-major'],[8,'maj9',4,'VImaj9','submediant','emotional-lift'],[5,'m9',4,'iv9','predominant','minor-predominant']],development:[[10,'9',4,'VII9/III','applied-dominant','secondary-dominant'],[3,'maj7',4,'IIImaj7','temporary-tonic','tonicization'],[2,'m7b5',4,'iiø7','predominant','minor-cadence'],[7,'7b9',4,'V7♭9','dominant','altered-dominant']]},
  {id:'minor-mediants',emotion:'cinematografico e inatteso',voicing:'cinematic',tags:['chromatic-mediant','modal-mixture'],core:[[0,'m9',4,'i9','tonic','minor-tonic'],[9,'major',4,'♯VI','chromatic-mediant','chromatic-mediant'],[8,'maj7',4,'VImaj7','submediant','semitone-release'],[3,'maj9',4,'IIImaj9','relative-tonic','relative-major']],development:[[5,'m9',4,'iv9','predominant','minor-predominant'],[1,'maj7',4,'♭IImaj7','chromatic-predominant','neapolitan'],[7,'7b13',4,'V7♭13','dominant','altered-dominant'],[0,'m9',4,'i9','tonic','resolution']]},
  {id:'mystic-common-tone',emotion:'sospeso e magnetico',voicing:'pedal-top',tags:['common-tone','altered-dominant'],core:[[0,'m11',8,'i11','tonic','tonic-prolongation'],[5,'m11',4,'iv11','predominant','common-tone'],[8,'maj9',4,'VImaj9','submediant','common-tone']],development:[[3,'maj7',4,'IIImaj7','relative-tonic','relative-major'],[10,'9',4,'VII9/III','applied-dominant','secondary-dominant'],[7,'7#9',4,'V7♯9','dominant','altered-dominant'],[0,'m9',4,'i9','tonic','resolution']]}
 ]
};
const GENRE_SCENE_PRIORITIES={
 'Power Piano House':['grounded-plagal','radiant-ascent','deceptive-lift','minor-anthem','aeolian-rise','cinematic-mediants','minor-circle'],
 'Classic House':['grounded-plagal','radiant-ascent','backdoor-soul','descending-fifths','aeolian-rise','borrowed-light'],
 '90s Piano House':['grounded-plagal','deceptive-lift','radiant-ascent','gospel-circle','minor-anthem','minor-circle'],
 'Chicago House':['backdoor-soul','descending-fifths','gospel-circle','minor-gospel','dorian-hope'],
 'Deep House':['suspended-horizon','bittersweet-plagal','mystic-common-tone','borrowed-light','minor-mediants'],
 'Soulful House':['gospel-circle','backdoor-soul','bittersweet-plagal','minor-gospel','borrowed-light'],
 'Gospel House':['gospel-circle','backdoor-soul','minor-gospel','minor-circle','bittersweet-plagal'],
 'Disco House':['radiant-ascent','descending-fifths','lydian-sky','dorian-hope','aeolian-rise'],
 'NY / NJ Garage':['backdoor-soul','gospel-circle','colour-mediant','minor-gospel','borrowed-light'],
 'UK Garage Piano':['suspended-horizon','lydian-sky','dorian-hope','mystic-common-tone','minor-mediants'],
 'Latin Piano House':['descending-fifths','lydian-sky','minor-circle','dorian-hope','neapolitan-night']
};
/* High-level controls distilled from 1,274 Scaler 3 MIDI expressions. The
   source families are treated as complementary layers: Phrases/Performances/
   Passages shape the arc, Rhythms/Sequences/Strums shape the surface, Melody
   informs voice motion and Bass informs the foundation. */
const SCALER_INTENTS={
 effortless:{label:'Immediate and functional',motion:'rhythmic',foundation:'grounded',scenes:['grounded-plagal','radiant-ascent','aeolian-rise','minor-anthem']},
 euphoric:{label:'Euphoric and open',motion:'performance',foundation:'octave',scenes:['radiant-ascent','deceptive-lift','gospel-circle','minor-anthem','aeolian-rise','dorian-hope']},
 soulful:{label:'Soulful and warm',motion:'phrase',foundation:'walking',scenes:['gospel-circle','backdoor-soul','bittersweet-plagal','minor-gospel','minor-circle','borrowed-light']},
 deep:{label:'Deep and suspended',motion:'sustained',foundation:'pedal',scenes:['suspended-horizon','bittersweet-plagal','lydian-sky','mystic-common-tone','lament-return','dorian-hope']},
 cinematic:{label:'Cinematic and spacious',motion:'sequence',foundation:'voice-led',scenes:['cinematic-mediants','colour-mediant','lydian-sky','minor-mediants','neapolitan-night','mystic-common-tone']},
 surprise:{label:'Surprising but resolved',motion:'strummed',foundation:'syncopated',scenes:['deceptive-lift','colour-mediant','lydian-sky','neapolitan-night','minor-mediants','dorian-hope']}
};
const SCALER_MOTIONS=['auto','rhythmic','performance','phrase','sustained','sequence','strummed'];
const SCALER_FOUNDATIONS=['auto','grounded','octave','walking','pedal','voice-led','syncopated'];
function resolvedScalerMotion(cfg){return cfg.corpusMotion==='auto'?SCALER_INTENTS[cfg.harmonicIntent].motion:cfg.corpusMotion;}
function resolvedScalerFoundation(cfg){return cfg.foundationStyle==='auto'?SCALER_INTENTS[cfg.harmonicIntent].foundation:cfg.foundationStyle;}
function scaleRows(rows,factor){return rows.map(row=>{const out=row.slice();out[2]*=factor;return out;});}
function recolourRoman(roman,from,to){if(!roman||from===to)return roman;const replacements={
  'maj9:add9':['maj9','add9'],'maj7#11:add9':['maj7♯11','add9'],'maj7#11:maj9':['maj7♯11','maj9'],
  'm9:m7':['9','7'],'m11:m7':['11','7'],'9:7':['9','7'],'13:7':['13','7'],'13sus:sus':['13sus','sus'],
  '6/9:add9':['6/9','add9'],'m6/9:m7':['6/9','7'],'13b9:7':['13♭9','7'],'13b9:7b9':['13♭9','7♭9'],
  '7b13:7':['7♭13','7'],'7b9:7':['7♭9','7'],'7#5b9:7':['7♯5♭9','7'],'7#5b9:7b9':['7♯5♭9','7♭9'],'7#9:7':['7♯9','7'],'mMaj7:minor':['(maj7)','']
 },pair=replacements[from+':'+to];return pair?roman.replace(pair[0],pair[1]):roman;}
function colourForComplexity(row,complexity){const out=row.slice(),q=out[1];if(complexity<55){const simple={maj9:'add9','maj7#11':'add9','6/9':'add9',m9:'m7',m11:'m7','m6/9':'m7','9':'7','13':'7','13sus':'sus','13b9':'7','7b13':'7','7b9':'7','7#5b9':'7','7#9':'7',mMaj7:'minor'};out[1]=simple[q]||q;}else if(complexity<82){const medium={'7#5b9':'7b9','7#9':'7','7b13':'7','13b9':'7b9','maj7#11':'maj9'};out[1]=medium[q]||q;}out[3]=recolourRoman(out[3],q,out[1]);return out;}
function developedPass(rows,cfg,revision){const out=copy(rows),eligible=[];for(let i=0;i<out.length-1;i++)if(!['tonic','dominant','suspension'].includes(out[i][4]))eligible.push(i);if(cfg.complexity>=65&&eligible.length){const i=eligible[(revision+Math.floor(stream(cfg,'developed-pass')()*eligible.length))%eligible.length],dest=out[i+1];out[i]=[mod(dest[0]+7,12),cfg.complexity>=88?'9':'7',out[i][2],'V'+(cfg.complexity>=88?'9':'7')+'/'+dest[3],'applied-dominant','secondary-dominant-development',{developedPass:true}];}for(const row of out)row[6]={...(typeof row[6]==='object'&&row[6]||{}),developedPass:true};return out;}
function nearestBassPitches(pc){return Array.from({length:17},(_,i)=>36+i).filter(n=>n%12===pc);}
function bassIntervalsFor(row){
 const quality=row[1],q=QUALITIES[quality],fn=row[4];
 if(!q||['dominant','suspension','leading-diminished','applied-dominant'].includes(fn)||['dim7','m7b5','7b9','7#5b9','7#9','13b9','7b13','7#5','7b5'].includes(quality))return [0];
 const third=q.pcs.find(n=>n===3||n===4),fifth=q.pcs.find(n=>n===7);
 return [0,...(third==null?[]:[third]),...(fifth==null?[]:[fifth])];
}
function bassMotionTarget(style,index,count){
 if(style==='ascent'||style==='lift')return 2;
 if(style==='descent')return -2;
 if(style==='arch')return index<count/2?2:-2;
 if(style==='wave'||style==='wide-wave')return index%2?2:-2;
 return 0;
}
/* Compose an independent but chordal bass line. The first chord and cadential
   dominants stay grounded; inner structural chords may use first/second
   inversion when that turns a root leap into a singable step. */
function planExpressiveBass(rows,cfg,scene,revision){
 const out=copy(rows);if(cfg.length<4||cfg.complexity<48||out.length<3)return {rows:out,style:'root-position',inversions:0};
 const tonic=PCS[cfg.key],style=scene.voicing||'voice-led',candidates=out.map((row,i)=>{
  const metadata=typeof row[6]==='object'&&row[6]||{},locked=metadata.bassLock||i===0||i===out.length-1&&['tonic','dominant','suspension'].includes(row[4]),intervals=locked?[0]:bassIntervalsFor(row);
  return intervals.flatMap(interval=>nearestBassPitches(mod(tonic+row[0]+interval,12)).map(pitch=>({pitch,degree:mod(row[0]+interval,12),inversion:interval===0?'root':interval===7?'second':'first'})));
 });
 let beam=candidates[0].map(c=>({cost:Math.abs(c.pitch-43)*.2,path:[c]}));
 for(let i=1;i<candidates.length;i++){
  const next=[];for(const state of beam)for(const c of candidates[i]){const prev=state.path.at(-1),delta=c.pitch-prev.pitch,target=bassMotionTarget(style,i,candidates.length),inversionPenalty=c.inversion==='root'?0:c.inversion==='first'?1.15:2.35;
   let cost=state.cost+Math.abs(delta)+Math.max(0,Math.abs(delta)-5)*1.7+inversionPenalty+Math.abs(delta-target)*.18;
   if(delta===0)cost+=1.2;if(i===candidates.length-1)cost+=Math.abs(c.pitch-state.path[0].pitch)*.35;
   next.push({cost,path:[...state.path,c]});
  }next.sort((a,b)=>a.cost-b.cost||a.path.map(x=>x.pitch).join(',').localeCompare(b.path.map(x=>x.pitch).join(',')));beam=next.slice(0,20);
 }
 const near=beam.filter(x=>x.cost<=beam[0].cost+2.5).slice(0,5),chosen=near[(revision+Math.floor(stream(cfg,'expressive-bass',revision)()*near.length))%near.length].path;
 let inversions=0;for(let i=0;i<out.length;i++){const c=chosen[i],meta=typeof out[i][6]==='object'&&out[i][6]||{};if(c.inversion!=='root')inversions++;out[i][6]={...meta,bassDegree:c.degree,bassPitch:c.pitch,inversion:c.inversion,bassMotion:style};}
 return {rows:out,style:inversions?style:'root-position',inversions};
}
function expressiveTemplate(cfg,revision){const scenes=EXPRESSIVE_SCENES[cfg.mode],intent=SCALER_INTENTS[cfg.harmonicIntent],priority=[...intent.scenes,...(GENRE_SCENE_PRIORITIES[cfg.genre]||[])],byId=new Map(scenes.map(s=>[s.id,s])),pool=[...[...new Set(priority)].map(id=>byId.get(id)).filter(Boolean),...scenes.filter(s=>!priority.includes(s.id))],offset=Math.floor(stream(cfg,'expressive-scene')()*pool.length),scene=(cfg.articulationStyle==='passages-pulse'||resolvedScalerMotion(cfg)==='sustained')&&cfg.mode==='Major'&&cfg.harmonicIntent==='effortless'?byId.get('grounded-plagal'):pool[(offset+revision)%pool.length];let rows;
 if(cfg.length===2)rows=scaleRows(scene.core,.5);
 else if(cfg.length===4)rows=copy(scene.core);
 else if(cfg.length===6)rows=[...copy(scene.core),...scaleRows(scene.development,.5)];
 else if(cfg.length===8)rows=[...copy(scene.core),...copy(scene.development)];
 else rows=[...copy(scene.core),...copy(scene.development),...developedPass(scene.core,cfg,revision),...developedPass(scene.development,cfg,revision+1)];
 rows=rows.map(row=>colourForComplexity(row,cfg.complexity));const bass=planExpressiveBass(rows,cfg,scene,revision);return {id:'expressive-'+scene.id,chords:bass.rows,composed:true,scene:{id:scene.id,emotion:scene.emotion,voicing:scene.voicing,bassMotion:bass.style,bassInversions:bass.inversions,tags:scene.tags.slice()}};
}
// Original two-bar rhythmic designs. An eighth=2 steps, a sixteenth=1.
const PATTERNS={
 power:[[0,8,11,14,16,19,22,24,30],[0,7,10,14,16,22,25,27,30],[0,6,9,14,16,23,26,30]],
 chicago:[[0,3,6,10,14,16,19,22,26,30],[0,6,8,11,14,16,22,24,27,30],[2,6,10,14,18,22,26,29,30]],
 anthem:[[0,3,6,8,14,16,19,22,24,27,30],[0,6,7,10,14,16,22,23,26,30],[2,6,8,11,14,18,22,24,27,30]],
 deep:[[2,10,18,26,30],[0,6,14,22,30],[2,8,14,18,26]],
 soulful:[[2,6,11,14,18,22,26,30],[0,6,10,14,18,23,26,30],[2,7,10,14,18,22,27,30]],
 gospel:[[0,6,10,14,16,22,26,28,30],[2,6,8,14,18,22,24,28,30],[0,3,6,10,14,18,22,26,30]],
 disco:[[2,6,8,10,14,18,22,24,26,30],[0,3,6,10,14,18,20,23,26,30],[2,6,10,12,14,18,22,26,28,30]],
 jersey:[[2,6,10,14,18,22,27,30],[0,6,11,14,18,22,26,30],[2,7,10,14,16,22,27,30]],
 uk:[[0,3,6,11,14,18,21,26,29],[2,5,10,14,16,19,23,26,30],[0,6,9,14,18,21,26,30]],
 latin:[[0,2,6,10,14,18,22,24,28],[0,2,6,10,14,18,22,24,28]]
};
const GENRES={
 'Power Piano House':{pattern:'power',harmony:'power',gate:1,swing:.5,register:70},
 'Classic House':{pattern:'chicago',harmony:'plain',gate:.66,swing:.5,register:67},
 '90s Piano House':{pattern:'anthem',harmony:'plain',gate:.62,swing:.5,register:71},
 'Chicago House':{pattern:'chicago',harmony:'plain',gate:.58,swing:.5,register:66},
 'Deep House':{pattern:'deep',harmony:'deep',gate:1.7,swing:.52,register:64},
 'Soulful House':{pattern:'soulful',harmony:'soul',gate:1.14,swing:.54,register:68},
 'Gospel House':{pattern:'gospel',harmony:'gospel',gate:1.05,swing:.53,register:69},
 'Disco House':{pattern:'disco',harmony:'soul',gate:.72,swing:.54,register:69},
 'NY / NJ Garage':{pattern:'jersey',harmony:'soul',gate:.87,swing:.55,register:67},
 'UK Garage Piano':{pattern:'uk',harmony:'deep',gate:.55,swing:.60,register:68},
 'Latin Piano House':{pattern:'latin',harmony:'latin',gate:1.02,swing:.5,register:68}
};
function config(c){const cfg={key:'A',mode:'Minor',genre:'Power Piano House',progressionSource:'scaler-all',scalerFolder:'Song Sets',scalerSubfolder:'Deep House',scalerSet:'auto',harmonicForm:'original',harmonicIntent:'effortless',corpusMotion:'auto',foundationStyle:'auto',seed:1847283,bpm:124,length:8,loopLength:0,loopOffset:0,form:'AUTO',sync:72,density:55,complexity:48,variation:48,human:24,lockMelody:false,clave:'2:3',harmonyStyle:'auto',articulationStyle:'auto',energy:'auto',body:75,stab:false,stabHarmony:'current',stabProgression:4,stabVoicing:'compact',stabHands:'bounce',stabRepeat:'phrase',bouncePattern:'auto',bounceForm:'AAAA',housemaster:false,oleanHouse:false,...c};
 const legacyForms={ABCD:'original',AAAA:'repeat',ABAB:'alternate',ABBA:'mirror',ABAC:'rondo',AABA:'aaba',ABCB:'response'};cfg.harmonicForm=legacyForms[cfg.harmonicForm]||cfg.harmonicForm;
 cfg.articulationStyle='passages';
 if(cfg.bouncePattern!=='auto'&&!BOUNCE_PATTERNS.some(p=>p.id===cfg.bouncePattern))throw Error('Invalid bounce pattern');
 if(!Object.hasOwn(BOUNCE_FORMS,cfg.bounceForm))throw Error('Invalid bounce form');
 // Higher-level harmonic methods are alternatives, not stacked presets.
 if(cfg.oleanHouse){cfg.housemaster=false;cfg.harmonyStyle='auto';cfg.stabHarmony='current';}
 else if(cfg.housemaster){cfg.harmonyStyle='auto';cfg.stabHarmony='current';}
 if(!cfg.stab){cfg.stabHarmony='current';cfg.bounceForm='AAAA';cfg.bouncePattern='auto';}
 if(cfg.stab){cfg.lockMelody=false;cfg.form='AUTO';cfg.body=100;cfg.energy='full';cfg.stabHands='bounce';}
 if(cfg.stabHarmony==='current')cfg.stabVoicing='compact';
 if(cfg.energy==='suspended')cfg.body=25;
 if(cfg.stabHands!=='bounce'){cfg.bounceForm='AAAA';cfg.bouncePattern='auto';}
 if(!['auto','functional','hybrid','parallel','pedal','borrowed','altered','shapes','common'].includes(cfg.harmonyStyle)||!['auto','passages','passages-pulse'].includes(cfg.articulationStyle)||!['auto','exposition','build','full','suspended'].includes(cfg.energy))throw Error('Invalid phrase character');
 if(!['scaler-house','scaler-all','engine'].includes(cfg.progressionSource))throw Error('Invalid progression source');
 for(const k of ['scalerFolder','scalerSubfolder','scalerSet'])if(typeof cfg[k]!=='string'||cfg[k].length>160)throw Error('Invalid Scaler catalogue selection');
 if(!['original','repeat','alternate','mirror','rondo','aaba','response'].includes(cfg.harmonicForm))throw Error('Invalid harmonic phrase form');
 if(!Object.hasOwn(SCALER_INTENTS,cfg.harmonicIntent)||!SCALER_MOTIONS.includes(cfg.corpusMotion)||!SCALER_FOUNDATIONS.includes(cfg.foundationStyle))throw Error('Invalid corpus direction');
 if(cfg.genre==='Garage House')cfg.genre='NY / NJ Garage';
 if(!['2:3','3:2'].includes(cfg.clave)||typeof cfg.lockMelody!=='boolean')throw Error('Invalid performance options');
 if(!GENRES[cfg.genre]||PCS[cfg.key]==null||!['Major','Minor'].includes(cfg.mode)||![2,4,6,8,16].includes(cfg.length)||![0,1,2,4,6,8,16].includes(cfg.loopLength)||!Number.isInteger(cfg.loopOffset)||cfg.loopOffset<0||cfg.loopOffset>255||!['AUTO','ABAB','ABBA','ABAC','AABA','ABCB','ABCD'].includes(cfg.form))throw Error('Invalid musical settings');
 if(!['current','bass','scale','scale-passages'].includes(cfg.stabHarmony)||![2,3,4].includes(cfg.stabProgression)||!['compact','open'].includes(cfg.stabVoicing))throw Error('Invalid STAB harmony');
 if(!['bounce','dialogue','together'].includes(cfg.stabHands))throw Error('Invalid STAB hands');
 if(!['phrase','bar'].includes(cfg.stabRepeat))throw Error('Invalid STAB repeat');
 if(cfg.bouncePattern!=='auto'&&!BOUNCE_PATTERNS.some(p=>p.id===cfg.bouncePattern))throw Error('Invalid bounce pattern');
 if(!Object.hasOwn(BOUNCE_FORMS,cfg.bounceForm))throw Error('Invalid bounce form');
 if(typeof cfg.oleanHouse!=='boolean')throw Error('Invalid Olean profile');
 if(typeof cfg.housemaster!=='boolean')throw Error('Invalid HOUSEMASTER state');
 if(typeof cfg.stab!=='boolean')throw Error('Invalid STAB state');
 for(const k of ['sync','density','complexity','variation','human','body'])if(!Number.isFinite(cfg[k])||cfg[k]<0||cfg[k]>100)throw Error('Invalid '+k);
 if(!Number.isInteger(cfg.seed)||cfg.seed<0||cfg.seed>4294967295||!Number.isFinite(cfg.bpm)||cfg.bpm<90||cfg.bpm>145)throw Error('Invalid seed or tempo');return cfg;}
// Upper-shape / bass pairs. The first minor variant reconstructs the Olean
// example relative to its tonic. Other variants are authored extensions.
function hybridTemplate(cfg,revision){
 const minor=cfg.mode==='Minor',variant=revision%2;
 const rows=minor?(variant?
  [[0,'m7',0,0,'m7'],[5,'m7',1,1,'maj9'],[10,'m7',3,3,'9sus'],[3,'maj7',0,0,'m9']]:
  [[0,'m7',0,0,'m7'],[10,'m7',3,3,'9sus'],[3,'m7',11,11,'maj9'],[3,'maj7',0,0,'m9']]):(variant?
  [[0,'maj7',0,0,'maj7'],[5,'maj7',2,2,'m9'],[10,'maj7',10,10,'maj7'],[10,'m7',6,6,'maj9']]:
  [[0,'maj7',0,0,'maj7'],[10,'maj7',10,10,'maj7'],[5,'maj7',2,2,'m9'],[5,'m7',1,1,'maj9']]);
 return {id:'upper-bass-'+cfg.mode.toLowerCase()+'-'+variant,chords:rows.map(x=>[x[3],x[4],4]),upper:rows.map((x,i)=>[x[0],x[1],x[2],i===0?'voice-led':i===3?'quality-change':'parallel'])};
}
function harmonicChanged(a,b){return a.rootPc!==b.rootPc||a.quality!==b.quality||(a.bassPc??a.rootPc)!==(b.bassPc??b.rootPc)||a.upper?.rootPc!==b.upper?.rootPc||a.upper?.quality!==b.upper?.quality||[...a.pcs].sort().join(',')!==[...b.pcs].sort().join(',');}
const OLEAN_RULES={hybrid:'Forme trasposte e basso indipendente',pedal:'Maggiore/minore sullo stesso basso',shapes:'Two recurring chord shapes',borrowed:'Discesa modale con chords estesi',altered:'Dominante alterata e ritorno'};
function oleanRule(cfg,revision){
 const pool=['hybrid','pedal','shapes',...(cfg.complexity>=55?['borrowed']:[]),...(cfg.complexity>=75?['altered']:[])];
 return pool[(Math.floor(stream(cfg,'olean-family')()*pool.length)+revision)%pool.length];
}
function makeHarmony(cfg,revision){
 if(cfg.harmonyStyle==='auto'&&cfg.progressionSource!=='engine'&&SCALER_SETS.length)return makeScalerSetHarmony(cfg,revision);
 const rule=cfg.oleanHouse?oleanRule(cfg,revision):null;
 const harmony=makeHarmonyRaw(rule?{...cfg,harmonyStyle:rule}:cfg,revision);
 if(rule)Object.assign(harmony,{oleanRule:rule,oleanRuleName:OLEAN_RULES[rule],source:'Authored MIDI grammar prioritizing the five studied Olean videos'});
 return applyHousemaster(harmony,cfg);
}
function identifyScalerChord(pcs,bassPc){let best={rootPc:bassPc,quality:'major',score:-1e9};for(let rootPc=0;rootPc<12;rootPc++)for(const [quality,q] of Object.entries(QUALITIES)){const wanted=new Set(q.pcs.map(n=>mod(rootPc+n,12))),matches=pcs.filter(pc=>wanted.has(pc)).length,missing=[...wanted].filter(pc=>!pcs.includes(pc)).length,extra=pcs.filter(pc=>!wanted.has(pc)).length,score=matches*4-missing*2-extra+(rootPc===bassPc?1.5:0);if(score>best.score)best={rootPc,quality,score}}return best;}
function makeScalerSetHarmony(cfg,revision){
 let pool=SCALER_SETS.slice();
 if(cfg.scalerSet!=='auto')pool=pool.filter(x=>x.uuid===cfg.scalerSet);
 else{if(cfg.scalerFolder!=='all')pool=pool.filter(x=>x.folder===cfg.scalerFolder);if(cfg.scalerSubfolder!=='all')pool=pool.filter(x=>x.subfolder===cfg.scalerSubfolder);}
 if(cfg.progressionSource==='scaler-house'&&cfg.scalerSet==='auto'&&cfg.scalerFolder==='all')pool=pool.filter(x=>/house/i.test(x.subfolder+' '+x.name));
 if(!pool.length)pool=SCALER_SETS;if(!pool.length)return makeHarmonyRaw({...cfg,harmonyStyle:'functional'},revision);
 const selected=pool[(Math.floor(stream(cfg,'scaler-chord-set')()*pool.length)+revision)%pool.length],totalBeats=cfg.length*4,original=selected.voicings.slice(),blockCount=harmonicBlockCount(original.length),blocks=Array.from({length:blockCount},(_,i)=>original.slice(Math.floor(i*original.length/blockCount),Math.floor((i+1)*original.length/blockCount))),sequence=harmonicFormSequence(cfg.harmonicForm,blockCount),letters='ABCDEFGH';let source=[...sequence].flatMap(letter=>blocks[letters.indexOf(letter)]);if(cfg.simpleMain)source=Array.from({length:cfg.length},(_,i)=>source[i%source.length]);const duration=totalBeats/source.length,tonic=PCS[cfg.simpleMain?(cfg.sourceTranspose||cfg.key):cfg.key],events=[];
 for(let i=0;i<source.length;i++){let notes=[...new Set(source[i].map(n=>60+tonic+n))].sort((a,b)=>a-b);while(Math.min(...notes)<36)notes=notes.map(n=>n+12);while(Math.max(...notes)>88)notes=notes.map(n=>n-12);notes=notes.filter(n=>n>=24&&n<=96);const pcs=[...new Set(notes.map(n=>n%12))],bassPc=notes[0]%12,id=identifyScalerChord(pcs,bassPc),label=NAMES[id.rootPc]+QUALITIES[id.quality].label,upper={rootPc:id.rootPc,quality:id.quality,pcs:pcs.slice(),label},right=notes.length>1?notes.slice(1):[Math.min(96,notes[0]+12)];events.push({index:i,onsetBeat:i*duration,durationBeats:duration,rootPc:id.rootPc,bassPc,quality:id.quality,upper,pcs,label,roman:'SET '+(i+1),technique:'scaler-chord-set',movement:'source-voicing',inversion:bassPc===id.rootPc?'root':'independent-bass',function:i===0?'tonic':'structural',scalerBassNote:notes[0],scalerNotes:right});}
 return {templateId:'scaler-'+selected.uuid,family:'scaler-set',language:'scaler-set',events,upper:null,arc:{id:selected.name,emotion:selected.subfolder,voicing:'source',bassMotion:'source',bassInversions:events.filter(e=>e.inversion!=='root').length,techniques:['embedded chord set',sequence]},scalerSet:{name:selected.name,folder:selected.folder,subfolder:selected.subfolder,uuid:selected.uuid,form:cfg.harmonicForm,formSequence:sequence,sourceChordCount:original.length,blockCount}};
}
function harmonicBlockCount(chordCount){return chordCount<=4?chordCount:chordCount<=8?4:8;}
function harmonicFormSequence(form,count){const abc='ABCDEFGH'.slice(0,count),repeat=(s,n)=>Array.from({length:n},(_,i)=>s[i%s.length]).join('');if(form==='repeat')return'A'.repeat(count);if(form==='alternate')return repeat('AB'.slice(0,count),count);if(form==='mirror')return abc.slice(0,Math.ceil(count/2))+abc.slice(0,Math.floor(count/2)).split('').reverse().join('');if(form==='rondo')return Array.from({length:count},(_,i)=>i%2?'ABCDEFGH'[Math.min((i+1)/2,count-1)]:'A').join('');if(form==='aaba')return repeat('AABA'.slice(0,count),count);if(form==='response')return repeat('ABCB'.slice(0,count),count);return abc;}
function makeHarmonyRaw(cfg,revision){const p=GENRES[cfg.genre],minor=cfg.mode==='Minor';
 // The default and Functional methods now use a full dramatic scene. The
 // special methods below remain deliberate alternatives with their own rules.
 let template=expressiveTemplate(cfg,revision),language='expressive';
 const hybrid=cfg.harmonyStyle==='hybrid';
 if(hybrid){language='hybrid';template=hybridTemplate(cfg,revision);}
 else if(cfg.harmonyStyle==='parallel'){language='parallel';template={id:'sampled-shape-'+revision%2,chords:revision%2?[[0,minor?'m7':'maj7',4],[5,minor?'m7':'maj7',4],[10,minor?'m7':'maj7',4],[7,minor?'m7':'maj7',4]]:[[0,minor?'m7':'maj7',8],[7,minor?'m7':'maj7',4],[9,minor?'m7':'maj7',4]]};}
 const family=researchFamily(cfg,revision);
 if(family){template=researchTemplate(family,cfg,revision);language=family==='pedal'?'hybrid':family;}
 // Gospel and high-complexity soul can approach a structural destination by
 // semitone. Its duration is taken from the preceding chord, so the arc length
 // and destination stay unchanged.
 if(!family&&language==='expressive'&&((p.harmony==='gospel'&&cfg.complexity>=60)||(p.harmony==='soul'&&cfg.complexity>=85))){
  const candidates=template.chords.map((row,i)=>({row,i})).filter(x=>x.i>0&&x.row[2]>=2&&x.row[4]!=='tonic');
  if(candidates.length){const target=candidates[(revision+1)%candidates.length],span=cfg.complexity>=90?1:.5,previous=template.chords[target.i-1];if(previous[2]>span){previous[2]-=span;template.chords.splice(target.i,0,[mod(target.row[0]-1,12),'dim7',span,'vii°7/'+target.row[3],'leading-diminished','chromatic-approach']);}}
 }
 const templateBeats=template.chords.reduce((n,c)=>n+c[2],0),total=cfg.length*4,cycleBeats=template.composed?total:cfg.length===2?8:Math.min(templateBeats,cfg.length===4||cfg.length===6?16:32),scale=cycleBeats/templateBeats,events=[];
 for(let start=0;start<total;start+=cycleBeats){let beat=start;for(let ci=0;ci<template.chords.length;ci++){
  let [degree,quality,dur,roman,functionName,technique,details]=template.chords[ci];
  if(family==='altered'&&ci===1)quality=(revision+Math.floor(start/cycleBeats))%2?'7#5b9':'7b9';
  if(family==='common'&&cfg.mode==='Minor'&&ci===2&&cfg.complexity>=70)quality='9sus';
  if(beat>=total)break;
  const duration=Math.min(dur*scale,total-beat),rootPc=mod(PCS[cfg.key]+degree,12),q=QUALITIES[quality],spec=template.upper?.[ci];
  const upperRoot=spec?mod(PCS[cfg.key]+spec[0],12):rootPc,upperQuality=spec?.[1]||quality,bassPc=spec?mod(PCS[cfg.key]+spec[2],12):details?.bassDegree==null?rootPc:mod(PCS[cfg.key]+details.bassDegree,12);
  const upper={rootPc:upperRoot,quality:upperQuality,pcs:[...new Set(QUALITIES[upperQuality].pcs.map(x=>mod(x+upperRoot,12)))],label:NAMES[upperRoot]+QUALITIES[upperQuality].label};
  const pcs=[...new Set([...upper.pcs,bassPc])].sort((a,b)=>a-b);
  events.push({index:events.length,onsetBeat:beat,durationBeats:duration,rootPc,quality,upper,bassPc,pcs,label:NAMES[rootPc]+q.label+(bassPc!==rootPc?'/'+NAMES[bassPc]:''),roman:roman||null,technique:technique||'authored-special-method',movement:spec?.[3]||(language==='parallel'?'parallel':'voice-led'),inversion:spec?'independent-bass':details?.inversion||'root',bassMotion:details?.bassMotion||null,developedPass:Boolean(details?.developedPass),shapeKey:family==='shapes'?(ci%2?'B':'A'):null,melodyDegree:family==='common'?(cfg.mode==='Minor'?[2,10,5,3]:[2,7,4,0])[ci]:null,function:functionName||(['sus','9sus','13sus','m7sus4'].includes(quality)?'suspension':['7','9','11','13','13b9','7b13','7b9','7#5b9','7#9','7#5','7b5'].includes(quality)?'dominant':'structural'),template:template.id});beat+=duration;
 }}
 // A cropped six-bar phrase also needs a meaningful return. A final passing
 // event is always rebuilt against its actual destination at the loop seam.
 for(let i=0;i<events.length;i++){
  const e=events[i],dest=events[(i+1)%events.length];
  if(e.quality==='dim7')e.function='leading-diminished';
  if(e.function==='dominant'&&mod(e.rootPc+5,12)!==dest.rootPc)e.function='colour';
  e.destinationIndex=['dominant','suspension','leading-diminished'].includes(e.function)?dest.index:null;
  e.transitionEvidence=i===events.length-1?'designed-loop-return':e.technique||'authored-functional-sequence';
 }
 annotateResolutions(events);
 if(language==='shapes')for(const h of events){h.resolutionRules=[];h.destinationIndex=null;if(h.function==='suspension')h.function='recalled-shape';}
 const arc=template.scene?{...copy(template.scene),techniques:[...new Set(events.map(e=>e.technique).filter(Boolean))]}:null;
 return {events,family:family||null,language,template:template.id,cycleBeats,arc,source:arc?'expressive functional grammar informed by public harmony theory':'authored harmonic grammar',plan:events.map(e=>e.quality+':'+e.rootPc)};
}
function transformGestureCell(hits,operation,width=4){
 const factor=operation==='double'?2:operation==='quadruple'?4:1;
 return {width:width*factor,hits:hits.map(h=>({...h,step:operation==='reverse'?width-1-h.step:h.step*factor,duration:h.duration*factor,operation})).sort((a,b)=>a.step-b.step)};
}
function inRest(step,rests,role='upper'){return rests.some(x=>x.role===role&&step>=x.start&&step<x.end);}
function restLimit(step,rests,role='upper'){return Math.min(Infinity,...rests.filter(x=>x.role===role&&x.start>step).map(x=>x.start*STEP));}
const ENERGY_LABELS={exposition:'Exposition',build:'Build',full:'Full',suspended:'Suspended'};
function energyAt(cfg,bar){
 if(cfg.energy!=='auto')return cfg.energy;
 if(cfg.length<8)return 'full';
 const section=Math.floor(bar/2)%4,second=Math.floor(bar/8)%2;
 return (second?['suspended','build','full','full']:['exposition','build','full','full'])[section];
}
function shapeEnergy(attacks,cfg){
 return attacks.filter(h=>{const energy=energyAt(cfg,h.bar);
  if(h.operation==='cadential-arrival'||h.essential&&h.role!=='bass')return true;
  if(h.role==='bass')return !['exposition','suspended'].includes(energy)||h.bassFunction!=='octave';
  return energy==='full'||energy==='build'||energy==='exposition'&&Math.floor(h.step)%3===0;
 }).map(h=>{const energy=energyAt(cfg,h.bar),out={...h,energy};
  if(h.operation==='cadential-arrival')return out;
  if(energy==='exposition'){out.velocity-=12;if(out.role==='full')out.role='outer';}
  if(energy==='build'){out.velocity-=4;if(!out.essential)out.duration*=.8;}
  if(energy==='suspended'){out.velocity-=20;if(out.role!=='bass'){out.role='upper';if(out.articulation==='held')out.duration*=1.25;}}
  return out;
 });
}
function makeRhythm(cfg,revision){if(cfg.oleanHouse)cfg={...cfg,harmonyStyle:'auto'};const p=GENRES[cfg.genre],r=stream(cfg,'rhythm',revision),patterns=PATTERNS[p.pattern];let pattern=patterns[(Math.floor(stream(cfg,'rhythm-base')()*patterns.length)+revision)%patterns.length];
 if(p.pattern==='latin'&&cfg.clave==='3:2')pattern=pattern.map(t=>mod(t+16,32)).sort((a,b)=>a-b);
 if(cfg.harmonyStyle==='common')pattern=[0,10,14,26,30];
 const motifs={},motifRests={},transformations={};
 const essential=new Set([pattern[0],pattern.find(t=>t>=8&&t<16),pattern.find(t=>t>=16),pattern.at(-1)]);
 const roles=p.pattern==='latin'?['outer','inner','outer','inner']:p.pattern==='deep'?['full','upper','full','inner']:['full','inner','upper','full'];
 const roleShift=Math.floor(r()*roles.length);
 let original=pattern.map((step,i)=>{
  const role=i===0?'full':roles[(i+roleShift)%roles.length],gap=(pattern[i+1]??32)-step;
  const articulation=i===0?'held':step>=28?'pickup':role==='inner'?'ghost':essential.has(step)?'stab':'answer';
  // Durations describe musical gestures, in sixteenths; they are not jitter on one gate.
  const duration=articulation==='held'?Math.min(p.pattern==='power'?8:6,Math.max(4,gap-.5)):articulation==='pickup'?.6:articulation==='ghost'?.55:articulation==='stab'?1:Math.min(2.5,gap*.75);
  return {step,duration,articulation,velocity:articulation==='held'?104:articulation==='ghost'?69:articulation==='pickup'?84:articulation==='stab'?100:88,role,essential:essential.has(step),anticipate:articulation!=='held',operation:'motif'};
 });
 // A held top can continue while the inner voices answer beneath it.
 if(original[1]&&original[1].step<original[0].step+original[0].duration&&!original[1].essential)original[1].role='inner';
 original=original.filter((h,i)=>h.essential||cfg.density>=40||(i%3===0&&cfg.density>=20));
 if(cfg.density>72&&p.pattern!=='latin')for(const t of [5,13,21,29])if(!original.some(h=>Math.abs(h.step-t)<1.5))original.push({step:t,duration:1,velocity:64,role:'inner',essential:false,anticipate:false,operation:'quiet-answer'});
 if(cfg.sync<35&&p.pattern!=='latin')for(const h of original)if(!h.essential){h.step=Math.floor(h.step/4)*4;h.operation='grounded';}
 if(cfg.sync>85&&p.pattern!=='latin')for(const h of original)if(!h.essential&&h.step%4===0){h.step=Math.max(0,h.step-1);h.operation='displaced';}
 const corpusMotion=resolvedScalerMotion(cfg);
 if(corpusMotion==='performance')for(const [i,h] of original.entries()){h.velocity+=i%4===0?7:i%2?-3:2;h.duration*=h.essential?1.12:.88;h.operation='scaler-performance-dynamics';}
 else if(corpusMotion==='phrase')for(const [i,h] of original.entries()){h.duration*=h.essential?1.35:1.08;h.velocity+=i%3===0?4:-2;h.operation='scaler-phrase-contour';}
 else if(corpusMotion==='sequence')for(const [i,h] of original.entries()){h.duration=Math.min(h.duration,.82);h.role=i%3===0?'full':i%2?'upper':'inner';h.operation='scaler-sequence-motion';}
 else if(corpusMotion==='strummed')for(const [i,h] of original.entries()){h.duration=Math.min(h.duration,1.25);h.strum=(i%2?1:-1);h.role=h.essential?'full':i%2?'upper':'inner';h.operation='scaler-strummed-motion';}
 else if(corpusMotion==='rhythmic')for(const h of original){h.duration=Math.min(h.duration,h.essential?1.35:.72);h.operation='scaler-rhythmic-chords';}
 function unique(hits){return [...new Map(hits.sort((a,b)=>Number(a.essential)-Number(b.essential)).map(h=>[h.step,h])).values()].sort((a,b)=>a.step-b.step);}
 original=unique(original);
 const gaps=[];for(let i=0;i<original.length-1;i++){const h=original[i],start=h.step+Math.max(2,Math.ceil(h.duration+.5));if(original[i+1].step-start>=1)gaps.push({start,end:original[i+1].step,role:'upper'});}
 const protectedRest=cfg.harmonyStyle!=='common'&&gaps.length?[copy(gaps[Math.floor(r()*gaps.length)])]:[];
 for(const letter of ['A','B','C','D']){let hs=copy(original);
  if(letter!=='A')for(const h of hs){if(!h.essential&&h.step>=16){h.role=letter==='B'?'upper':letter==='C'?'inner':h.role;h.duration*=letter==='B'?.75:1.25;h.velocity+=letter==='D'?5:-5;h.operation='response';}if(letter==='C'&&!h.essential&&h.step<16)h.velocity-=10;}
  if(letter==='D'&&cfg.variation>65&&p.pattern!=='latin')hs=hs.filter(h=>h.essential||h.step<24);
  const rests=copy(protectedRest),ops=[];
  if(letter==='D'&&cfg.variation>65&&p.pattern!=='latin'){
   const nextAnchor=hs.find(h=>h.essential&&h.step>=24);if(nextAnchor&&nextAnchor.step>24)rests.push({start:24,end:nextAnchor.step,role:'upper'});
  }
  // Transform only the subordinate answer; retain the call and its anchors.
  if(letter!=='A'&&cfg.variation>=55&&p.pattern!=='latin'){
   const q=original.filter(h=>h.step>=4&&h.step<8).map(h=>({...h,step:h.step-4,essential:false,role:'inner'}));
   const op=letter==='B'?'double':letter==='C'?'reverse':'quadruple',unit=transformGestureCell(q.length?q:[{step:0,duration:1,velocity:70,role:'inner',essential:false,anticipate:false}],op);
   for(const h of unit.hits){const step=16+h.step;if(step<31&&!inRest(step,rests)&&!hs.some(x=>Math.abs(x.step-step)<1.5))hs.push({...h,step,velocity:Math.min(78,h.velocity),anticipate:false});}
   ops.push(op);
   if(letter==='C')for(const h of hs)if(!h.essential&&h.role==='upper'){h.contour='mirror';ops.push('melodic-inversion');}
  }
  motifs[letter]=unique(hs.filter(h=>h.essential||!inRest(h.step,rests)));motifRests[letter]=rests;transformations[letter]=[...new Set(ops)];
 }
 const formCode=cfg.form==='AUTO'?(cfg.variation<25?'AAAA':cfg.variation<65?'ABAC':'ABAD'):cfg.form;
 const sections=Array.from({length:Math.ceil(cfg.length/2)},(_,i)=>formCode[i%4]),form=Array.from({length:cfg.length},(_,b)=>sections[Math.floor(b/2)]),attacks=[],protectedRests=[];
 for(let b=0;b<cfg.length;b+=2)for(const rest of motifRests[sections[b/2]])protectedRests.push({...rest,start:rest.start+b*16,end:Math.min(rest.end+b*16,cfg.length*16)});
 for(let b=0;b<cfg.length;b+=2)for(const h of motifs[sections[b/2]])if(b*16+h.step<cfg.length*16)attacks.push({...h,step:b*16+h.step,bar:Math.floor((b*16+h.step)/16),motif:sections[b/2]});
 if(p.pattern==='power'&&['auto','functional'].includes(cfg.harmonyStyle)&&cfg.length>=8){
  for(const h of attacks){const phase=h.bar%8;h.velocity+=phase>=4?5:0;if(phase>=4&&h.articulation==='held')h.duration=Math.max(h.duration,7);}
  for(let bar=7;bar<cfg.length;bar+=8){const start=bar*16;
   // A real arrival needs room. Retain a short pickup at the end of the bar.
   for(let i=attacks.length-1;i>=0;i--)if(attacks[i].step>=start&&attacks[i].step<start+14)attacks.splice(i,1);
   for(let i=protectedRests.length-1;i>=0;i--)if(protectedRests[i].start<start+12&&protectedRests[i].end>start)protectedRests.splice(i,1);
   attacks.push({step:start,bar,duration:12,articulation:'arrival',velocity:111,role:'full',essential:true,anticipate:false,operation:'cadential-arrival',motif:form[bar]});
  }
 }
 const foundation=resolvedScalerFoundation(cfg);
 for(let b=0;b<cfg.length;b++){const bassSteps=foundation==='grounded'?[0]:foundation==='octave'?[0,6]:foundation==='walking'?[0,6,12]:foundation==='pedal'?[0]:foundation==='syncopated'?[0,6,14]:foundation==='voice-led'?[0,10]:p.pattern==='latin'?[6,12]:p.pattern==='uk'?[0,10]:p.pattern==='disco'?[0,7]:['power','anthem','chicago'].includes(p.pattern)?[0,6]:[0];
  for(const t of bassSteps)attacks.push({step:b*16+t,bar:b,duration:foundation==='pedal'?12:p.pattern==='deep'?6:p.pattern==='latin'?(t===12?10:6):2.5,velocity:foundation==='walking'?78:84,role:'bass',essential:true,bassFunction:foundation==='octave'&&t>0?'octave':foundation==='walking'&&t===6?'fifth':p.pattern==='latin'&&t===6?'fifth':['power','anthem','chicago'].includes(p.pattern)&&t===6?'octave':'root',anticipate:foundation==='syncopated'&&t===14||p.pattern==='latin'&&t===12,operation:'scaler-'+foundation+'-bass',motif:form[b]});}
 const shaped=shapeEnergy(attacks,cfg);attacks.splice(0,attacks.length,...shaped);
 attacks.sort((a,b)=>a.step-b.step||a.role.localeCompare(b.role));attacks.forEach((h,i)=>h.id=i);
 return {energy:cfg.energy,energySections:Array.from({length:Math.ceil(cfg.length/2)},(_,i)=>energyAt(cfg,i*2)),motifs,motifRests,protectedRests,transformations,clave:cfg.clave,form,sections,attacks,target:Math.round(original.length/2),corpusMotion,foundation,operations:['two-bar motif','protected accents','protected rests','voice response','independent left hand','energy development','Scaler corpus '+corpusMotion,'Scaler bass '+foundation,...[...new Set(sections)].flatMap(x=>transformations[x])],pattern:pattern.join(',')};
}
/* A harmonic passage is phrased from the harmonic rhythm itself. Each new
   harmony receives one supported piano attack; the upper structure lasts to
   the next change and common pitches can remain tied across that boundary.
   The bass states the inversion clearly, then releases earlier to avoid mud. */
function makePassagesRhythm(cfg,harmony,base,revision=0){
 const source=base.passagesBase||base,attacks=[],total=cfg.length*16,r=stream(cfg,'passages',revision),pulse=cfg.articulationStyle==='passages-pulse';
 for(const h of harmony.events){
  const step=h.onsetBeat*4;if(step>=total)continue;
  const harmonicSteps=Math.max(1,Math.min(h.durationBeats*4,total-step));
  const arrival=['tonic','deceptive-tonic','temporary-tonic'].includes(h.function),tension=['dominant','applied-dominant','suspension'].includes(h.function);
  const velocity=96,bar=Math.floor(step/16),motif=source.form[bar]||'A';
  attacks.push({id:'passage:'+h.index+':piano',step,bar,role:'full',duration:harmonicSteps,velocity,essential:true,anticipate:false,articulation:'sustained-chord',operation:'straight-sustained-harmony',motif,energy:energyAt(cfg,bar),harmonicSlot:h.index});
  attacks.push({id:'passage:'+h.index+':bass',step,bar,role:'bass',duration:harmonicSteps,velocity:Math.max(72,velocity-8),essential:true,anticipate:false,articulation:'sustained-bass',bassFunction:'root',operation:'straight-sustained-bass',motif,energy:energyAt(cfg,bar),harmonicSlot:h.index});
  if(pulse)for(let cell=step;cell<step+harmonicSteps;cell+=16){
   const available=Math.min(16,step+harmonicSteps-cell);if(available<8)continue;
   const turn=(Math.floor(cell/16)+revision+h.index)%2;
   for(const [pi,[offset,register,duration]] of [[4,turn?'middle':'high',3.65],[8,turn?'high':'middle',Math.min(7.65,available-8)]].entries())if(offset<available)attacks.push({id:'passage:'+h.index+':pulse:'+cell+':'+pi,step:cell+offset,bar:Math.floor((cell+offset)/16),role:'pulse',pulseRegister:register,duration:Math.max(.75,duration),velocity:velocity-(pi?8:2),essential:false,anticipate:false,articulation:'passage-pulse',operation:'octave-pulse',motif,energy:energyAt(cfg,Math.floor((cell+offset)/16)),harmonicSlot:h.index});
  }
 }
 attacks.sort((a,b)=>a.step-b.step||a.role.localeCompare(b.role));
 const form=Array.from({length:cfg.length},(_,bar)=>source.form[bar]||'A'),sections=source.sections?.slice()||Array.from({length:Math.ceil(cfg.length/2)},()=> 'A');
 return {...copy(source),passagesBase:copy(source),passages:true,passagesPulse:false,form,sections,attacks,protectedRests:[],pattern:attacks.filter(h=>h.role!=='bass').map(h=>h.step).join(','),operations:['straight harmonic blocks','full-duration chords','full-duration bass'],energySections:Array.from({length:Math.ceil(cfg.length/2)},(_,i)=>energyAt(cfg,i*2))};
}
function inversions(notes){return notes.map((_,i)=>notes.map((n,j)=>n+(j<i?12:0)).sort((a,b)=>a-b));}
function playableUpperPcs(chord){const quality=chord.upper?.quality||chord.quality,root=chord.upper?.rootPc??chord.rootPc;return [...new Set(QUALITIES[quality].upper.map(n=>mod(n+root,12)))];}
function voiceCandidates(chord,cfg){const center=GENRES[cfg.genre].register,q=QUALITIES[chord.upper?.quality||chord.quality],upperRoot=chord.upper?.rootPc??chord.rootPc,out=[];
 for(const inv of inversions(q.upper))for(const octave of [36,48,60]){const notes=inv.map(n=>n+upperRoot+octave);if(notes[0]<53||notes.at(-1)>86)continue;out.push({notes,cost:Math.abs(notes.reduce((a,b)=>a+b,0)/notes.length-center)*.25});
  if(GENRES[cfg.genre].harmony==='power'&&notes.length>=4&&notes[1]-12>=53){const open=[notes[1]-12,notes[0],...notes.slice(2)].sort((a,b)=>a-b);out.push({notes:open,cost:Math.abs(open.reduce((a,b)=>a+b,0)/open.length-center)*.2-.4});}
 }return out;}
function voiceCost(a,b){return b.reduce((s,n)=>s+Math.min(...a.map(x=>Math.abs(x-n))),0)/b.length;}
function planVoicings(harmony,cfg,revision,lockedPlan){if(harmony.events.every(h=>h.scalerNotes?.length))return harmony.events.map(h=>({notes:h.scalerNotes.slice(),topTarget:h.scalerNotes.at(-1),inverted:h.inversion!=='root',voicingOperation:'scaler-source'}));const r=stream(cfg,'voicing',revision),contour=pick([[0,0,-2,0],[0,2,0,-2],[0,-2,-3,0]],r),center=GENRES[cfg.genre].register+5+pick([-2,0,2],r);
 if(lockedPlan){
  if(harmony.events.some(h=>h.resolutionRules?.length)){const result=copy(lockedPlan);for(let i=0;i<result.length;i++){const candidates=melodicCandidates(harmony.events[i],lockedPlan[i].notes.at(-1),cfg).filter(v=>v.notes.join(',')!==result[i].notes.join(','));for(const c of candidates.sort((a,b)=>hash(a.notes.join(',')+revision)-hash(b.notes.join(',')+revision))){const previous=result[i];result[i]={...previous,notes:c.notes};if(performedResolutions(harmony,result).every(x=>x.resolved))break;result[i]=previous;}}return result;}
  if(['parallel','shapes'].includes(harmony.language))return copy(lockedPlan);
  return harmony.events.map((h,i)=>{if(h.movement==='parallel'||harmony.events[(i+1)%harmony.events.length].movement==='parallel')return copy(lockedPlan[i]);
   const top=lockedPlan[i].notes.at(-1),base=lockedPlan[i].notes;
   const choices=voiceCandidates(h,cfg).filter(v=>v.notes.at(-1)===top&&JSON.stringify(v.notes)!==JSON.stringify(base));
   if(!choices.length){const inner=base.slice(0,-1).map((n,j)=>j===0&&n-12>=48?n-12:n);choices.push({notes:[...inner,top].sort((a,b)=>a-b)});}
   return {notes:pick(choices,r).notes,inverted:true,topTarget:top};
  });
 }
 if(harmony.language==='parallel'){const q=QUALITIES[harmony.events[0].quality],base=pick([q.upper,inversions(q.upper)[1]],r),shifts=harmony.events.map(h=>mod(h.rootPc-PCS[cfg.key],12));let octave=48;if(Math.max(...shifts)+PCS[cfg.key]+octave+base.at(-1)>86)octave-=12;
  return harmony.events.map((h,i)=>({notes:base.map(n=>n+PCS[cfg.key]+shifts[i]+octave),inverted:false,topTarget:base.at(-1)+PCS[cfg.key]+shifts[i]+octave}));}
 if(harmony.language==='hybrid')return planHybridVoicings(harmony,cfg,revision);
 if(harmony.language==='shapes')return planShapeBank(harmony,cfg,revision);
 if(['played','expressive','common','altered','borrowed'].includes(harmony.language))return planMelodicVoicings(harmony,cfg,revision);
 // Plan the upper voice over a complete cycle, including the return.
 const count=harmony.events.filter(h=>h.onsetBeat<harmony.cycleBeats).length,cycle=harmony.events.slice(0,count);let beam=[{cost:0,path:[]}];
 const power=GENRES[cfg.genre].harmony==='power';
 for(let i=0;i<cycle.length;i++){const target=center+(power?[-3,-1,1,3,1,4,5,4,3][i%9]:contour[i%contour.length]),candidates=voiceCandidates(cycle[i],cfg),next=[];if(!candidates.length)throw Error('No playable voicing');
  for(const state of beam)for(const c of candidates){const prev=state.path.at(-1)?.notes;let cost=state.cost+c.cost+Math.abs(c.notes.at(-1)-target)*(power?1.6:.7);if(prev)cost+=voiceCost(prev,c.notes)+Math.abs(prev.at(-1)-c.notes.at(-1))*(power?.3:.6);if(i===cycle.length-1&&state.path.length)cost+=voiceCost(c.notes,state.path[0].notes)*.65;next.push({cost,path:[...state.path,{notes:c.notes,inverted:true,topTarget:target}]});}
  next.sort((a,b)=>a.cost-b.cost||JSON.stringify(a.path).localeCompare(JSON.stringify(b.path)));beam=next.slice(0,16);}
 const chosen=pick(beam.filter(x=>x.cost<=beam[0].cost+1.8).slice(0,4),r).path;return harmony.events.map((h,i)=>copy(chosen[i%count]));
}
function planHybridVoicings(harmony,cfg,revision){
 const count=harmony.events.filter(h=>h.onsetBeat<harmony.cycleBeats).length,cycle=harmony.events.slice(0,count),r=stream(cfg,'hybrid-voicing',revision);
 let beam=[{cost:0,path:[]}];
 for(let i=0;i<cycle.length;i++){
  const chord=cycle[i],next=[];
  for(const state of beam){const prev=state.path.at(-1)?.notes;let candidates;
   if(prev&&chord.movement==='parallel'){
    const delta=chord.upper.rootPc-cycle[i-1].upper.rootPc;
    candidates=[-24,-12,0,12,24].map(o=>({notes:prev.map(n=>n+delta+o),cost:Math.abs(delta+o)*.12})).filter(v=>v.notes[0]>=53&&v.notes.at(-1)<=86);
   }else candidates=voiceCandidates(chord,cfg);
   for(const v of candidates){let cost=state.cost+v.cost+Math.abs(v.notes.at(-1)-(GENRES[cfg.genre].register+5))*.2;
    if(prev&&chord.movement!=='parallel')cost+=voiceCost(prev,v.notes)+Math.abs(prev.at(-1)-v.notes.at(-1))*.5;
    next.push({cost,path:[...state.path,{notes:v.notes,topTarget:v.notes.at(-1),inverted:chord.movement!=='parallel',movement:chord.movement}]});
   }
  }
  next.sort((a,b)=>a.cost-b.cost||JSON.stringify(a.path).localeCompare(JSON.stringify(b.path)));beam=next.slice(0,24);if(!beam.length)throw Error('No playable hybrid path');
 }
 const choices=beam.filter(x=>x.cost<beam[0].cost+4).slice(0,8),selected=choices[(Math.floor(r()*choices.length)+revision)%choices.length].path;
 return harmony.events.map((h,i)=>copy(selected[i%count]));
}
function activeIndex(harmony,beat){let i=0;while(i+1<harmony.events.length&&harmony.events[i+1].onsetBeat<=beat+1e-8)i++;return i;}
function harmonicTarget(harmony,hit,cfg){if(hit.articulation?.startsWith('sustained-')&&Number.isInteger(hit.harmonicSlot))return {index:hit.harmonicSlot,anticipation:false};const beat=hit.step/4,active=activeIndex(harmony,beat),next=(active+1)%harmony.events.length,at=next===0?cfg.length*4:harmony.events[next].onsetBeat,window=!cfg.stab&&GENRES[cfg.genre].pattern==='latin'&&hit.role==='bass'?1:.5;
 const anticipation=hit.anticipate&&cfg.sync>=45&&at-beat>0&&at-beat<=window&&harmonicChanged(harmony.events[active],harmony.events[next]);return {index:anticipation?next:active,anticipation,active};}
function swingTick(step,ratio){const pair=Math.floor(step/2),phase=step-pair*2;return(pair*2+(phase<=1?phase*2*ratio:2*ratio+(phase-1)*2*(1-ratio)))*STEP;}
function sanitize(events,total){const out=[],seen=new Map();events.sort((a,b)=>a.startTick-b.startTick||a.note-b.note||Number(b.stab&&b.role==='bass')-Number(a.stab&&a.role==='bass')||b.velocity-a.velocity);
 for(const e0 of events){const e={...e0,startTick:clamp(Math.round(e0.startTick),0,total-1),endTick:clamp(Math.round(e0.endTick),1,total)};if(e.endTick<=e.startTick)e.endTick=e.startTick+1;const key=e.startTick+':'+e.note;if(seen.has(key)){const shared=seen.get(key);if(e.hand&&shared.hand&&e.hand!==shared.hand)shared.sharedRight=true;continue;}seen.set(key,e);out.push(e);}
 const last=new Map();for(const e of out){const prev=last.get(e.note);if(prev&&prev.endTick>e.startTick)prev.endTick=e.startTick;last.set(e.note,e);}return out;}
function releaseLimit(harmony,fromBeat,pitch,cfg){for(const h of harmony.events)if(h.onsetBeat>fromBeat+1e-8&&!h.pcs.includes(mod(pitch,12)))return h.onsetBeat*PPQ;return cfg.length*BAR;}
function preserveMelody(events,locked){
 if(!locked)return events;
 return [...events.filter(e=>e.role!=='top'&&!locked.some(t=>t.note===e.note&&e.startTick<t.endTick&&e.endTick>t.startTick)),...copy(locked)];
}
function ornamentEvents(events,harmony,rhythm,cfg){
 if(cfg.complexity<70||!['soul','gospel'].includes(GENRES[cfg.genre].harmony))return events;
 const out=events.slice(),used=new Set();
 for(const target of events.filter(e=>e.role==='top'&&e.essential)){
  const section=Math.floor(target.bar/2);if(used.has(section)||target.startTick<120)continue;
  const start=target.startTick-60;if((rhythm.protectedRests||[]).some(x=>x.role==='upper'&&start<x.end*STEP&&target.startTick>x.start*STEP))continue;
  const note=target.note-1;if(note<36||out.some(e=>e.note===note&&e.startTick<target.startTick&&e.endTick>start))continue;
  out.push({...target,note,role:'ornament',gesture:'chromatic-approach',essential:false,ghost:true,velocity:Math.max(38,target.velocity-23),startTick:start,endTick:target.startTick,attackIndex:'grace:'+target.attackIndex,resolutionTarget:{note:target.note,startTick:target.startTick,attackIndex:target.attackIndex}});used.add(section);
 }
 return out;
}
function articulatedDuration(hit,top,profile,voiceIndex=0,voiceCount=1){
 if(hit.articulation==='house-stab'||hit.role==='bass')return hit.duration;
 if(hit.articulation==='passage-pulse')return hit.duration;
 if(hit.articulation==='passage-held')return hit.duration*(top?1:[.92,.96,.985][(voiceIndex+hit.bar)%3]);
 // Each voice now has its own release profile. The top can sing over a shorter
 // inner answer, while guide tones alternate between dry and sustained releases.
 const phase=voiceCount<=1?1:voiceIndex/(voiceCount-1),alternate=(voiceIndex+hit.bar)%3;
 if(['held','arrival'].includes(hit.articulation))return hit.duration*(top?1:hit.articulation==='arrival'?[.58,.74,.86][alternate]:[.42,.62,.78][alternate]);
 if(hit.articulation==='ghost')return hit.duration*(top?.96:[.62,.76,.86][alternate]);
 if(hit.articulation==='pickup')return hit.duration*(top?1:[.68,.82,.92][alternate]);
 const innerShape=[.64,.79,.92][alternate]+phase*.05;
 return hit.duration*clamp(profile.gate,.5,1.4)*(top?1.08:innerShape);
}
function tiePassageCommonTones(events){
 const ordered=events.slice().sort((a,b)=>a.note-b.note||a.startTick-b.startTick),kept=[],last=new Map();
 for(const e of ordered){
  const prev=last.get(e.note),eligible=e.articulation==='passage-held'&&prev?.articulation==='passage-held'&&prev.harmonicSlot!==e.harmonicSlot;
  // Human timing and rolled attacks can leave a very small gap around a
  // harmonic boundary. Treat it as a real piano tie when the pitch is common.
  if(eligible&&e.startTick-prev.endTick<=STEP*1.25&&e.startTick>=prev.startTick){
   prev.endTick=Math.max(prev.endTick,e.endTick);prev.tiedAcrossHarmony=true;prev.tiedSlots=[...(prev.tiedSlots||[prev.harmonicSlot]),e.harmonicSlot];continue;
  }
  kept.push(e);last.set(e.note,e);
 }
 return kept.sort((a,b)=>a.startTick-b.startTick||a.note-b.note);
}
function renderModel(grammar,cfg,harmony,rhythm,revisions,voicingPlan,lockedTop){
 cfg=config(cfg);const filtered=applyHousemaster(harmony,cfg);if(filtered!==harmony){harmony=filtered;voicingPlan=null;lockedTop=null;}rhythm=rhythm.stabBase||rhythm;rhythm=rhythm.passagesBase||rhythm;if(cfg.stab){rhythm=makeStabRhythm(cfg,rhythm,revisions.rhythm);lockedTop=null;}else if(cfg.articulationStyle!=='auto'||resolvedScalerMotion(cfg)==='sustained')rhythm=makePassagesRhythm(cfg,harmony,rhythm,revisions.rhythm);
 const p=GENRES[cfg.genre],events=[];let bassPrev=43;const bassAnchors=new Map(),resolutionArrivals=new Set();voicingPlan=voicingPlan||planVoicings(harmony,cfg,revisions.voicing);
 for(const hit of (cfg.stab?rhythm.attacks:(rhythm.passages?rhythm.attacks:coordinatePiano(harmony,rhythm,cfg)).map(h=>bodyGesture(h,cfg)))){const target=harmonicTarget(harmony,hit,cfg),chord=harmony.events[target.index],voicing=voicingPlan[target.index].notes;let notes=cfg.stab?(hit.role!=='bass'&&cfg.stabHands==='bounce'?powerStabNotes(voicing,chord):hit.role!=='bass'&&cfg.stabHands==='dialogue'?rightHandStabNotes(voicing,chord):plannedStabNotes(voicing,chord)):voicing.slice();
  if(hit.role==='bass'){
   const bassPc=chord.bassPc??chord.rootPc,fifth=mod(bassPc+7,12),pc=hit.bassFunction==='common'&&chord.pcs.includes(hit.commonPc)?hit.commonPc:hit.bassFunction==='fifth'&&chord.pcs.includes(fifth)?fifth:bassPc;
   const candidates=[24,36,48].map(n=>n+pc).filter(n=>n>=36&&n<=52).sort((a,b)=>Math.abs(a-bassPrev)-Math.abs(b-bassPrev)||a-b);const anchorKey=hit.bar+':'+target.index;const anchor=hit.bassFunction==='octave'?(bassAnchors.get(anchorKey)??candidates[0]):candidates[0];notes=cfg.stab?(chord.scalerNotes?[chord.scalerBassNote]:cfg.stabHands==='bounce'?bounceLeftNotes(chord):cfg.stabHands==='dialogue'?leftHandStabNotes(chord):[anchor,anchor+12]):[anchor+(hit.bassFunction==='octave'?12:0)];if(hit.bassFunction!=='octave'){bassPrev=anchor;bassAnchors.set(anchorKey,anchor);}
  }else if(hit.role==='pulse'){
   const rootPc=chord.upper?.rootPc??chord.rootPc,targetRegister=hit.pulseRegister==='high'?78:66;
   notes=Array.from({length:49},(_,i)=>48+i).filter(n=>n%12===rootPc&&!voicing.includes(n)).sort((a,b)=>Math.abs(a-targetRegister)-Math.abs(b-targetRegister)||a-b).slice(0,1);
  }else{const previous=harmony.events[(target.index-1+harmony.events.length)%harmony.events.length],mustResolve=!cfg.stab&&previous.resolutionRules?.length&&!resolutionArrivals.has(target.index);if(mustResolve){notes=voicing.slice();resolutionArrivals.add(target.index);}else if(hit.role==='inner')notes=notes.slice(0,Math.min(2,notes.length-1));else if(hit.role==='upper')notes=notes.slice(-2);else if(hit.role==='outer')notes=[notes[0],notes.at(-1)];}
  if(!cfg.stab&&hit.contour==='mirror'&&!voicingPlan[target.index].melodyPlanned&&!['parallel','shapes','common','altered','borrowed'].includes(harmony.language)&&chord.movement!=='parallel'&&harmony.events[(target.index+1)%harmony.events.length].movement!=='parallel'){
   const pivot=voicing[Math.floor(voicing.length/2)],allowed=Array.from({length:34},(_,i)=>53+i).filter(n=>chord.pcs.includes(n%12));
   notes=[...new Set(notes.map(n=>allowed.slice().sort((a,b)=>Math.abs(a-(2*pivot-n))-Math.abs(b-(2*pivot-n))||a-b)[0]))].sort((a,b)=>a-b);
  }
  const sustained=hit.articulation==='sustained-chord'||hit.articulation==='sustained-bass',touchCycle=cfg.stab&&cfg.stabRepeat==='bar'?16:32,touchPinned=(touchCycle===16||cfg.stab&&cfg.stabHands==='bounce'&&cfg.bounceForm!=='AAAA')&&mod(hit.step,touchCycle)===0,pr=stream(cfg,'touch:'+mod(hit.step,touchCycle)+':'+(cfg.stab?'stab':hit.role)),human=cfg.human/100,touch=sustained?0:(pr()-.5)*human*5*cfg.bpm*PPQ/60000*(touchPinned?0:1),startBase=sustained?hit.step*STEP:swingTick(hit.step,cfg.stab||hit.role==='bass'?.5:p.swing)+touch;
  for(let ni=0;ni<notes.length;ni++){const note=notes[ni],top=(cfg.stab&&cfg.stabHands==='bounce'&&ni===notes.length-1||note===voicing.at(-1)||hit.contour==='mirror'&&ni===notes.length-1)&&hit.role!=='bass',role=hit.role==='bass'?'bass':top?'top':'inner';
   const rests=hit.role==='bass'?[]:(rhythm.protectedRests||[]),previousRest=Math.max(0,...rests.filter(x=>x.end<=hit.step).map(x=>x.end*STEP));
   const parallelTouch=cfg.stab||['parallel','shapes'].includes(harmony.language)||chord.movement==='parallel',spread=sustained?0:(parallelTouch?0:ni*human*.9*cfg.bpm*PPQ/60000)+(hit.strum||0)*ni*18,start=Math.max(previousRest,hit.step*STEP-STEP*.2,startBase+spread),dur=(sustained?hit.duration:articulatedDuration(hit,top,p,ni,notes.length))*STEP,limit=sustained?(chord.onsetBeat+chord.durationBeats)*PPQ:Math.min(releaseLimit(harmony,hit.step/4,note,cfg),restLimit(hit.step,rests)),velocityBase=hit.velocity+(cfg.stab&&cfg.stabHands==='bounce'?(top?3:0):top?7:role==='bass'?-8:-5),velocityNoise=(pr()-.5)*5,velocity=clamp(Math.round(velocityBase+velocityNoise*human),35,120);
   events.push({bar:hit.bar,step:mod(hit.step,16),note,velocity,velocityBase,velocityNoise,startTick:start,endTick:Math.max(start+24,Math.min(limit,start+dur)),ghost:velocity<72,chordIndex:Math.floor(chord.onsetBeat/4),harmonicSlot:target.index,shapeId:chord.quality+':'+chord.rootPc,attackIndex:hit.id,touchSlot:ni,touchRole:cfg.stab?'stab':hit.role,stab:cfg.stab,hand:cfg.stab?(hit.role==='bass'?'left':'right'):null,touchStep:hit.step,...(hit.bounceLetter?{bounceLetter:hit.bounceLetter}:{}),touchCycle,touchPinned,parallelTouch,role,bassFunction:hit.bassFunction||null,gesture:hit.role,articulation:hit.articulation||'detached',anticipation:target.anticipation,motif:hit.motif,essential:hit.essential});}}
 const prepared=preserveMelody(events,lockedTop),performed=sanitize(prepared,cfg.length*BAR),final=cfg.stab||rhythm.passages?performed:sanitize(addBassApproaches(ornamentEvents(performed,harmony,rhythm,cfg),harmony,cfg),cfg.length*BAR),chords=Array.from({length:cfg.length},(_,b)=>({roman:rhythm.form[b],label:[...new Set(harmony.events.filter(h=>h.onsetBeat<(b+1)*4&&h.onsetBeat+h.durationBeats>b*4).map(h=>h.label))].join(' → ')}));
 return {version:23,body:cfg.body,stab:cfg.stab,performance:{bpm:cfg.bpm,human:cfg.human},revisions:{...revisions},harmony,rhythm,chords,voicingPlan,melodyPlan:voicingPlan.map((v,i)=>({harmonicSlot:i,note:v.notes.at(-1),onsetBeat:harmony.events[i].onsetBeat})),plannedVoiceResolutions:performedResolutions(harmony,voicingPlan),voiceResolutions:actualResolutions(harmony,final),voicings:Array.from({length:cfg.length},(_,b)=>voicingPlan[activeIndex(harmony,b*4)].notes),events:final,notice:'',diagnostics:{operations:rhythm.operations,inversions:voicingPlan.filter(v=>v.inverted).length,bassInversions:harmony.events.filter(h=>h.inversion&&h.inversion!=='root').length,bassMotion:harmony.arc?.bassMotion||null,language:harmony.language,ornaments:final.filter(e=>e.role==='ornament').length,protectedRests:rhythm.protectedRests?.length||0,anticipations:new Set(final.filter(e=>e.anticipation).map(e=>e.attackIndex)).size,partialGestures:new Set(final.filter(e=>['inner','upper','outer'].includes(e.gesture)).map(e=>e.attackIndex)).size,articulationDurations:new Set(final.filter(e=>e.role!=='bass').map(e=>Math.round(e.endTick-e.startTick))).size,tiedCommonTones:final.filter(e=>e.tiedAcrossHarmony).length,harmonicScene:harmony.arc?.id||null,harmonicIntent:cfg.harmonicIntent,corpusMotion:resolvedScalerMotion(cfg),foundation:resolvedScalerFoundation(cfg),profileOrigin:'Interdependent grammar distilled from 1,274 Scaler 3 MIDI expressions and practical piano-house theory',corpusMandatory:false},provenance:'Scaler-informed deterministic piano grammar v23'};
}
function generate(grammar,input,revisions={rhythm:0,harmony:0,voicing:0}){const cfg=config(input),source=renderModel(grammar,{...cfg,stab:false},makeHarmony(cfg,revisions.harmony),makeRhythm(cfg,revisions.rhythm),revisions);return cfg.stab?setStab(grammar,cfg,source):source;}
function regenerate(grammar,input,model,kind){const cfg=config(input);if(cfg.stab&&model.stabSource)return setStab(grammar,cfg,regenerate(grammar,{...cfg,stab:false},model.stabSource,kind));const key=kind==='chords'?'harmony':kind;if(!['rhythm','harmony','voicing'].includes(key))throw Error('Unknown layer');const revisions={...model.revisions,[key]:model.revisions[key]+1},harmony=key==='harmony'?makeHarmony(cfg,revisions.harmony):model.harmony,rhythm=key==='rhythm'?makeRhythm(cfg,revisions.rhythm):model.rhythm;
 if(key==='voicing'&&cfg.lockMelody&&['parallel','shapes'].includes(harmony.language))return {...copy(model),notice:'Melody locked: parallel shapes move all voices together. Unlock the melody to change voicings.'};
 const locked=key==='voicing'&&cfg.lockMelody,lockedTop=locked?model.events.filter(e=>e.role==='top'):null;
 let next=renderModel(grammar,cfg,harmony,rhythm,revisions,key==='rhythm'?model.voicingPlan:locked?planVoicings(harmony,cfg,revisions.voicing,model.voicingPlan):null,lockedTop);
 // Several valid searches can settle on the same voicing. Skip equivalent takes.
 if(key==='voicing')for(let tries=0;tries<32&&JSON.stringify(next.events)===JSON.stringify(model.events);tries++){revisions.voicing++;next=renderModel(grammar,cfg,harmony,rhythm,revisions,locked?planVoicings(harmony,cfg,revisions.voicing,model.voicingPlan):null,lockedTop);}
 next.notice=key==='rhythm'?'New development · harmony and voicings preserved':key==='harmony'?'New harmony · rhythmic gestures preserved':'New voicings · harmony and gestures preserved';return next;}
function rearrange(grammar,input,model){const cfg=config(input);if(cfg.stab&&model.stabSource)return setStab(grammar,cfg,rearrange(grammar,{...cfg,stab:false},model.stabSource));const rhythm=makeRhythm(cfg,model.revisions.rhythm);const next=renderModel(grammar,cfg,model.harmony,rhythm,model.revisions,model.voicingPlan);next.notice='Energy updated · harmony, seed and voicings preserved';return next;}
function reperform(grammar,input,model){
 const cfg=config(input),reference=model.performanceReference||{settings:model.performance,events:model.events},before={...cfg,...reference.settings},rests=model.rhythm.protectedRests||[];
 function offset(e,c){const r=stream(c,'touch:'+mod(e.touchStep,e.touchCycle||32)+':'+e.touchRole),touch=(r()-.5)*c.human/100*5*c.bpm*PPQ/60000*(e.touchPinned?0:1),spread=model.harmony.language==='parallel'||e.parallelTouch?0:e.touchSlot*c.human/100*.9*c.bpm*PPQ/60000;return touch+spread;}
 const events=reference.events.map(e=>{const delta=offset(e,cfg)-offset(e,before),step=e.touchStep-(e.role==='ornament'?.5:0),rr=e.role==='bass'?[]:rests,previous=Math.max(0,...rr.filter(x=>x.end<=step).map(x=>x.end*STEP));
  const velocity=e.velocityBase==null?e.velocity:clamp(e.velocity+clamp(Math.round(e.velocityBase+e.velocityNoise*cfg.human/100),35,120)-clamp(Math.round(e.velocityBase+e.velocityNoise*before.human/100),35,120),1,127);
  return {...copy(e),velocity,startTick:Math.max(previous,e.startTick+delta),endTick:Math.min(e.endTick+delta,restLimit(step,rr),releaseLimit(model.harmony,step/4,e.note,cfg))};
 });
 for(const e of events.filter(e=>e.role==='ornament')){const t=events.find(t=>t.attackIndex===e.resolutionTarget.attackIndex&&t.note===e.resolutionTarget.note&&t.role==='top');if(t){e.endTick=t.startTick;e.resolutionTarget.startTick=Math.round(t.startTick);}}
 for(const e of events.filter(e=>e.bassFunction==='chromatic-approach')){
  const original=reference.events.find(x=>x.attackIndex===e.attackIndex&&x.note===e.note&&x.touchStep===e.touchStep),refTarget=reference.events.find(x=>x.attackIndex===original.resolutionTarget.attackIndex&&x.note===original.resolutionTarget.note&&x.startTick===original.resolutionTarget.startTick);
  const t=refTarget&&events.find(x=>x.attackIndex===refTarget.attackIndex&&x.note===refTarget.note&&x.touchStep===refTarget.touchStep);
  if(t){const delta=t.startTick-refTarget.startTick;e.startTick=original.startTick+delta;e.endTick=original.endTick+delta;e.resolutionTarget.startTick=Math.round(t.startTick);}
 }
 const final=sanitize(events,cfg.length*BAR);
 return {...copy(model),performanceReference:copy(reference),performance:{bpm:cfg.bpm,human:cfg.human},events:final,voiceResolutions:actualResolutions(model.harmony,final)};
}
// Research-derived MIDI rules. These are authored realizations, not transcriptions.
function researchFamily(cfg,revision){
 if(['pedal','borrowed','altered','shapes','common'].includes(cfg.harmonyStyle))return cfg.harmonyStyle;
 return null;
}
function researchTemplate(family,cfg,revision){
 const tonic=cfg.mode==='Minor'?'m9':'maj9',variant=revision%2;
 if(family==='pedal')return (cfg.mode==='Major')!==Boolean(variant)?{id:'pedal-major-minor',chords:[[0,'maj7',8],[0,'m9',8]],upper:[[0,'maj7',0,'voice-led'],[3,'maj7',0,'parallel']]}:{id:'pedal-minor-major',chords:[[0,'m9',8],[0,'maj7',8]],upper:[[3,'maj7',0,'voice-led'],[0,'maj7',0,'parallel']]};
 if(family==='borrowed')return {id:'borrowed-descent-three',chords:[[0,tonic,8],[variant?5:10,'m11',4],[8,'maj9',4]]};
 if(family==='altered')return {id:'tonic-altered-return',chords:[[0,tonic,8],[7,revision%2?'7#5b9':'7b9',8]]};
 if(family==='shapes')return {id:'two-recalled-shapes',chords:[[0,tonic,4],[variant?5:2,'13sus',4],[7,tonic,4],[variant?0:9,'13sus',4]]};
 return cfg.mode==='Minor'?{id:'common-tone-m11',chords:[[0,'m11',8],[variant?5:8,'m11',8],[0,'m11',8],[variant?5:8,'m11',8]]}:{id:'common-tone-major-authored',chords:[[0,'maj9',8],[variant?5:8,'maj9',8],[0,'maj9',8],[variant?5:8,'maj9',8]]};
}
function annotateResolutions(events){
 for(let i=0;i<events.length;i++){
  const h=events[i],dest=events[(i+1)%events.length];h.resolutionRules=[];
  const dominantArrival=mod(h.rootPc+5,12)===dest.rootPc;
  if(['7','9','11','13','13b9','7b13','7b9','7#5b9','7#9','7#5','7b5'].includes(h.quality)){h.function=dominantArrival?'dominant':'colour';h.destinationIndex=h.function==='dominant'?dest.index:null;}
  if(['sus','9sus','13sus','m7sus4'].includes(h.quality)){
   h.function='suspension';h.destinationIndex=dest.index;
   if(h.rootPc===dest.rootPc&&h.pcs.includes(mod(h.rootPc+5,12))&&dest.pcs.includes(mod(h.rootPc+4,12)))h.resolutionRules.push({sourcePc:mod(h.rootPc+5,12),targetPc:mod(h.rootPc+4,12),role:'suspension-resolution'});
  }
  if(dominantArrival&&['7','9','11','13','13b9','7b13','7#5','7b5'].includes(h.quality)){
   const third=[3,4].map(x=>mod(dest.rootPc+x,12)).find(pc=>dest.pcs.includes(pc));
   if(h.pcs.includes(mod(h.rootPc+4,12))&&dest.pcs.includes(dest.rootPc))h.resolutionRules.push({sourcePc:mod(h.rootPc+4,12),targetPc:dest.rootPc,role:'leading-tone'});
   if(third!=null&&h.pcs.includes(mod(h.rootPc+10,12)))h.resolutionRules.push({sourcePc:mod(h.rootPc+10,12),targetPc:third,role:'seventh'});
   if(third!=null&&h.pcs.includes(mod(h.rootPc+9,12)))h.resolutionRules.push({sourcePc:mod(h.rootPc+9,12),targetPc:third,role:'thirteenth'});
  }
  if(['7b9','13b9','7#5b9','7#9'].includes(h.quality)&&mod(h.rootPc+5,12)===dest.rootPc){
   h.function='dominant';h.destinationIndex=dest.index;
   const rules=[[4,0,'leading-tone'],[1,7,'flat-ninth'],[10,3,'seventh'],[8,3,'common-altered-fifth']];
   for(const [from,to,role] of rules){const sourcePc=mod(h.rootPc+from,12),targetPc=mod(dest.rootPc+to,12);
    if(h.pcs.includes(sourcePc)&&dest.pcs.includes(targetPc))h.resolutionRules.push({sourcePc,targetPc,role});
   }
   if(!dest.pcs.includes(mod(dest.rootPc+3,12))&&dest.pcs.includes(mod(dest.rootPc+4,12))){
    for(const from of [10,8])if(h.pcs.includes(mod(h.rootPc+from,12)))h.resolutionRules.push({sourcePc:mod(h.rootPc+from,12),targetPc:mod(dest.rootPc+4,12),role:'major-resolution'});
   }
   if(h.quality==='7b9')h.upper={rootPc:mod(h.rootPc+4,12),quality:'dim7',pcs:h.pcs.filter(n=>n!==h.rootPc),label:NAMES[mod(h.rootPc+4,12)]+'dim7'};
  }
 }
}
function melodyTargets(harmony,cfg,revision){
 const strategy=harmony.arc?.voicing||null,center=GENRES[cfg.genre].register+4+[0,-2,2][revision%3],r=stream(cfg,'melody',revision),contours={
  arch:[-2,0,3,5,4,7,3,0],wave:[0,3,-1,4,1,5,2,0],lift:[-3,0,2,5,3,7,4,1],ascent:[-4,-2,0,2,4,6,7,3],descent:[6,4,3,1,0,-2,-4,0],cinematic:[-5,2,7,0,4,9,3,-1],'common-tone':[0,0,2,0,-1,0,3,0],'pedal-top':[2,2,2,1,2,2,3,2],'wide-wave':[-4,3,-1,6,1,8,2,-2]
 },contour=contours[strategy]||pick([[0,2,4,2],[2,0,-2,0],[0,-2,1,3]],r);
 let beam=[{cost:0,path:[]}];
 for(let i=0;i<harmony.events.length;i++){
  const h=harmony.events[i],preferred=h.melodyDegree==null?null:mod(PCS[cfg.key]+h.melodyDegree,12);
  let candidates=Array.from({length:25},(_,n)=>n+63).filter(n=>(h.upper?.pcs||h.pcs).includes(n%12)&&(preferred==null||n%12===preferred));
  if(!candidates.length)throw Error('No melody note in chord');
  const next=[];for(const b of beam)for(const note of candidates){
   if(i){const rule=harmony.events[i-1].resolutionRules?.find(x=>x.sourcePc===b.path.at(-1)%12);if(rule){const destNote=note-mod(note-rule.targetPc,12);if(Math.abs(destNote-b.path.at(-1))>2)continue;}}
   if(i===harmony.events.length-1){const rule=h.resolutionRules?.find(x=>x.sourcePc===note%12);if(rule){const destNote=b.path[0]-mod(b.path[0]-rule.targetPc,12);if(Math.abs(destNote-note)>2)continue;}}
   const prev=b.path.at(-1),first=b.path[0],motion=prev==null?0:Math.abs(note-prev);
   // Plan an audible phrase first; retain identity on repeated harmonic cells.
   const dramatic=strategy==='cinematic'||strategy==='wide-wave',target=center+contour[i%contour.length];
   let cost=b.cost+Math.abs(note-target)*(dramatic?.7:.42)+motion*(dramatic?.24:.42)+Math.max(0,motion-(dramatic?9:6))*(dramatic?.7:1.7);
   if(i===harmony.events.length-1&&first!=null)cost+=Math.abs(note-first)*.4;
   if(i>=4&&h.rootPc===harmony.events[i-4].rootPc&&h.quality===harmony.events[i-4].quality)cost+=Math.abs(note-b.path[i-4])*.8;
   if(prev===note&&preferred==null)cost+=.9;
   next.push({cost,path:[...b.path,note]});
  }next.sort((a,b)=>a.cost-b.cost||a.path.join(',').localeCompare(b.path.join(',')));beam=next.slice(0,12);
 }
 return beam[0].path;
}
function melodicCandidates(h,top,cfg,strategy){
 // The bass owns the root or inversion. The right hand keeps no more than four
 // characteristic tones: guide tones and colour before redundant doublings.
 const out=[],topPc=top%12;let required=playableUpperPcs(h);
 if(!required.includes(topPc)){
  const upperRoot=h.upper?.rootPc??h.rootPc,omit=[7,0,2,5,9].map(interval=>required.findIndex(pc=>mod(pc-upperRoot,12)===interval)).find(i=>i>=0)??0;
  required=[...required.slice(0,omit),...required.slice(omit+1),topPc];
 }
 // A compact and an open disposition share the exact same melodic target.
 const spans=['cinematic','wide-wave'].includes(strategy)?[17,22,28,32]:strategy==='common-tone'||strategy==='pedal-top'?[12,17,22]:[12,17,22,28];
 for(const span of spans)for(const variant of [0,1,2]){
  let notes=required.map((pc,i)=>{if(pc===top%12)return top;let n=top-mod(top-pc,12);if(variant&&i%2===0&&n-12>=53&&top-(n-12)<=span)n-=12;return n;});
  if(variant===2)notes=notes.map((n,i)=>i===1&&n-12>=53&&top-(n-12)<=span?n-12:n);
  notes.push(top);notes=[...new Set(notes)].sort((a,b)=>a-b);
  if(notes[0]<53||notes.at(-1)>86)continue;
  if(!out.some(v=>v.notes.join(',')===notes.join(',')))out.push({notes,cost:Math.abs(notes.reduce((a,b)=>a+b,0)/notes.length-GENRES[cfg.genre].register)*.25});
 }
 return out;
}
function resolutionPairs(h,from,to){
 return (h.resolutionRules||[]).flatMap(rule=>from.filter(n=>n%12===rule.sourcePc).map(note=>{
  const choices=to.filter(n=>n%12===rule.targetPc).sort((a,b)=>Math.abs(a-note)-Math.abs(b-note)||a-b);
  return {from:note,to:choices[0]??null,role:rule.role,resolved:choices.length>0&&Math.abs(choices[0]-note)<=2};
 }));
}
function orderedVoiceCost(a,b){
 const n=Math.max(a.length,b.length);let sum=0;
 for(let i=0;i<n;i++)sum+=Math.abs(a[Math.round(i*(a.length-1)/(n-1))]-b[Math.round(i*(b.length-1)/(n-1))]);
 return sum/n;
}
function limitPianoVoicing(notes,h,previous,top){
 const out=[...new Set(notes)].sort((a,b)=>a-b),protectedPcs=new Set([...(h.resolutionRules||[]).map(x=>x.sourcePc),...(previous?.resolutionRules||[]).map(x=>x.targetPc)]);
 while(out.length>4){
  const scores=out.map((note,i)=>{const interval=mod(note-h.rootPc,12),duplicate=out.some((n,j)=>j!==i&&n%12===note%12);let score=note===top?100:0;score+=protectedPcs.has(note%12)?45:0;score+=interval===3||interval===4||interval===10||interval===11?12:interval===2||interval===5||interval===9?8:interval===0?5:interval===7?1:4;if(duplicate)score-=20;return {i,score,note};});
  scores.sort((a,b)=>a.score-b.score||a.note-b.note);out.splice(scores[0].i,1);
 }
 return out;
}
function planMelodicVoicings(harmony,cfg,revision){
 const melody=melodyTargets(harmony,cfg,revision);let beam=[{cost:0,path:[]}];
 for(let i=0;i<harmony.events.length;i++){
  const h=harmony.events[i],candidates=melodicCandidates(h,melody[i],cfg,harmony.arc?.voicing),next=[];
  for(const state of beam)for(const c of candidates){const prev=state.path.at(-1)?.notes;
   let cost=state.cost+c.cost;if(prev){cost+=orderedVoiceCost(prev,c.notes);cost+=resolutionPairs(harmony.events[i-1],prev,c.notes).filter(x=>!x.resolved).length*40;}
   if(i===harmony.events.length-1&&state.path.length){cost+=orderedVoiceCost(c.notes,state.path[0].notes)*.5;cost+=resolutionPairs(h,c.notes,state.path[0].notes).filter(x=>!x.resolved).length*40;}
   next.push({cost,path:[...state.path,{notes:c.notes,topTarget:melody[i],melodyPlanned:true,inverted:true}]});
  }
  next.sort((a,b)=>a.cost-b.cost||JSON.stringify(a.path).localeCompare(JSON.stringify(b.path)));beam=next.slice(0,24);if(!beam.length)throw Error('No melodic voicing');
 }
 // Resolve every explicit tension against a real destination voice. When a
 // target is already the melody, its lower octave may be doubled underneath.
 const options=beam.filter(x=>x.cost<=beam[0].cost+5).slice(0,4),path=options[revision%options.length].path;
 for(let i=0;i<path.length;i++){
  const h=harmony.events[i],dest=path[(i+1)%path.length],top=path[i].notes.at(-1);
  if(!h.resolutionRules?.length)continue;
  path[i].notes=path[i].notes.map(note=>{const rule=h.resolutionRules.find(x=>x.sourcePc===note%12);if(!rule)return note;
   if(!dest.notes.some(n=>n%12===rule.targetPc&&Math.abs(n-note)<=2)){
    const added=[-2,-1,0,1,2].map(d=>note+d).find(n=>n%12===rule.targetPc&&n>=53&&n<=dest.notes.at(-1));
    if(added!=null)dest.notes=[...new Set([...dest.notes,added])].sort((a,b)=>a-b);
   }
   if(note===top)return note;
   const choices=dest.notes.filter(n=>n%12===rule.targetPc).flatMap(n=>[-2,-1,0,1,2].map(d=>n+d)).filter(n=>n%12===rule.sourcePc&&n>=53&&n<top);
   return choices.sort((a,b)=>Math.abs(a-note)-Math.abs(b-note)||a-b)[0]??note;
  });path[i].notes=[...new Set(path[i].notes)].sort((a,b)=>a-b);
 }
 for(let i=0;i<path.length;i++)path[i].notes=limitPianoVoicing(path[i].notes,harmony.events[i],harmony.events[(i-1+path.length)%path.length],path[i].topTarget);
 return path;
}
function performedResolutions(harmony,plan){return harmony.events.flatMap((h,i)=>resolutionPairs(h,plan[i].notes,plan[(i+1)%plan.length].notes).map(p=>({...p,fromSlot:i,toSlot:(i+1)%plan.length,loopReturn:i===plan.length-1})));}
function planShapeBank(harmony,cfg,revision){
 const r=stream(cfg,'shape-bank',revision),bank={};
 for(const h of harmony.events)if(!bank[h.shapeKey]){
  const upper=QUALITIES[h.quality].upper,inv=inversions(upper)[Math.floor(r()*upper.length)];
  // Store intervals once, then recall them, including a true root/octave pair.
  bank[h.shapeKey]=[0,12,...inv].filter((x,i,a)=>a.indexOf(x)===i).sort((a,b)=>a-b);
 }
 return harmony.events.map(h=>{const intervals=bank[h.shapeKey];let octave=48;
  while(octave+h.rootPc+intervals.at(-1)>86)octave-=12;
  const notes=intervals.map(n=>n+h.rootPc+octave);
  return {notes,topTarget:notes.at(-1),shapeKey:h.shapeKey,shapeIntervals:intervals.slice(),inverted:false};
 });
}
function coordinatePiano(harmony,rhythm,cfg){
 const attacks=copy(rhythm.attacks),family=harmony.family;
 if(!family)return attacks;
 const has=(step,role)=>attacks.some(h=>Math.abs(h.step-step)<.01&&(role==='bass'?h.role==='bass':h.role!=='bass'));
 const add=(step,role,extra={})=>{if(step<0||step>=cfg.length*16||has(step,role)||role!=='bass'&&inRest(step,rhythm.protectedRests||[]))return;
  const bar=Math.floor(step/16),energy=energyAt(cfg,bar);if(energy==='suspended'&&!extra.essential)return;
  attacks.push({step,bar,role,duration:role==='bass'?1.4:1.2,velocity:energy==='exposition'?76:94,essential:false,anticipate:true,articulation:'answer',operation:'coordinated-response',motif:rhythm.form[bar],energy,...extra});
 };
 if(family==='common'){
  for(const hit of attacks)if(hit.role!=='bass'&&mod(hit.step,16)===10){hit.role='upper';hit.articulation='answer';hit.duration=1.1;}
  for(const h of harmony.events){if(h.onsetBeat>0&&cfg.sync>=45)add(h.onsetBeat*4-2,'full',{essential:true,velocity:103,articulation:'pickup',duration:2.6});
   for(let bar=Math.floor(h.onsetBeat/4);bar*4<h.onsetBeat+h.durationBeats;bar++)add(bar*16+10,'upper',{velocity:86,articulation:'answer',duration:1.1});
  }
 }
 // Common tones are selected against the actual harmony, including omissions.
 if(['common','borrowed','pedal'].includes(family)&&cfg.density>=35){
  for(let bar=0;bar<cfg.length;bar++){
   const active=activeIndex(harmony,bar*4+2.75),h=harmony.events[active],next=harmony.events[(active+1)%harmony.events.length];
   const common=h.pcs.filter(pc=>next.pcs.includes(pc)&&pc!==(h.bassPc??h.rootPc));
   if(!common.length)continue;
   const preferred=[mod(PCS[cfg.key]+3,12),mod(PCS[cfg.key]+10,12)],ordered=[...preferred.filter(pc=>common.includes(pc)),...common.filter(pc=>!preferred.includes(pc))];
   if(bar%2)add(bar*16+10,'bass',{bassFunction:'common',commonPc:ordered[0],anticipate:false});
   add(bar*16+11,'bass',{bassFunction:'common',commonPc:ordered[(bar%2)%ordered.length],anticipate:false});
  }
 }
 attacks.sort((a,b)=>a.step-b.step||a.role.localeCompare(b.role));attacks.forEach((h,i)=>h.id=i);return attacks;
}
function addBassApproaches(events,harmony,cfg){
 if(cfg.complexity<70||!['altered','borrowed','common'].includes(harmony.family))return events;
 const out=events.slice(),targets=events.filter(e=>e.role==='bass'&&e.bassFunction==='root'&&e.touchStep%16===0);
 for(const target of targets){
  const slot=target.harmonicSlot,h=harmony.events[slot];if(target.touchStep!==h.onsetBeat*4||target.startTick<STEP*2)continue;
  const previous=harmony.events[(slot-1+harmony.events.length)%harmony.events.length];if(previous.bassPc===h.bassPc)continue;
  const count=cfg.complexity>=90?2:1,first=target.startTick-count*STEP;
  // Do not interrupt a sustained structural bass; the approach needs a gap.
  if(events.some(e=>e.role==='bass'&&e.startTick<target.startTick&&e.endTick>first))continue;
  for(let n=count;n>=1;n--){const start=target.startTick-n*STEP,note=target.note-n;if(note<36)continue;
   out.push({...target,note,startTick:start,endTick:target.startTick-(n-1)*STEP,step:mod(target.touchStep-n,16),bar:Math.floor((target.touchStep-n)/16),touchStep:target.touchStep-n,role:'bass',bassFunction:'chromatic-approach',gesture:'bass-approach',essential:false,ghost:true,velocity:Math.max(40,target.velocity-16-n*3),attackIndex:'bass-approach:'+target.attackIndex+':'+n,resolutionTarget:{note:target.note,startTick:target.startTick,attackIndex:target.attackIndex},approachDistance:n});
  }
 }
 return out;
}
function repairLocalResolution(harmony,plan,slot){
 for(const pair of performedResolutions(harmony,plan).filter(x=>!x.resolved)){
  const from=plan[pair.fromSlot],to=plan[pair.toSlot],rule=harmony.events[pair.fromSlot].resolutionRules.find(x=>x.sourcePc===pair.from%12);
  if(pair.toSlot===slot){const target=[-2,-1,0,1,2].map(d=>pair.from+d).find(n=>n%12===rule.targetPc&&n>=53&&n<=to.notes.at(-1));if(target!=null)to.notes=[...new Set([...to.notes,target])].sort((a,b)=>a-b);}
  if(pair.fromSlot===slot&&pair.from!==from.notes.at(-1)){
   const source=to.notes.filter(n=>n%12===rule.targetPc).flatMap(n=>[-2,-1,0,1,2].map(d=>n+d)).find(n=>n%12===rule.sourcePc&&n>=53&&n<from.notes.at(-1));
   if(source!=null)from.notes=[...new Set(from.notes.map(n=>n===pair.from?source:n))].sort((a,b)=>a-b);
  }
 }
 return performedResolutions(harmony,plan).every(x=>x.resolved);
}
// HOUSEMASTER is an explicit palette preference, not a definition of all house music.
const HOUSEMASTER_REPLACEMENTS={major:'maj7',minor:'m7',add9:'maj9',madd9:'m9'};
function applyHousemaster(harmony,cfg){
 if(!cfg.housemaster)return harmony.housemasterBase||harmony;
 if(harmony.housemaster)return harmony;
 const result=copy(harmony);result.housemasterBase=copy(harmony);result.housemaster=true;
 if(harmony.language==='stab-bass'){
  // Keep one fixed enriched upper shape, including when the bass moves.
  const root=harmony.events[0].upper.rootPc,quality=cfg.mode==='Minor'?'m7':'6',q=QUALITIES[quality];
  const upper={rootPc:root,quality,pcs:q.pcs.map(n=>mod(root+n,12)).sort((a,b)=>a-b),label:NAMES[root]+q.label};
  for(const h of result.events){
   const pcs=[...new Set([...upper.pcs,h.bassPc])].sort((a,b)=>a-b);
   const roots=[...new Set([root,h.rootPc,h.bassPc,...pcs])];let found;
   for(const r of roots){for(const [name,spec] of Object.entries(QUALITIES)){
    if(HOUSEMASTER_REPLACEMENTS[name])continue;
    if(JSON.stringify(spec.pcs.map(n=>mod(r+n,12)).sort((a,b)=>a-b))===JSON.stringify(pcs)){found={root:r,quality:name};break;}
   }if(found)break;}
   if(!found)throw Error('HOUSEMASTER upper/bass combination is not represented');
   Object.assign(h,{rootPc:found.root,quality:found.quality,upper:copy(upper),pcs,stabTriad:false,label:upper.label+(h.bassPc!==root?'/'+NAMES[h.bassPc]:'')});
  }
 }else for(const h of result.events){
  let replacement=HOUSEMASTER_REPLACEMENTS[h.quality];
  if(h.quality==='major'||h.quality==='add9'){
   const scale=(cfg.mode==='Minor'?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map(n=>mod(n+PCS[cfg.key],12));
   const dest=result.events[(h.index+1)%result.events.length],dominant=mod(h.rootPc+5,12)===dest.rootPc;
   if(dominant||scale.includes(mod(h.rootPc+10,12)))replacement=h.quality==='major'?'7':'9';
  }
  if(replacement){replaceQuality(h,replacement);h.stabTriad=false;
   if(['7','9'].includes(replacement)){const dest=result.events[(h.index+1)%result.events.length];h.function=mod(h.rootPc+5,12)===dest.rootPc?'dominant':'colour';h.destinationIndex=h.function==='dominant'?dest.index:null;}
  }
 }
 annotateResolutions(result.events);
 result.plan=result.events.map(h=>h.quality+':'+h.rootPc);
 return result;
}
function setOleanHouse(grammar,input,model){
 const cfg=config(input),source=model.stabSource||model;
 const next=renderModel(grammar,{...cfg,stab:false},makeHarmony(cfg,source.revisions.harmony),source.rhythm,source.revisions);
 const result=cfg.stab?setStab(grammar,cfg,next):next;
 result.notice=cfg.oleanHouse?'Olean’s House on · '+result.harmony.oleanRuleName:'Olean’s House off · style harmony restored';
 return result;
}
function setHousemaster(grammar,input,model){
 const cfg=config(input),source=model.stabSource||model,harmony=applyHousemaster(source.harmony,cfg);
 const next=renderModel(grammar,{...cfg,stab:false},harmony,source.rhythm,source.revisions);
 const result=cfg.stab?setStab(grammar,cfg,next):next;
 result.notice=cfg.housemaster?'HOUSEMASTER on · sevenths, ninths and suspended colours; enriched triads':'HOUSEMASTER off · full harmonic vocabulary';
 return result;
}
function replaceQuality(h,quality){
 const q=QUALITIES[quality];h.quality=quality;h.upper={rootPc:h.rootPc,quality,pcs:[...new Set(q.pcs.map(n=>mod(n+h.rootPc,12)))],label:NAMES[h.rootPc]+q.label};
 h.pcs=[...new Set(q.pcs.map(n=>mod(n+h.rootPc,12)))].sort((a,b)=>a-b);h.label=NAMES[h.rootPc]+q.label+(h.bassPc!==h.rootPc?'/'+NAMES[h.bassPc]:'');
}
function localVariation(grammar,input,model,kind){
 const cfg=config(input);if(cfg.stab)return {...copy(model),notice:'Turn STAB off to make local edits to the original phrase.'};if(!['extend','redispose','tail','articulate'].includes(kind))throw Error('Unknown local variation');
 if(['parallel','shapes'].includes(model.harmony.language)||model.harmony.family==='pedal')return {...copy(model),notice:'These shapes have fixed intervals. Choose Inversions, Descent, Dominants or Common tones for local edits.'};
 const harmony=copy(model.harmony),rhythm=copy(model.rhythm),plan=copy(model.voicingPlan),total=cfg.length*BAR,iteration=(model.localEdits?.length||0),r=stream(cfg,'local:'+kind,iteration),changed=[];
 const extension={minor:'madd9',major:'add9',m7:'m9',m9:'m11',maj7:'maj9','7':'7b9','7b9':'7#5b9','9sus':'m11'};
 const eligible=h=>h.upper.rootPc===h.rootPc&&(h.bassPc??h.rootPc)===h.rootPc&&(!cfg.lockMelody||QUALITIES[extension[h.quality]||h.quality].pcs.map(n=>mod(n+h.rootPc,12)).includes(plan[h.index].notes.at(-1)%12));
 let slot=harmony.events.length-1,cut=0;
 if(kind==='extend'){
  const candidates=harmony.events.filter(h=>extension[h.quality]&&eligible(h)&&!model.events.some(e=>e.harmonicSlot===h.index&&e.startTick<h.onsetBeat*PPQ&&!QUALITIES[extension[h.quality]].pcs.includes(mod(e.note-h.rootPc,12)))&&!['parallel'].includes(h.movement)&&harmony.events[(h.index+1)%harmony.events.length].movement!=='parallel');
  if(!candidates.length)return {...copy(model),notice:'These chords already use all available extensions compatible with the melody.'};
  slot=candidates[iteration%candidates.length].index;const h=harmony.events[slot],before=h.quality;cut=h.onsetBeat*PPQ;replaceQuality(h,extension[before]);changed.push({slot,from:before,to:h.quality});
 }else if(kind==='redispose'){
  const candidates=[];for(let i=0;i<plan.length;i++){const h=harmony.events[i];if(h.movement==='parallel'||harmony.events[(i+1)%plan.length].movement==='parallel')continue;
   for(let j=0;j<plan[i].notes.length-(cfg.lockMelody?1:0);j++)for(const delta of [-12,12]){const n=plan[i].notes[j]+delta;if(n<53||n>86||plan[i].notes.includes(n)||cfg.lockMelody&&n>=plan[i].notes.at(-1))continue;const candidatePlan=copy(plan);candidatePlan[i].notes[j]=n;candidatePlan[i].notes.sort((a,b)=>a-b);if(performedResolutions(harmony,candidatePlan).every(x=>x.resolved))candidates.push({i,j,n});}
  }
  if(!candidates.length)return {...copy(model),notice:'No octave shift is available within the current register and constraints.'};
  const {i,j,n}=pick(candidates,r);slot=i;cut=harmony.events[i].onsetBeat*PPQ;const before=plan[i].notes[j];plan[i].notes[j]=n;plan[i].notes.sort((a,b)=>a-b);plan[i].topTarget=plan[i].notes.at(-1);changed.push({slot,fromNote:before,toNote:n});
 }else{
  const last=harmony.events.at(-1);if(kind==='tail'&&last.durationBeats<.5)return {...copy(model),notice:'The ending is already one sixteenth note long. Regenerate the phrase for a new division.'};cut=kind==='tail'?Math.max(last.onsetBeat*PPQ+last.durationBeats*PPQ/2,total-PPQ):Math.max(0,total-2*BAR);
  if(kind==='tail'){
   cut=Math.round(cut/STEP)*STEP;if(cut<=last.onsetBeat*PPQ||cut>=total)return {...copy(model),notice:'There is no room to split the ending further.'};
   const oldEnd=last.onsetBeat+last.durationBeats,lastCopy=copy(last),newChord={...copy(last),index:harmony.events.length,onsetBeat:cut/PPQ,durationBeats:oldEnd-cut/PPQ,movement:'voice-led'};
   last.durationBeats=cut/PPQ-last.onsetBeat;const q=extension[lastCopy.quality];if(q&&eligible(lastCopy))replaceQuality(newChord,q);
   harmony.events.push(newChord);plan.push(copy(plan.at(-1)));slot=newChord.index;changed.push({slot,splitAtTick:cut,from:lastCopy.quality,to:newChord.quality});
  }
  const step=cut/STEP;
  rhythm.protectedRests=(rhythm.protectedRests||[]).filter(x=>x.start<step).map(x=>({...x,end:Math.min(x.end,step)}));
  for(const hit of rhythm.attacks)if(hit.step>=step){if(!hit.essential)hit.duration*=.45;if(hit.role==='bass'&&kind==='tail')hit.bassFunction='octave';}
  const positions=kind==='tail'?[step,step+2]:[step+5,step+13,step+21,step+29];
  for(const [i,t] of positions.entries())if(t<cfg.length*16&&!rhythm.attacks.some(h=>h.step===t&&h.role!=='bass'))rhythm.attacks.push({id:'local:'+iteration+':'+i,step:t,bar:Math.floor(t/16),role:i%2?'inner':'full',duration:i%2?.55:1.8,velocity:i%2?70:101,articulation:i%2?'ghost':'stab',anticipate:false,essential:false,motif:rhythm.form[Math.floor(t/16)],operation:'local-retrigger'});
  rhythm.attacks.sort((a,b)=>a.step-b.step||String(a.id).localeCompare(String(b.id)));
 }
 annotateResolutions(harmony.events);harmony.plan=harmony.events.map(h=>h.quality+':'+h.rootPc);
 if(kind==='extend'||kind==='tail'){
  const h=harmony.events[slot],oldTop=plan[slot].notes.at(-1),top=h.pcs.includes(oldTop%12)?oldTop:melodyTargets(harmony,cfg,model.revisions.voicing)[slot];
  const retained=plan[slot].notes.filter(n=>h.pcs.includes(n%12)&&n<=top);plan[slot]={notes:[...new Set([...retained,...melodicCandidates(h,top,cfg)[0].notes])].sort((a,b)=>a-b),topTarget:top,melodyPlanned:true,inverted:true};
 }
 if(!repairLocalResolution(harmony,plan,slot))return {...copy(model),notice:'This variation would interrupt a resolution. Try another edit or regenerate the voicings.'};
 let next=renderModel(grammar,cfg,harmony,rhythm,model.revisions,plan,cfg.lockMelody?model.events.filter(e=>e.role==='top'):null);
 // Preserve the already performed prefix, including anticipations and touch.
 // A note crossing the cut keeps its onset and is released at the cut if the
 // altered harmony no longer admits it. No new event may start in the prefix.
 const prefix=model.events.filter(e=>e.startTick<cut).map(e=>{
  const h=harmony.events[activeIndex(harmony,cut/PPQ)],out=copy(e);
  if(out.endTick>cut&&!h.pcs.includes(out.note%12))out.endTick=cut;return out;
 });
 next.events=sanitize([...prefix,...next.events.filter(e=>e.startTick>=cut)],total);
 // Preserve existing ornaments only if their actual target survives the edit.
 next.events=next.events.filter(e=>!e.resolutionTarget||next.events.some(t=>t.note===e.resolutionTarget.note&&t.startTick===e.resolutionTarget.startTick&&t.attackIndex===e.resolutionTarget.attackIndex));
 const changedStarts=next.events.flatMap(e=>{const old=model.events.find(x=>x.note===e.note&&x.startTick===e.startTick&&x.attackIndex===e.attackIndex);return old&&old.endTick!==e.endTick?[e.startTick]:[];}),effectiveCut=Math.min(cut,...changedStarts);
 next.localEdits=[...(model.localEdits||[]),{kind,iteration,fromTick:effectiveCut,harmonicSlot:slot,changes:changed,noteChanges:next.events.filter(e=>e.startTick>=effectiveCut&&!model.events.some(x=>JSON.stringify(x)===JSON.stringify(e))).map(e=>({note:e.note,startTick:e.startTick,endTick:e.endTick,role:e.role}))}];
 next.notice=({extend:'Extension added',redispose:'One voice shifted by an octave',tail:'Ending split and varied',articulate:'Ending rhythm added'})[kind]+' · the beginning of the phrase is preserved';return next;
}

// Chord body is independent of attack density. Suspended energy remains sparse.
function bodyGesture(hit,cfg){
 if(hit.role==='bass'||hit.role==='pulse'||energyAt(cfg,hit.bar)==='suspended')return hit;
 const out={...hit};
 if(cfg.body<35){if(out.role==='full')out.role='outer';return out;}
 const anchor=hit.essential||['held','arrival'].includes(hit.articulation);
 if(cfg.body>=50&&anchor||cfg.body>=100||cfg.body>=85&&hash('body:'+hit.step)%100<cfg.body-55)out.role='full';
 return out;
}
function rebody(grammar,input,model){
 const cfg=config(input),next=renderModel(grammar,cfg,model.harmony,model.rhythm,model.revisions,model.voicingPlan);
 next.localEdits=copy(model.localEdits||[]);next.notice='Chord body updated · rhythm and harmony preserved';return next;
}
function makeStabRhythm(cfg,base,revision){
 if(cfg.stabHands==='bounce')return arrangeBounceRhythm(cfg,base,revision);
 const patterns=[[0,3,6,10,14,16,19,22,26,30],[0,6,9,14,16,22,25,27,30],[0,3,6,8,14,16,19,22,24,30]],r=stream(cfg,'stab-rhythm',revision);
 let pattern=pick(patterns,r).slice();
 if(cfg.density<35)pattern=pattern.filter(t=>[0,6,14,16,22,30].includes(t));
 if(cfg.density>75)pattern=[...new Set([...pattern,7,23,29])].sort((a,b)=>a-b);
 const attacks=[];
 for(let b=0;b<cfg.length;b+=2)for(const [hitIndex,t0] of pattern.entries()){let t=t0;
  // Repeat the same rhythmic cell; harmonic passages never add attacks.
  const step=b*16+t;if(step>=cfg.length*16)continue;
  const accent=t===0||t===16||t%16===14,bar=Math.floor(step/16),duration=accent?1.55:t%4===3?.6:1.05;
  const roles=cfg.stabHands==='dialogue'?[(Math.floor(b/2)*pattern.length+hitIndex)%2?'full':'bass']:['bass','full'];
  for(const role of roles)attacks.push({id:'stab:'+step+':'+role,step,bar,role,duration,velocity:accent?113:103,essential:accent,anticipate:true,articulation:'house-stab',bassFunction:role==='bass'?'root':undefined,motif:base.form[bar],operation:'house-stab',energy:'full'});
 }
 return repeatStabBar({...copy(base),stabBase:copy(base),form:Array(cfg.length).fill('A'),sections:Array(Math.ceil(cfg.length/(cfg.stabRepeat==='bar'?1:2))).fill('A'),attacks,protectedRests:[],energy:'full',energySections:base.energySections.map(()=>'full'),operations:[cfg.stabHands==='dialogue'?'alternating left/right chord stabs':'synchronized bass and chords','full house stabs','accented call and response'],pattern:pattern.join(',')},cfg);
}
function repeatStabBar(rhythm,cfg){
 if(cfg.stabRepeat!=='bar')return rhythm;
 const cell=rhythm.attacks.filter(h=>h.step<16),attacks=[];
 for(let bar=0;bar<cfg.length;bar++)for(const h of cell)attacks.push({...copy(h),id:'bar-loop:'+bar+':'+h.id,step:bar*16+h.step,bar,motif:rhythm.form[bar]});
 return {...rhythm,attacks,repeatBeats:4,pattern:[...new Set(cell.map(h=>h.step))].join(','),...(rhythm.bounceCell?{bounceCell:rhythm.bounceCell.filter(h=>h[0]<16)}:{}),operations:[...rhythm.operations,'identical syncopated four-beat bar']};
}
function leftHandStabNotes(chord){
 if(chord.scalerNotes)return [chord.scalerBassNote];
 const root=48+(chord.bassPc??chord.rootPc),available=chord.pcs;
 const colours=[3,4,10,11,7,8,6,5,2,1,9].filter(n=>available.includes(mod(root+n,12))).slice(0,2);
 if(colours.length<2)throw Error('Left-hand chord needs two harmonic colours');
 return [root,...colours.map(n=>root+n)].sort((a,b)=>a-b);
}
function rightHandStabNotes(voicing,chord){
 if(chord.scalerNotes)return voicing.slice();
 const top=Math.max(72,voicing.at(-1));let notes=powerStabNotes(voicing,chord).filter(n=>n>=60);
 // Keep the response above middle C and fill missing chord colours underneath.
 if(new Set(notes.map(n=>n%12)).size<3){
  for(const pc of chord.upper.pcs){const n=top-mod(top-pc,12);if(n>=60&&!notes.includes(n))notes.push(n);}
 }
 return [...new Set(notes)].sort((a,b)=>a-b);
}
function powerStabNotes(voicing,chord){
 if(chord.scalerNotes)return voicing.slice();
 const top=voicing.at(-1),notes=voicing.slice();
 // Add weight around the melody with root/fifth doublings; dedicated STAB
 // triads may also reinforce the third.
 // Prefer the upper register so shared punches do not collapse into the left hand.
 const weightRoot=chord.stabTriad?chord.upper.rootPc:chord.rootPc;
 const upperQuality=QUALITIES[chord.upper.quality],third=chord.resolutionRules?.length?null:upperQuality.pcs.find(n=>n===3||n===4)??null;
 for(const pc of [weightRoot,mod(weightRoot+7,12),...(third==null?[]:[mod(weightRoot+third,12)])]){
  if(!chord.pcs.includes(pc))continue;
  const near=top-mod(top-pc,12),note=[near,near+12,near-12].find(n=>n>=48&&n<=96&&!notes.includes(n));if(note!=null)notes.push(note);
 }
 if(chord.resolutionRules?.length){const near=top-mod(top-weightRoot,12),anchor=[near+12,near-12,near+24].find(n=>n>=48&&n<=96&&!notes.includes(n));if(anchor!=null)notes.push(anchor);}
 return [...new Set(notes)].sort((a,b)=>a-b);
}
function setStab(grammar,input,model){
 const cfg=config(input);
 if(cfg.stab){
  const source=copy(model.stabSource||model),rhythm=source.rhythm.stabBase||source.rhythm;
  const harmony=cfg.oleanHouse||cfg.stabHarmony==='current'?source.harmony:makeStabHarmony(cfg,source.revisions.harmony,makeStabRhythm(cfg,rhythm,source.revisions.rhythm));
  const plan=cfg.oleanHouse||cfg.stabHarmony==='current'?source.voicingPlan:planStabTriads(harmony,cfg);
  const next=renderModel(grammar,cfg,harmony,rhythm,source.revisions,plan);next.stabSource=source;next.notice=cfg.stabHands==='bounce'?'STAB! House bounce · full chords and close responses':'STAB! Fixed rhythm, full chords · click again to restore the phrase';return next;
 }
 if(model.stabSource){const source=copy(model.stabSource),next=reperform(grammar,cfg,source);next.notice='Original phrase restored';return next;}
 const next=renderModel(grammar,cfg,model.harmony,model.rhythm,model.revisions,model.voicingPlan);next.notice='STAB off · phrasing restored';return next;
}
// PML-inspired authored progressions. Natural-minor examples are not a ban on V
// or diminished chords in the other harmonic languages of the engine.
function makeStabHarmony(cfg,revision,rhythm){return applyHousemaster(makeStabHarmonyRaw(cfg,revision,rhythm),cfg);}
function makeStabHarmonyRaw(cfg,revision,rhythm){
 const minor=cfg.mode==='Minor',scale=minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11],variant=revision%2;
 const lastDegree=minor?6:4;
 const patterns=cfg.stabProgression===2?(variant?[[0,8],[3,8]]:[[0,8],[5,8]]):cfg.stabProgression===3?(variant?[[0,4],[lastDegree,4],[5,8]]:[[0,4],[3,4],[5,8]]):(variant?[[0,4],[2,4],[5,4],[lastDegree,4]]:[[0,4],[5,4],[2,4],[3,4]]);
 const tonic=PCS[cfg.key],total=cfg.length*4,cycleBeats=cfg.length===2?8:16,factor=cycleBeats/16,events=[];
 const triad=degree=>{const intervals=[0,2,4].map(n=>mod(scale[(degree+n)%7]-scale[degree],12)).sort((a,b)=>a-b);return intervals.includes(3)?'minor':'major';};
 function chord(degree,onsetBeat,durationBeats,passage=false){
  let rootPc=mod(tonic+scale[degree],12),quality=triad(degree),bassPc=rootPc,upperRoot=rootPc,upperQuality=quality;
  if(cfg.stabHarmony==='bass'){
   upperRoot=tonic;upperQuality=minor?'minor':'major';
   const diff=scale[degree];
   if(QUALITIES[upperQuality].pcs.includes(diff)){rootPc=tonic;quality=upperQuality;}
   else if(degree===5)quality=minor?'maj7':'m7';
   else if(degree===3)quality=minor?'9no3':'maj9no3';
   else throw Error('Unsupported fixed-triad bass');
  }
  const upper={rootPc:upperRoot,quality:upperQuality,pcs:QUALITIES[upperQuality].pcs.map(n=>mod(n+upperRoot,12)).sort((a,b)=>a-b),label:NAMES[upperRoot]+QUALITIES[upperQuality].label};
  const pcs=[...new Set([...upper.pcs,bassPc])].sort((a,b)=>a-b);
  const label=cfg.stabHarmony==='bass'?upper.label+(bassPc!==upperRoot?'/'+NAMES[bassPc]:''):NAMES[rootPc]+QUALITIES[quality].label;
  return {index:0,onsetBeat,durationBeats,rootPc,quality,bassPc,upper,pcs,label,movement:cfg.stabHarmony==='bass'?'fixed-upper':'diatonic',function:passage?'passing-diatonic':'structural',destinationIndex:null,template:'pml-stab-'+cfg.stabHarmony,passage,scaleDegree:degree+1,resolutionRules:[],stabTriad:true};
 }
 // The fixed-upper variant uses only bass notes whose result is represented
 // explicitly. Its four-event alternative changes order, not the pitch set.
 const rows=cfg.stabHarmony==='bass'&&variant?(cfg.stabProgression===2?[[0,8],[3,8]]:cfg.stabProgression===3?[[0,4],[5,4],[3,8]]:[[0,4],[3,4],[5,4],[2,4]]):patterns;
 for(let start=0;start<total;start+=cycleBeats){let beat=start;
  for(let ci=0;ci<rows.length;ci++){
   const [degree,dur]=rows[ci],duration=Math.min(dur*factor,total-beat);if(duration<=0)break;
   const h=chord(degree,beat,duration),end=beat+duration;
   if(cfg.stabHarmony==='scale-passages'&&(ci===1||ci===2&&dur>=8)){
    const candidates=rhythm.attacks.filter(a=>(a.role==='full'||a.role==='bass')&&a.step/4>=beat+.5&&a.step/4<end-.5&&a.step%4!==0);
    const selected=candidates.at(-1),at=selected?selected.step/4:null;
    if(at!=null){h.durationBeats=at-beat;events.push(h);const nextDegree=rows[(ci+1)%rows.length][0],preferred=ci===1?2:lastDegree,passDegree=[preferred,2,lastDegree,3,5].find(d=>d!==degree&&d!==nextDegree);events.push(chord(passDegree,at,end-at,true));}else events.push(h);
   }else events.push(h);
   beat=end;
  }
 }
 events.forEach((h,i)=>{h.index=i;if(h.passage)h.destinationIndex=(i+1)%events.length;});
 return {events,language:'stab-'+cfg.stabHarmony,family:null,template:'pml-stab-'+cfg.stabHarmony,cycleBeats,source:'Authored diatonic STAB grammar informed by PML',plan:events.map(h=>h.quality+':'+h.rootPc)};
}
function planStabTriads(harmony,cfg){
 if(cfg.housemaster)return harmony.events.map(h=>{
  const root=60+h.upper.rootPc,third=h.upper.pcs.includes(mod(h.upper.rootPc+3,12))?3:4;
  let notes=h.upper.pcs.map(pc=>root+mod(pc-root,12)+(cfg.stabVoicing==='open'&&mod(pc-root,12)===third?12:0)).sort((a,b)=>a-b);
  while(notes.at(-1)>86)notes=notes.map(n=>n-12);
  return {notes,topTarget:notes.at(-1),inverted:cfg.stabVoicing==='open',stabTriad:false,voicingOperation:'housemaster-'+cfg.stabVoicing};
 });
 return harmony.events.map(h=>{
  const root=h.upper.rootPc,third=h.upper.quality==='minor'?3:4;
  let notes=[60+root,60+root+third+(cfg.stabVoicing==='open'?12:0),60+root+7].sort((a,b)=>a-b);
  while(notes.at(-1)>80)notes=notes.map(n=>n-12);
  return {notes,topTarget:notes.at(-1),inverted:cfg.stabVoicing==='open',stabTriad:true,voicingOperation:cfg.stabVoicing==='open'?'third-up-octave':'root-position'};
 });
}

const BOUNCE_FORMS = {"AAAA":"Fixed · AAAA","AAAB":"AAAB · final response","AABA":"AABA · variation and return","AABB":"AABB · two blocks","AABC":"AABC · progressive opening","ABAA":"ABAA · response and reprise","ABAB":"ABAB · alternating","ABAC":"ABAC · two responses","ABBA":"ABBA · mirrored return","ABBB":"ABBB · new bounce","ABBC":"ABBC · response and ending","ABCA":"ABCA · journey and return","ABCB":"ABCB · returning response","ABCC":"ABCC · repeated ending","ABCD":"ABCD · four bounces"};
const BOUNCE_PATTERNS = (()=>{
 const original=[
  [[0,'both'],[2,'right'],[3,'left'],[6,'right'],[7,'left'],[8,'right'],[10,'left'],[11,'right'],[14,'right'],[15,'left'],[16,'both'],[18,'left'],[19,'right'],[22,'left'],[23,'right'],[26,'right'],[27,'left'],[30,'both']],
  [[0,'both'],[1,'right'],[3,'left'],[6,'right'],[8,'left'],[9,'right'],[11,'left'],[14,'right'],[15,'left'],[16,'both'],[18,'right'],[19,'left'],[22,'right'],[24,'left'],[25,'right'],[27,'left'],[30,'both']],
  [[0,'both'],[2,'left'],[3,'right'],[6,'left'],[7,'right'],[10,'right'],[11,'left'],[14,'right'],[15,'left'],[16,'both'],[18,'right'],[19,'left'],[22,'right'],[23,'left'],[24,'right'],[26,'left'],[27,'right'],[30,'both']]
 ];
 return [
  {id:"classic",name:"Classic bounce",cell:original[0],accents:[6,10,14,22,26]},
  {id:"answer",name:"Call and response",cell:original[1],accents:[6,10,14,22,26]},
  {id:"drive",name:"House drive",cell:original[2],accents:[6,10,14,22,26]},
  {"id":"backbeat","name":"Backbeat accents","cell":[[0,"both"],[2,"right"],[3,"left"],[4,"right"],[6,"left"],[7,"right"],[10,"left"],[11,"right"],[12,"both"],[15,"left"],[16,"right"],[18,"left"],[19,"right"],[20,"both"],[22,"right"],[23,"left"],[26,"right"],[27,"left"],[28,"both"],[31,"right"]],"accents":[4,12,20,28]},
  {"id":"push","name":"Early push","cell":[[0,"both"],[1,"left"],[2,"right"],[5,"left"],[6,"right"],[8,"left"],[9,"right"],[12,"both"],[14,"left"],[15,"right"],[16,"left"],[17,"right"],[20,"both"],[21,"right"],[22,"left"],[25,"right"],[26,"left"],[28,"right"],[29,"left"],[31,"right"]],"accents":[2,6,9,14,17,22,26,31]},
  {"id":"double","name":"Double response","cell":[[0,"both"],[2,"left"],[3,"right"],[5,"right"],[6,"left"],[8,"right"],[10,"left"],[11,"right"],[13,"right"],[14,"left"],[16,"both"],[18,"right"],[19,"left"],[21,"left"],[22,"right"],[24,"left"],[26,"right"],[27,"left"],[29,"left"],[30,"right"]],"accents":[3,6,11,14,19,22,27,30]},
  {"id":"offbeat","name":"Persistent offbeat","cell":[[0,"both"],[1,"left"],[2,"right"],[5,"left"],[6,"right"],[9,"left"],[10,"right"],[13,"left"],[14,"right"],[15,"left"],[16,"both"],[17,"right"],[18,"left"],[21,"right"],[22,"left"],[25,"right"],[26,"left"],[29,"right"],[30,"left"]],"accents":[2,6,10,14,18,22,26,30]},
  {"id":"chase","name":"Chase","cell":[[0,"both"],[1,"right"],[3,"left"],[4,"right"],[6,"left"],[7,"right"],[9,"left"],[10,"right"],[12,"left"],[13,"right"],[15,"left"],[16,"both"],[18,"right"],[19,"left"],[21,"right"],[22,"left"],[24,"right"],[25,"left"],[27,"right"],[28,"left"],[30,"right"],[31,"left"]],"accents":[3,6,9,12,15,19,22,25,28,31]},
  {"id":"rebound","name":"Rebound","cell":[[0,"both"],[3,"right"],[4,"left"],[5,"right"],[7,"left"],[8,"right"],[10,"left"],[12,"both"],[13,"right"],[15,"left"],[16,"right"],[19,"left"],[20,"right"],[21,"left"],[23,"right"],[24,"left"],[26,"right"],[28,"both"],[29,"left"],[31,"right"]],"accents":[3,5,8,13,19,21,24,29]},
  {"id":"triplet_groups","name":"Groups of 3–3–2","cell":[[0,"both"],[2,"left"],[3,"right"],[5,"left"],[6,"right"],[8,"both"],[9,"right"],[11,"left"],[12,"right"],[14,"left"],[15,"right"],[16,"both"],[18,"right"],[19,"left"],[21,"right"],[22,"left"],[24,"both"],[25,"left"],[27,"right"],[28,"left"],[30,"right"],[31,"left"]],"accents":[3,6,11,14,19,22,27,30]},
  {"id":"pickup","name":"Early pickup","cell":[[0,"both"],[2,"right"],[4,"left"],[5,"right"],[7,"left"],[8,"right"],[9,"left"],[11,"right"],[13,"left"],[14,"right"],[15,"left"],[16,"both"],[18,"left"],[20,"right"],[21,"left"],[23,"right"],[24,"left"],[25,"right"],[27,"left"],[29,"right"],[30,"left"],[31,"right"]],"accents":[5,8,11,14,21,24,27,30]},
  {"id":"broken","name":"Broken bounce","cell":[[0,"both"],[1,"left"],[4,"right"],[5,"left"],[7,"right"],[9,"left"],[10,"right"],[12,"both"],[13,"left"],[14,"right"],[16,"left"],[17,"right"],[20,"both"],[21,"right"],[23,"left"],[25,"right"],[26,"left"],[28,"both"],[29,"right"],[30,"left"]],"accents":[1,5,7,10,14,17,21,23,26,30]},
 ];
})();
// Authored rhythm, hand and accent patterns; selection is deterministic.
function makeBounceRhythm(cfg,base,revision){
 const variant=cfg.bouncePattern==='auto'?(Math.floor(stream(cfg,'bounce-base')()*BOUNCE_PATTERNS.length)+revision)%BOUNCE_PATTERNS.length:BOUNCE_PATTERNS.findIndex(p=>p.id===cfg.bouncePattern);
 const selected=BOUNCE_PATTERNS[variant];let cell=copy(selected.cell);
 if(cfg.density<35){
  cell=cell.filter(([t,hand],i)=>hand==='both'||t%4===2||t%4===3&&i%2===0);
  // A sparse bounce still needs an independent reply from each hand per bar.
  for(const start of [0,16])for(const hand of ['left','right'])if(!cell.some(h=>h[0]>=start&&h[0]<start+16&&h[1]===hand)){
   const reply=selected.cell.find(h=>h[0]>=start&&h[0]<start+16&&h[1]===hand);if(reply)cell.push(copy(reply));
  }
 }
 if(cfg.density>75){
  const pickups=[5,13,21,29,1,9,17,25,7,15,23,31,3,11,19,27,2,6,10,14,18,22,26,30,4,8,12,20,24,28];
  let added=0;for(const t of pickups)if(!cell.some(x=>x[0]===t)){cell.push([t,added%2?'right':'left']);if(++added===4)break;}
 }
 cell=strictBounceCell(cell);const attacks=[];
 for(let b=0;b<cfg.length;b+=2)for(let i=0;i<cell.length;i++){
  const [t,hand]=cell[i],step=b*16+t;if(step>=cfg.length*16)continue;
  const both=hand==='both',accent=both||selected.accents.includes(t),gap=(cell[i+1]?.[0]??32)-t;
  // Leave actual silence before the next hand, even at adjacent sixteenths.
  const duration=Math.min(both?1.35:accent?1.05:.55,gap-.22),velocity=both?120:accent?116:101;
  for(const role of both?['bass','full']:[hand==='left'?'bass':'full'])attacks.push({id:'bounce:'+step+':'+role,step,bar:Math.floor(step/16),role,duration,velocity,essential:accent,anticipate:true,articulation:'house-stab',bassFunction:role==='bass'?'root':undefined,motif:base.form[Math.floor(step/16)],operation:both?'bounce-punch':accent?'bounce-accent':'bounce-reply',energy:'full'});
 }
 return {...copy(base),stabBase:copy(base),attacks,protectedRests:[],energy:'full',energySections:base.energySections.map(()=>'full'),operations:['strict bass/chord alternation','syncopated interlocking replies','single-hand attacks','source bass against exact chord voicing'],pattern:cell.map(x=>x[0]).join(','),bounceCell:cell,bouncePatternId:selected.id,bouncePatternName:selected.name};
}
function strictBounceCell(cell){const unique=[...new Map(cell.sort((a,b)=>a[0]-b[0]).map(x=>[x[0],x])).values()];return unique.map(([time],index,array)=>{const barStart=Math.floor(time/16)*16,position=array.filter(x=>x[0]>=barStart&&x[0]<time).length;return[time,position%2?'right':'left'];});}
function relatedBouncePatterns(selected){
 const distance=p=>{
  const left=new Map(selected.cell),right=new Map(p.cell),times=new Set([...left.keys(),...right.keys()]);
  let score=Math.abs(selected.cell.length-p.cell.length)*.25;
  for(const t of times){if(!left.has(t)||!right.has(t))score+=1.5;else if(left.get(t)!==right.get(t))score+=1;}
  for(const t of new Set([...selected.accents,...p.accents]))if(selected.accents.includes(t)!==p.accents.includes(t))score+=3;
  return score;
 };
 return [selected,...BOUNCE_PATTERNS.filter(p=>p.id!==selected.id).sort((a,b)=>distance(a)-distance(b)||BOUNCE_PATTERNS.indexOf(a)-BOUNCE_PATTERNS.indexOf(b))];
}
function arrangeBounceRhythm(cfg,base,revision){
 const first=repeatStabBar(makeBounceRhythm(cfg,base,revision),cfg),unit=cfg.stabRepeat==='bar'?16:32;
 const letters=[...new Set(cfg.bounceForm)],index=BOUNCE_PATTERNS.findIndex(p=>p.id===first.bouncePatternId),assignments={},cells={};
 for(const [i,letter] of letters.entries()){
  const p=relatedBouncePatterns(BOUNCE_PATTERNS[index])[i];assignments[letter]={id:p.id,name:p.name};
  const source=i===0?first:repeatStabBar(makeBounceRhythm({...cfg,bouncePattern:p.id},base,revision),cfg);
  cells[letter]=source.attacks.filter(h=>h.step<unit);
 }
 const sequence=Array.from({length:Math.ceil(cfg.length*16/unit)},(_,i)=>cfg.bounceForm[i%cfg.bounceForm.length]);
 const metadata={form:Array.from({length:cfg.length},(_,b)=>sequence[Math.floor(b*16/unit)]),sections:sequence,bounceForm:cfg.bounceForm,bounceUnitBeats:unit/4,bounceAssignments:assignments,bounceSequence:sequence};
 if(cfg.bounceForm==='AAAA')return {...first,...metadata};
 const attacks=[];
 for(const [i,letter] of sequence.entries())for(const h of cells[letter]){
  const step=i*unit+h.step;if(step>=cfg.length*16)continue;
  attacks.push({...copy(h),id:'bounce-form:'+i+':'+h.id,step,bar:Math.floor(step/16),motif:base.form[Math.floor(step/16)],bounceLetter:letter});
 }
 return {...first,...metadata,attacks,pattern:[...new Set(attacks.map(h=>h.step))].join(','),operations:[...first.operations,'bounce form '+cfg.bounceForm]};
}
function plannedStabNotes(voicing,chord){
 if(chord.scalerNotes)return voicing.slice();
 const notes=voicing.slice();
 // A triad receives an upper root double so it does not disappear into the
 // independent bass/octave pair on a shared attack.
 if(notes.length<4){const root=notes[0]-mod(notes[0]-chord.upper.rootPc,12);const candidates=[root+12,root-12,root];const n=candidates.find(n=>n>=36&&n<=96&&!notes.includes(n));if(n!=null)notes.push(n);}
 return notes.sort((a,b)=>a-b);
}
function actualResolutions(harmony,events){
 return harmony.events.flatMap((h,i)=>{
  if(!h.resolutionRules?.length)return [];
  const dest=(i+1)%harmony.events.length,from=events.filter(e=>e.harmonicSlot===i&&(e.role!=='bass'||e.sharedRight)&&e.role!=='ornament'),to=events.filter(e=>e.harmonicSlot===dest&&(e.role!=='bass'||e.sharedRight)&&e.role!=='ornament');
  if(!from.length)return [];
  const last=from.reduce((a,b)=>a.touchStep>b.touchStep?a:b),first=to.length?to.reduce((a,b)=>a.touchStep<b.touchStep?a:b):null;
  const sources=from.filter(e=>e.touchStep===last.touchStep),targets=to.filter(e=>e.touchStep===first?.touchStep);
  return resolutionPairs(h,sources.map(e=>e.note),targets.map(e=>e.note)).map(r=>({...r,fromSlot:i,toSlot:dest,fromTick:last.startTick,toTick:first?.startTick??null,loopReturn:dest===0,basis:'final-midi-attacks'}));
 });
}
function bounceLeftNotes(chord){
 if(chord.scalerNotes)return [chord.scalerBassNote];
 const root=48+(chord.bassPc??chord.rootPc),colours=[3,4,7,8,6,10,11,5,2,1,9].filter(n=>chord.pcs.includes(mod(root+n,12))).slice(0,2);
 return [root,...colours.map(n=>root+n),root+12].sort((a,b)=>a-b);
}
function bounceRightNotes(chord,cfg={},revision=0){
 if(chord.scalerNotes)return chord.scalerNotes.slice();
 let root=60+chord.upper.rootPc;
 // Keep the full upper structure and reinforce its root in octave. Bass remains
 // separately defined: a borrowed bass must not turn every upper stab into a triad.
 const third=chord.upper.pcs.includes(mod(chord.upper.rootPc+3,12))?3:4;
 const notes=[...new Set([...chord.upper.pcs.map(pc=>root+mod(pc-root,12)+(cfg.stabVoicing==='open'&&mod(pc-root,12)===third?12:0)),root,root+12])].sort((a,b)=>a-b);
 // Vary an inner voice while retaining both octave anchors and chord weight.
 const movable=notes.filter(n=>n!==root&&n!==root+12&&n+12<=96&&!notes.includes(n+12));
 const choice=revision%(movable.length+1);
 if(cfg.stabHarmony==='current'&&choice)notes[notes.indexOf(movable[choice-1])]+=12;
 return notes.sort((a,b)=>a-b);
}

const api={version:23,SCALER_SETS,makeScalerSetHarmony,identifyScalerChord,SCALER_INTENTS,SCALER_MOTIONS,SCALER_FOUNDATIONS,resolvedScalerMotion,resolvedScalerFoundation,EXPRESSIVE_SCENES,GENRE_SCENE_PRIORITIES,expressiveTemplate,planExpressiveBass,relatedBouncePatterns,actualResolutions,plannedStabNotes,OLEAN_RULES,oleanRule,setOleanHouse,applyHousemaster,setHousemaster,HOUSEMASTER_REPLACEMENTS,BOUNCE_FORMS,BOUNCE_PATTERNS,makeBounceRhythm,bounceLeftNotes,bounceRightNotes,leftHandStabNotes,rightHandStabNotes,makeStabHarmony,planStabTriads,setStab,rebody,bodyGesture,makeStabRhythm,makePassagesRhythm,tiePassageCommonTones,powerStabNotes,localVariation,researchFamily,researchTemplate,melodyTargets,planMelodicVoicings,coordinatePiano,performedResolutions,rearrange,energyAt,ENERGY_LABELS,hybridTemplate,harmonicChanged,planHybridVoicings,GENRES,QUALITIES,LIBRARY,generate,regenerate,reperform,config,makeHarmony,makeRhythm,planVoicings,harmonicTarget,releaseLimit,swingTick,sanitize,inversions,renderModel,transformGestureCell,inRest,restLimit};
api.harmonicBlockCount=harmonicBlockCount;api.harmonicFormSequence=harmonicFormSequence;
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HouseEngine=api;
})(typeof window!=='undefined'?window:this);
/* Deterministic section derivation from one Chordarium phrase. */
(function(root){'use strict';
const E=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.HouseEngine;
const BAR=1920,STEP=120,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mod=(v,n)=>(v%n+n)%n;
function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function random(seed){return()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function sourceSignature(model,cfg){return hash([cfg.seed,cfg.genre,cfg.key,cfg.mode,model.events.length,model.events.map(e=>[Math.round(e.startTick),e.note,e.velocity].join(':')).join(',')].join('|'))}
function pitch(note,shift=0){return clamp(note+shift,0,127)}
function clean(events,bars){
 const end=bars*BAR,out=[],seen=new Map();
 for(const raw of events){const e={...raw,note:Math.round(raw.note),velocity:clamp(Math.round(raw.velocity),1,127),startTick:Math.max(0,Math.round(raw.startTick)),endTick:Math.min(end,Math.round(raw.endTick))};if(e.note<0||e.note>127||e.endTick<=e.startTick)continue;const k=e.startTick+':'+e.note;const old=seen.get(k);if(!old||e.velocity>old.velocity)seen.set(k,e)}
 for(const e of seen.values())out.push(e);out.sort((a,b)=>a.startTick-b.startTick||a.note-b.note);
 // MIDI note-off for an older event must never silence a repeated note that is
 // still sounding on the same channel. Trim the older event at the retrigger.
 const sounding=new Map();for(const e of out){const k=(e.role==='bass'?'b:':'p:')+e.note,old=sounding.get(k);if(old&&old.endTick>e.startTick)old.endTick=e.startTick;sounding.set(k,e)}
 return out.filter(e=>e.endTick>e.startTick);
}
function repeatWindow(model,from,span,bars,filter=()=>true,transform=e=>e){
 const result=[],end=bars*BAR,source=model.events.filter(e=>e.startTick>=from&&e.startTick<from+span&&filter(e));
 for(let offset=0;offset<end;offset+=span)for(const e of source){const copy=transform({...e,startTick:e.startTick-from+offset,endTick:Math.min(span,e.endTick-from)+offset},offset/span);if(copy)result.push(copy)}return clean(result,bars);
}
function hookWindow(model,cfg,revision,spanBars=1){
 const total=cfg.length*BAR,span=Math.min(spanBars*BAR,total),starts=[];
 for(let start=0;start+span<=total;start+=BAR){const es=model.events.filter(e=>e.startTick>=start&&e.startTick<start+span);const score=es.reduce((s,e)=>s+e.velocity*(e.role==='top'?1.65:e.role==='bass'?1.08:1)+(e.essential?35:0),0)+new Set(es.map(e=>Math.round(mod(e.startTick-start,span)/STEP))).size*18;starts.push({start,score})}
 starts.sort((a,b)=>b.score-a.score||a.start-b.start);return starts[revision%Math.min(3,starts.length||1)]?.start||0;
}
function activeHarmony(model,beat){let i=0;while(i+1<model.harmony.events.length&&model.harmony.events[i+1].onsetBeat<=beat+1e-7)i++;return i}
function harmonyAtLoop(model,cfg,beat){return activeHarmony(model,mod(beat,cfg.length*4))}
function bassFor(h,center=41){const pc=h.bassPc??h.rootPc,candidates=[];for(let n=28;n<=52;n++)if(mod(n,12)===pc)candidates.push(n);return candidates.sort((a,b)=>Math.abs(a-center)-Math.abs(b-center))[0]}
function sixteenthChords(model,cfg,revision,bars){
 const events=[],variant=revision%4,accentMaps=[[0,4,8,12],[0,3,6,8,11,14],[0,2,5,8,10,13],[0,4,7,10,12,15]],accents=new Set(accentMaps[variant]);
 for(let step=0;step<bars*16;step++){
  const beat=step/4,i=harmonyAtLoop(model,cfg,beat),voicing=model.voicingPlan[i].notes,barStep=step%16;
  let chord=voicing.slice(-Math.min(variant===2?4:3,voicing.length));
  if(variant===3&&barStep>=12)chord=chord.map((n,j)=>pitch(n,j===chord.length-1?12:0));
  const velocity=clamp(72+(barStep%4===0?13:0)+(accents.has(barStep)?9:0)+(barStep===15?5:0),55,116),gate=[82,102,70,92][variant];
  for(const [j,n] of chord.entries())events.push({note:n,velocity:clamp(velocity+j*2,1,120),startTick:step*STEP,endTick:step*STEP+gate,role:j===chord.length-1?'top':'inner',harmonicSlot:i,articulation:'sixteenth'});
  if(barStep%4===0){const h=model.harmony.events[i];events.push({note:bassFor(h),velocity:barStep===0?86:74,startTick:step*STEP,endTick:step*STEP+Math.min(300,gate*2),role:'bass',harmonicSlot:i,articulation:'quarter-anchor'})}
 }
 return clean(events,bars);
}
const KEY_PCS={C:0,'C#':1,D:2,Eb:3,E:4,F:5,'F#':6,G:7,Ab:8,A:9,Bb:10,B:11};
function scalePcs(cfg){const tonic=KEY_PCS[cfg.key]??0,steps=cfg.mode==='Major'?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10];return steps.map(x=>mod(tonic+x,12))}
function notePool(pcs,lo=62,hi=86){const set=new Set(pcs),notes=[];for(let n=lo;n<=hi;n++)if(set.has(mod(n,12)))notes.push(n);return notes}
function chooseMelodyNote(pool,previous,target,r,structural){
 const ranked=pool.map(n=>{const leap=previous==null?Math.abs(n-target):Math.abs(n-previous),contour=Math.abs(n-target),repeat=previous===n?4.5:0,large=leap>7?(leap-7)*4:0;return{n,score:leap*1.25+contour*.68+repeat+large+r()*.42+(structural?0:Math.max(0,leap-4)*2)}}).sort((a,b)=>a.score-b.score||a.n-b.n);
 return ranked[0]?.n??72;
}
// Phrase rhythm repeats; pitch targets follow one contour adapted to each chord.
function melodicBoundary(model,cfg,tick,total){
 const cycle=cfg.length*BAR,local=mod(tick,cycle),base=tick-local;
 const next=model.harmony.events.find(h=>h.onsetBeat*480>local+.001);
 return Math.min(total,next?base+next.onsetBeat*480:base+cycle);
}
function motifPitch(h,previous,target){
 const pool=notePool(h.pcs,64,84),near=previous==null?pool:pool.filter(n=>Math.abs(n-previous)<=7);
 return (near.length?near:pool).sort((a,b)=>
  (Math.abs(a-target)+(previous==null?0:Math.abs(a-previous)*.55))-
  (Math.abs(b-target)+(previous==null?0:Math.abs(b-previous)*.55))||a-b)[0];
}
function melody(model,cfg,revision,bars){
 const events=[],variant=mod(revision,4),total=bars*BAR;
 const rhythms=[[0,3,6,8],[0,2,5,8],[0,3,5,9],[0,2,6,9]];
 const contours=[[0,3,5,2],[0,-2,3,0],[0,5,2,-2],[0,2,-3,0]];
 const center=72+mod(hash(cfg.seed+':melody:'+revision),5)-2;
 let previous=null;
 for(let bar=0;bar<bars;bar++){
  const positions=rhythms[variant],shape=contours[variant];
  for(let p=0;p<positions.length;p++){
   const startTick=bar*BAR+positions[p]*STEP,i=harmonyAtLoop(model,cfg,startTick/480),h=model.harmony.events[i];
   const cadence=bar===bars-1&&p===positions.length-1;
   const target=cadence?(previous??center):center+shape[p]+(bar%4===1?2:0);
   const note=motifPitch(h,previous,target),next=bar*BAR+(positions[p+1]??11)*STEP;
   const endTick=Math.min(next-24,startTick+(p===positions.length-1?2.5:2)*STEP,melodicBoundary(model,cfg,startTick,total));
   events.push({note,velocity:cadence?94:[94,80,87,83][p],startTick,endTick,role:'melody',harmonicSlot:i,structural:true,motifPosition:p,embellishment:'motif-chord-tone'});
   previous=note;
  }
 }
 // Low, quiet accompaniment leaves the melodic register free and follows actual changes.
 for(let startTick=0;startTick<total;){
  const i=harmonyAtLoop(model,cfg,startTick/480),h=model.harmony.events[i],end=melodicBoundary(model,cfg,startTick,total);
  const notes=[...new Set(model.voicingPlan[i].notes.map(n=>{while(n>59)n-=12;return n}))];
  for(const note of notes)events.push({note,velocity:44,startTick,endTick:Math.min(end,startTick+720),role:'inner',harmonicSlot:i,accompaniment:true});
  events.push({note:bassFor(h),velocity:54,startTick,endTick:Math.min(end,startTick+660),role:'bass',harmonicSlot:i,accompaniment:true});
  startTick=end;
 }
 return clean(events,bars);
}
function bassline(model,cfg,revision,bars){
 const events=[],variant=revision%4,patterns=[[0,3,4,6,8,11,12,15],[0,2,4,7,8,10,12,14,15],[0,3,4,7,8,11,12,14],[0,2,4,6,8,9,12,15]],pattern=new Set(patterns[variant]);
 for(let step=0;step<bars*16;step++){
  const position=step%16;if(!pattern.has(position))continue;
  const beat=step/4,i=harmonyAtLoop(model,cfg,beat),nextI=harmonyAtLoop(model,cfg,beat+.25),h=model.harmony.events[i],root=bassFor(h,40),isApproach=step+1<bars*16&&nextI!==i&&position%4===3;
  let note=root,bassFunction='root',approachTargetPc=null;
  if(isApproach){const target=bassFor(model.harmony.events[nextI],40),direction=variant%2===0?-1:1;note=clamp(target+direction,28,54);bassFunction='chromatic-approach';approachTargetPc=mod(target,12)}
  else if(position%4!==0){const fifthPc=mod((h.bassPc??h.rootPc)+7,12),pool=notePool(h.pcs,31,55),fifths=pool.filter(n=>mod(n,12)===fifthPc);if((position+variant)%3===0&&fifths.length){note=fifths.sort((a,b)=>Math.abs(a-43)-Math.abs(b-43))[0];bassFunction='fifth'}else{note=root+(position%2?12:0);if(note>55)note-=12;bassFunction=note===root?'root':'octave'}}
  const accented=position%4===0;events.push({note,velocity:accented?96:78+(position%2?7:0),startTick:step*STEP,endTick:step*STEP+(accented?210:92),role:'bass',harmonicSlot:i,bassFunction,approachTargetPc});
 }
 return clean(events,bars);
}
function offbeat(model,cfg,revision,bars){
 const events=[],variant=revision%4;
 for(let step=2;step<bars*16;step+=4){const beat=step/4,i=harmonyAtLoop(model,cfg,beat),voicing=model.voicingPlan[i].notes,count=variant===2?4:3;let chord=voicing.slice(-Math.min(count,voicing.length));if(variant===3&&Math.floor(step/4)%2)chord=chord.map((n,j)=>pitch(n,j===chord.length-1?12:0));for(const [j,n] of chord.entries())events.push({note:n,velocity:82+j*3+(step%16===14?6:0),startTick:step*STEP,endTick:step*STEP+[250,330,190,280][variant],role:j===chord.length-1?'top':'inner',harmonicSlot:i,articulation:'offbeat'});if(step%8===2){const h=model.harmony.events[i];events.push({note:bassFor(h),velocity:68,startTick:(step-2)*STEP,endTick:(step-2)*STEP+330,role:'bass',harmonicSlot:i,articulation:'half-note-anchor'})}}
 return clean(events,bars);
}
function euclideanPattern(pulses,steps){
 if(!Number.isInteger(pulses)||!Number.isInteger(steps)||pulses<1||pulses>steps)throw Error('Invalid Euclidean parameters');
 return Array.from({length:steps},(_,i)=>mod(i*pulses,steps)<pulses);
}
function rotatePattern(pattern,rotation){return pattern.map((_,i)=>pattern[mod(i-rotation,pattern.length)])}
function euclideanChords(model,cfg,revision,bars){
 const events=[],pulses=[5,7,9,11][revision%4],rotation=[0,2,5,7][revision%4],pattern=rotatePattern(euclideanPattern(pulses,16),rotation);
 for(let bar=0;bar<bars;bar++)for(let position=0;position<16;position++)if(pattern[position]){
  const step=bar*16+position,beat=step/4,i=harmonyAtLoop(model,cfg,beat),h=model.harmony.events[i],notes=model.voicingPlan[i].notes;
  let distance=1;while(distance<16&&!pattern[mod(position+distance,16)])distance++;
  const gate=Math.max(62,Math.min(230,distance*STEP-26)),accent=position%4===0||position===pattern.indexOf(true),velocity=accent?104:88+(position%2?4:0);
  for(const [j,n] of notes.entries())events.push({note:n,velocity:clamp(velocity+j,1,118),startTick:step*STEP,endTick:step*STEP+gate,role:j===notes.length-1?'top':'inner',harmonicSlot:i,articulation:'euclidean-full-chord',euclideanPulse:position,euclideanPulses:pulses,euclideanSteps:16,euclideanRotation:rotation});
  events.push({note:bassFor(h),velocity:accent?94:80,startTick:step*STEP,endTick:step*STEP+gate,role:'bass',harmonicSlot:i,articulation:'euclidean-full-chord',euclideanPulse:position,euclideanPulses:pulses,euclideanSteps:16,euclideanRotation:rotation});
 }
 return clean(events,bars);
}
function harmonyChanges(model,cfg,bars){
 const changes=[],phraseBeats=cfg.length*4,total=bars*4;
 for(let offset=0;offset<total;offset+=phraseBeats)for(let i=0;i<model.harmony.events.length;i++){const beat=offset+model.harmony.events[i].onsetBeat;if(beat<total)changes.push({beat,i,h:model.harmony.events[i]})}
 return changes.sort((a,b)=>a.beat-b.beat||a.i-b.i);
}
function voiceLeadPcs(pcs,previous,preferred,count=3,lo=55,hi=82){
 const pool=notePool(pcs,lo,hi),used=new Set(),result=[];
 const targets=previous?.length?previous.slice(0,count):preferred.filter(n=>n>=lo&&n<=hi).slice(-count);
 while(targets.length<count)targets.push(62+targets.length*5);
 for(const target of targets){const candidates=pool.filter(n=>!used.has(n));const n=(candidates.length?candidates:pool).sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||a-b)[0];if(n!=null){result.push(n);used.add(n)}}
 return result.sort((a,b)=>a-b);
}
function pad(model,cfg,revision,bars){
 const changes=harmonyChanges(model,cfg,bars),events=[];let previous=null;
 for(let c=0;c<changes.length;c++){const {beat,i,h}=changes[c],endBeat=changes[c+1]?.beat??bars*4,count=revision%4===2?4:3,preferred=model.voicingPlan[i].notes;let notes=voiceLeadPcs(h.pcs,previous,preferred,count,55,82);if(revision%4===3&&c%2&&notes.at(-1)<=70)notes[notes.length-1]+=12;for(const [j,n] of notes.entries())events.push({note:n,velocity:58+j*3+(c===0?5:0),startTick:beat*480,endTick:Math.max(beat*480+90,endBeat*480-24),role:j===notes.length-1?'top':'inner',harmonicSlot:i,articulation:'pad',guideVoice:j});if(c===0||Math.floor(beat/4)!==Math.floor((changes[c-1]?.beat??-4)/4))events.push({note:bassFor(h,38),velocity:52,startTick:beat*480,endTick:Math.min(endBeat,beat+3.5)*480,role:'bass',harmonicSlot:i,articulation:'pad-anchor'});previous=notes}
 return clean(events,bars);
}
function stringLine(model,cfg,revision,bars){
 const changes=harmonyChanges(model,cfg,bars),events=[],variant=revision%4,voiceNames=['cello','viola','violin-2','violin-1','divisi'];
 for(let c=0;c<changes.length;c++){
  const {beat,i,h}=changes[c],endBeat=changes[c+1]?.beat??bars*4,startTick=Math.round(beat*480),segmentEnd=Math.round(endBeat*480),source=[...new Set(model.voicingPlan[i].notes)].sort((a,b)=>a-b),count=Math.min(5,source.length),notes=count===source.length?source:Array.from({length:count},(_,v)=>source[Math.round(v*(source.length-1)/(count-1))]).filter((n,v,a)=>v===0||n!==a[v-1]);
  for(const [v,note] of notes.entries()){
   const entrance=variant===1&&c>0?v*14:variant===3&&c%2?v*9:0,bowGap=variant===2?22:12,velocity=clamp(50+v*4+(c%4===3?5:0)+(variant===3&&v===notes.length-1?7:0),42,86);
   events.push({note,velocity,startTick:startTick+entrance,endTick:Math.max(startTick+entrance+90,segmentEnd-bowGap),role:'string',harmonicSlot:i,articulation:variant===1?'string-staggered-legato':variant===2?'string-soft-bow':'string-legato',structural:true,stringVoice:voiceNames[Math.min(v,voiceNames.length-1)],exactMainVoicing:true,chordPcs:h.pcs});
  }
 }
 return clean(events,bars);
}
function response(model,cfg,revision,bars){
 const base=melody(model,cfg,cfg.melodyRevision??revision,bars),call=cfg.responseCall?repeatWindow({events:cfg.responseCall},0,(cfg.responseCallBars||bars)*BAR,bars):base,callLine=call.filter(e=>e.role==='melody'),total=bars*BAR,events=base.filter(e=>e.accompaniment).map(e=>({...e}));
 let previous=null;
 for(let bar=0;bar<bars;bar++){
  const from=bar*BAR,to=Math.min(total,from+BAR),phrase=callLine.filter(e=>e.startTick>=from&&e.startTick<to);
  if(!phrase.length)continue;
  const last=phrase.at(-1),prior=phrase.at(-2)||last,direction=Math.sign(last.note-prior.note)||1;
  const start=Math.max(from+11*STEP,last.endTick+30);
  const positions=[start,start+2*STEP].filter(t=>t+90<to);
  for(const [p,startTick] of positions.entries()){
   const i=harmonyAtLoop(model,cfg,startTick/480),h=model.harmony.events[i],target=p===0?last.note-direction*(2+mod(revision,3)):last.note-direction*2;
   const note=motifPitch(h,previous??last.note,target),endTick=Math.min(to-24,startTick+(p===0?1.5:2)*STEP,melodicBoundary(model,cfg,startTick,total));
   if(endTick<=startTick||callLine.some(c=>startTick<c.endTick&&endTick>c.startTick))continue;
   events.push({note,velocity:p===0?83:90,startTick,endTick,role:'melody',harmonicSlot:i,structural:true,response:true,embellishment:'answer-chord-tone'});previous=note;
  }
 }
 return clean(events,bars);
}
function preDrop(model,cfg,revision,bars){
 const events=[],lastBar=(bars-1)*BAR,variant=revision%4;
 for(let bar=0;bar<bars-1;bar++){const beat=bar*4,i=harmonyAtLoop(model,cfg,beat),h=model.harmony.events[i],notes=model.voicingPlan[i].notes.slice(-2);for(const [j,n] of notes.entries())events.push({note:n,velocity:62+j*4,startTick:bar*BAR,endTick:bar*BAR+Math.min(720,BAR-60),role:j?'top':'inner',harmonicSlot:i,articulation:'pre-drop-subtraction'});if(bar%2===0)events.push({note:bassFor(h),velocity:57,startTick:bar*BAR,endTick:bar*BAR+420,role:'bass',harmonicSlot:i})}
 {const beat=(bars-1)*4,i=harmonyAtLoop(model,cfg,beat),h=model.harmony.events[i],notes=model.voicingPlan[i].notes.slice(-3);for(const [j,n] of notes.entries())events.push({note:n,velocity:70+j*3,startTick:lastBar,endTick:lastBar+330,role:j===notes.length-1?'top':'inner',harmonicSlot:i});events.push({note:bassFor(h),velocity:66,startTick:lastBar,endTick:lastBar+300,role:'bass',harmonicSlot:i})}
 for(let s=0;s<4;s++){const step=(bars-1)*16+12+s,beat=step/4,i=harmonyAtLoop(model,cfg,beat),h=model.harmony.events[i],notes=model.voicingPlan[i].notes.slice(-(variant===2?4:3));for(const [j,n] of notes.entries())events.push({note:pitch(n,variant===3&&s===3&&j===notes.length-1?12:0),velocity:86+s*8+j*2,startTick:step*STEP,endTick:step*STEP+76,role:j===notes.length-1?'top':'inner',harmonicSlot:i,articulation:'pre-drop-pickup'});events.push({note:bassFor(h)+(variant===1&&s===3?12:0),velocity:80+s*9,startTick:step*STEP,endTick:step*STEP+76,role:'bass',harmonicSlot:i,articulation:'pre-drop-pickup'})}
 return clean(events,bars);
}
function syntheticChord(rootPc,quality){const q=E.QUALITIES[quality];return{rootPc,quality,pcs:q.pcs.map(x=>mod(rootPc+x,12)),label:quality}}
function gospelTurnaround(model,cfg,revision,bars){
 const tonic=KEY_PCS[cfg.key]??0,minor=cfg.mode==='Minor',recipe=minor?[[0,'m9',2],[8,'maj7',2],[2,'m7b5',2],[7,'7b9',1],[0,'m9',1]]:[[0,'6',2],[9,'7',2],[2,'m9',2],[7,'9',1],[0,'maj9',1]],events=[];let previous=null,slot=0;
 for(let unit=0;unit<bars;unit+=2){let beat=unit*4;for(const [degree,quality,duration] of recipe){if(beat>=bars*4)break;const h=syntheticChord(mod(tonic+degree,12),quality),preferred=notePool(h.pcs,58,82),notes=voiceLeadPcs(h.pcs,previous,preferred,revision%4===2?4:3,57,84),endBeat=Math.min(bars*4,beat+duration),isCadence=degree===7,isResolution=degree===0&&beat>unit*4;for(const [j,n] of notes.entries())events.push({note:n,velocity:(isResolution?98:isCadence?91:75)+j*2,startTick:beat*480,endTick:endBeat*480-34,role:j===notes.length-1?'top':'inner',harmonicSlot:slot,turnaround:true,chordPcs:h.pcs,turnaroundFunction:isResolution?'resolution':isCadence?'dominant':'preparation'});events.push({note:bassFor(h,39),velocity:isResolution?92:isCadence?87:70,startTick:beat*480,endTick:endBeat*480-40,role:'bass',harmonicSlot:slot,turnaround:true,chordPcs:h.pcs,turnaroundFunction:isResolution?'resolution':isCadence?'dominant':'preparation'});previous=notes;beat=endBeat;slot++}}
 return clean(events,bars);
}
function relaxed(model,cfg,revision,bars){const events=[],variant=revision%3;for(let beat=0;beat<bars*4;){const sourceBeat=mod(beat,cfg.length*4),i=harmonyAtLoop(model,cfg,beat),h=model.harmony.events[i],nextSource=model.harmony.events[i+1]?.onsetBeat??cfg.length*4,dur=Math.min(8,bars*4-beat,Math.max(2,nextSource-sourceBeat));const notes=model.voicingPlan[i].notes.slice(variant===1?-2:-3);for(const [j,n] of notes.entries())events.push({note:pitch(n,variant===2&&j===notes.length-1?12:0),velocity:72+j*4,startTick:beat*480,endTick:(beat+dur*.92)*480,role:j===notes.length-1?'top':'inner',harmonicSlot:i});if(variant!==1){const bassPc=h.bassPc??h.rootPc,bass=[36,48].map(x=>x+mod(bassPc-x,12)).sort((a,b)=>Math.abs(a-43)-Math.abs(b-43))[0];events.push({note:bass,velocity:62,startTick:beat*480,endTick:(beat+Math.min(4,dur))*.9*480,role:'bass',harmonicSlot:i})}beat+=dur}return clean(events,bars)}
function arpeggio(model,cfg,revision,bars){const events=[],shape=revision%4;for(let step=0;step<bars*16;step++){const beat=step/4,i=harmonyAtLoop(model,cfg,beat),notes=model.voicingPlan[i].notes.slice(-4),cycle=shape===0?[0,1,2,3]:shape===1?[3,2,1,0]:shape===2?[0,2,1,3]:[0,1,2,3,2,1],n=notes[cycle[step%cycle.length]%notes.length];events.push({note:n,velocity:step%4===0?98:78+(step%4===2?8:0),startTick:step*STEP,endTick:step*STEP+98,role:n===notes.at(-1)?'top':'inner',harmonicSlot:i});if(step%4===0){const h=model.harmony.events[i],pc=h.bassPc??h.rootPc,bass=36+mod(pc-36,12);events.push({note:bass,velocity:72,startTick:step*STEP,endTick:step*STEP+300,role:'bass',harmonicSlot:i})}}return clean(events,bars)}
function build(model,cfg,revision,bars){const start=hookWindow(model,cfg,revision,1),events=repeatWindow(model,start,BAR,bars,e=>e.role==='bass'||e.role==='top'||e.velocity>=88,(e,cycle)=>({...e,velocity:clamp(e.velocity-8+Math.min(cycle,3)*6,45,118),endTick:Math.min(e.endTick,e.startTick+300)}));const chordIndex=harmonyAtLoop(model,cfg,bars*4-.5),voices=model.voicingPlan[chordIndex].notes.slice(-3),h=model.harmony.events[chordIndex],bass=36+mod((h.bassPc??h.rootPc)-36,12);for(let i=0;i<4;i++){const t=bars*BAR-480+i*STEP,n=i%2?voices.at(-1):voices.at(-2);events.push({note:pitch(n,i>=3?12:0),velocity:92+i*8,startTick:t,endTick:t+86,role:'top',harmonicSlot:chordIndex});events.push({note:bass+(i>=3?12:0),velocity:82+i*8,startTick:t,endTick:t+86,role:'bass',harmonicSlot:chordIndex})}return clean(events,bars)}
function derive(model,input,kind,revision=0,barsOverride=null){const cfg={...input},r=random(sourceSignature(model,cfg)^hash(kind)^Math.imul(revision+1,2654435761));const defaults={intro:4,main:4,stab:4,sixteenth:4,offbeat:4,euclidean:4,melody:4,response:4,bassline:4,breakdown:4,pad:4,string:4,bridge:4,build:2,predrop:2,drop:2,arp:4,gospel:4,outro:4};let bars=barsOverride==null?defaults[kind]:Number(barsOverride),events=[],detail='';if(![1,2,4,6,8,16].includes(bars))throw Error('Invalid section length');
 if(kind==='main'){events=repeatWindow(model,0,cfg.length*BAR,bars,()=>true,e=>revision%4===0?e:{...e,note:pitch(e.note,revision%4===2&&e.role==='top'&&Math.floor(e.startTick/BAR)%2?12:0),velocity:clamp(e.velocity+(revision%4===1&&(Math.round(e.startTick/STEP)%4===0)?9:0),40,123),endTick:revision%4===3&&e.role!=='bass'?Math.min(e.endTick,e.startTick+360):e.endTick});detail=revision?'Source phrase · main variation '+(revision+1):'Source phrase · full exposition'}
 else if(kind==='stab'){const stabSource={...model,revisions:{...model.revisions,rhythm:model.revisions.rhythm+revision}},stabModel=E.setStab(null,E.config({...cfg,stab:true}),stabSource);events=repeatWindow(stabModel,0,cfg.length*BAR,bars);detail=cfg.stabHands==='bounce'?'STAB bounce · full two-hand chords':'STAB · full rhythmic chords'}
 else if(kind==='sixteenth'){events=sixteenthChords(model,cfg,revision,bars);detail='Sixteenth-note chords · quarter-note bass'}
 else if(kind==='offbeat'){events=offbeat(model,cfg,revision,bars);detail='Offbeat chords · anchoring bass'}
 else if(kind==='euclidean'){events=euclideanChords(model,cfg,revision,bars);const first=events[0];detail=`E(${first.euclideanPulses},${first.euclideanSteps}) · rotation ${first.euclideanRotation} · full chords`}
 else if(kind==='melody'){events=melody(model,cfg,revision,bars);detail='Recurring motif · chord tones · room for a response'}
 else if(kind==='response'){events=response(model,cfg,revision,bars);detail='Response to MELODY · harmonic endings · shared rests'}
 else if(kind==='bassline'){events=bassline(model,cfg,revision,bars);detail='Roots, fifths and octaves · resolved approaches'}
 else if(kind==='intro'){events=repeatWindow(model,0,cfg.length*BAR,bars,e=>e.role==='top'||e.role==='outer'||e.role==='bass'&&e.startTick%BAR<180,e=>{const bar=Math.floor(e.startTick/BAR);return r()<.22+bar*.18?{...e,velocity:clamp(e.velocity-22+bar*3,38,96),note:pitch(e.note,e.role==='bass'?0:-12)}:null});detail='Progressive reduction · close register'}
 else if(kind==='breakdown'){events=relaxed(model,cfg,revision,bars);detail='Relaxed chords · sparse bass'}
 else if(kind==='pad'){events=pad(model,cfg,revision,bars);detail='Sustained guide tones · common tones and voice leading'}
 else if(kind==='string'){events=stringLine(model,cfg,revision,bars);detail='String ensemble · exact MAIN voicing · ordered parts sustained until the next change'}
 else if(kind==='bridge'){const start=hookWindow(model,cfg,revision,2);events=repeatWindow(model,start,Math.min(2,cfg.length)*BAR,bars,e=>e.role!=='ornament',(e,cycle)=>{if((cycle+Math.floor(e.startTick/BAR))%2&&e.role==='inner')return null;return{...e,note:pitch(e.note,e.role==='bass'&&cycle%2?-12:e.role==='top'&&cycle%2?12:0),velocity:clamp(e.velocity-12,42,102)}});detail='Call & response · octave shifts'}
 else if(kind==='build'){events=build(model,cfg,revision,bars);detail='Build · percussive sixteenth-note fill'}
 else if(kind==='predrop'){events=preDrop(model,cfg,revision,bars);detail='Reduction · central rest · pickup into the drop'}
 else if(kind==='drop'){const spanBars=revision%3===0?1:2,start=hookWindow(model,cfg,revision,spanBars);events=repeatWindow(model,start,Math.min(spanBars,cfg.length)*BAR,bars,()=>true,e=>({...e,velocity:clamp(e.velocity+15,55,124),endTick:Math.min(e.endTick,e.startTick+360)}));for(const e of [...events])if(e.role==='top'&&e.velocity>=103&&e.note<=91)events.push({...e,note:e.note+12,velocity:e.velocity-9});events=clean(events,bars);detail=(spanBars===1?'1-bar loop':'2-bar loop')+' · octave doubling'}
 else if(kind==='arp'){events=arpeggio(model,cfg,revision,bars);detail='Broken chords · sixteenth-note figure'}
 else if(kind==='gospel'){events=gospelTurnaround(model,cfg,revision,bars);detail=cfg.mode==='Minor'?'i–VI–iiø–V7♭9–i · gospel cadence':'I–VI7–ii–V–I · gospel turnaround'}
 else if(kind==='outro'){events=repeatWindow(model,0,cfg.length*BAR,bars,e=>e.role==='bass'||e.role==='top'||e.velocity>=92,e=>{const bar=Math.floor(e.startTick/BAR);return r()>bar*.19?{...e,velocity:clamp(e.velocity-bar*10,32,102),note:pitch(e.note,bar>=2?-12:0)}:null});detail='Progressive reduction · descending ending'}
 else throw Error('Unknown section: '+kind);
 if(!events.length)events=repeatWindow(model,0,cfg.length*BAR,bars);
 return {kind,revision,bars,events:clean(events,bars),detail,signature:sourceSignature(model,cfg)};
}
const TYPES=[['intro','INTRO'],['main','MAIN'],['stab','STAB'],['sixteenth','16TH'],['offbeat','OFFBEAT'],['euclidean','EUCLIDEAN'],['melody','MELODY'],['response','RESPONSE'],['bassline','BASSLINE'],['breakdown','BREAKDOWN'],['pad','PAD'],['string','STRING'],['bridge','BRIDGE'],['build','BUILD'],['predrop','PRE-DROP'],['drop','DROP'],['arp','ARP'],['gospel','GOSPEL TURNAROUND'],['outro','OUTRO']];
const api={version:6,TYPES,derive,sourceSignature,clean,hookWindow,euclideanPattern};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HouseArranger=api;
})(typeof window!=='undefined'?window:this);
