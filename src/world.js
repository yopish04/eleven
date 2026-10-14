import { random, clamp, round, simulateMatch, selectLineup, ATTRIBUTES, FORMATIONS } from './engine.js';

export const RULES = {
  id:'eleven-asia-v1', name:'Eleven Asia Cup', edition:'Musim 01',
  note:'Kompetisi fiksi terinspirasi format ACL Two 2026/27. Bukan kompetisi resmi AFC.',
  groups:8, clubsPerGroup:4, groupLegs:2, qualifyPerGroup:2,
  knockoutLegs:2, finalLegs:1,
  tiebreak:'Poin → head-to-head (poin, selisih gol, gol; diterapkan ulang) → selisih gol → gol → undian deterministik. Penalti khusus grup dan fair play belum dimodelkan.',
};
const CLUBS = [
  ['Riyadh Crescent','SA','Riyadh'],['Doha Falcons','QA','Doha'],['Tashkent Atlas','UZ','Tashkent'],['Mumbai Mariners','IN','Mumbai'],
  ['Jeddah Coast','SA','Jeddah'],['Abu Dhabi Oasis','AE','Abu Dhabi'],['Tehran Stars','IR','Tehran'],['Dushanbe Peaks','TJ','Dushanbe'],
  ['Dubai Union','AE','Dubai'],['Baghdad Lions','IQ','Baghdad'],['Amman City','JO','Amman'],['Ashgabat Silk','TM','Ashgabat'],
  ['Al Wakrah Waves','QA','Al Wakrah'],['Isfahan Heritage','IR','Isfahan'],['Kuwait Harbour','KW','Kuwait'],['Manama Pearl','BH','Manama'],
  ['Bandung Garuda','ID','Bandung'],['Osaka Sakura','JP','Osaka'],['Seoul Phoenix','KR','Seoul'],['Bangkok Elephants','TH','Bangkok'],
  ['Jakarta Merah','ID','Jakarta'],['Yokohama Bay','JP','Yokohama'],['Johor Straits','MY','Johor'],['Hanoi Lotus','VN','Hanoi'],
  ['Surabaya Green','ID','Surabaya'],['Busan Ocean','KR','Busan'],['Sydney Harbour','AU','Sydney'],['Shanghai Jade','CN','Shanghai'],
  ['Kuala Lumpur Tigers','MY','Kuala Lumpur'],['Chiang Mai North','TH','Chiang Mai'],['Manila Archipelago','PH','Manila'],['Singapore Strikers','SG','Singapore'],
];
const names = {
 ID:['Arka','Raka','Bima','Dimas','Fajar','Rizky','Ilham','Daffa','Bagas','Aditya','Farhan','Reza','Hafiz','Naufal','Andika','Galih'],
 JP:['Haru','Ren','Sota','Yuto','Kaito','Daichi','Riku','Toma','Akira','Itsuki','Shun','Ryo','Kei','Yuki','Nao','Hayato'],
 KR:['Minjun','Jiho','Hyunwoo','Seojun','Doyun','Jiwon','Sunwoo','Taeyang','Jinwoo','Siwoo','Haneul','Jisung','Yejun','Gunwoo','Junseo','Minho'],
};
const surnames={ID:['Pratama','Saputra','Wijaya','Kurniawan'],JP:['Tanaka','Mori','Sato','Nakamura'],KR:['Kim','Lee','Park','Choi']};
const positions=['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW','GK','DF','MF','MF','FW'];
export const emptyCareer=()=>({appearances:0,minutes:0,goals:0,assists:0,shots:0,shotsOnTarget:0,passes:0,completedPasses:0,tackles:0,interceptions:0,saves:0,xg:0,xa:0,ratingSum:0});
export function createWorld(seed='eleven', mode='demo', now=Date.now(), interval=900000) {
  const rng=random(seed);
  const clubs=CLUBS.map(([name,country,city], i)=>{
    const id=`club-${i}`, level=60+Math.floor(rng()*11);
    const players=positions.map((position,n)=>{
      const first=names[country]?.[n] || ['Adam','Sami','Leo','Rayan','Ilyas','Karim','Amir','Faris','Nico','Zain','Omar','Idris','Arman','Dani','Ari','Noah'][n];
      const last=surnames[country]?.[n%4] || city;
      const attributes=Object.fromEntries(ATTRIBUTES.map(key=>[key,clamp(level-15+Math.floor(rng()*24),35,86)]));
      const keys=position==='GK'?['goalkeeping','vision']:position==='DF'?['defending','stamina']:position==='MF'?['passing','vision']:['finishing','pace'];
      keys.forEach(k=>attributes[k]=clamp(attributes[k]+10,35,90));
      if(position!=='GK')attributes.goalkeeping=15+Math.floor(rng()*15);
      return {id:`${id}-p${n}`,name:`${first} ${last}`,position,number:n+1,age:19+Math.floor(rng()*10),attributes,condition:100,owner:null,trainingRound:-1,trainingLog:[],career:emptyCareer()};
    });
    return {id,name,country,city,code:name.split(' ').map(x=>x[0]).join('').slice(0,3),group:String.fromCharCode(65+Math.floor(i/4)),region:i<16?'Barat':'Timur',color:['#c4f569','#97b6ff','#fca99b','#e1b1ff'][i%4],coach:null,tactics:{formation:'4-3-3',mentality:'balanced',pressing:'balanced',style:'balanced'},lineup:null,players};
  });
  const world={schemaVersion:1,seed,mode,round:0,version:0,rules:RULES,clubs,fixtures:[],champion:null,nextKickoff:mode==='shared'?now+interval:null,interval};
  const schedule=[[[0,3],[1,2]],[[2,0],[3,1]],[[0,1],[2,3]]];
  for(let md=0;md<6;md++)for(let g=0;g<8;g++)for(const [a,b] of schedule[md%3]) {
    const home=g*4+(md<3?a:b),away=g*4+(md<3?b:a);
    world.fixtures.push({id:`g${g}-m${md}-${a}`,round:md,stage:'Grup',group:String.fromCharCode(65+g),homeId:clubs[home].id,awayId:clubs[away].id,result:null});
  }
  return world;
}
function tableRows(ids, fixtures) {
  const rows=new Map(ids.map(id=>[id,{id,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,gd:0,points:0,form:[]} ]));
  for(const f of fixtures.filter(f=>f.result && rows.has(f.homeId) && rows.has(f.awayId))) {
    for(const [id,gf,ga] of [[f.homeId,...f.result.score],[f.awayId,...[...f.result.score].reverse()]]) {
      const r=rows.get(id);r.played++;r.gf+=gf;r.ga+=ga;r.gd=r.gf-r.ga;
      const outcome=gf>ga?'W':gf===ga?'D':'L';r.form.push(outcome);
      if(outcome==='W'){r.won++;r.points+=3;}else if(outcome==='D'){r.drawn++;r.points++;}else r.lost++;
    }
  }
  return [...rows.values()];
}
function buckets(rows, key) {
  const out=[];for(const r of rows){const k=key(r);if(out.at(-1)?.key===k)out.at(-1).rows.push(r);else out.push({key:k,rows:[r]});}return out.map(b=>b.rows);
}
export function standings(world, group) {
  const ids=world.clubs.filter(c=>c.group===group).map(c=>c.id);
  const fixtures=world.fixtures.filter(f=>f.stage==='Grup'&&f.group===group);
  const rows=tableRows(ids,fixtures);
  const all=new Map(rows.map(r=>[r.id,r]));
  const fallback=(a,b)=>b.gd-a.gd||b.gf-a.gf||random(`${world.seed}:${a.id}`)()-random(`${world.seed}:${b.id}`)();
  function resolve(tied) {
    if(tied.length<2)return tied;
    const mini=tableRows(tied.map(r=>r.id),fixtures).sort((a,b)=>b.points-a.points||b.gd-a.gd||b.gf-a.gf);
    const groups=buckets(mini,r=>`${r.points}/${r.gd}/${r.gf}`);
    if(groups.length===1)return tied.sort(fallback);
    return groups.flatMap(g=>resolve(g.map(r=>all.get(r.id))));
  }
  return buckets(rows.sort((a,b)=>b.points-a.points),r=>r.points).flatMap(resolve);
}
function scheduleTie(world,homeId,awayId,stage,round,index,oneLeg=false) {
  const tieId=`${world.competition?`s${world.competition.season}-`:''}${stage}-${index}`;
  world.fixtures.push({id:`${tieId}-1`,tieId,round,stage,leg:1,homeId,awayId,result:null,neutral:oneLeg});
  if(!oneLeg)world.fixtures.push({id:`${tieId}-2`,tieId,round:round+1,stage,leg:2,homeId:awayId,awayId:homeId,result:null});
}
function advanceStage(world) {
  if(world.round===6) {
    for(const region of ['ABCD','EFGH']) {
      // Seeded cross-group bracket. First-leg hosts are group runners-up.
      const tables=[...region].map(g=>standings(world,g));
      const pairings=[[0,1],[1,0],[2,3],[3,2]];
      pairings.forEach(([a,b],i)=>scheduleTie(world,tables[b][1].id,tables[a][0].id,'16 besar',6,`${region}-${i}`));
    }
  }
  for(const [last,stage,round] of [['16 besar','Perempat final',8],['Perempat final','Semifinal',10],['Semifinal','Final',12]]) {
    if(world.round!==round)continue;
    const winners=world.fixtures.filter(f=>f.stage===last&&f.leg===2).map(f=>f.result.winner);
    for(let i=0;i<winners.length;i+=2)scheduleTie(world,winners[i],winners[i+1],stage,round,i/2,stage==='Final');
  }
  if(world.round===13)world.champion=world.fixtures.find(f=>f.stage==='Final').result.winner;
}
/** Mutates a server-owned world, returns full records to persist in same transaction. */
export function advanceWorld(world, options={}) {
  if(world.champion)throw new Error('Musim telah selesai. Buat demo baru untuk musim berikutnya.');
  const pending=world.fixtures.filter(f=>f.round===world.round&&!f.result);
  if(!pending.length)throw new Error('Tidak ada pertandingan pada pekan ini.');
  const records=[];
  for(const f of pending) {
    const home=world.clubs.find(c=>c.id===f.homeId),away=world.clubs.find(c=>c.id===f.awayId);
    const first=f.leg===2?world.fixtures.find(x=>x.tieId===f.tieId&&x.leg===1):null;
    const input={home:structuredClone(home),away:structuredClone(away),seed:`${world.seed}:${f.id}`,knockout:f.leg===2||f.stage==='Final',aggregate:first?[...first.result.score].reverse():[0,0],neutral:!!f.neutral};
    const match=simulateMatch(input);
    f.result={score:match.score,xg:match.teams.map(t=>t.xg),winner:match.winner,penalties:match.penalties?.score||null,minutes:match.minutes};
    records.push({id:f.id,fixture:structuredClone(f),input,match});
    for(const p of [...home.players,...away.players]) {
      const s=match.players.find(s=>s.id===p.id); if(!s)continue;
      const tactic=home.players.some(q=>q.id===p.id)?home.tactics:away.tactics;
      p.condition=round(clamp(p.condition-(14+(100-p.attributes.stamina)*.1+(tactic.pressing==='high'?7:0))*match.minutes/90,30,100));
      p.career.appearances++;
      for(const k of ['minutes','goals','assists','shots','shotsOnTarget','passes','completedPasses','tackles','interceptions','saves','xg','xa'])p.career[k]=round(p.career[k]+s[k]);
      p.career.ratingSum=round(p.career.ratingSum+s.rating);
    }
  }
  // A matchday models several days: recovery occurs after all fixtures together.
  for(const c of world.clubs)for(const p of c.players)p.condition=clamp(p.condition+18,30,100);
  world.round++;world.version++;if(!options.skipStages)advanceStage(world);
  if(world.nextKickoff)world.nextKickoff+=world.interval;
  return records;
}
export function train(world, playerId, focus) {
  const p=world.clubs.flatMap(c=>c.players).find(p=>p.id===playerId);
  if(!p)throw new Error('Pemain tidak ditemukan.');
  if(world.champion)throw new Error('Musim telah selesai.');
  if(![...ATTRIBUTES,'recovery'].includes(focus))throw new Error('Program latihan tidak valid.');
  if(p.trainingRound===world.round)throw new Error('Latihan pekan ini sudah selesai. Tunggu pekan berikutnya.');
  if(focus!=='recovery'&&p.condition<45)throw new Error('Kondisi terlalu rendah. Pilih pemulihan.');
  if(focus==='recovery')p.condition=clamp(p.condition+25,0,100);
  else {p.attributes[focus]=round(Math.min(99,p.attributes[focus]+.35+(100-p.attributes[focus])*.009));p.condition-=14;}
  p.trainingRound=world.round;p.trainingLog.push({round:world.round,season:world.competition?.season||0,focus,value:focus==='recovery'?p.condition:p.attributes[focus]});
  world.version++;return p;
}
export function setTactics(world, clubId, input) {
  const c=world.clubs.find(c=>c.id===clubId);
  if(!c)throw new Error('Klub tidak ditemukan.');
  if(world.champion)throw new Error('Musim telah selesai.');
  const t=input.tactics;
  if(!t||!Object.hasOwn(FORMATIONS,t.formation)||!['balanced','attacking','defensive'].includes(t.mentality)||!['low','balanced','high'].includes(t.pressing)||!['balanced','possession','direct'].includes(t.style))throw new Error('Taktik tidak valid.');
  const next={...c,tactics:{formation:t.formation,mentality:t.mentality,pressing:t.pressing,style:t.style},lineup:input.lineup??null};
  if(next.lineup!==null&&(!Array.isArray(next.lineup)||next.lineup.length!==11||new Set(next.lineup).size!==11))throw new Error('Pilih tepat 11 pemain yang berbeda.');
  const chosen=selectLineup(next);
  if(chosen[0].position!=='GK')throw new Error('Slot penjaga gawang harus diisi GK.');
  c.tactics=next.tactics;c.lineup=next.lineup;world.version++;
}
