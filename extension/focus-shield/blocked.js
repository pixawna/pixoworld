const status=document.querySelector('#status');
async function update(){const state=await chrome.runtime.sendMessage({type:'status'});status.textContent=state.active?`Focus time remaining: ${Math.ceil((state.until-Date.now())/60000)} min.`:'Focus ended. You can navigate to your website now.';}
document.querySelector('#release').onclick=async()=>{await chrome.runtime.sendMessage({type:'toggle',enabled:false});await update();};
update();setInterval(update,1000);
