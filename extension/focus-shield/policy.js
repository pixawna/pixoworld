export const domains=['twitter.com','x.com','linkedin.com','youtube.com','youtu.be','instagram.com'];
export const origins=['https://heat-flip-3234.onpagelove.com','http://localhost:4173','http://127.0.0.1:4173'];
export const isPixo=url=>{try{return origins.includes(new URL(url).origin);}catch{return false;}};
export const isBlocked=url=>{try{const host=new URL(url).hostname;return domains.some(d=>host===d||host.endsWith('.'+d));}catch{return false;}};
export const validUntil=(until,now)=>Number.isFinite(until)&&until>now&&until<=now+4*60*60*1000;
export const activeSessions=(sessions,now)=>Object.fromEntries(Object.entries(sessions||{}).filter(([,until])=>validUntil(until,now)));
export const rules=()=>domains.map((domain,i)=>({id:i+1,priority:1,action:{type:'redirect',redirect:{extensionPath:'/blocked.html'}},condition:{requestDomains:[domain],resourceTypes:['main_frame']}}));
