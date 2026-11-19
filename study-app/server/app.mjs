import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Store } from './store.mjs';
import { Tutor } from './ai.mjs';
import { appRoot, documents, subjects, skills, skillById, questionFor } from './content.mjs';
import { localGrade, progressFrom, rankSkills } from './engine.mjs';
import { findRepoRoot, getGitInfo, commitAndPushProgress, importProgressIfPresent, pullProgress, exportProgress } from './git-sync.mjs';
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID();
const defaults={id:'main',budget:30,model:'gpt-5.4-mini',dailyAiLimit:60,enabledSubjects:['maths','biology','physics','english','software','extension'],year12Enabled:false,englishTexts:'',tafeCourse:'',notes:''};
const bodySettings=z.object({budget:z.number().int().min(5).max(180),model:z.string().regex(/^[a-zA-Z0-9._-]{1,100}$/),dailyAiLimit:z.number().int().min(1).max(500),enabledSubjects:z.array(z.enum(['maths','biology','physics','english','software','extension'])).min(1),year12Enabled:z.boolean(),englishTexts:z.string().max(4000),tafeCourse:z.string().max(1000),notes:z.string().max(6000),apiKey:z.string().max(500).optional()});
const HttpError=(message,status=400)=>Object.assign(new Error(message),{status});
export function createApp({dataDir=path.join(appRoot,'data'),repoDir}={}){
 const isTestDir=dataDir.startsWith(os.tmpdir());
 const resolvedRepoDir=repoDir!==undefined?repoDir:(isTestDir?null:findRepoRoot());
 const app=express();const store=new Store(dataDir);const tutor=new Tutor(store,path.join(dataDir,'secrets.json'));const inFlight=new Map();const nextJobs=new Map();
 if(!store.get('settings','main'))store.put('settings','main',defaults);
 if(resolvedRepoDir)try{importProgressIfPresent(store,resolvedRepoDir);}catch{}
 app.disable('x-powered-by');
 app.use((req,res,next)=>{
  const host=(req.headers.host||'').split(':')[0];
  if(!['127.0.0.1','localhost','[::1]'].includes(host))return res.status(403).json({error:'This app accepts local connections only.'});
  if(req.headers.origin){try{const u=new URL(req.headers.origin);if(!['127.0.0.1','localhost'].includes(u.hostname)||u.host!==req.headers.host)return res.status(403).json({error:'Cross-origin requests are not allowed.'});}catch{return res.status(403).json({error:'Invalid origin.'});}}
  res.setHeader('Cache-Control','no-store');next();
 });
 app.use(express.json({limit:'25mb'}));
 const route=(method,url,fn)=>app[method](url,async(req,res,next)=>{try{res.json(await fn(req,res));}catch(e){next(e);}});
 const settings=()=>store.get('settings','main');
 const states=()=>{const bySkill=Map.groupBy(store.all('attempt'),a=>a.skillId);return Object.fromEntries(skills.map(s=>[s.id,progressFrom(bySkill.get(s.id)||[])]));};
 const getSession=id=>{const s=store.get('session',id);if(!s)throw HttpError('Session not found.',404);return s;};
 const publicQuestion=q=>{if(!q)return null;const {answer,numeric,aliases,lesson,example,hint,criteria,...safe}=q;return safe;};
 const safeSkill=s=>{if(!s)return null;const {variants,lesson,example,hint,...safe}=s;return safe;};
 const publicSession=s=>{if(!s)return null;const q=store.get('question',s.questionId);const attempts=store.all('attempt').filter(a=>a.sessionId===s.id);const latest=attempts.filter(a=>a.questionId===s.questionId).at(-1);const lastBySkill=new Map(attempts.filter(a=>a.status==='graded'&&!a.disputed).map(a=>[a.skillId,a]));return {...s,question:publicQuestion(q),skill:q?safeSkill(skillById.get(q.skillId)):null,latest:latest||null,summary:{attempted:attempts.filter(a=>a.status==='graded').length,independent:attempts.filter(a=>a.status==='graded'&&a.grade?.verdict==='correct'&&!a.assisted&&!a.disputed).length,gaps:[...lastBySkill.values()].filter(a=>['incorrect','partial'].includes(a.grade?.verdict)).map(a=>skillById.get(a.skillId)?.title)},draft:q?store.get('draft',s.id+':'+q.id):null};};
 const sourceFor=skill=>{
  const doc=documents.find(d=>d.id===skill.subject);const terms=(skill.description||skill.title).toLowerCase().split(/\W+/).filter(w=>w.length>4);
  const relevant=doc.paragraphs.map((p,i)=>({p,i,score:terms.reduce((n,t)=>n+(p.toLowerCase().includes(t)?1:0),0)+(p.includes(skill.sourceCode||'§§')?20:0)})).sort((a,b)=>b.score-a.score).slice(0,12).flatMap(x=>doc.paragraphs.slice(Math.max(0,x.i-1),x.i+4));
  return `Official source: ${doc.contentUrl}; syllabus ${doc.version}. Preparation mappings are authored.\n${[...new Set(relevant)].join('\n').slice(0,16000)}\nStudent context: ${settings().notes}. English texts: ${settings().englishTexts||'not specified; use original passages'}`;
 };
 const event=(type,detail)=>{const id=uid();store.put('event',id,{id,type,at:now(),...detail});};
 route('get','/api/health',()=>({ok:true,name:'Recall',version:1}));
 route('get','/api/state',()=>{
  const progress=states();const sessions=store.all('session');const open=sessions.filter(s=>s.status!=='finished').at(-1);
  const attempts=store.all('attempt');
  return {settings:{...settings(),hasApiKey:!!tutor.key(),aiVerified:tutor.verified},subjects,skills:skills.map(({variants,lesson,example,hint,...s})=>({...s,...progress[s.id]})),documents:documents.map(({paragraphs,...d})=>({...d,paragraphCount:paragraphs.length})),session:publicSession(open),history:sessions.filter(s=>s.status==='finished').sort((a,b)=>(b.finished||b.created).localeCompare(a.finished||a.created)).slice(0,10).map(publicSession),deadlines:store.all('deadline'),usage:store.all('usage').slice(-100),counts:{due:Object.values(progress).filter(p=>p.due&&new Date(p.due)<=new Date()).length,retained:Object.values(progress).filter(p=>p.state==='retained').length,attempts:attempts.filter(a=>a.status==='graded').length,pending:attempts.filter(a=>a.status==='pending').length},git:resolvedRepoDir?getGitInfo(resolvedRepoDir):null};
 });
 route('get','/api/git/info',()=>resolvedRepoDir?getGitInfo(resolvedRepoDir):{isRepo:false});
 route('post','/api/git/push',async()=>{
  if(!resolvedRepoDir)throw HttpError('No Git repository detected.',400);
  const lastFinished=store.all('session').filter(s=>s.status==='finished').at(-1);
  return await commitAndPushProgress(store,lastFinished,resolvedRepoDir);
 });
 route('post','/api/git/pull',async()=>{
  if(!resolvedRepoDir)throw HttpError('No Git repository detected.',400);
  return await pullProgress(store,resolvedRepoDir);
 });
 route('get','/api/source/:id',req=>{const d=documents.find(d=>d.id===req.params.id);if(!d)throw HttpError('Source not found.',404);return d;});
 route('get','/api/skill/:id/attempts',req=>{
  if(!skillById.has(req.params.id))throw HttpError('Skill not found.',404);
  return store.all('attempt').filter(a=>a.skillId===req.params.id&&a.status==='graded'&&!a.assisted&&!a.disputed&&a.grade?.verdict&&a.grade.verdict!=='uncertain').sort((a,b)=>b.created.localeCompare(a.created)).slice(0,5).map(a=>({id:a.id,created:a.created,verdict:a.grade.verdict}));
 });
 const reviewAttempt=a=>({attempt:a,question:publicQuestion(store.get('question',a.questionId)),skillTitle:skillById.get(a.skillId)?.title||'Practice question'});
 route('get','/api/session/:id/recap',req=>{
  const s=getSession(req.params.id);
  return store.all('attempt').filter(a=>a.sessionId===s.id).map(reviewAttempt);
 });
 route('get','/api/attempts/pending',()=>store.all('attempt').filter(a=>a.status==='pending').map(reviewAttempt));
 route('post','/api/settings',req=>{const parsed=bodySettings.parse(req.body);const {apiKey,...s}=parsed;if(apiKey!==undefined)tutor.saveKey(apiKey);store.put('settings','main',{id:'main',...s});return {ok:true,hasApiKey:!!tutor.key()};});
 route('post','/api/connection/test',async()=>{const schema={type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false};const r=await tutor.request('connection_check',schema,'Return ok=true to confirm the tutor connection.');if(r.ok!==true)throw HttpError('The tutor did not confirm the connection.');return {ok:true};});
 route('post','/api/session/start',req=>{
  const existing=store.all('session').filter(s=>s.status!=='finished').at(-1);if(existing)return publicSession(existing);
  const budget=z.number().int().min(5).max(180).parse(req.body.budget||settings().budget);
  const targetSubject=z.string().optional().parse(req.body.subject);
  if(targetSubject!==undefined&&!settings().enabledSubjects.includes(targetSubject))throw HttpError('Choose an enabled subject.');
  const s={id:uid(),created:now(),updated:now(),status:'active',budget,targetSubject,elapsedSeconds:0,reviewSeconds:0,reviewCount:0,focus:[],seen:[],questionId:null,mode:null,reason:null,assisted:false,repair:null,check:null,checked:[],lastHeartbeat:Date.now()};store.put('session',s.id,s);event('session-start',{sessionId:s.id});return publicSession(s);
 });
 route('get','/api/session/:id',req=>publicSession(getSession(req.params.id)));
 route('post','/api/session/:id/action',async req=>{
  const action=z.enum(['pause','resume','finish','continue','heartbeat','budget']).parse(req.body.action);const s=getSession(req.params.id);
  if(action==='heartbeat'&&s.status==='active'){const delta=Math.max(0,Math.min(90,(Date.now()-s.lastHeartbeat)/1000));s.elapsedSeconds+=delta;if(s.mode==='review')s.reviewSeconds+=delta;s.lastHeartbeat=Date.now();}
  if(action==='pause'){if(s.status==='finished')return publicSession(s);s.status='paused';}if(action==='resume'){if(s.status==='finished')throw HttpError('This session has finished. Start a new one.');s.status='active';s.lastHeartbeat=Date.now();}
  if(action==='finish'){
   s.status='finished';s.finished=now();s.updated=now();store.put('session',s.id,s);
   if(resolvedRepoDir){
    try{s.gitSync=await commitAndPushProgress(store,s,resolvedRepoDir);}
    catch(e){s.gitSync={success:false,committed:false,pushed:false,error:e.message||'Git push failed'};}
   }
  }
  if(action==='continue'){const other=store.all('session').find(x=>x.id!==s.id&&x.status!=='finished');if(other)throw HttpError('Another session is already open.');s.status='active';s.budget=Math.max(s.budget,Math.ceil(s.elapsedSeconds/60))+10;s.lastHeartbeat=Date.now();}
  if(action==='budget')s.budget=z.number().int().min(5).max(180).parse(req.body.budget);
  s.updated=now();store.put('session',s.id,s);return publicSession(s);
 });
 async function chooseNext(id){
  let s=getSession(id);if(s.status!=='active')throw HttpError('Resume your session first.');
  const last=store.all('attempt').filter(a=>a.sessionId===id&&a.questionId===s.questionId).at(-1);
  if(s.questionId&&!last)return publicSession(s);
  if(last?.status==='pending'&&!last.deferredAt)throw HttpError('Your answer is waiting for marking. Retry or mark it later before moving on.');
  const st=states();const ranking=rankSkills(skills,st,s,settings(),store.all('deadline'));
  let selected=null;let question=null;let generationFailed=false;
  const attemptsBySkill=Map.groupBy(store.all('attempt'),a=>a.skillId);
  const cachedBySkill=Map.groupBy(store.all('question'),q=>q.skillId);
  for(const candidate of ranking){
   const history=attemptsBySkill.get(candidate.skill.id)||[];
   const used=new Set(history.filter(a=>a.sessionId===id).map(a=>a.questionId));
   const prepared=candidate.skill.variants.map((_,i)=>questionFor(candidate.skill,i));
   // Prefer least recently seen variant; never repeat a prepared prompt within a session.
   prepared.sort((a,b)=>history.filter(x=>x.questionId===a.id).length-history.filter(x=>x.questionId===b.id).length);
   question=prepared.find(q=>!used.has(q.id));
   if(!question){
    question=cachedBySkill.get(candidate.skill.id)?.find(q=>!history.some(a=>a.questionId===q.id));
   }
   if(!question&&!generationFailed&&tutor.key()){
    try{
     question={...await tutor.generate(candidate.skill,sourceFor(candidate.skill),history.slice(-6).map(a=>store.get('question',a.questionId)?.prompt)),id:uid(),skillId:candidate.skill.id};
    }catch{generationFailed=true;}
   }
   if(question){selected=candidate;break;}
  }
  s=getSession(id);if(s.status!=='active')return publicSession(s);
  if(!question||!selected){
   s.noMore=true;
   s.message=generationFailed?'The tutor couldn’t prepare a new question, and all prepared questions for this session are used. Try again or finish here.':'You’ve used the prepared questions for this session. Connect the tutor for more, or finish here.';
   store.put('session',id,s);
   return publicSession(s);
  }
  delete s.noMore;delete s.message;
  store.put('question',question.id,question);s.questionId=question.id;s.mode=selected.mode;s.reason=selected.reason;s.assisted=false;s.teachingShown=false;s.support=null;
  if(!s.focus.includes(selected.skill.subject))s.focus.push(selected.skill.subject);
  s.seen.push(selected.skill.id);if(s.mode==='review')s.reviewCount++;
  if(s.mode==='check'){s.checked.push(selected.skill.id);s.check=null;}
  if(s.repair===selected.skill.id)s.repair=null;
  s.updated=now();store.put('session',id,s);event('task-selected',{sessionId:id,skillId:selected.skill.id,mode:s.mode,reason:s.reason});return publicSession(s);
 }
 route('post','/api/session/:id/next',req=>{const id=req.params.id;if(nextJobs.has(id))return nextJobs.get(id);const job=chooseNext(id).finally(()=>nextJobs.delete(id));nextJobs.set(id,job);return job;});
 route('post','/api/session/:id/draft',req=>{
  const s=getSession(req.params.id);const body=z.object({questionId:z.string(),text:z.string().max(18000),photoId:z.string().nullable().optional(),inputMode:z.enum(['typed','dictation']).optional()}).parse(req.body);if(body.questionId!==s.questionId)throw HttpError('Question changed; reload the session.');const id=s.id+':'+s.questionId;store.put('draft',id,{id,...body,updated:now()});return {ok:true};
 });
 route('post','/api/session/:id/support',req=>{
  const s=getSession(req.params.id);const kind=z.enum(['hint','teach','answer']).parse(req.body.kind);const q=store.get('question',s.questionId);if(!q)throw HttpError('Start a question first.');s.assisted=true;s.teachingShown=kind!=='hint'||s.teachingShown;s.support=kind==='hint'?{kind,text:q.hint}:kind==='answer'?{kind,text:q.answer}:{kind,text:q.lesson,example:q.example};store.put('session',s.id,s);event('support-used',{sessionId:s.id,questionId:q.id,kind});return s.support;
 });
 route('post','/api/session/:id/tutor',async req=>{
  const s=getSession(req.params.id);const body=z.object({question:z.string().min(1).max(3000),working:z.string().max(18000)}).parse(req.body);const q=store.get('question',s.questionId);if(!q)throw HttpError('Start a question first.');s.assisted=true;store.put('session',s.id,s);const reply=await tutor.coach(q,body.working,body.question,sourceFor(skillById.get(q.skillId)));const id=uid();store.put('tutoring',id,{id,sessionId:s.id,questionId:q.id,request:body.question,reply,created:now()});return {kind:'tutor',...reply};
 });
 async function markAttempt(attempt){
  const q=store.get('question',attempt.questionId);const skill=skillById.get(attempt.skillId);
  try{
   let grade=attempt.notLearned?{verdict:'incorrect',score:0,feedback:'That’s useful to know. Start with the hint or explanation, then try a new question.',misconceptions:['Not yet learned'],criteria:[]}:localGrade(q,attempt.answer);
   if(!attempt.notLearned&&tutor.key()&&(grade.verdict==='uncertain'||q.kind==='ai'||q.kind==='rubric'||attempt.inputMode==='dictation'))grade=await tutor.grade(q,attempt.answer,sourceFor(skill));
   if(!tutor.key()&&attempt.inputMode==='dictation'&&q.kind==='numeric'&&grade.verdict==='correct')grade.feedback='The final numerical answer is correct. Your original spoken working is saved. Full feedback on the reasoning is available when your tutor is connected.';
   if(attempt.assisted&&grade.verdict==='correct')grade.feedback='You got the answer with support. We’ll use a different question to check what you can do on your own.';
   attempt={...attempt,grade,status:'graded',error:null};
   store.transaction(()=>{store.put('attempt',attempt.id,attempt);const s=getSession(attempt.sessionId);if(s.questionId!==attempt.questionId||attempt.deferredAt||s.status==='finished')return;if(['incorrect','partial'].includes(grade.verdict)){s.repair=skill.id;s.check=null;}else if(grade.verdict==='correct'&&s.mode!=='check'&&!s.checked.includes(skill.id)){s.check=skill.id;}if(s.mode==='check'&&grade.verdict==='correct')s.check=null;s.updated=now();store.put('session',s.id,s);});
   return {attempt,session:publicSession(getSession(attempt.sessionId))};
  }catch(e){attempt.error='Marking could not finish. Your answer is saved; retry when the connection is available.';store.put('attempt',attempt.id,attempt);throw e;}
 }
 function startMarking(attempt){
  const existing=inFlight.get(attempt.id);
  if(existing)return existing;
  const job=markAttempt(attempt).finally(()=>inFlight.delete(attempt.id));
  inFlight.set(attempt.id,job);
  return job;
 }
 route('post','/api/attempt/:id/defer',req=>{
  const a=store.get('attempt',req.params.id);
  if(!a)throw HttpError('Answer not found.',404);
  if(inFlight.has(a.id))throw HttpError('Marking is still in progress.');
  if(a.status==='pending'&&!a.deferredAt)store.put('attempt',a.id,{...a,deferredAt:now()});
  return publicSession(getSession(a.sessionId));
 });
 route('post','/api/attempt/:id/retry',req=>{
  const a=store.get('attempt',req.params.id);
  if(!a)throw HttpError('Answer not found.',404);
  if(a.status==='graded')return {attempt:a,session:publicSession(getSession(a.sessionId))};
  return startMarking(a);
 });
 route('post','/api/session/:id/answer',req=>{
  const body=z.object({submissionId:z.string().uuid(),questionId:z.string(),answer:z.string().max(18000),inputMode:z.enum(['typed','dictation']).optional(),notLearned:z.boolean().optional(),photoId:z.string().nullable().optional(),confirmedPhoto:z.boolean().optional()}).parse(req.body);
  const existing=store.get('attempt',body.submissionId);
  if(existing){if(existing.sessionId!==req.params.id)throw HttpError('Submission belongs to a different session.');if(existing.status==='graded')return {attempt:existing,session:publicSession(getSession(existing.sessionId))};if(inFlight.has(existing.id))return inFlight.get(existing.id);}
  const s=getSession(req.params.id);if(s.status!=='active')throw HttpError('Resume the session before submitting.');if(s.questionId!==body.questionId)throw HttpError('The question has changed. Your draft is saved.');
  if(body.photoId&&!body.confirmedPhoto)throw HttpError('Confirm or correct the photo transcription before marking.');
  if(body.photoId&&!store.get('photo',body.photoId))throw HttpError('Photo not found.');
  if(!body.answer.trim()&&!body.notLearned)throw HttpError('Write an answer or choose “I haven’t learned this”.');
  const other=store.all('attempt').find(a=>a.sessionId===s.id&&a.questionId===s.questionId&&a.id!==body.submissionId);if(other)return {attempt:other,session:publicSession(s)};
  const q=store.get('question',s.questionId);const attempt=existing||{id:body.submissionId,sessionId:s.id,questionId:q.id,skillId:q.skillId,answer:body.answer,inputMode:body.inputMode||'typed',photoId:body.photoId||null,notLearned:!!body.notLearned,assisted:s.assisted,created:now(),status:'pending',disputed:false};store.put('attempt',attempt.id,attempt);
  return startMarking(attempt);
 });
 route('post','/api/attempt/:id/dispute',req=>{const a=store.get('attempt',req.params.id);if(!a)throw HttpError('Answer not found.',404);a.disputed=true;a.disputeNote=z.string().max(3000).parse(req.body.note||'Student disputed the assessment');store.put('attempt',a.id,a);event('assessment-disputed',{attemptId:a.id});return {ok:true};});
 route('post','/api/photo',async req=>{
  const image=z.string().max(16000000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).parse(req.body.image);if(!tutor.key())throw HttpError('Photo reading needs the live tutor. Connect it in Settings, or type your working.');
  const id=uid();const parsed=await tutor.transcribe(image);store.put('photo',id,{id,image,...parsed,created:now()});return {id,...parsed};
 });
 route('post','/api/deadlines',req=>{const d=z.object({subject:z.enum(['maths','biology','physics','english','software','extension']),title:z.string().min(1).max(200),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).parse(req.body);const id=uid();return store.put('deadline',id,{id,...d,done:false});});
 route('post','/api/deadlines/:id/done',req=>{const d=store.get('deadline',req.params.id);if(!d)throw HttpError('Deadline not found.',404);d.done=true;return store.put('deadline',d.id,d);});
 route('get','/api/backup/export',()=>({...store.export(),photos:store.all('photo')}));
 route('post','/api/backup/import',req=>{
  const record=z.object({type:z.enum(['settings','session','attempt','question','deadline','usage','event','draft','tutoring']),id:z.string().min(1).max(200),value:z.record(z.unknown())});
  const b=z.object({format:z.literal('recall-backup'),version:z.literal(1),records:z.array(record).max(100000),photos:z.array(z.object({id:z.string(),image:z.string().max(16000000),text:z.string(),ambiguous:z.boolean(),note:z.string(),created:z.string()})).max(10000).optional()}).parse(req.body);
  // Validate all records before the transaction. Credentials are not part of this format.
  for(const r of b.records){if(r.type==='settings'){const {apiKey,...s}=bodySettings.parse(r.value);r.value={id:'main',...s};}else{if(r.value.id!==r.id)throw HttpError('A backup record has an invalid identity.');if(r.type==='attempt'){z.object({sessionId:z.string(),questionId:z.string(),skillId:z.string(),created:z.string().datetime(),status:z.enum(['pending','graded'])}).passthrough().parse(r.value);}if(r.type==='session'){z.object({status:z.enum(['active','paused','finished']),focus:z.array(z.string()),seen:z.array(z.string()),checked:z.array(z.string()),budget:z.number().min(5).max(180),elapsedSeconds:z.number(),reviewSeconds:z.number(),reviewCount:z.number()}).passthrough().parse(r.value);}}}
  const combined=new Map(store.all('session').map(s=>[s.id,s]));for(const r of b.records.filter(r=>r.type==='session'))combined.set(r.id,r.value);if([...combined.values()].filter(s=>s.status!=='finished').length>1)throw HttpError('This backup would create two open sessions. Finish your current session before importing.');
  store.transaction(()=>{for(const r of b.records)store.put(r.type,r.id,r.value);for(const p of b.photos||[])store.put('photo',p.id,p);});return {ok:true,imported:b.records.length};
 });
 app.use('/api',(req,res)=>res.status(404).json({error:'API endpoint not found.'}));
 app.use((err,req,res,next)=>{res.status(err.status||400).json({error:err instanceof z.ZodError?'Some fields are invalid. Please check your entries.':err.message||'The request could not be completed.'});});
 return {app,store,tutor};
}
