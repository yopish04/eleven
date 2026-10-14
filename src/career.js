import { createWorld, advanceWorld, standings, emptyCareer } from './world.js';
import { random, clamp } from './engine.js';

export const TIERS = [
  {id:'pre',name:'Liga Pra-Regional',short:'Pra-Regional',tag:'LANGKAH PERTAMA',level:1,clubs:8,rounds:14,promote:2,description:'Kompetisi lokal. Dua tim teratas naik ke Regional.'},
  {id:'regional',name:'Liga Regional',short:'Regional',tag:'WAKILI DAERAHMU',level:2,clubs:8,rounds:14,promote:2,description:'Dua tim teratas naik ke Nasional. Dua terbawah turun ke Pra-Regional.'},
  {id:'national',name:'Liga Nasional',short:'Nasional',tag:'TAKLUKKAN NEGERI',level:3,clubs:8,rounds:14,promote:2,description:'Dua tim teratas mendapat tiket Asia Cup. Dua terbawah turun ke Regional.'},
  {id:'asia',name:'Eleven Asia Cup',short:'Asia Cup',tag:'PANGGUNG TERBESAR',level:4,clubs:32,rounds:13,promote:0,description:'Delapan grup, fase gugur dua leg, dan final. Setelah turnamen, kembali ke Nasional untuk kualifikasi berikutnya.'},
];
const localNames={
 pre:[['Cimahi Muda','Cimahi'],['Lembang United','Lembang'],['Soreang Athletic','Soreang'],['Cibiru Rovers','Cibiru'],['Dago FC','Bandung'],['Cileunyi Putra','Cileunyi'],['Rancaekek Stars','Rancaekek'],['Cimanggung FC','Cimanggung']],
 regional:[['Garut Persada','Garut'],['Tasik United','Tasikmalaya'],['Bogor Raya','Bogor'],['Bekasi Patriot','Bekasi'],['Cirebon Coast','Cirebon'],['Sukabumi City','Sukabumi'],['Karawang Athletic','Karawang'],['Purwakarta FC','Purwakarta']],
 national:[['Jakarta Merah','Jakarta'],['Surabaya Green','Surabaya'],['Bali Ocean','Denpasar'],['Makassar Maritim','Makassar'],['Medan Deli','Medan'],['Solo Heritage','Solo'],['Papua Sunrise','Jayapura'],['Semarang Port','Semarang']],
};
export const getTier=world=>TIERS.find(t=>t.id===world.competition?.tier)||TIERS[3];
export const careerStandings=(world,group)=>standings(world,world.competition?.tier==='asia'||!world.competition?group||world.clubs.find(c=>c.id===world.profile.clubId).group:'L');

