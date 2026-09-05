let enabled=false;
async function update(){const s=await chrome.runtime.sendMessage({type:'status'});enabled=s.enabled;document.querySelector('#status').textContent=s.active?'Protecting your focus session.':enabled?'Ready for your next focus session.':'Blocking is turned off.';document.querySelector('#toggle').textContent=enabled?'Turn off blocking':'Turn on blocking';}
document.querySelector('#toggle').onclick=async()=>{await chrome.runtime.sendMessage({type:'toggle',enabled:!enabled});update();};update();
