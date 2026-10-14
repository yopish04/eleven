import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,advanceWorld,train} from '../src/world.js';
import {initializeCareer,advanceCareer,nextSeason,migrateLegacyJourney,careerStandings} from '../src/career.js';
function career(){const w=createWorld('career-test');w.profile={clubId:'club-16',playerId:'club-16-p8',name:'Arka'};w.clubs[16].players[8].owner='you';return initializeCareer(w);}
function finishWith(w,win=true){
  // Fix completed results; the final matchday still goes through the real simulator.
  for(const f of w.fixtures.filter(f=>f.round<13)){
    const home=f.homeId===w.profile.clubId,away=f.awayId===w.profile.clubId;
    f.result={score:home?(win?[3,0]:[0,3]):away?(win?[0,3]:[3,0]):[0,0]};
  }
  w.round=13;advanceCareer(w);
}
test('new career starts in Pra-Regional with balanced home/away league fixtures',()=>{
  const w=career();assert.equal(w.competition.tier,'pre');assert.equal(w.fixtures.length,56);assert.equal(careerStandings(w).length,8);
  const ids=[...new Set(w.fixtures.flatMap(f=>[f.homeId,f.awayId]))];
  for(const id of ids){const own=w.fixtures.filter(f=>[f.homeId,f.awayId].includes(id));assert.equal(own.length,14);assert.equal(own.filter(f=>f.homeId===id).length,7);assert.equal(new Set(own.map(f=>f.round)).size,14);assert.equal(new Set(own.map(f=>f.homeId===id?f.awayId:f.homeId)).size,7);}
  assert.throws(()=>nextSeason(w));
});
test('full domestic season uses 56 simulated matches and never creates Asian knockout rounds',()=>{
  const w=career();let games=0;for(let i=0;i<14;i++)games+=advanceCareer(w).length;
  assert.equal(games,56);assert.equal(w.fixtures.length,56);assert.equal(w.round,14);assert.ok(w.champion);assert.ok(w.competition.finished);assert.throws(()=>advanceCareer(w));
  assert.ok(careerStandings(w).every(r=>r.played===14));
  const c=w.clubs.find(c=>c.id===w.profile.clubId),before=structuredClone(c.players),ids=new Set(w.fixtures.map(f=>f.id));
  nextSeason(w);assert.equal(w.competition.season,2);assert.equal(w.history.length,1);assert.ok(w.fixtures.every(f=>!ids.has(f.id)));assert.equal(w.round,0);
  const after=w.clubs.find(c=>c.id===w.profile.clubId).players;
  for(let i=0;i<before.length;i++){assert.deepEqual(after[i].career,before[i].career);assert.deepEqual(after[i].attributes,before[i].attributes);assert.equal(after[i].trainingRound,-1);}
  train(w,w.profile.playerId,'passing');
});
test('top two promote through Regional, National and earn a complete Asia Cup with unique seasonal records',()=>{
  const w=career();const seen=new Set();
  for(const tier of ['pre','regional','national']){
    assert.equal(w.competition.tier,tier);for(const f of w.fixtures){assert.ok(!seen.has(f.id));seen.add(f.id);}
    finishWith(w,true);assert.equal(w.competition.outcome.position,1);nextSeason(w);
  }
  assert.equal(w.competition.tier,'asia');assert.equal(w.clubs.length,32);assert.equal(w.fixtures.length,96);assert.equal(careerStandings(w).length,4);
  let count=0;for(let i=0;i<13;i++)count+=advanceCareer(w).length;
  assert.equal(count,125);assert.ok(w.competition.finished);assert.equal(w.competition.outcome.nextTier,'national');
  for(const f of w.fixtures){assert.ok(!seen.has(f.id));assert.ok(f.id.startsWith('s4-'));}
  const champion=w.champion;nextSeason(w);assert.equal(w.competition.tier,'national');assert.equal(w.competition.season,5);assert.equal(w.history.at(-1).champion,champion);
});
test('bottom two relegate, while Pra-Regional has a floor',()=>{
  const w=career();finishWith(w,false);assert.equal(w.competition.outcome.nextTier,'pre');assert.equal(w.competition.outcome.status,'Bertahan');nextSeason(w);
  finishWith(w,true);nextSeason(w);assert.equal(w.competition.tier,'regional');finishWith(w,false);assert.equal(w.competition.outcome.status,'Degradasi');assert.equal(w.competition.outcome.nextTier,'pre');
});
test('legacy Asia progress is archived only on an explicit transition, preserving player career and attributes',()=>{
  const w=createWorld('legacy');w.profile={clubId:'club-16',playerId:'club-16-p8',name:'Legacy'};
  advanceWorld(w);const old=structuredClone(w),own=w.clubs[16].players[8];
  migrateLegacyJourney(w);assert.equal(w.competition.tier,'pre');assert.equal(w.history[0].fixtures.length,96);assert.equal(w.history[0].completed,false);assert.deepEqual(w.clubs[16].players[8].career,own.career);assert.deepEqual(w.clubs[16].players[8].attributes,old.clubs[16].players[8].attributes);assert.equal(w.version,old.version+1);assert.throws(()=>migrateLegacyJourney(w));
});
