import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {gameApi} from '../src/api.js';

// Real SQLite runs the exact D1 SQL including CAS and transactional conditional inserts.
function database(){
  const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../drizzle/0000_lush_amphibian.sql',import.meta.url),'utf8'));
  const db={prepare(query){return {values:[],bind(...values){this.values=values;return this;},async first(){return sql.prepare(query).get(...this.values)||null;},async run(){const r=sql.prepare(query).run(...this.values);return {meta:{changes:Number(r.changes)}};}};},async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}},sql};return db;
}
function request(body,owner='tester',db){return gameApi(new Request('https://eleven.example/api/game',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://eleven.example'},body:JSON.stringify(body)}),db,owner);}
const begin={action:'start',name:'Arka Test',clubId:'club-16',position:'FW'};
test('auth, ownership and persistence isolate each career',async()=>{
  const db=database();assert.equal((await request(begin,null,db)).status,401);
  const a=await (await request(begin,'a',db)).json();assert.equal(a.world.profile.name,'Arka Test');
  const get=await gameApi(new Request('https://eleven.example/api/game'),db,'a');assert.deepEqual((await get.json()).world,a.world);
  const other=await gameApi(new Request('https://eleven.example/api/game'),db,'b');assert.equal((await other.json()).world,null);
  assert.equal((await request({action:'advance',version:0},'b',db)).status,400);
  const b=await (await request(begin,'b',db)).json();assert.notEqual(a.world.seed,b.world.seed);
});
test('client cannot train another player, set scores, double train or replay a stale advance',async()=>{
  const db=database();let {world:w}=await (await request(begin,'a',db)).json();
  let r=await request({action:'train',version:w.version,focus:'passing',playerId:'club-0-p8',attributes:{passing:999}},'a',db);
  w=(await r.json()).world;assert.equal(w.clubs[0].players[8].trainingRound,-1);assert.equal(w.clubs[16].players[8].trainingRound,0);
  assert.equal((await request({action:'train',version:w.version,focus:'pace'},'a',db)).status,400);
  const old=w.version;r=await request({action:'advance',version:old,score:[999,0]},'a',db);const data=await r.json();w=data.world;
  assert.equal(r.status,200);assert.equal(w.round,1);assert.ok(data.match);assert.notEqual(data.match.match.score[0],999);
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM matches').get().n,4);
  assert.equal((await request({action:'advance',version:old},'a',db)).status,409);
  const replay=await gameApi(new Request(`https://eleven.example/api/game?match=${data.match.id}`),db,'a');assert.deepEqual(await replay.json(),data.match);
  await request(begin,'b',db);
  assert.equal((await gameApi(new Request(`https://eleven.example/api/game?match=${data.match.id}`),db,'b')).status,404);
});
test('invalid origin, request shape, tactics and name rejected',async()=>{
  const db=database();assert.equal((await request({...begin,name:'<script>'},'a',db)).status,400);
  assert.equal((await request(null,'a',db)).status,400);
  const r=await gameApi(new Request('https://eleven.example/api/game',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/json'},body:JSON.stringify(begin)}),db,'a');assert.equal(r.status,403);
  const {world}=await (await request(begin,'a',db)).json();
  assert.equal((await request({action:'tactics',version:world.version,tactics:{formation:'4-3-3',style:'cheat'}},'a',db)).status,400);
});
test('atomic batch rolls back both progression and event storage if a write fails',async()=>{
  const db=database();const {world}=await (await request(begin,'a',db)).json();
  db.sql.exec("CREATE TRIGGER fail_match BEFORE INSERT ON matches BEGIN SELECT RAISE(ABORT, 'database write failure'); END;");
  const r=await request({action:'advance',version:world.version},'a',db);assert.equal(r.status,500);
  const saved=JSON.parse(db.sql.prepare('SELECT payload FROM worlds').get().payload);assert.equal(saved.round,0);
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM matches').get().n,0);
});
test('reset requires current version and replaces only own career and replays',async()=>{
  const db=database();let {world:w}=await (await request(begin,'a',db)).json();w=(await (await request({action:'advance',version:w.version},'a',db)).json()).world;
  assert.equal((await request({...begin,action:'reset',version:0},'a',db)).status,409);
  const res=await request({...begin,action:'reset',version:w.version,name:'New Career'},'a',db);assert.equal(res.status,200);
  const next=(await res.json()).world;assert.equal(next.round,0);assert.notEqual(next.seed,w.seed);assert.equal(next.version,w.version+1);
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM matches').get().n,0);
});
test('season transition is server-controlled, versioned, and keeps historical replays accessible',async()=>{
  const db=database();let {world:w}=await (await request(begin,'season-owner',db)).json();
  assert.equal(w.competition.tier,'pre');
  assert.equal((await request({action:'nextSeason',version:w.version,tier:'asia'},'season-owner',db)).status,400);
  let first;
  for(let i=0;i<14;i++){const r=await request({action:'advance',version:w.version},'season-owner',db);assert.equal(r.status,200);const d=await r.json();w=d.world;if(i===0)first=d.match;}
  const expected=w.competition.outcome.nextTier,oldVersion=w.version,oldProfile=w.profile;
  const res=await request({action:'nextSeason',version:oldVersion,tier:'asia'},'season-owner',db);assert.equal(res.status,200);w=(await res.json()).world;
  assert.equal(w.competition.tier,expected);assert.deepEqual(w.profile,oldProfile);assert.equal(w.competition.season,2);assert.equal(w.history.length,1);
  assert.equal((await request({action:'nextSeason',version:oldVersion},'season-owner',db)).status,409);
  const replay=await gameApi(new Request(`https://eleven.example/api/game?match=${first.id}`),db,'season-owner');assert.equal(replay.status,200);assert.deepEqual(await replay.json(),first);
  assert.equal((await request({action:'advance',version:w.version},'season-owner',db)).status,200);
  assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM matches').get().n,60);
});