function domesticFixtures(ids,season){
  const fixtures=[],ring=[...ids];
  for(let md=0;md<ids.length-1;md++){
    for(let i=0;i<ids.length/2;i++){
      const a=ring[i],b=ring[ids.length-1-i],home=md%2?b:a,away=md%2?a:b;
      fixtures.push({id:`s${season}-l${md}-${i}`,round:md,stage:'Grup',group:'L',homeId:home,awayId:away,result:null});
      fixtures.push({id:`s${season}-l${md+ids.length-1}-${i}`,round:md+ids.length-1,stage:'Grup',group:'L',homeId:away,awayId:home,result:null});
    }
    ring.splice(1,0,ring.pop());
  }
  return fixtures.sort((a,b)=>a.round-b.round);
}
function setSeason(world,tierId,season){
  const own=world.clubs.find(c=>c.id===world.profile.clubId);
  const fresh=createWorld(`${world.seed}:season:${season}`);
  world.round=0;world.champion=null;world.schemaVersion=2;
  world.competition={tier:tierId,season,finished:false,outcome:null};
  if(tierId==='asia'){
    const original=fresh.clubs.find(c=>c.id===own.id);own.group=original.group;own.region=original.region;
    world.clubs=fresh.clubs.map(c=>c.id===own.id?own:c);
    world.fixtures=fresh.fixtures.map(f=>({...f,id:`s${season}-${f.id}`}));
    world.rules={...fresh.rules,edition:`Musim ${season}`,note:'Aturan Asia Cup versi ELEVEN. Klub dan peserta merupakan data simulasi.'};
  }else{
    own.group='L';
    const source=(own.country==='ID'?localNames[tierId]:Array.from({length:8},(_,i)=>[`${own.city} ${['Academy','United','Athletic','Rovers','City','Racing','Youth','Hearts'][i]}`,own.city])).filter(([n])=>n!==own.name).slice(0,7);
    const rng=random(`${world.seed}:${tierId}:${season}`),offset={pre:-15,regional:-7,national:0}[tierId];
    const opponents=source.map(([name,city],i)=>{
      const template=structuredClone(fresh.clubs[i]);const id=`${tierId}-${own.country}-${i}`;
      return {...template,id,name,city,country:own.country,code:name.split(' ').map(s=>s[0]).join('').slice(0,3),group:'L',region:own.region,
        players:template.players.map((p,n)=>({...p,id:`${id}-p${n}`,name:own.country==='ID'?`${['Raka','Bima','Dimas','Fajar','Rizky','Ilham','Daffa','Bagas','Aditya','Farhan','Reza','Hafiz','Naufal','Andika','Galih','Surya'][n]} ${['Putra','Saputra','Wijaya','Pratama'][i%4]}`:p.name,attributes:Object.fromEntries(Object.entries(p.attributes).map(([k,v])=>[k,clamp(v+offset+Math.floor(rng()*5),15,90)])),career:emptyCareer()}))};
    });
    // Keep the original catalogue order, including the owned club, for existing profile references.
    world.clubs=fresh.clubs.map(c=>c.id===own.id?own:{...c,group:`inactive-${c.id}`}).concat(opponents);
    world.fixtures=domesticFixtures([own.id,...opponents.map(c=>c.id)],season);
    world.rules={id:`eleven-${tierId}-v2`,name:TIERS.find(t=>t.id===tierId).name,edition:`Musim ${season}`,note:'Piramida kompetisi fiksi ELEVEN; bukan struktur resmi federasi.',tiebreak:'Poin → head-to-head → selisih gol → gol → undian deterministik.',groups:1,clubsPerGroup:8,groupLegs:2,qualifyPerGroup:2};
  }
  for(const p of own.players){p.condition=100;p.trainingRound=-1;}
}
export function initializeCareer(world){
  world.history=[];world.highestTier=0;
  const own=world.clubs.find(c=>c.id===world.profile.clubId);
  for(const p of own.players)for(const k of Object.keys(p.attributes))p.attributes[k]=clamp(p.attributes[k]-15,15,90);
  setSeason(world,'pre',1);return world;
}
export function migrateLegacyJourney(world){
  if(world.competition)throw new Error('Karier berjenjang sudah aktif.');
  world.history=[{season:0,tier:'asia',name:'Asia Cup — demo awal',position:null,champion:world.champion,completed:!!world.champion,fixtures:world.fixtures,clubId:world.profile.clubId}];
  world.highestTier=0;setSeason(world,'pre',1);world.version++;return world;
}
function finishSeason(world){
  const t=getTier(world);let rank=null,nextTier=t.id,status='Bertahan';
  if(t.id==='asia'){nextTier='national';status=world.champion===world.profile.clubId?'Juara Asia':'Kembali ke Nasional';}
  else{
    const table=careerStandings(world);rank=table.findIndex(r=>r.id===world.profile.clubId)+1;
    world.champion=table[0].id;
    const i=TIERS.indexOf(t);
    if(rank<=2){nextTier=TIERS[i+1].id;status=t.id==='national'?'Lolos ke Asia':'Promosi';}
    else if(rank>=7&&i>0){nextTier=TIERS[i-1].id;status='Degradasi';}
  }
  world.competition.finished=true;world.competition.outcome={position:rank,nextTier,status};
  world.highestTier=Math.max(world.highestTier||0,TIERS.findIndex(t=>t.id===nextTier));
}
export function advanceCareer(world){
  if(!world.competition)return advanceWorld(world);
  if(world.competition.finished)throw new Error('Musim selesai. Lanjutkan ke musim berikutnya.');
  const domestic=world.competition.tier!=='asia';
  // Reuse the same event engine and career accounting; only domestic stage advancement differs.
  const records=advanceWorld(world,{skipStages:domestic});
  if((domestic&&world.round===14)||(!domestic&&world.champion))finishSeason(world);
  return records;
}
export function nextSeason(world){
  if(!world.competition?.finished)throw new Error('Selesaikan musim ini terlebih dahulu.');
  const {season,tier,outcome}=world.competition;
  world.history ||= [];
  world.history.push({season,tier,name:getTier(world).name,position:outcome.position,champion:world.champion,championName:world.clubs.find(c=>c.id===world.champion)?.name,completed:true,status:outcome.status,fixtures:world.fixtures,clubId:world.profile.clubId});
  // Keep recent summaries and fixture references without duplicating full match event records.
  if(world.history.length>20)world.history=world.history.slice(-20);
  setSeason(world,outcome.nextTier,season+1);world.version++;return world;
}
