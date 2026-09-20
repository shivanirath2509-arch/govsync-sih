import {departments,citizens,sampleRecord,normalize,assess,type Department} from '@/lib/demo';
import {database,owner,application,consent,event,body,reply,guarded,ApiError} from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){return guarded(async()=>{
 const user=owner(request),url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'').split('/'),db=database();
 if(path[0]==='workspace'){const [apps,logs]=await Promise.all([db.prepare('SELECT * FROM applications WHERE owner = ? ORDER BY created_at DESC LIMIT 100').bind(user).all(),db.prepare('SELECT * FROM audit WHERE owner = ? ORDER BY created_at DESC LIMIT 200').bind(user).all()]);return reply({applications:apps.results,audit:logs.results,citizens});}
 if(path[0]==='applications'&&path[1]){const app=await application(path[1],user);const rows=await db.prepare('SELECT * FROM checks WHERE application_id = ?').bind(app.id).all();return reply({application:app,checks:rows.results});}
 if(path[0]==='departments'&&departments.includes(path[1] as Department)&&path[2]){
  const started=Date.now(),dept=path[1] as Department,app=await application(url.searchParams.get('applicationId')||'',user);
  if(app.citizen_id!==path[2])throw new ApiError(403,'Citizen does not match this application.');
  try{consent(app,dept);}catch(e){await event(user,app.id,'Consent check','blocked','Data access denied: consent missing, expired or revoked.',dept).run();throw e;}
  if(app.status==='submitted')throw new ApiError(409,'Submitted applications cannot be verified again.');
  if(url.searchParams.get('simulate')==='unavailable'){await event(user,app.id,'Department request','failed','Simulated department outage. Retry after disabling the failure scenario.',dept,Date.now()-started).run();return reply({error:`${dept} is temporarily unavailable (simulated). Retry this verification.`,retryable:true},503);}
  const raw=sampleRecord(dept,path[2]),normalized=normalize(dept,raw);
  await db.batch([db.prepare('INSERT INTO checks (id,application_id,department,raw,normalized,checked_at) VALUES (?,?,?,?,?,?) ON CONFLICT(application_id,department) DO UPDATE SET raw=excluded.raw, normalized=excluded.normalized, checked_at=excluded.checked_at').bind(crypto.randomUUID(),app.id,dept,JSON.stringify(raw),JSON.stringify(normalized),new Date().toISOString()),event(user,app.id,'Department request','success','Scholarship eligibility verification · sample records',dept,Date.now()-started)]);
  return reply({department:dept,citizenId:path[2],sample:true,raw,normalized});
 }throw new ApiError(404,'API endpoint not found.');
});}
export async function POST(request:Request){return guarded(async()=>{
 const user=owner(request),path=new URL(request.url).pathname.replace(/^\/api\/?/,'').split('/'),db=database(),data=await body(request);
 if(path[0]==='applications'&&!path[1]){
  const citizen=citizens.find(c=>c.id===data.citizenId);if(!citizen)throw new ApiError(400,'Choose one of the sample citizens.');
  if(!Array.isArray(data.scopes)||!departments.every(d=>data.scopes.includes(d))||data.accepted!==true)throw new ApiError(400,'Consent to all four required department checks is needed.');
  const id='SS-'+crypto.randomUUID(),now=new Date().toISOString(),expires=new Date(Date.now()+86400000).toISOString();
  await db.batch([db.prepare('INSERT INTO applications (id,owner,citizen_id,name,status,consent,expires_at,scopes,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,user,citizen.id,citizen.name,'draft',1,expires,JSON.stringify(departments),now),event(user,id,'Consent granted','success','Purpose: demo scholarship application. Identity, education, income and residence. Expires in 24 hours.')]);return reply({application:await application(id,user)},201);
 }
 if(path[0]==='applications'&&path[1]){
  const app=await application(path[1],user);
  if(path[2]==='revoke'){await db.batch([db.prepare('UPDATE applications SET consent = 0 WHERE id = ? AND owner = ?').bind(app.id,user),event(user,app.id,'Consent revoked','success','Further department access and submission blocked. Existing application history retained.')]);return reply({revoked:true});}
  consent(app);
  if(path[2]==='evaluate'){
   if(app.status==='submitted')throw new ApiError(409,'Application is already submitted.');
   const rows=await db.prepare('SELECT department,normalized FROM checks WHERE application_id = ?').bind(app.id).all<any>();
   if(!departments.every(d=>rows.results.some((r: any)=>r.department===d)))throw new ApiError(409,'Complete all four department checks first.');
   const result=assess(Object.fromEntries(rows.results.map(r=>[r.department,JSON.parse(r.normalized)])));
   await db.batch([db.prepare('UPDATE applications SET status = ?, result = ? WHERE id = ? AND owner = ?').bind(result.status,JSON.stringify(result),app.id,user),event(user,app.id,'Eligibility checked',result.status==='eligible'?'success':'review',result.rules.filter(r=>!r.passed).map(r=>r.label).join('; ')||'All demonstration rules passed.')]);return reply({application:await application(app.id,user),result});
  }
  if(path[2]==='submit'){
   if(app.status==='submitted')return reply({application:app});if(app.status!=='eligible')throw new ApiError(409,'Only an eligible, verified application can be submitted.');
   if(typeof data.email!=='string'||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||data.email.length>200)throw new ApiError(400,'Enter a valid demo contact email.');
   if(typeof data.statement!=='string'||data.statement.trim().length<20||data.statement.length>1000)throw new ApiError(400,'Write a statement between 20 and 1,000 characters.');if(data.confirmed!==true)throw new ApiError(400,'Confirm that you reviewed the application.');
   const changed=await db.prepare("UPDATE applications SET status = 'submitted', email = ?, statement = ?, submitted_at = ? WHERE id = ? AND owner = ? AND status = 'eligible' AND consent = 1 AND expires_at > ?").bind(data.email,data.statement.trim(),new Date().toISOString(),app.id,user,new Date().toISOString()).run();
   if(changed.meta.changes)await event(user,app.id,'Application submitted','success','Received for demo review. This is not a scholarship award. No email or SMS was sent.').run();return reply({application:await application(app.id,user)});
  }
 }throw new ApiError(404,'API endpoint not found.');
});}
