import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoiceServer} from '../server/voice-server.mjs';
const origin='http://localhost:4173',code='test-access-code-123456';
async function start(t,env,fetchImpl){const server=createVoiceServer({env,fetchImpl});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return `http://127.0.0.1:${server.address().port}/session`;}
const request=(url,{originValue=origin,token=code,body={sdp:'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111'},...other}={})=>fetch(url,{method:'POST',headers:{Origin:originValue,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),...other});
test('voice refuses unknown origins, missing configuration, and wrong access codes',async t=>{
  let calls=0;const upstream=async()=>{calls++;throw Error('must not call');};
  const unconfigured=await start(t,{},upstream);
  assert.equal((await request(unconfigured)).status,503);
  const url=await start(t,{OPENAI_API_KEY:'server-test-only',PIXO_VOICE_ACCESS_CODE:code},upstream);
  assert.equal((await request(url,{originValue:'https://evil.test'})).status,403);
  assert.equal((await request(url,{token:'incorrect'})).status,401);
  assert.equal((await request(url,{body:{sdp:'bad'}})).status,400);
  assert.equal(calls,0);
});
test('voice sends keys only upstream, constrains context, and caps call creation',async t=>{
  let last;
  const url=await start(t,{OPENAI_API_KEY:'server-test-only',PIXO_VOICE_ACCESS_CODE:code},async(endpoint,options)=>{
    last={endpoint,options};return new Response('v=0\r\nanswer',{status:201,headers:{'Content-Type':'application/sdp',Location:'/v1/realtime/calls/test-call'}});
  });
  const result=await request(url,{body:{sdp:'v=0\r\no=test',context:'a'.repeat(5000)}});
  assert.equal(result.status,200);assert.equal(await result.text(),'v=0\r\nanswer');
  assert.equal(result.headers.get('access-control-allow-origin'),origin);assert.equal(result.headers.get('cache-control'),'no-store');
  assert.equal(last.options.headers.Authorization,'Bearer server-test-only');
  const config=JSON.parse(last.options.body.get('session'));assert.ok(config.instructions.length<4000);assert.equal(config.audio.output.voice,'marin');
  for(let i=0;i<5;i++)assert.equal((await request(url)).status,200);
  assert.equal((await request(url)).status,429);
});
