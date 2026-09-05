export function createFocusShield(getTimer,onChange) {
  let enabled=false,lastSignature='',status={installed:false,active:false},pending=new Map();
  const ask=(type,payload={})=>new Promise(resolve=>{
    const id=crypto.randomUUID();const timeout=setTimeout(()=>{pending.delete(id);resolve({installed:false,active:false});},1500);
    pending.set(id,{resolve,timeout});window.postMessage({source:'pixo-focus-page',id,type,...payload},location.origin);
  });
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.source!=='pixo-focus-extension')return;
    const item=pending.get(event.data.id);if(!item)return;clearTimeout(item.timeout);pending.delete(event.data.id);item.resolve(event.data);
  });
  async function sync(force=false){
    const t=getTimer(),running=enabled&&t.running,until=running?t.endAt:0;
    const signature=JSON.stringify({running,until});if(!force&&signature===lastSignature)return status;lastSignature=signature;
    status=await ask('sync',{running,until});onChange(status);return status;
  }
  return {setEnabled:value=>{enabled=Boolean(value);return sync(true);},sync,check:async()=>{status=await ask('status');onChange(status);return status;},getStatus:()=>status};
}
