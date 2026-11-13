import React,{useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/newsreader/400.css';
import '@fontsource/newsreader/400-italic.css';
import './style.css';
import './student.css';
import {StudySession} from './StudySession';
import {StudentHome} from './student-home';
import {StudentSettings} from './student-settings';
import {StudentProgress} from './student-progress';
import type {AppState,Session,Settings,View,Document} from './types';

async function api<T=any>(url:string,body?:unknown):Promise<T>{const r=await fetch('/api'+url,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let data;try{data=await r.json();}catch{throw new Error('Could not reach Recall. Reopen the app launcher.');}if(!r.ok)throw new Error(data.error||'The request could not finish.');return data;}
function Icon({name,size=20}:{name:string;size?:number}){const paths:Record<string,React.ReactNode>={today:<><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4m8-4v4M3 10h18m-12 5h6"/></>,session:<><path d="m9 5 11 7-11 7z"/></>,subjects:<><path d="M3 4h6a4 4 0 0 1 3 1 4 4 0 0 1 3-1h6v16h-6a4 4 0 0 0-3 1 4 4 0 0 0-3-1H3zM12 5v16"/></>,settings:<><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></>,arrow:<><path d="M4 12h16m-6-6 6 6-6 6"/></>,check:<path d="m5 12 4 4L19 6"/>,clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,photo:<><rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="8" cy="10" r="1"/><path d="m3 17 5-5 4 4 4-5 5 6"/></>,pause:<><path d="M8 5v14m8-14v14"/></>,close:<><path d="m6 6 12 12M6 18 18 6"/></>,loop:<><path d="M18 7a7 7 0 1 0 1 9M18 3v5h-5"/></>};return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.subjects}</svg>;}
const shortName=(id:string)=>({maths:'Maths Advanced',extension:'Maths Extension 1',english:'English Standard',biology:'Biology',physics:'Physics',software:'Software Engineering',tafe:'TAFE software'}[id]||id);
const date=(s:string)=>new Date(s).toLocaleDateString('en-AU',{day:'numeric',month:'short',timeZone:'Australia/Sydney'});
function App(){
 const [data,setData]=useState<AppState|null>(null);const [view,setView]=useState<View>(()=>(['today','session','subjects','settings'].includes(location.hash.slice(1))?location.hash.slice(1):'today') as View);const [session,setSession]=useState<Session|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [budget,setBudget]=useState(30);
 const refresh=async()=>{const d=await api<AppState>('/state');setData(d);setBudget(d.settings.budget);return d;};
 useEffect(()=>{refresh().then(d=>{if(d.session)setSession(d.session);}).catch(e=>setError(e.message));},[]);
 useEffect(()=>{location.hash=view;window.scrollTo(0,0);},[view]);
 useEffect(()=>{const handler=()=>{const v=location.hash.slice(1);if(['today','session','subjects','settings'].includes(v))setView(v as View);};addEventListener('hashchange',handler);return()=>removeEventListener('hashchange',handler);},[]);
 const run=async(fn:()=>Promise<void>)=>{setError('');setNotice('');setBusy(true);try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const sync=async(s:Session)=>{setSession(s);await refresh();};
 const start=()=>run(async()=>{let s=await api<Session>('/session/start',{budget});if(s.status==='paused')s=await api(`/session/${s.id}/action`,{action:'resume'});if(!s.question)s=await api(`/session/${s.id}/next`,{});setView('session');await sync(s);});
 const action=async(action:string,extras={})=>{if(!session)return;const s=await api<Session>(`/session/${session.id}/action`,{action,...extras});await sync(s);};
 useEffect(()=>{if(view!=='session'||session?.status!=='active')return;const timer=setInterval(()=>{api<Session>(`/session/${session.id}/action`,{action:'heartbeat'}).then(s=>setSession(old=>old?.id===s.id&&old.status==='active'?s:old)).catch(()=>{});},15000);return()=>clearInterval(timer);},[view,session?.id,session?.status]);
 useEffect(()=>{if(!session||session.status!=='active')return;const pause=()=>{if(view!=='session'||document.hidden)api<Session>(`/session/${session.id}/action`,{action:'pause'}).then(s=>setSession(old=>old?.id===s.id&&old.status==='active'?s:old)).catch(()=>{});};pause();document.addEventListener('visibilitychange',pause);return()=>document.removeEventListener('visibilitychange',pause);},[view,session?.id,session?.status]);
 const remaining=session?Math.max(0,Math.ceil(session.budget-session.elapsedSeconds/60)):budget;
 const activeCount=data?.subjects.filter(s=>data.settings.enabledSubjects.includes(s.id)).length||0;
 return <div className="app-shell">
  <aside className="sidebar"><a href="#today" className="brand" onClick={()=>setView('today')}><span className="brand-mark"><svg viewBox="0 0 32 32" fill="none"><path d="M24 8C18 1 6 6 6 15c0 9 12 14 19 6M24 3v7h-7" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg></span>recall<span className="brand-dot">.</span></a><div className="workspace">Your study desk<span>Year 11 · 2027 / HSC · 2028</span></div>
  <nav aria-label="Main navigation">{(['today',...(data?.session?['session']:[]),'subjects','settings'] as View[]).map(v=><button key={v} className={'nav-item '+(view===v?'active':'')} onClick={()=>setView(v)}><Icon name={v}/>{({today:'Today',session:'Study session',subjects:'Progress',settings:'Settings'})[v]}{v==='session'&&data?.session&&<span className="nav-dot"/>}</button>)}</nav><div className="sidebar-bottom"><div className="local-dot"/>Saved on this computer<p>A little progress, remembered.</p></div></aside>
  <main><header className="topbar"><span>{({today:'Your daily rhythm',session:'One thing at a time',subjects:'A clearer picture',settings:'Make it yours'})[view]}</span><span className="top-date">{new Date().toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'long',timeZone:'Australia/Sydney'})}</span></header>
  <div className="content">{error&&<div role="alert" className="alert error">{error}<button aria-label="Dismiss error" onClick={()=>setError('')}><Icon name="close" size={16}/></button></div>}{notice&&<div role="status" className="alert">{notice}</div>}
  {!data?<div className="empty"><Icon name="loop"/><h1>Opening your study desk…</h1><p>Your learning history stays on this computer.</p></div>:<>
  {view==='today'&&<StudentHome data={data} busy={busy} budget={budget} setBudget={setBudget} start={start} onSettings={()=>setView('settings')} onProgress={()=>setView('subjects')}><DeadlinePanel data={data} onChange={refresh} run={run}/></StudentHome>}
  <div hidden={view!=='session'}><StudySession visible={view==='session'} data={data} session={session} setSession={setSession} busy={busy} run={run} sync={sync} start={start} action={action} remaining={remaining} onSettings={()=>setView('settings')}/></div>
  {view==='subjects'&&<StudentProgress data={data} run={run}/>}
  {view==='settings'&&<StudentSettings data={data} run={run} refresh={refresh} notice={setNotice}/>}
  </>}</div><footer className="page-footer"><span>Recall · A practice that grows with you.</span><span>Year 11, 2027 · HSC, 2028</span></footer></main>
 </div>;
}
function DeadlinePanel({data,onChange,run}:{data:AppState;onChange:()=>Promise<unknown>;run:(f:()=>Promise<void>)=>Promise<void>}){
 const [open,setOpen]=useState(false);const [title,setTitle]=useState('');const [subject,setSubject]=useState('maths');const [due,setDue]=useState('');const live=data.deadlines.filter(d=>!d.done);
 return <section className="deadlines"><div className="section-label"><h2>Anything coming up?</h2><button className="text-button" onClick={()=>setOpen(!open)}>{open?'Close':'+ Add an assessment'}</button></div><p className="muted">Optional. A deadline helps Recall adjust your priorities.</p>{live.map(d=><div className="deadline-row" key={d.id}><span><strong>{d.title}</strong><small>{shortName(d.subject)} · {date(d.date)}</small></span><button className="text-button" onClick={()=>run(async()=>{await api(`/deadlines/${d.id}/done`,{});await onChange();})}>Mark complete</button></div>)}{open&&<form className="deadline-form" onSubmit={e=>{e.preventDefault();run(async()=>{await api('/deadlines',{title,subject,date:due});setTitle('');setOpen(false);await onChange();});}}><label>Assessment<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Biology depth study"/></label><label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}>{data.subjects.filter(s=>!s.pending).map(s=><option key={s.id} value={s.id}>{shortName(s.id)}</option>)}</select></label><label>Due date<input type="date" required value={due} onChange={e=>setDue(e.target.value)}/></label><button className="primary">Save</button></form>}</section>;
}
createRoot(document.getElementById('root')!).render(<App/>);
