import { dateKey, daysTogether, dayPhase, restoreWorld, collection } from './room-model.js';
import {PixoVoice} from './voice-client.js?v=game2';
import {createFocusShield} from './focus-shield.js?v=game2';
import {createSmallTalkPanel} from './small-talk-panel.js?v=smalltalk1';

const $ = selector => document.querySelector(selector);
if (!window.PixoApp) await new Promise(resolve => document.addEventListener('pixo:ready',resolve,{once:true}));
const app = window.PixoApp;
const world = restoreWorld($('#world-state')?.textContent);
const previousSeen=world.lastSeen;
let scene=null, lastInteraction=Date.now(), lastBehavior=0, busyUntil=0, focusStart=0, breakAt=0;
let saving=Promise.resolve(), panelName='', notificationRequest=false;
let subtitleTimer,manualSleep=false,currentView='home',activeBehavior='idle';
const escape = value => {const span=document.createElement('span');span.textContent=String(value??'');return span.innerHTML.replaceAll('"','&quot;').replaceAll("'",'&#39;');};
const save = () => {
  world.lastSeen=new Date().toISOString();
  // Serialize writes to avoid a slow earlier response replacing a newer edit.
  const snapshot=JSON.parse(JSON.stringify(world));
  saving=saving.catch(()=>false).then(()=>app.saveWorld(snapshot));
  return saving;
};
const speak = (message, behavior='idle', duration=10000) => {
  activeBehavior=behavior;
  $('#world-message').textContent=message;busyUntil=Date.now()+duration;
  const subtitle=$('.world-speech');subtitle.classList.add('is-speaking');clearTimeout(subtitleTimer);subtitleTimer=setTimeout(()=>subtitle.classList.remove('is-speaking'),Math.min(duration,8000));
  scene?.setAction(behavior);
  $('#pixo-activity').textContent=({idle:'keeping you company',working:'working with you',sleeping:'getting some rest',water:'looking out for you',watering:'checking on the plant',reading:'one more page'})[behavior]||'keeping you company';
};
function setView(view){currentView=view;scene?.setView(view);document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));}
function doActivity(action,log=false){
  if(dialog.open)dialog.close();
  if(action==='working'){manualSleep=false;if(!app.timer().running)app.toggleTimer();setView('desk');return;}
  if(action==='sleeping'){manualSleep=true;if(app.timer().running)app.toggleTimer();scene?.setPhase('night');setView('bed');speak('The day can wait. Sleep with me.','sleeping',3600000);}
  else {
    manualSleep=false;
    if(action==='water'){if(log)app.logWater();setView('table');speak('Drink water with me. Just a few sips.','water',30000);}
    else if(action==='eating'){setView('table');speak('Eat with me. Let’s take a proper food break.','eating',60000);}
    else if(action==='stretch'){speak('Shoulders up… and let them go.','stretch',20000);}
    else {busyUntil=0;scene?.setAction('idle');setView('home');scene?.setPhase(world.light==='auto'?dayPhase(new Date().getHours()):world.light);}
  }
  document.querySelectorAll('[data-action]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.action===action)));
}
let voiceMessage='Microphone off',voiceTranscript='';
const voice=new PixoVoice((state,message)=>{
  voiceMessage=message;$('#voice-live').hidden=!['connecting','connected'].includes(state);$('#voice-live-status').textContent=message;
  if($('#voice-status'))$('#voice-status').textContent=message;
  $('#voice-mute').setAttribute('aria-pressed',String(voice?.muted||false));
},text=>{voiceTranscript=text;if($('#voice-transcript'))$('#voice-transcript').textContent=text;speak(text,app.timer().running?'working':'idle',8000);},value=>scene?.setSpeaking(value));
const smallTalk=createSmallTalkPanel({
  onReply:reply=>{
    const behavior=app.timer().running?'working':reply.behavior;
    if(!app.timer().running&&['water','eating'].includes(behavior))setView('table');
    speak(reply.text,behavior,15000);
  },
  onSpeaking:value=>scene?.setSpeaking(value),
  onAdvanced:()=>{parkPanel();renderAdvancedTalk();}
});
const shield=createFocusShield(()=>app.timer(),status=>{
  $('#game-shield').classList.toggle('is-protected',Boolean(status.active));
  $('#game-shield').title=status.active?'Focus shield active':status.installed?'Focus shield connected':'Focus shield — extension required';
  if($('#shield-state'))$('#shield-state').textContent=status.error||(!status.installed?'Extension not detected. No websites are being blocked.':!status.enabled?'Extension turned off. Enable it from the browser toolbar.':status.active?'Shield active: social websites are blocked.':'Extension connected. Ready when you focus.');
},Boolean(world.shieldEnabled));
const titles={talk:'A little hello.',focus:'Let’s work together.',quest:'One small quest.',care:'Good things for your human.',diary:'Our days, in little pages.',backpack:'Things we picked up along the way.',memories:'Things I know about you.',growth:'Look how far we’ve come.',rest:'You can take a breath.',checkin:'How’s your brain today?'};
const dialog=$('#world-dialog'),content=$('#world-panel-content');
let parked=null,placeholder=null;
function parkPanel(){smallTalk.stop();if(parked&&placeholder){placeholder.replaceWith(parked);parked=null;placeholder=null;}content.replaceChildren();}
function borrowPanel(selector){const element=$(selector);placeholder=document.createComment('room panel position');element.before(placeholder);content.append(element);parked=element;}
function openPanel(name){
  if(name==='eat'){doActivity('eating');return;}
  if(name==='sleep'){doActivity('sleeping');return;}
  if(name==='shield'){parkPanel();panelName='shield';$('#world-panel-title').textContent='Focus shield';renderShield();if(!dialog.open)dialog.showModal();return;}
  if(name==='light'){
    world.light=world.light==='night'?'morning':'night';$('#room-light').value=world.light;updateTime();save();return;
  }
  if(!titles[name])return;
  parkPanel();panelName=name;$('#world-panel-title').textContent=titles[name];
  if(name==='focus'){
    content.innerHTML=`<p class="world-note">Pick one thing. Pixo will settle at his laptop while you work.</p><form class="world-form" id="focus-quest-form"><label for="focus-quest">What are we working on?</label><input id="focus-quest" maxlength="120" placeholder="Something small is enough" value="${escape(world.quest)}"/><button>Keep this as today’s quest</button></form>`;
    borrowPanel('#focus');
    $('#focus-quest-form').onsubmit=async e=>{e.preventDefault();world.quest=$('#focus-quest').value.trim();if(await save()){speak(world.quest?`Okay. “${world.quest}.” I’ll work too.`:'We can start small.');dialog.close();}};
  }else if(name==='quest'){
    content.innerHTML=`<p class="world-note">${world.quest?`Today’s north star: <strong>${escape(world.quest)}</strong>`:'No heroic to-do list required. What would make today feel good?'} </p>`;borrowPanel('#today');
  }else if(name==='care'){
    borrowPanel('#care-reminders');
    $('.reminder-panel__intro p').textContent='Water and meal times follow your device’s local time. Keep this page open for reminders. Take a stretch break during long focus sessions.';
    $('#test-reminder').textContent='Preview a reminder';
    const controls=document.createElement('div');controls.className='world-chips';controls.innerHTML='<button id="world-notifications">Enable browser notifications</button><button id="world-stretch">Take a stretch break</button>';content.append(controls);
    $('#world-notifications').onclick=async()=>{
      if(!('Notification' in window)){speak('This browser doesn’t support notifications. I can still remind you here.');return;}
      if(notificationRequest)return;notificationRequest=true;
      try{const result=await Notification.requestPermission();$('#world-notifications').textContent=result==='granted'?'Notifications enabled':result==='denied'?'Blocked in browser settings':'Enable browser notifications';}finally{notificationRequest=false;}
    };
    $('#world-stretch').onclick=()=>doActivity('stretch');
    const meal=document.createElement('button');meal.textContent='Eat with me';meal.onclick=()=>doActivity('eating');controls.append(meal);
  }else if(name==='checkin'){
    borrowPanel('.checkin-panel');
  }else if(name==='memories') renderMemories();
  else if(name==='diary') renderDiary();
  else if(name==='backpack'||name==='growth')renderCollection();
  else if(name==='rest'){
    content.innerHTML='<p class="world-note">You don’t have to earn a pause. Watch the fish for a minute, unclench your jaw, and let your shoulders drop.</p><button class="world-action" id="rest-together">Let’s sit quietly</button><div class="world-chips"><button id="rest-diary">Open our diary</button></div>';
    $('#rest-together').onclick=()=>{dialog.close();speak('Nothing to do for a moment. I’ll be right here.','reading',60000);};$('#rest-diary').onclick=()=>openPanel('diary');
  }else renderTalk();
  if(!dialog.open)dialog.showModal();
}
function renderTalk(){
  voice.stop();
  smallTalk.mount(content);
}
function renderAdvancedTalk(){
  content.innerHTML=`<p class="voice-privacy">Pixo’s voice is AI-generated. Starting a call shares microphone audio with OpenAI. Nothing is recorded or saved by this app. You can mute or end the call at any time.</p><form class="world-form" id="voice-form"><label for="voice-endpoint">Your secure voice server</label><input id="voice-endpoint" type="url" placeholder="https://your-voice-server/session" value="${escape(world.voiceEndpoint||window.PIXO_TEMPLATE?.voice?.endpoint||'')}" required/><label for="voice-code">Voice access code (not your API key)</label><input id="voice-code" type="password" autocomplete="off" required/><label><input type="checkbox" id="voice-context"/> Share my name, current quest, and last six saved memories for this call</label><button id="voice-start">Start conversation</button></form><p class="voice-status" id="voice-status" role="status">${escape(voiceMessage)}</p><div class="world-chips"><button id="voice-stop">End call</button><button id="voice-resume">Resume audio</button></div><div class="voice-transcript" id="voice-transcript">${escape(voiceTranscript)}</div><p class="world-note">Not configured yet? The project includes a protected voice server and setup guide. Never put an OpenAI key in this form or in PageLove files.</p><div class="world-chips"><button id="talk-checkin">Check in</button><button id="talk-memory">Memories</button><button id="talk-focus">Focus</button><button id="talk-rest">Rest</button></div>`;
  $('#talk-checkin').onclick=()=>openPanel('checkin');$('#talk-memory').onclick=()=>openPanel('memories');$('#talk-focus').onclick=()=>openPanel('focus');$('#talk-rest').onclick=()=>openPanel('rest');
  const back=document.createElement('button');back.textContent='Back to free small talk';back.className='world-action';back.onclick=()=>openPanel('talk');content.prepend(back);
  $('#voice-stop').onclick=()=>voice.stop();$('#voice-resume').onclick=()=>voice.resume()?.catch(()=>{});
  $('#voice-form').onsubmit=async e=>{
    e.preventDefault();const endpoint=$('#voice-endpoint').value.trim(),accessCode=$('#voice-code').value;$('#voice-code').value='';
    const context=$('#voice-context').checked?JSON.stringify({name:app.getState().profile.name,quest:world.quest,memories:world.memories.slice(-6).map(m=>m.text)}):'';
    try{const url=new URL(endpoint);if(url.username||url.password||url.search||url.hash)throw new Error('Use a clean endpoint URL, without credentials or query parameters.');
      await voice.start({endpoint,accessCode,context});
      if(voice.state==='connected'||voice.state==='connecting'){world.voiceEndpoint=endpoint;save();}
    }catch(error){$('#voice-status').textContent=error.message;}
  };
}
function renderShield(){
  content.innerHTML=`<div class="shield-state"><strong id="shield-state">Checking your extension…</strong></div><form class="world-form"><label><input id="shield-enabled" type="checkbox" ${world.shieldEnabled?'checked':''}/> Block social websites during focus</label></form><p class="world-note">Twitter / X, LinkedIn, YouTube, and Instagram—including their subdomains. Blocking ends when you pause, reset, or finish. It applies only to the browser with the extension installed, not native apps or other browsers.</p><ol class="world-note"><li>Download and unzip the focus extension.</li><li>Open <code>brave://extensions</code> or <code>chrome://extensions</code>, turn on Developer mode, and choose Load unpacked.</li><li>Select the extracted <code>focus-shield</code> folder, then reload Pixo.</li></ol><a class="world-action" href="./downloads/pixo-focus-shield.zip" download>Download focus extension</a><div class="world-chips"><button id="shield-check">Check connection</button></div>`;
  $('#shield-enabled').onchange=async e=>{world.shieldEnabled=e.target.checked;await save();shield.setEnabled(world.shieldEnabled);};
  $('#shield-check').onclick=()=>shield.sync(true);shield.check();
}
function renderMemories(){
  content.innerHTML=`<p class="world-note">Tell me what matters. You decide what I keep, and can forget a memory at any time.</p><form class="world-form" id="memory-form"><label for="memory-kind">A little about…</label><select id="memory-kind"><option>A goal</option><option>A project</option><option>A person</option><option>Something I like</option><option>A little win</option><option>A promise to myself</option></select><label for="memory-text">Something worth remembering</label><textarea id="memory-text" maxlength="500" required placeholder="I’m building something I care about…"></textarea><button>Remember this</button></form><div id="world-memory-list"></div><div class="world-chips"><button id="old-checkins">Earlier check-ins</button></div>`;
  const list=$('#world-memory-list');
  for(const memory of [...world.memories].reverse()){
    const entry=document.createElement('article');entry.className='world-entry';entry.innerHTML=`<small>${escape(memory.kind)} · ${escape(memory.date)}</small><p>${escape(memory.text)}</p><button>Forget this memory</button>`;
    entry.querySelector('button').onclick=async()=>{world.memories=world.memories.filter(x=>x.id!==memory.id);if(await save())renderMemories();};list.append(entry);
  }
  $('#memory-form').onsubmit=async e=>{e.preventDefault();const text=$('#memory-text').value.trim();if(!text)return;const button=e.target.querySelector('button');button.disabled=true;
    world.memories.push({id:crypto.randomUUID(),kind:$('#memory-kind').value,text,date:dateKey()});world.memories=world.memories.slice(-100);
    if(await save()){speak('I’ll keep that little piece of you safe here.');renderMemories();}else{button.disabled=false;}
  };
  $('#old-checkins').onclick=()=>{parkPanel();borrowPanel('#memories');$('#memory-log').hidden=false;$('#memory-toggle').textContent='Hide your memories';$('#memory-toggle').setAttribute('aria-expanded','true');};
}
function renderDiary(){
  const key=dateKey(),existing=world.diary.find(x=>x.date===key),state=app.getState();
  content.innerHTML=`<p class="world-note">A little record of our days. Write a line now or come back before bed.</p><form class="world-form" id="diary-form"><label for="diary-line">Anything worth remembering today?</label><textarea id="diary-line" maxlength="1000" placeholder="Today I finally…" required>${escape(existing?.note||'')}</textarea><button>${existing?'Update today’s page':'Keep today’s page'}</button></form><div id="diary-pages"></div>`;
  const list=$('#diary-pages');
  if(!world.diary.length)list.innerHTML='<p class="world-note" style="margin-top:22px">Our first page is waiting. Small things count.</p>';
  for(const entry of [...world.diary].reverse()){
    const node=document.createElement('article');node.className='world-entry';
    node.innerHTML=`<time>${escape(entry.date)}</time><p>We spent ${Number(entry.minutes)||0} minutes focusing together.</p><p>${escape(entry.note)}</p><p>${Number(entry.water)||0} glasses of water logged. One human, doing their best.</p><small>— ${escape(window.PIXO_TEMPLATE?.companion?.name||'Pixo')}</small>`;list.append(node);
  }
  $('#diary-form').onsubmit=async e=>{
    e.preventDefault();const note=$('#diary-line').value.trim();if(!note)return;e.target.querySelector('button').disabled=true;
    const current=app.getState();const entry={date:dateKey(),note,minutes:current.focus.dailyDate===dateKey()?Number(current.focus.minutes):0,water:current.care.waterDate===dateKey()?Number(current.care.waterCount):0};
    world.diary=world.diary.filter(x=>x.date!==entry.date);world.diary.push(entry);world.diary=world.diary.slice(-365);
    if(await save()){renderDiary();speak('That one belongs in our story.','reading');}else e.target.querySelector('button').disabled=false;
  };
}
function renderCollection(){
  content.innerHTML=`<p class="world-note">Day ${daysTogether(world.firstSeen)} together. Little things arrive with time and care. There’s no rush, and nothing is lost when you take a break.</p><div class="collection">${collection(world).map(item=>`<article class="collectible ${item.unlocked?'':'locked'}"><span class="item-icon" aria-hidden="true">${item.icon}</span><strong>${item.name}</strong><small>${item.unlocked?'Yours to keep. ':''}${item.hint}</small></article>`).join('')}</div>`;
}
document.querySelectorAll('[data-room-panel]').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.roomPanel)));
$('#world-panel-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{parkPanel();panelName='';});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('#world-settings').onclick=()=>$('#profile-dialog').showModal();
$('#world-sound').onclick=()=>{$('#sound-toggle').click();$('#world-sound').setAttribute('aria-pressed',$('#sound-toggle').getAttribute('aria-pressed'));};
$('#world-pause').onclick=()=>app.toggleTimer();
$('#room-light').value=world.light;$('#room-light').onchange=()=>{world.light=$('#room-light').value;updateTime();save();};
$('#room-detail').setAttribute('aria-pressed',String(world.pixel));$('#room-detail').onclick=()=>{world.pixel=!world.pixel;scene?.setPixel(world.pixel);$('#room-detail').setAttribute('aria-pressed',String(world.pixel));save();};
$('#room-reset').onclick=()=>setView('home');
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>doActivity(b.dataset.action,true));
document.querySelectorAll('.world-dock button').forEach(b=>{b.setAttribute('aria-label',b.textContent.trim());b.title=b.textContent.trim();});
$('#game-voice').onclick=()=>openPanel('talk');$('#game-shield').onclick=()=>openPanel('shield');
$('#game-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{speak('Fullscreen is unavailable in this browser.');}};
$('#voice-end').onclick=()=>voice.stop();$('#voice-mute').onclick=()=>{const muted=voice.mute();$('#voice-mute').setAttribute('aria-label',muted?'Unmute microphone':'Mute microphone');};
window.addEventListener('pagehide',()=>{voice.stop();smallTalk.stop();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)smallTalk.stop();});
function updateTime(){
  const now=new Date(),realPhase=dayPhase(now.getHours()),light=world.light==='auto'?realPhase:world.light;
  $('#world-clock').textContent=new Intl.DateTimeFormat('en',{hour:'2-digit',minute:'2-digit'}).format(now);
  $('#world-day').textContent=`Day ${daysTogether(world.firstSeen,now)}`;
  $('#world-phase').textContent=({morning:'A little daylight',evening:'Golden hour',night:'The lamp is on'})[light];
  scene?.setPhase(manualSleep?'night':light);scene?.setGrowth(daysTogether(world.firstSeen,now));
  if(Date.now()<busyUntil)return;
  const timer=app.timer();
  if(timer.running){scene?.setAction('working');$('#pixo-activity').textContent='working with you';return;}
  if(manualSleep||realPhase==='night'){scene?.setAction('sleeping');$('#pixo-activity').textContent='getting sleepy';return;}
  if(Date.now()-lastBehavior>26000){
    lastBehavior=Date.now();const quiet=Date.now()-lastInteraction>60000;
    const choices=quiet?['reading','watering','idle']:['idle','reading'];const behavior=choices[Math.floor(Math.random()*choices.length)];
    scene?.setAction(behavior);$('#pixo-activity').textContent=({reading:'one more page',watering:'checking on the plant',idle:'keeping you company'})[behavior];
  }
}
document.addEventListener('pointerdown',()=>{lastInteraction=Date.now();},{passive:true});
document.addEventListener('keydown',()=>{lastInteraction=Date.now();},{passive:true});
document.addEventListener('pixo:speak',e=>{speak(e.detail.message,Date.now()<busyUntil?activeBehavior:'idle');if(e.detail.celebrate)scene?.celebrate();});
document.addEventListener('pixo:care',e=>doActivity(e.detail.kind==='meal'?'eating':'water'));
document.addEventListener('pixo:completed',()=>{world.totalSessions+=1;save();scene?.celebrate();});
function showTimer(){
  const timer=app.timer();$('#world-focus').hidden=!timer.running&&timer.remaining===timer.duration;
  $('#pixo-world').classList.toggle('is-focusing',timer.running);
  $('#world-timer').textContent=`${String(Math.floor(timer.remaining/60)).padStart(2,'0')}:${String(timer.remaining%60).padStart(2,'0')}`;
  $('#world-pause').textContent=timer.running?'Pause':'Continue';
  $('#world-focus-label').textContent=world.quest?world.quest.slice(0,30):'Working together';
  if(timer.running){
    if(!focusStart){manualSleep=false;focusStart=Date.now();breakAt=focusStart+50*60000;setView('desk');speak('I’ll work with you.','working',10000);}
    if(Date.now()>breakAt){breakAt=Date.now()+50*60000;speak('We’ve been here for a while. Shall we roll our shoulders and stand up?','water',30000);}
    if(Date.now()>busyUntil)scene?.setAction('working');
  }else{if(focusStart){busyUntil=0;scene?.setAction('idle');}focusStart=0;}
  shield.sync();
}
document.addEventListener('pixo:timer',showTimer);
$('#hatch-skip').onclick=()=>{sessionStorage.setItem('pixo-exploring','yes');$('#hatch-dialog').close();speak('Take your time. I saved you a little corner.');};
$('#hatch-form').onsubmit=async e=>{
  e.preventDefault();const name=$('#hatch-name').value.trim();if(!name)return;e.target.querySelector('button').disabled=true;
  if(!await app.setName(name)){e.target.querySelector('button').disabled=false;return;}
  world.hatched=true;if(await save()){$('#hatch-dialog').close();speak(`Hi, ${name}. I’m Pixo. I think we’re going to like it here.`, 'idle',20000);scene?.celebrate();}e.target.querySelector('button').disabled=false;
};
const syncObserver=new MutationObserver(()=>{$('#world-sync').textContent=$('#sync-status').textContent.trim();});syncObserver.observe($('#sync-status'),{subtree:true,childList:true,characterData:true});
$('#world-sync').textContent=$('#sync-status').textContent.trim();
const state=app.getState();
// Existing companions do not have to hatch again to keep their saved history.
if(!world.hatched&&(state.profile.name!=='friend'||state.checkin.note||Number(state.focus.minutes)>0||Number(state.growth.xp)>35))world.hatched=true;
const daysAway=Math.floor((Date.now()-Date.parse(previousSeen))/86400000);
// No greeting overlay on entry: the home itself is the landing screen.
const onSceneFailure=()=>{
  $('#room-loading')?.remove();
  $('#room-canvas').innerHTML='<div class="room-fallback"><span aria-hidden="true">⌂</span><p>The 3D room needs WebGL. Enable hardware acceleration or try another browser. Your focus, diary, care, and memories are still available below.</p></div>';
};
try{
  const {createRoom}=await import('./room-scene.js?v=game2');scene=createRoom($('#room-canvas'),openPanel);$('#room-loading')?.remove();scene.setPixel(world.pixel);scene.setView(currentView);updateTime();
}catch(error){console.error('Pixo room renderer could not start.',error);onSceneFailure();}
$('#room-canvas').addEventListener('room:lost',onSceneFailure,{once:true});
updateTime();showTimer();
// The room opens directly. Profile setup remains available from the settings icon.
shield.setEnabled(Boolean(world.shieldEnabled));
setInterval(()=>shield.sync(true),15000);
// Keep a saved last visit without relying on an unreliable page-unload request.
if(world.hatched)save();
setInterval(()=>{
  if(document.hidden)return;updateTime();
  const s=app.getState();
  if(s.care.waterDate===dateKey()&&Number(s.care.waterCount)>=Number(s.profile.waterGoal)&&!world.waterDays.includes(dateKey())){world.waterDays.push(dateKey());save();}
},5000);
setInterval(()=>{if(!document.hidden&&world.hatched)save();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateTime();showTimer();}});
window.PixoRoom={openPanel,world,getScene:()=>scene};
