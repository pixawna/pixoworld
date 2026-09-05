import test from 'node:test';
import assert from 'node:assert/strict';
import {PixoVoice} from '../voice-client.js';
function globals(t,values){for(const [key,value] of Object.entries(values)){const previous=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else delete globalThis[key];});}}
test('voice releases a microphone granted after the user cancels',async t=>{
  let grant,stops=0;const stream={getTracks:()=>[{stop:()=>stops++}]};
  globals(t,{window:{RTCPeerConnection:class{}},navigator:{mediaDevices:{getUserMedia:()=>new Promise(r=>{grant=r;})}}});
  const voice=new PixoVoice(()=>{},()=>{},()=>{});
  const pending=voice.start({endpoint:'https://voice.example/session',accessCode:'test-access-code'});
  voice.stop();grant(stream);await pending;assert.equal(stops,1);assert.equal(voice.state,'idle');
});
test('connected voice supports muting and completely stops tracks and peer connection',async t=>{
  let stops=0,closed=0;const track={enabled:true,stop:()=>stops++};
  class Peer{createDataChannel(){return this.channel={close(){}};}addTrack(){}async createOffer(){return{sdp:'v=0'};}async setLocalDescription(){}async setRemoteDescription(){this.channel.onopen();}close(){closed++;}}
  globals(t,{window:{RTCPeerConnection:Peer},RTCPeerConnection:Peer,navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track],getAudioTracks:()=>[track]})}},document:{createElement:()=>({pause(){},play:async()=>{}})},fetch:async()=>new Response('v=0\r\nanswer')});
  const voice=new PixoVoice(()=>{},()=>{},()=>{});t.after(()=>voice.stop());
  await voice.start({endpoint:'https://voice.example/session',accessCode:'test-access-code'});
  assert.equal(voice.state,'connected');assert.equal(voice.mute(),true);assert.equal(track.enabled,false);
  voice.stop();assert.equal(stops,1);assert.equal(closed,1);assert.equal(voice.stream,null);assert.equal(voice.pc,null);
});
test('voice rejects insecure remote endpoints and provider keys before touching the microphone',async()=>{
  const voice=new PixoVoice(()=>{},()=>{},()=>{});
  await assert.rejects(voice.start({endpoint:'http://voice.example/session',accessCode:'test'}),/HTTPS/);
  await assert.rejects(voice.start({endpoint:'https://voice.example/session',accessCode:'sk-not-a-real-key'}),/not an OpenAI/);
});
