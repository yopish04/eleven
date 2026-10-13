import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateMatch,selectLineup,summarize,effective,ATTRIBUTES} from '../src/engine.js';
import {createWorld,advanceWorld,train,setTactics,standings} from '../src/world.js';

test('seed + inputs reproduce every event; score and player stats reconcile',()=>{
  const w=createWorld('audit'),input={home:w.clubs[16],away:w.clubs[17],seed:'audit'};
  const before=structuredClone(input),m=simulateMatch(input);
  assert.deepEqual(input,before);assert.deepEqual(m,simulateMatch(input));
  assert.deepEqual(m.teams.map(t=>t.goals),m.score);
  assert.equal(m.players.reduce((n,p)=>n+p.goals,0),m.score[0]+m.score[1]);
  assert.equal(m.players.reduce((n,p)=>n+p.passes,0),m.events.filter(e=>e.type==='pass').length);
  assert.equal(m.players.reduce((n,p)=>n+p.shots,0),m.events.filter(e=>e.type==='shot').length);
  assert.equal(m.players.reduce((n,p)=>n+p.saves,0),m.events.filter(e=>e.type==='shot'&&e.onTarget&&!e.goal).length);
  assert.deepEqual(summarize(m.events,m.lineups).teams,m.teams);
  for(const p of m.players){assert.ok(p.assists<=m.score[0]+m.score[1]);assert.ok(p.shotsOnTarget<=p.shots);assert.equal(p.minutes,90);}
});
test('stronger finishing materially raises goals across paired seeds',()=>{
  const w=createWorld('strength');let weak=structuredClone(w.clubs[0]),strong=structuredClone(weak),opponent=w.clubs[1];
  weak.players.forEach(p=>p.attributes.finishing=35);strong.players.forEach(p=>p.attributes.finishing=95);
  let low=0,high=0;for(let i=0;i<300;i++){
    low+=simulateMatch({home:weak,away:opponent,seed:i}).score[0];
    high+=simulateMatch({home:strong,away:opponent,seed:i}).score[0];
  }
  assert.ok(high>low*1.35,`${high} vs ${low}`);
});
test('passing, goalkeeper and stamina influence their own actions',()=>{
  const w=createWorld('attributes'),team=w.clubs[0],opponent=w.clubs[1];
  const low=structuredClone(team),high=structuredClone(team);
  low.players.forEach(p=>{p.attributes.passing=25;p.attributes.goalkeeping=25;});
  high.players.forEach(p=>{p.attributes.passing=95;p.attributes.goalkeeping=95;});
  let lp=0,lc=0,hp=0,hc=0,lg=0,hg=0;
  for(let i=0;i<150;i++){
    const a=simulateMatch({home:low,away:opponent,seed:i}),b=simulateMatch({home:high,away:opponent,seed:i});
    lp+=a.teams[0].passes;lc+=a.teams[0].completedPasses;hp+=b.teams[0].passes;hc+=b.teams[0].completedPasses;lg+=a.score[1];hg+=b.score[1];
  }
  assert.ok(hc/hp>lc/lp+.1);assert.ok(hg<lg);
  const p=selectLineup(team)[1];assert.ok(effective(p,'pace',90,'high')<effective(p,'pace',90,'low'));
  assert.ok(effective({...p,condition:45},'pace',0)<effective(p,'pace',0));
});
test('bench does not accrue appearances; invalid or duplicate XI rejected',()=>{
  const w=createWorld('lineups'),c=w.clubs[0];
  const xi=selectLineup(c).map(p=>p.id);const bench=c.players.filter(p=>!xi.includes(p.id));
  assert.throws(()=>setTactics(w,c.id,{tactics:c.tactics,lineup:Array(11).fill(xi[0])}));
  assert.throws(()=>setTactics(w,c.id,{tactics:{...c.tactics,formation:'__proto__'}}));
  const invalid=[...xi];invalid[0]=bench.find(p=>p.position!=='GK').id;
  assert.throws(()=>setTactics(w,c.id,{tactics:c.tactics,lineup:invalid}));
  advanceWorld(w);for(const p of bench)assert.equal(p.career.appearances,0);
});
test('training is once per matchday and controlled by server, with bounds',()=>{
  const w=createWorld('training'),p=w.clubs[0].players[8],before=p.attributes.finishing;
  train(w,p.id,'finishing');assert.ok(p.attributes.finishing>before);assert.equal(p.condition,86);
  assert.throws(()=>train(w,p.id,'pace'));
  advanceWorld(w);train(w,p.id,'recovery');assert.ok(p.condition<=100);
  w.round++;p.attributes.pace=98.9;train(w,p.id,'pace');assert.ok(p.attributes.pace<=99);
});
test('group fixtures are double round robin, country-separated and balanced',()=>{
  const w=createWorld();assert.equal(w.clubs.length,32);assert.equal(w.fixtures.length,96);
  for(const c of w.clubs){const fs=w.fixtures.filter(f=>[f.homeId,f.awayId].includes(c.id));assert.equal(fs.length,6);assert.equal(fs.filter(f=>f.homeId===c.id).length,3);assert.equal(new Set(fs.map(f=>f.round)).size,6);}
  for(const g of 'ABCDEFGH'){const cs=w.clubs.filter(c=>c.group===g);assert.equal(new Set(cs.map(c=>c.country)).size,4);}
});
test('head-to-head outranks overall goal difference on equal points',()=>{
  const w=createWorld();const fs=w.fixtures.filter(f=>f.group==='A');
  // A beats B twice but B has much greater overall goal difference. Both have six points.
  for(const f of fs){let s=[0,0];
    if(f.homeId==='club-0'&&f.awayId==='club-1')s=[1,0];
    else if(f.homeId==='club-1'&&f.awayId==='club-0')s=[0,1];
    else if(f.homeId==='club-1'&&f.awayId==='club-2')s=[10,0];
    else if(f.homeId==='club-2'&&f.awayId==='club-1')s=[0,10];
    else if(f.homeId==='club-0')s=[0,1];else if(f.awayId==='club-0')s=[1,0];
    else if(f.homeId==='club-1')s=[0,1];else if(f.awayId==='club-1')s=[1,0];
    f.result={score:s};
  }
  const table=standings(w,'A');assert.ok(table.findIndex(r=>r.id==='club-0')<table.findIndex(r=>r.id==='club-1'));
});
test('full season produces 125 matches, two-leg knockouts, East/West final',()=>{
  const w=createWorld('full-season');let n=0;
  for(let i=0;i<13;i++){const records=advanceWorld(w);n+=records.length;for(const r of records)assert.deepEqual(simulateMatch(r.input).score,r.match.score);}
  assert.equal(n,125);assert.equal(w.round,13);assert.ok(w.champion);
  const final=w.fixtures.find(f=>f.stage==='Final');
  assert.notEqual(w.clubs.find(c=>c.id===final.homeId).region,w.clubs.find(c=>c.id===final.awayId).region);
  for(const f of w.fixtures.filter(f=>f.leg===2)){assert.ok(f.result.winner);const first=w.fixtures.find(x=>x.tieId===f.tieId&&x.leg===1);assert.equal(first.homeId,f.awayId);}
  assert.throws(()=>advanceWorld(w));
});
test('aggregate tie invokes extra time; shootout goals stay outside match statistics',()=>{
  const w=createWorld('extra-time'),input={home:w.clubs[0],away:w.clubs[1],seed:'extra',neutral:true};
  const normal=simulateMatch(input);
  const m=simulateMatch({...input,knockout:true,aggregate:[normal.score[1],normal.score[0]]});
  assert.equal(m.minutes,120);assert.ok(m.winner);
  assert.equal(m.players.reduce((n,p)=>n+p.goals,0),m.score[0]+m.score[1]);
  let shootout;
  for(let i=0;i<100&&!shootout;i++){const r=simulateMatch({...input,seed:i,knockout:true});if(r.penalties)shootout=r;}
  assert.ok(shootout);assert.notEqual(...shootout.penalties.score);
  assert.equal(shootout.players.reduce((n,p)=>n+p.goals,0),shootout.score[0]+shootout.score[1]);
});
