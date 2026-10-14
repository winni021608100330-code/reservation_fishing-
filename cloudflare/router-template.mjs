export default {async fetch(request,env){
 const url=new URL(request.url),json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(url.pathname==='/.netlify/functions/status'){
  if(request.method!=='GET')return json({error:'method_not_allowed'},405);
  const date=url.searchParams.get('date')||env.FISHING_WATCH_DATE||DEFAULT_WATCH.ymd;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)return json({error:'invalid_date'},400);
  url.searchParams.set('date',date);return getStatus(new Request(url,request));
 }
 if(url.pathname==='/.netlify/functions/watch'){
  if(request.method!=='GET')return json({error:'method_not_allowed'},405);
  if(!env.FISHING_STATE_BACKEND||!env.FISHING_FRONTEND_KEY)return json({error:'state_backend_unavailable'},503);
  const testMode=env.FISHING_ENVIRONMENT==='preview',headers={'X-Fishing-Frontend-Key':env.FISHING_FRONTEND_KEY,'Content-Type':'application/json'};
  const backend=env.FISHING_STATE_BACKEND+'/watch'+(url.searchParams.has('set')?'':'?test_mode='+testMode);
  try {const response=await fetch(backend,{method:url.searchParams.has('set')?'POST':'GET',headers,body:url.searchParams.has('set')?JSON.stringify({watch_date:url.searchParams.get('set'),test_mode:testMode}):undefined,signal:AbortSignal.timeout(15000)});return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});}catch{return json({error:'state_backend_unavailable'},503);}
 }
 if(url.pathname==='/.netlify/functions/check-seats')return json({error:'scheduler_migration_pending'},503);
 return env.ASSETS.fetch(request);
}};
