// Rebalance ONLY practice tests, leaving quizzes/materials untouched so no
// rendered video goes stale.
const fs=require('fs'), path=require('path');
const ROOT=require('path').join(__dirname,'..');
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function seedFrom(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function reposition(q,target){
  const o=q.options; if(!Array.isArray(o)||o.length!==4) return false;
  const ci=q.correct_index; if(!Number.isInteger(ci)||ci<0||ci>3||ci===target) return false;
  const we=Array.isArray(q.why_others_wrong)?q.why_others_wrong.slice():null;
  let w=0;
  const pairs=o.map((text,i)=>({text,expl:i===ci?null:(we?we[w++]:undefined),correct:i===ci}));
  const cp=pairs[ci], rest=pairs.filter((_,i)=>i!==ci);
  rest.splice(target,0,cp);
  q.options=rest.map(p=>p.text); q.correct_index=target;
  if(we) q.why_others_wrong=rest.filter(p=>!p.correct).map(p=>p.expl);
  return true;
}
function dist(qs){const d=[0,0,0,0];for(const q of qs) if(Number.isInteger(q.correct_index)&&q.correct_index<4) d[q.correct_index]++;return d;}
const pct=d=>{const n=d.reduce((a,b)=>a+b,0);return n?Math.round(Math.max(...d)/n*100):0;};
for(const slug of fs.readdirSync(ROOT+'/generated')){
  const f=ROOT+'/generated/'+slug+'/state.json'; if(!fs.existsSync(f)) continue;
  const s=JSON.parse(fs.readFileSync(f,'utf8'));
  if(!s.tests||!Object.keys(s.tests).length) continue;
  const pools={1:[],2:[]};
  for(const k of Object.keys(s.tests)) pools[k.startsWith('t1')?1:2].push(...(s.tests[k]||[]));
  const out=[];
  for(const n of [1,2]){
    const qs=pools[n].filter(q=>Array.isArray(q.options)&&q.options.length===4&&Number.isInteger(q.correct_index)&&q.correct_index<4);
    if(qs.length<4) continue;
    const before=dist(qs);
    const targets=qs.map((_,i)=>i%4); const rnd=mulberry32(seedFrom(slug+':t'+n));
    for(let i=targets.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[targets[i],targets[j]]=[targets[j],targets[i]];}
    qs.forEach((q,i)=>reposition(q,targets[i]));
    out.push(`  test ${n}: ${before.join('/')} (${pct(before)}%) -> ${dist(qs).join('/')} (${pct(dist(qs))}%)`);
  }
  fs.writeFileSync(ROOT+'/generated/'+slug+'/state.backup.testbalance.'+Date.now()+'.json', JSON.stringify(JSON.parse(fs.readFileSync(f,'utf8')),null,2));
  fs.writeFileSync(f, JSON.stringify(s,null,2));
  console.log(slug+'\n'+out.join('\n'));
}
