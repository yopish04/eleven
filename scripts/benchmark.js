import {createWorld} from '../src/world.js';
import {simulateMatch} from '../src/engine.js';
const world=createWorld('benchmark-v1');
const base=world.clubs[16],away=world.clubs[17];
const results=[];
for(const finishing of [35,65,95]){
  const home=structuredClone(base);home.players.forEach(p=>p.attributes.finishing=finishing);
  let goals=0,conceded=0,shots=0,wins=0;
  for(let seed=0;seed<500;seed++){
    const m=simulateMatch({home,away,seed:`paired-${seed}`});
    goals+=m.score[0];conceded+=m.score[1];shots+=m.teams[0].shots;if(m.score[0]>m.score[1])wins++;
  }
  results.push({finishing,matches:500,goalsPerMatch:goals/500,concededPerMatch:conceded/500,shotsPerMatch:shots/500,winRate:wins/500});
}
console.log(JSON.stringify({engine:'0.1.0',purpose:'Sensitivity check, not professional-data calibration',results},null,2));
