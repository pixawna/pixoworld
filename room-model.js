export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function daysTogether(first, now = new Date()) {
  const started = new Date(first);
  if (!Number.isFinite(started.getTime())) return 1;
  const day = d => Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
  return Math.max(1,Math.floor((day(now)-day(started))/86400000)+1);
}
export function dayPhase(hour) {
  return hour >= 21 || hour < 6 ? 'night' : hour >= 16 ? 'evening' : 'morning';
}
export function freshWorld(now = new Date()) {
  return { version:1, hatched:false, firstSeen:now.toISOString(), lastSeen:now.toISOString(), quest:'', memories:[], diary:[], totalSessions:0, waterDays:[], light:'auto', pixel:false };
}
export function restoreWorld(raw, now = new Date()) {
  const base=freshWorld(now);
  try {
    const data=JSON.parse(raw || '{}');
    if(!data || typeof data!=='object' || Array.isArray(data))return base;
    return {...base, ...data,
      firstSeen:Number.isFinite(Date.parse(data.firstSeen))?data.firstSeen:base.firstSeen,
      memories:Array.isArray(data.memories)?data.memories.filter(x=>x&&typeof x.text==='string').slice(-100):[],
      diary:Array.isArray(data.diary)?data.diary.filter(x=>x&&typeof x.date==='string').slice(-365):[],
      waterDays:Array.isArray(data.waterDays)?data.waterDays.filter(x=>typeof x==='string').slice(-365):[],
      totalSessions:Math.max(0,Number(data.totalSessions)||0),
      light:['auto','morning','evening','night'].includes(data.light)?data.light:'auto',
    };
  }catch{return base;}
}
export function collection(world, now = new Date()) {
  const day=daysTogether(world.firstSeen,now);
  return [
    {icon:'🪴',name:'Our first plant',hint:'A small beginning. Here from day one.',unlocked:true},
    {icon:'☕',name:'A favorite mug',hint:'Three days of keeping each other company.',unlocked:day>=3},
    {icon:'🧸',name:'A tiny friend',hint:'One week together. Someone for the bookshelf.',unlocked:day>=7},
    {icon:'🎧',name:'Focus headphones',hint:`${Math.min(world.totalSessions,10)} / 10 completed focus sessions.`,unlocked:world.totalSessions>=10},
    {icon:'💧',name:'Very serious water bottle',hint:`${Math.min(world.waterDays.length,7)} / 7 days meeting your own water goal.`,unlocked:world.waterDays.length>=7},
    {icon:'📚',name:'Stories worth keeping',hint:`${Math.min(world.diary.length,7)} / 7 daily diary entries.`,unlocked:world.diary.length>=7},
  ];
}
