(() => {
  if(window.top!==window)return;
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.source!=='pixo-focus-page')return;
    const {id,type,running,until}=event.data;
    if(!['status','sync'].includes(type)||typeof id!=='string'||id.length>80)return;
    chrome.runtime.sendMessage({type,running:running===true,until:Number(until)||0},reply=>{
      if(chrome.runtime.lastError)return;
      window.postMessage({source:'pixo-focus-extension',id,...reply},location.origin);
    });
  });
})();
