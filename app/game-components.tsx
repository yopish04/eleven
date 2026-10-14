'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Check, ChevronRight, CircleHelp, Dumbbell, Flag, Goal, Home, LoaderCircle, Pause, Play, RotateCcw, Shield, Sparkles, Target, Trophy, Users, X, Zap } from 'lucide-react';

import { overall, selectLineup, summarize, FORMATIONS } from '../src/engine.js';

export type Player={id:string;name:string;position:string;number:number;age:number;attributes:Record<string,number>;condition:number;owner:string|null;trainingRound:number;trainingLog:{round:number;season?:number;focus:string;value:number}[];career:Record<string,number>};
export type Tactics={formation:string;mentality:string;pressing:string;style:string};
export type Club={id:string;name:string;code:string;country:string;city:string;group:string;region:string;color:string;players:Player[];tactics:Tactics;lineup:string[]|null};
export type Fixture={id:string;homeId:string;awayId:string;stage:string;round:number;group?:string;leg?:number;result:null|{score:number[];xg:number[];winner:string;penalties:number[]|null;minutes:number}};
export type World={clubs:Club[];fixtures:Fixture[];profile:{name:string;clubId:string;playerId:string};round:number;version:number;champion:string|null;rules:{note:string;tiebreak:string;name?:string};seed:string;competition?:{tier:string;season:number;finished:boolean;outcome:null|{position:number|null;nextTier:string;status:string}};highestTier?:number;history?:{season:number;tier:string;name:string;position:number|null;championName?:string;completed:boolean;status?:string;fixtures:Fixture[];clubId:string}[]};
type Event={id:number;minute:number;side:number;playerId:string;type:string;x:number;y:number;goal?:boolean;onTarget?:boolean;success?:boolean;xg?:number;toId?:string};
export type Match={id:string;fixture:Fixture;input:{home:Club;away:Club};match:{minutes:number;score:number[];aggregate:number[];lineups:(Player&{role:string;slot:number})[][];events:Event[];players:Record<string,number|string>[];penalties:null|{score:number[]};engineVersion:string;seed:string}};
type Page='home'|'squad'|'training'|'asia'|'stats';
const LABELS:Record<string,string>={pace:'Kecepatan',passing:'Umpan',finishing:'Finishing',defending:'Bertahan',vision:'Visi',stamina:'Stamina',goalkeeping:'Kiper',recovery:'Pemulihan'};
const POS:Record<string,string>={GK:'Penjaga gawang',DF:'Bek',MF:'Gelandang',FW:'Penyerang'};
const NAV=[{id:'home' as Page,label:'Beranda',icon:Home},{id:'squad' as Page,label:'Skuad',icon:Users},{id:'training' as Page,label:'Latihan',icon:Dumbbell},{id:'asia' as Page,label:'Asia Cup',icon:Trophy},{id:'stats' as Page,label:'Statistik',icon:Activity}];
const pct=(n:number,d:number)=>d?`${Math.round(n/d*100)}%`:'—';
const fmt=(n:number)=>Number.isInteger(n)?n:n.toFixed(1);
const roleName=(s:string)=>s==='player'?'Pemain':'Pelatih';
export function Badge({club,small=false}:{club:Club;small?:boolean}){return <span className={`badge ${small?'small':''}`} style={{'--club':club.color} as React.CSSProperties}><Shield aria-hidden="true"/><b>{club.code}</b></span>;}
export function Brand(){return <div className="brand"><span className="brand-mark">11</span><span>ELEVEN<i>FOOTBALL, TOGETHER.</i></span></div>;}
export function Bar({value}:{value:number}){return <div className="bar"><span style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div>;}
export function Metric({label,value,detail}:{label:string;value:string|number;detail?:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>;}
export function Pitch({home,away,event,lineup}:{home:Club;away?:Club;event?:Event;lineup?:ReturnType<typeof selectLineup>}) {
  const lineups=[lineup||selectLineup(home),...(away?[selectLineup(away)]:[])];
  return <div className={`pitch ${away?'match-pitch':''}`} aria-label={away?'Visualisasi posisi tim dan peristiwa bola':'Formasi sebelas pemain'}>
    <svg className="pitch-lines" viewBox="0 0 100 68" preserveAspectRatio="none" aria-hidden="true"><rect x="3" y="3" width="94" height="62" rx=".2"/><path d="M50 3v62M3 17h15v34H3M97 17H82v34h15M3 26h5v16H3M97 26h-5v16h5"/><ellipse cx="50" cy="34" rx="9" ry="9"/><circle cx="50" cy="34" r=".45"/><path d="M18 27a9 9 0 0 1 0 14M82 27a9 9 0 0 0 0 14"/></svg>
    {lineups.map((players,side)=>players.map((p:Player&{role:string;slot:number})=>{
      const row=players.filter((a:{role:string})=>a.role===p.role), i=row.findIndex((a:{id:string})=>a.id===p.id);
      const x=({GK:10,DF:29,MF:51,FW:77}[p.role]||50), y=100*(i+1)/(row.length+1);
      const offset=away?(event?Math.sin(event.id*.4+p.slot)*2:0):0;
      return <span key={p.id} className={`pitch-player ${side?'away':''} ${p.owner?'owned':''}`} style={{left:`${(side?100-x:x)+offset}%`,top:`${y}%`}}><b>{p.number}</b>{!away&&<small>{p.name.split(' ')[0]}</small>}</span>;
    }))}
    {away&&<span className="ball" style={{left:`${event?.x??50}%`,top:`${event?.y??50}%`}}/>}
    {!away&&<span className="pitch-direction">ARAH SERANG <ArrowRight size={12}/></span>}
  </div>;
}
export function Radar({player}:{player:Player}){
  const keys=player.position==='GK'?['goalkeeping','vision','passing','stamina','pace','defending']:['pace','finishing','passing','vision','defending','stamina'];
  const point=(i:number,r:number)=>[110+Math.sin(i*Math.PI/3)*r,102-Math.cos(i*Math.PI/3)*r];
  return <svg className="radar" viewBox="0 0 220 216" role="img" aria-label="Radar atribut pemain">
    {[.25,.5,.75,1].map(r=><polygon key={r} className="radar-grid" points={keys.map((_,i)=>point(i,70*r).join(',')).join(' ')}/>)}
    {keys.map((_,i)=><line className="radar-grid" key={i} x1="110" y1="102" x2={point(i,70)[0]} y2={point(i,70)[1]}/>)}
    <polygon className="radar-value" points={keys.map((k,i)=>point(i,70*player.attributes[k]/100).join(',')).join(' ')}/>
    {keys.map((k,i)=><text key={k} x={point(i,91)[0]} y={point(i,88)[1]+4} textAnchor="middle">{k==='defending'?'DEF':k==='finishing'?'FIN':k==='goalkeeping'?'GK':k.slice(0,3).toUpperCase()} {Math.round(player.attributes[k])}</text>)}
  </svg>;
}
export function Modal({children,onClose,label}:{children:React.ReactNode;onClose:()=>void;label:string}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[]);
  return <dialog ref={ref} onCancel={onClose} className="modal" aria-label={label}><button className="icon-button close" onClick={onClose} aria-label="Tutup"><X size={21}/></button>{children}</dialog>;
}

