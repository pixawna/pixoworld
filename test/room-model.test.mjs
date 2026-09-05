import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dateKey,daysTogether,dayPhase,restoreWorld,collection} from '../room-model.js';

test('day and lighting transitions follow the local calendar',()=>{
  const first=new Date(2026,8,4,23,59),second=new Date(2026,8,5,0,1);
  assert.equal(dateKey(first),'2026-09-04');
  assert.equal(daysTogether(first.toISOString(),second),2);
  assert.equal(dayPhase(5),'night');assert.equal(dayPhase(6),'morning');
  assert.equal(dayPhase(16),'evening');assert.equal(dayPhase(21),'night');
});
test('older and malformed world state receive safe defaults without losing memories',()=>{
  assert.deepEqual(restoreWorld('{broken').memories,[]);
  const saved=restoreWorld(JSON.stringify({memories:[{text:'Ship my project',kind:'A goal'},null],totalSessions:-4,light:'bad'}));
  assert.equal(saved.memories[0].text,'Ship my project');assert.equal(saved.memories.length,1);
  assert.equal(saved.totalSessions,0);assert.equal(saved.light,'auto');assert.ok(saved.firstSeen);
});
test('collections unlock from real milestones and never punish time away',()=>{
  const now=new Date(2026,8,5),world=restoreWorld('{}',now);
  assert.equal(collection(world,now).filter(x=>x.unlocked).length,1);
  world.totalSessions=10;world.waterDays=Array.from({length:7},(_,i)=>`2026-08-${i+1}`);
  assert.equal(collection(world,now).find(x=>x.name==='Focus headphones').unlocked,true);
  assert.equal(collection(world,new Date(2026,9,5)).filter(x=>x.unlocked).length,5);
});
