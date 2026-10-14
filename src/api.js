import { selectLineup } from './engine.js';
import { createWorld, train, setTactics } from './world.js';
import { initializeCareer, advanceCareer, nextSeason, migrateLegacyJourney } from './career.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const error=(message,status)=>json({error:message},status);
export async function gameApi(request, db, owner) {
  if(!owner)return error('Masuk dengan ChatGPT untuk melanjutkan karier.',401);
  if(!db)return error('Penyimpanan belum tersedia.',503);
  const url=new URL(request.url);
  if(request.method==='GET') {
    const row=await db.prepare('SELECT payload, run_id FROM worlds WHERE owner = ?').bind(owner).first();
    if(!row)return json({world:null});
    if(url.searchParams.has('match')) {
      const found=await db.prepare('SELECT payload FROM matches WHERE owner = ? AND run_id = ? AND fixture_id = ?').bind(owner,row.run_id,url.searchParams.get('match')).first();
      return found?json(JSON.parse(found.payload)):error('Pertandingan tidak ditemukan.',404);
    }
    return json({world:JSON.parse(row.payload)});
  }
  if(request.method!=='POST')return error('Metode tidak didukung.',405);
  const origin=request.headers.get('origin');
  if(origin && origin!==url.origin)return error('Asal permintaan tidak valid.',403);
  if(request.headers.get('sec-fetch-site')==='cross-site')return error('Permintaan lintas situs ditolak.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return error('Gunakan JSON.',415);
  const raw=await request.text();
  if(raw.length>16384)return error('Permintaan terlalu besar.',413);
  let body;try{body=JSON.parse(raw);}catch{return error('JSON tidak valid.',400);}
  if(!body || typeof body!=='object' || Array.isArray(body))return error('Permintaan tidak valid.',400);
  const row=await db.prepare('SELECT payload, run_id, version FROM worlds WHERE owner = ?').bind(owner).first();
  try {
    if(body.action==='start'||body.action==='reset') {
      if(row&&body.action==='start')return json({world:JSON.parse(row.payload)});
      if(body.action==='reset'&&(!row||body.version!==row.version))return error('Progres berubah. Muat ulang terlebih dahulu.',409);
      if(typeof body.name!=='string'||body.name.trim().length<2||body.name.trim().length>32||/[\p{Cc}<>]/u.test(body.name))return error('Nama harus 2–32 karakter tanpa simbol < atau >.',400);
      const world=createWorld(crypto.randomUUID(),'demo');
      const club=world.clubs.find(c=>c.id===body.clubId);
      if(!club || !['GK','DF','MF','FW'].includes(body.position))return error('Pilih klub dan posisi yang valid.',400);
      const player=club.players.find(p=>p.position===body.position);
      player.name=body.name.trim();player.owner='you';club.coach='you';
      const xi=selectLineup(club);
      if(!xi.some(p=>p.id===player.id))xi[xi.findIndex(p=>p.role===player.position)]=player;
      club.lineup=xi.map(p=>p.id);
      world.profile={clubId:club.id,playerId:player.id,name:player.name};
      initializeCareer(world);
      const runId=crypto.randomUUID(), mutation=crypto.randomUUID();
      world.version=row?row.version+1:0;
      if(row) {
        const result=await db.batch([
          db.prepare('UPDATE worlds SET payload=?, run_id=?, version=?, mutation=?, updated_at=? WHERE owner=? AND version=?').bind(JSON.stringify(world),runId,world.version,mutation,Date.now(),owner,row.version),
          db.prepare('DELETE FROM matches WHERE owner=? AND EXISTS (SELECT 1 FROM worlds WHERE owner=? AND mutation=?)').bind(owner,owner,mutation),
        ]);
        if(!result[0].meta.changes)return error('Progres berubah. Muat ulang terlebih dahulu.',409);
      }else {
        await db.prepare('INSERT OR IGNORE INTO worlds (owner,run_id,version,mutation,payload,updated_at) VALUES (?,?,?,?,?,?)').bind(owner,runId,world.version,mutation,JSON.stringify(world),Date.now()).run();
      }
      const saved=await db.prepare('SELECT payload FROM worlds WHERE owner=?').bind(owner).first();
      return json({world:JSON.parse(saved.payload)});
    }
    if(!row)return error('Mulai karier terlebih dahulu.',400);
    if(body.version!==row.version)return error('Progres sudah diperbarui. Muat ulang lalu coba lagi.',409);
    const world=JSON.parse(row.payload);
    let records=[];
    if(body.action==='train')train(world,world.profile.playerId,body.focus);
    else if(body.action==='tactics')setTactics(world,world.profile.clubId,body);
    else if(body.action==='advance')records=advanceCareer(world);
    else if(body.action==='nextSeason')nextSeason(world);
    else if(body.action==='startJourney')migrateLegacyJourney(world);
    else return error('Aksi tidak dikenal.',400);
    const mutation=crypto.randomUUID();
    const statements=[db.prepare('UPDATE worlds SET payload=?,version=?,mutation=?,updated_at=? WHERE owner=? AND version=?').bind(JSON.stringify(world),world.version,mutation,Date.now(),owner,row.version)];
    // Unique mutation token binds conditional inserts to this CAS update. D1 batch is atomic.
    for(const r of records)statements.push(db.prepare('INSERT INTO matches (owner,run_id,fixture_id,payload) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM worlds WHERE owner=? AND mutation=?)').bind(owner,row.run_id,r.id,JSON.stringify(r),owner,mutation));
    const result=await db.batch(statements);
    if(!result[0].meta.changes)return error('Progres berubah di tab lain. Muat ulang lalu coba lagi.',409);
    const own=records.find(r=>[r.fixture.homeId,r.fixture.awayId].includes(world.profile.clubId));
    return json({world,match:own||records[0]||null});
  }catch(e){
    if(e instanceof Error && !/SQL|D1|constraint|database/i.test(e.message))return error(e.message,400);
    console.error('Game operation failed',e instanceof Error?e.message:'unknown');
    return error('Progres belum tersimpan. Coba lagi.',500);
  }
}
