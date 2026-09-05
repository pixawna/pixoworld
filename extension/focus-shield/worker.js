import {activeSessions,isBlocked,isPixo,rules,validUntil} from './policy.js';
export function createShield(api,now=Date.now) {
  let queue=Promise.resolve();
  const serial=fn=>{const result=queue.catch(()=>{}).then(fn);queue=result;return result;};
  async function reconcile(data) {
    const sessions=activeSessions(data.sessions,now());
    const enabled=data.enabled!==false,until=enabled?Math.max(0,...Object.values(sessions)):0;
    const existing=await api.declarativeNetRequest.getSessionRules();
    await api.declarativeNetRequest.updateSessionRules({removeRuleIds:existing.map(r=>r.id),addRules:until?rules():[]});
    await api.storage.session.set({sessions:enabled?sessions:{}});
    await api.alarms.clear('pixo-release');
    if(until)await api.alarms.create('pixo-release',{when:Math.min(...Object.values(sessions))});
    await api.action.setBadgeText({text:until?'ON':''});
    return {installed:true,enabled,active:until>0,until};
  }
  async function read(){return {...await api.storage.local.get('enabled'),...await api.storage.session.get('sessions')};}
  async function handle(message,sender){
    const internal=sender.id===api.runtime.id&&!sender.tab&&sender.url?.startsWith(api.runtime.getURL(''));
    const page=sender.tab&&isPixo(sender.url||sender.tab.url)&&sender.frameId===0;
    if(!internal&&!page)throw new Error('Untrusted sender');
    const data=await read();
    if(message.type==='toggle'&&internal){data.enabled=Boolean(message.enabled);if(!data.enabled)data.sessions={};await api.storage.local.set({enabled:data.enabled});}
    if(message.type==='sync'&&page){
      data.sessions=activeSessions(data.sessions,now());
      if(message.running===true&&validUntil(message.until,now()))data.sessions[sender.tab.id]=message.until;
      else delete data.sessions[sender.tab.id];
    }
    const before=await api.declarativeNetRequest.getSessionRules();
    const status=await reconcile(data);
    // A loaded social feed is already in memory; move it to the blocker as focus starts.
    if(status.active&&!before.length){
      const tabs=await api.tabs.query({});
      await Promise.all(tabs.filter(t=>isBlocked(t.url)).map(t=>api.tabs.update(t.id,{url:api.runtime.getURL('blocked.html')}).catch(()=>{})));
    }
    return status;
  }
  api.runtime.onMessage.addListener((message,sender,reply)=>{
    if(!['status','sync','toggle'].includes(message?.type))return false;
    serial(()=>handle(message,sender)).then(reply,()=>reply({installed:true,error:'Shield could not update. Check extension permissions.'}));return true;
  });
  api.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='pixo-release')serial(async()=>reconcile(await read())).catch(()=>{});});
  api.runtime.onStartup.addListener(()=>serial(async()=>reconcile(await read())).catch(()=>{}));
  api.runtime.onInstalled.addListener(()=>serial(async()=>reconcile(await read())).catch(()=>{}));
  // Service workers can restart without onStartup; restore the release alarm on each load.
  const ready=serial(async()=>reconcile(await read()));
  return {handle:(message,sender)=>serial(()=>handle(message,sender)),ready};
}
if(globalThis.chrome?.runtime)createShield(chrome);