export function TacticsPanel({club,role,busy,save,onCoach}:{club:Club;role:string;busy:boolean;save:(t:Tactics,l:string[])=>void;onCoach:()=>void}){
  const [tactics,setTactics]=useState(club.tactics),[lineup,setLineup]=useState(selectLineup(club).map((p:{id:string})=>p.id));
  const draft={...club,tactics,lineup};
  const valid=new Set(lineup).size===11;
  const preview=valid?selectLineup(draft):selectLineup(club);
  const readonly=role!=='coach';
  const update=(k:string,v:string)=>{const t={...tactics,[k]:v};setTactics(t);if(k==='formation')setLineup(selectLineup({...club,tactics:t,lineup:null}).map((p:{id:string})=>p.id));};
  return <><div className="coach-note"><Flag size={18}/><span>{readonly?'Kamu sedang melihat skuad sebagai pemain. Ganti ke pelatih untuk mengatur taktik.':'Ruang pelatih. Semua perubahan berlaku pada pertandingan berikutnya.'}</span>{readonly&&<button className="text-button" onClick={onCoach}>Jadi pelatih <ArrowRight size={16}/></button>}</div><div className="tactics-layout"><section className="panel tactics-controls"><div className="section-title"><h2>Papan taktik</h2><span className="pill green">{tactics.formation}</span></div><Pitch home={draft} lineup={preview}/><div className="tactics-options">{[{k:'formation',label:'Formasi',opts:Object.keys(FORMATIONS).map(v=>[v,v])},{k:'mentality',label:'Mentalitas',opts:[['balanced','Seimbang'],['attacking','Menyerang'],['defensive','Bertahan']]},{k:'style',label:'Gaya bermain',opts:[['balanced','Seimbang'],['possession','Penguasaan bola'],['direct','Umpan langsung']]},{k:'pressing',label:'Pressing',opts:[['balanced','Sedang'],['high','Tinggi'],['low','Rendah']]}].map(s=><label key={s.k}>{s.label}<select disabled={readonly||busy} value={tactics[s.k as keyof Tactics]} onChange={e=>update(s.k,e.target.value)}>{s.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>)}</div><p className="fine-print">Pressing tinggi menekan akurasi lawan, tetapi mempercepat kelelahan. Pemain di luar posisi alami kehilangan 22% efektivitas atribut.</p><button className="primary full" disabled={readonly||busy||!valid} onClick={()=>save(tactics,lineup)}><Check size={18}/> Simpan taktik & starting XI</button></section><section className="panel"><div className="section-title"><h2>Starting XI</h2><button className="text-button" disabled={readonly||busy} onClick={()=>setLineup(selectLineup({...club,tactics,lineup:null}).map((p:{id:string})=>p.id))}><RotateCcw size={14}/> Otomatis</button></div>{!valid&&<p className="error-text">Ada pemain yang dipilih dua kali. Pilih 11 pemain berbeda.</p>}<div className="lineup-list">{lineup.map((id:string,i:number)=>{const p=club.players.find(p=>p.id===id)!;const slot=(FORMATIONS as Record<string,string[]>)[tactics.formation][i];return <div className="lineup-row" key={i}><span className={`position position-${slot}`}>{slot}</span><div><select aria-label={`Pemain slot ${i+1} ${slot}`} disabled={readonly||busy} value={id} onChange={e=>setLineup(lineup.map((v:string,n:number)=>n===i?e.target.value:v))}>{club.players.map(p=><option key={p.id} value={p.id}>{p.name}{p.owner?' · KAMU':''} ({p.position})</option>)}</select>{p.position!==slot&&<small className="warning">Di luar posisi alami</small>}</div><b>{overall(p,slot)}</b><span className="condition-mini">{p.condition}%</span></div>;})}</div><div className="bench"><span className="eyebrow">CADANGAN</span>{club.players.filter(p=>!lineup.includes(p.id)).map(p=><div key={p.id}><span>{p.name}</span><span>{p.position} · {overall(p)}</span></div>)}</div></section></div></>;
}

export function MatchReplay({record}:{record:Match}){
  const {match:m,input:{home,away}}=record;
  const [minute,setMinute]=useState(0),[playing,setPlaying]=useState(true),[speed,setSpeed]=useState(3),[tab,setTab]=useState('events');
  useEffect(()=>{if(!playing)return;const t=setInterval(()=>setMinute(v=>Math.min(m.minutes,v+speed)),350);return()=>clearInterval(t);},[playing,speed,m.minutes]);
  useEffect(()=>{if(minute>=m.minutes)setPlaying(false);},[minute,m.minutes]);
  const events=useMemo(()=>m.events.filter(e=>e.minute<=minute),[m.events,minute]);
  const live=useMemo(()=>summarize(events,m.lineups,minute),[events,m.lineups,minute]);
  const names=Object.fromEntries(m.lineups.flat().map(p=>[p.id,p.name]));
  const highlights=events.filter(e=>e.type==='shot').slice(-12).reverse();
  function download(){const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`eleven-${record.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <div className="match-replay"><div className="eyebrow">MATCH CENTRE <span className="subtle">/ REPLAY 2D</span></div><div className="replay-score"><div><Badge club={home} small/><h3>{home.name}</h3></div><div className="score-centre"><b>{live.teams[0].goals} <span>:</span> {live.teams[1].goals}</b><span className="pill green">{minute>=m.minutes?'FULL TIME':`${Math.floor(minute)}′`}</span></div><div><Badge club={away} small/><h3>{away.name}</h3></div></div>
    {record.fixture.leg===2&&<p className="aggregate">Agregat: {live.teams[0].goals+m.aggregate[0]} – {live.teams[1].goals+m.aggregate[1]}</p>}
    {minute>=m.minutes&&m.penalties&&<p className="aggregate lime">Adu penalti: {m.penalties.score.join(' – ')}</p>}
    <Pitch home={{...home,lineup:m.lineups[0].map(p=>p.id)}} away={{...away,lineup:m.lineups[1].map(p=>p.id)}} event={events.at(-1)}/>
    <div className="replay-controls"><button className="icon-button" onClick={()=>{if(minute>=m.minutes)setMinute(0);setPlaying(!playing);}} aria-label={playing?'Jeda replay':'Putar replay'}>{playing?<Pause size={20}/>:<Play size={20}/>}</button><input type="range" min="0" max={m.minutes} value={minute} aria-label="Menit replay" onChange={e=>{setPlaying(false);setMinute(Number(e.target.value));}}/><select aria-label="Kecepatan replay" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={3}>3×</option><option value={6}>6×</option></select><button className="text-button" onClick={()=>{setPlaying(false);setMinute(m.minutes);}}>Hasil <ChevronRight size={16}/></button></div>
    <div className="replay-tabs"><button className={tab==='events'?'selected':''} onClick={()=>setTab('events')}>Jalannya laga</button><button className={tab==='players'?'selected':''} onClick={()=>setTab('players')}>Pemain</button></div>
    <div className="replay-details"><div className="match-stats">{[['Penguasaan',`${live.teams[0].possession}%`,`${live.teams[1].possession}%`],['Tembakan',live.teams[0].shots,live.teams[1].shots],['Tepat sasaran',live.teams[0].shotsOnTarget,live.teams[1].shotsOnTarget],['Expected goals',live.teams[0].xg.toFixed(2),live.teams[1].xg.toFixed(2)],['Akurasi umpan',pct(live.teams[0].completedPasses,live.teams[0].passes),pct(live.teams[1].completedPasses,live.teams[1].passes)]].map(([l,h,a])=><div key={l}><b>{h}</b><span>{l}</span><b>{a}</b></div>)}</div><div className="commentary-log">{tab==='events'?(highlights.length?highlights.map(e=><div key={e.id} className={e.goal?'goal-event':''}><span>{Math.ceil(e.minute)}′</span>{e.goal?<Goal size={18}/>:<Target size={18}/>}<p><b>{e.goal?'GOL! ':''}{names[e.playerId]}</b><small>{e.goal?'Menuntaskan peluang.':e.onTarget?'Tembakan diselamatkan.':'Tembakan melebar / diblok.'} xG {e.xg?.toFixed(2)}</small></p></div>):<p className="muted">Peluit dibunyikan. Kedua tim membangun serangan…</p>):live.players.filter((p:{id:string})=>m.lineups[0].some(x=>x.id===p.id)).map((p:{id:string;name:string;goals:number;assists:number;rating:number})=><div key={p.id}><span className="lime">{p.rating}</span><p><b>{p.name}</b><small>{p.goals} gol · {p.assists} assist · {home.code}</small></p></div>)}</div></div><div className="replay-bottom"><span>Visualisasi peristiwa · bukan posisi tracking nyata</span><button className="text-button" onClick={download}><ArrowDownToLine size={15}/> Data pertandingan</button></div>
  </div>;
}
