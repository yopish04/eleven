// Pure, deterministic match engine. There is no client-authoritative scoring.
export const ENGINE_VERSION = '0.1.0';
export const ATTRIBUTES = ['pace', 'passing', 'finishing', 'defending', 'vision', 'stamina', 'goalkeeping'];
export const FORMATIONS = {
  '4-3-3': ['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW'],
  '4-4-2': ['GK','DF','DF','DF','DF','MF','MF','MF','MF','FW','FW'],
  '3-5-2': ['GK','DF','DF','DF','MF','MF','MF','MF','MF','FW','FW'],
};
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const round = (v, digits = 2) => Number(v.toFixed(digits));
export function random(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const mean = values => values.reduce((a,b) => a+b, 0) / values.length;
const choose = (list, rng) => list[Math.floor(rng() * list.length)];
export function overall(player, role = player.position) {
  const a = player.attributes;
  const keys = role === 'GK' ? ['goalkeeping','vision','stamina'] : role === 'DF' ? ['defending','pace','stamina'] : role === 'MF' ? ['passing','vision','stamina'] : ['finishing','pace','vision'];
  return Math.round(mean(keys.map(k => a[k])));
}
export function selectLineup(team) {
  const slots = FORMATIONS[team.tactics.formation];
  if (!slots) throw new Error('Unknown formation');
  const remaining = [...team.players];
  const manual = team.lineup?.length === 11 ? team.lineup : null;
  return slots.map((role, index) => {
    let p = manual ? remaining.find(p => p.id === manual[index]) : null;
    if (manual && !p) throw new Error('Invalid or duplicate lineup');
    if (!p) {
      remaining.sort((a,b) => (overall(b, role) * (b.position === role ? 1 : .72)) - (overall(a, role) * (a.position === role ? 1 : .72)) || a.id.localeCompare(b.id));
      p = remaining[0];
    }
    if (!p) throw new Error('A match needs 11 players per club');
    remaining.splice(remaining.indexOf(p), 1);
    return { ...structuredClone(p), role, slot: index };
  });
}
export function effective(player, key, minute, pressing = 'balanced') {
  const fatigue = (minute / 90) * (1 - player.attributes.stamina / 160) * (pressing === 'high' ? .27 : pressing === 'low' ? .11 : .18);
  return player.attributes[key] * (.65 + .35 * player.condition / 100) * (1 - fatigue) * (player.role === player.position ? 1 : .78);
}
const blankStats = p => ({ id:p.id, name:p.name, position:p.position, role:p.role, minutes:0, passes:0, completedPasses:0, shots:0, shotsOnTarget:0, goals:0, assists:0, tackles:0, interceptions:0, saves:0, xg:0, xa:0, rating:6 });
export function summarize(events, lineups, minutes = 90) {
  const stats = Object.fromEntries(lineups.flat().map(p => [p.id, blankStats(p)]));
  const teams = [0,1].map(() => ({ goals:0, shots:0, shotsOnTarget:0, passes:0, completedPasses:0, xg:0, possession:0 }));
  let actions = 0;
  for (const e of events) {
    if (!stats[e.playerId]) continue;
    const p = stats[e.playerId], t = teams[e.side];
    if (e.type === 'pass') { p.passes++; t.passes++; actions++; t.possession++; if(e.success) {p.completedPasses++; t.completedPasses++;} else { stats[e.opponentId].interceptions++; } }
    if (e.type === 'duel') { actions++; t.possession++; if(!e.success) stats[e.opponentId].tackles++; }
    if (e.type === 'shot') {
      p.shots++; t.shots++; p.xg += e.xg; t.xg += e.xg;
      if(e.onTarget) {p.shotsOnTarget++; t.shotsOnTarget++;}
      if(e.goal) {p.goals++; t.goals++; if(e.assistId) stats[e.assistId].assists++;}
      else if(e.onTarget) stats[e.keeperId].saves++;
      if(e.assistId) stats[e.assistId].xa += e.xg;
    }
  }
  for (const p of Object.values(stats)) {
    p.minutes = minutes; p.xg = round(p.xg); p.xa = round(p.xa);
    // Transparent contribution index, not a licensed Opta/FotMob match rating.
    p.rating = round(clamp(6 + .7*p.goals + .45*p.assists + .045*p.tackles + .025*p.interceptions + .075*p.saves + .004*p.completedPasses - .015*(p.passes-p.completedPasses), 3, 10),1);
  }
  teams.forEach(t => {t.xg = round(t.xg); t.possession = actions ? round(100*t.possession/actions,1) : 50;});
  return { players: Object.values(stats), teams };
}
/** aggregate is the first-leg score in CURRENT home/away order. */
export function simulateMatch({ home, away, seed, knockout = false, aggregate = [0,0], neutral = false }) {
  if (home.id === away.id) throw new Error('Clubs must differ');
  const rng = random(seed), lineups = [selectLineup(home), selectLineup(away)];
  const teams = [home,away], events = [], score = [0,0];
  let side = rng() < .5 ? 0 : 1, zone = 1, assistId = null;
  let carrier = choose(lineups[side].filter(p => p.role === 'MF'), rng);
  const eff = (p,k,m,s) => effective(p,k,m,teams[s].tactics.pressing);
  const flip = () => {side = 1-side; zone = 1; assistId = null; carrier = choose(lineups[side].filter(p => p.role === 'MF'), rng);};
  function period(start, end) {
    // Eight meaningful ball actions per minute. Every counted statistic has an event.
    for (let tick = start*8; tick < end*8; tick++) {
      const minute = (tick+1)/8, opposition = 1-side, tactic = teams[side].tactics;
      const defender = choose(lineups[opposition].filter(p => p.role === (zone === 2 ? 'DF' : 'MF')), rng);
      const pressure = teams[opposition].tactics.pressing === 'high' ? 7 : teams[opposition].tactics.pressing === 'low' ? -4 : 0;
      const base = { id:events.length, minute:round(minute,3), side, playerId:carrier.id, zone, x:side ? 88-zone*29 : 12+zone*29, y:round(18+rng()*64), opponentId:defender.id };
      const shooting = zone === 2 && rng() < (tactic.mentality === 'attacking' ? .115 : tactic.mentality === 'defensive' ? .045 : .075);
      if (shooting) {
        const keeper = lineups[opposition].find(p => p.role === 'GK');
        const distance = 7 + rng()*21;
        const angle = .55 + rng()*.45;
        // xG is chance geometry/pressure only; finishing and keeper affect conversion separately.
        const xg = clamp(.47*Math.exp(-distance/19)*angle * (1 + (eff(carrier,'vision',minute,side)-eff(defender,'defending',minute,opposition)) / 220), .025, .5);
        const onTargetP = clamp(.28 + eff(carrier,'finishing',minute,side)/230 - eff(defender,'defending',minute,opposition)/600, .18, .8);
        const conversionP = clamp(xg * Math.exp((eff(carrier,'finishing',minute,side)-65)/100 + (65-eff(keeper,'goalkeeping',minute,opposition))/120 + (!neutral && side===0 ? .045 : 0)), .01, onTargetP*.93);
        const shotRoll = rng(), goal = shotRoll < conversionP, onTarget = shotRoll < onTargetP;
        events.push({...base,type:'shot',xg:round(xg,5),conversionP:round(conversionP,5),distance:round(distance),goal,onTarget,keeperId:keeper.id,assistId});
        if(goal) score[side]++;
        flip(); continue;
      }
      if (rng() < .13) {
        const probability = clamp(.5 + (eff(carrier,'pace',minute,side)*.55+eff(carrier,'vision',minute,side)*.45-eff(defender,'defending',minute,opposition)-pressure)/155, .13,.88);
        const success = rng() < probability;
        events.push({...base,type:'duel',success,probability:round(probability,5)});
        assistId=null;
        if(success) zone = Math.min(2,zone+1); else flip();
      } else {
        const candidates = lineups[side].filter(p=>p.id!==carrier.id && p.role!=='GK');
        const preferred = candidates.filter(p=>p.role === (zone>=1 ? 'FW':'MF'));
        const recipient = choose(rng()<.6 && preferred.length ? preferred : candidates,rng);
        const progress = rng() < (tactic.style === 'direct' ? .72 : tactic.style === 'possession' ? .3 : .47);
        const probability = clamp(.77 + (eff(carrier,'passing',minute,side)*.7 + eff(carrier,'vision',minute,side)*.3 - eff(defender,'defending',minute,opposition) - pressure)/210 - (progress ? .09 : 0) + (tactic.style==='possession' ? .045 : 0), .24,.97);
        const success = rng() < probability;
        events.push({...base,type:'pass',toId:recipient.id,success,probability:round(probability,5)});
        if(success) {assistId=carrier.id; carrier=recipient; zone=progress?Math.min(2,zone+1):zone;} else flip();
      }
    }
  }
  period(0,90);
  let minutes = 90, penalties = null;
  if(knockout && score[0]+aggregate[0]===score[1]+aggregate[1]) {period(90,120); minutes=120;}
  let winner = score[0]+aggregate[0] === score[1]+aggregate[1] ? null : score[0]+aggregate[0] > score[1]+aggregate[1] ? home.id : away.id;
  if (knockout && !winner) {
    const tally=[0,0], kicks=[];
    const takers=lineups.map(l=>l.filter(p=>p.role!=='GK').sort((a,b)=>b.attributes.finishing-a.attributes.finishing));
    let ended=false;
    for(let n=0;!ended;n++) {
      for(let s=0;s<2;s++) {
        const p=takers[s][n%10], g=lineups[1-s][0];
        const success=rng()<clamp(.75+(p.attributes.finishing-g.attributes.goalkeeping)/350,.5,.92);
        if(success)tally[s]++;
        kicks.push({side:s,playerId:p.id,success});
        if(n<5) {
          const leftHome=4-n, leftAway=s===0?5-n:4-n;
          if(tally[0]>tally[1]+leftAway || tally[1]>tally[0]+leftHome) {ended=true;break;}
        }
      }
      if(n>=4 && tally[0]!==tally[1]) ended=true;
      if(n>1000) throw new Error('Shootout failed to converge');
    }
    penalties={score:tally,kicks}; winner=tally[0]>tally[1]?home.id:away.id;
  }
  return {engineVersion:ENGINE_VERSION,seed,homeId:home.id,awayId:away.id,score,aggregate,minutes,winner,penalties,lineups,events,...summarize(events,lineups,minutes)};
}
