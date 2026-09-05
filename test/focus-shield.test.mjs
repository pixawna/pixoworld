import test from 'node:test';
import assert from 'node:assert/strict';
import {isBlocked,isPixo,rules} from '../extension/focus-shield/policy.js';
import {createShield} from '../extension/focus-shield/worker.js';
function fixture(){
  let now=1000000,session={},local={},network=[],alarms=new Map(),redirects=[];
  const event={addListener(){}};
  const api={runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onMessage:event,onStartup:event,onInstalled:event},
    storage:{local:{get:async()=>({...local}),set:async x=>Object.assign(local,x)},session:{get:async()=>({...session}),set:async x=>Object.assign(session,x)}},
    declarativeNetRequest:{getSessionRules:async()=>network,updateSessionRules:async({addRules})=>{network=addRules;}},
    alarms:{clear:async n=>alarms.delete(n),create:async(n,x)=>alarms.set(n,x),onAlarm:event},action:{setBadgeText:async()=>{}},
    tabs:{query:async()=>[{id:4,url:'https://www.youtube.com/watch?v=test'},{id:5,url:'https://example.com/'}],update:async(id,options)=>redirects.push({id,...options})}};
  return {shield:createShield(api,()=>now),advance:()=>{now+=100000;},get:()=>({network,alarms,redirects}),until:now+60000,
    sender:id=>({tab:{id,url:'https://heat-flip-3234.onpagelove.com/'},url:'https://heat-flip-3234.onpagelove.com/',frameId:0}),internal:{id:'test',url:'chrome-extension://test/popup.html'}};
}
test('focus rules cover exact social domains and subdomains, not lookalikes',()=>{
  for(const url of ['https://x.com/','https://mobile.twitter.com/','https://www.linkedin.com/','https://m.youtube.com/','https://youtu.be/a','https://instagram.com/'])assert.ok(isBlocked(url));
  assert.equal(isBlocked('https://youtube.com.example.org'),false);assert.equal(isBlocked('https://example.com/?url=x.com'),false);
  assert.equal(isPixo('https://heat-flip-3234.onpagelove.com.evil.test'),false);
  assert.ok(rules().every(r=>r.condition.resourceTypes.join()==='main_frame'));
});
test('shield redirects open social tabs, handles multiple focus tabs, and releases at expiry',async()=>{
  const f=fixture();await f.shield.ready;
  assert.equal((await f.shield.handle({type:'sync',running:true,until:f.until},f.sender(1))).active,true);
  assert.equal(f.get().network.length,6);assert.deepEqual(f.get().redirects.map(x=>x.id),[4]);
  await f.shield.handle({type:'sync',running:true,until:f.until},f.sender(2));
  assert.equal((await f.shield.handle({type:'sync',running:false},f.sender(1))).active,true);
  f.advance();assert.equal((await f.shield.handle({type:'status'},f.internal)).active,false);assert.equal(f.get().network.length,0);
});
test('emergency off wins over heartbeat; untrusted senders and excessive durations cannot block',async()=>{
  const f=fixture();await f.shield.ready;
  await assert.rejects(f.shield.handle({type:'sync',running:true,until:f.until},{tab:{id:1},url:'https://evil.test',frameId:0}));
  assert.equal((await f.shield.handle({type:'sync',running:true,until:999999999},f.sender(1))).active,false);
  await f.shield.handle({type:'toggle',enabled:false},f.internal);
  assert.equal((await f.shield.handle({type:'sync',running:true,until:f.until},f.sender(1))).active,false);
  assert.equal(f.get().network.length,0);
});
