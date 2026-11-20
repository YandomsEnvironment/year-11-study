import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import './style.css';
import './student.css';
import './theme.css';
import {StudySession} from './StudySession';
import {StudentHome} from './student-home';
import {StudentSettings} from './student-settings';
import {StudentProgress} from './student-progress';
import type {AppState,Session,Theme,View} from './types';
import {api,Icon,shortName,date} from './ui';

const navigation: { view: View; label: string }[] = [
  { view: 'today', label: 'Today' },
  { view: 'session', label: 'Study session' },
  { view: 'subjects', label: 'Progress' },
  { view: 'settings', label: 'Settings' },
];

function App(){
 const [data,setData]=useState<AppState|null>(null);const [view,setView]=useState<View>(()=>(['today','session','subjects','settings'].includes(location.hash.slice(1))?location.hash.slice(1):'today') as View);const [session,setSession]=useState<Session|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [budget,setBudget]=useState(30);
 const [theme,setTheme]=useState<Theme>(()=>document.documentElement.dataset.theme as Theme||'system');
 const changeTheme=(value:Theme)=>{
  setTheme(value);
  if(value==='system')delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme=value;
  try{localStorage.setItem('recall-theme',value);}catch{}
 };
 const refresh=async()=>{const d=await api<AppState>('/state');setData(d);setBudget(d.settings.budget);return d;};
 useEffect(()=>{refresh().then(d=>{if(d.session)setSession(d.session);}).catch(e=>setError(e.message));},[]);
 useEffect(()=>{location.hash=view;window.scrollTo(0,0);},[view]);
 useEffect(()=>{const handler=()=>{const v=location.hash.slice(1);if(['today','session','subjects','settings'].includes(v))setView(v as View);};addEventListener('hashchange',handler);return()=>removeEventListener('hashchange',handler);},[]);
 const run=async(fn:()=>Promise<void>)=>{setError('');setNotice('');setBusy(true);try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const sync=async(s:Session)=>{setSession(s);await refresh();};
 const start=(subject?:string)=>run(async()=>{
  let s=await api<Session>('/session/start',{budget,subject});
  if(s.status==='paused')s=await api(`/session/${s.id}/action`,{action:'resume'});
  setView('session');
  setSession(s);
  if(!s.question)s=await api(`/session/${s.id}/next`,{});
  await sync(s);
 });
 const action=async(action:string,extras={})=>{if(!session)return;const s=await api<Session>(`/session/${session.id}/action`,{action,...extras});await sync(s);};
 useEffect(()=>{if(view!=='session'||session?.status!=='active')return;const timer=setInterval(()=>{api<Session>(`/session/${session.id}/action`,{action:'heartbeat'}).then(s=>setSession(old=>old?.id===s.id&&old.status==='active'?s:old)).catch(()=>{});},15000);return()=>clearInterval(timer);},[view,session?.id,session?.status]);
 useEffect(()=>{if(!session||session.status!=='active')return;const pause=()=>{if(view!=='session'||document.hidden)api<Session>(`/session/${session.id}/action`,{action:'pause'}).then(s=>setSession(old=>old?.id===s.id&&old.status==='active'?s:old)).catch(()=>{});};pause();document.addEventListener('visibilitychange',pause);return()=>document.removeEventListener('visibilitychange',pause);},[view,session?.id,session?.status]);
 const remaining=session?Math.max(0,Math.ceil(session.budget-session.elapsedSeconds/60)):budget;
 return (
  <div className="app-shell">
   <a className="skip-link" href="#main-content" onClick={event => {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
   }}>Skip to content</a>
   <aside className="sidebar">
    <a href="#today" className="brand">
     <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
       <path d="M24 8C18 1 6 6 6 15c0 9 12 14 19 6M24 3v7h-7" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"/>
       <circle cx="16" cy="16" r="3" fill="currentColor"/>
      </svg>
     </span>
     Recall
    </a>
    <nav aria-label="Main navigation">
     {navigation.filter(item => item.view !== 'session' || !!data?.session || view === 'session').map(item => (
      <a key={item.view} href={'#' + item.view} className="nav-item" aria-current={view === item.view ? 'page' : undefined}>
       <Icon name={item.view} size={18}/><span>{item.label}</span>
      </a>
     ))}
    </nav>
    <div className="sidebar-bottom"><span className="local-dot" /> Saved on this computer</div>
   </aside>
   <main id="main-content" tabIndex={-1}>
    <header className="topbar">
     <span>Year 11 · 2027</span>
     <span className="top-date">{new Date().toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'long',timeZone:'Australia/Sydney'})}</span>
    </header>
  <div className="content">{error&&<div role="alert" className="alert error">{error}<button aria-label="Dismiss error" onClick={()=>setError('')}><Icon name="close" size={16}/></button></div>}{notice&&<div role="status" className="alert">{notice}</div>}
  {!data?<div className="empty" role="status"><Icon name="loop"/><h1>{error ? 'Study desk unavailable' : 'Opening your study desk…'}</h1><p>Your learning history stays on this computer.</p></div>:<>
  {view==='today'&&<StudentHome data={data} busy={busy} budget={budget} setBudget={setBudget} start={start} onSettings={()=>setView('settings')} onProgress={()=>setView('subjects')}><DeadlinePanel data={data} onChange={refresh} run={run}/></StudentHome>}
  <div hidden={view!=='session'}><StudySession visible={view==='session'} data={data} session={session} setSession={setSession} busy={busy} run={run} sync={sync} start={()=>start()} action={action} remaining={remaining} onSettings={()=>setView('settings')}/></div>
  {view==='subjects'&&<StudentProgress data={data} busy={busy} run={run} refresh={async()=>{const updated=await refresh();if(updated.session)setSession(updated.session);}} notice={setNotice}/>}
  {view==='settings'&&<StudentSettings data={data} run={run} refresh={refresh} notice={setNotice} theme={theme} changeTheme={changeTheme}/>}
  </>}</div>
   </main>
  </div>
 );
}
function DeadlinePanel({data,onChange,run}:{data:AppState;onChange:()=>Promise<unknown>;run:(f:()=>Promise<void>)=>Promise<void>}){
 const [open,setOpen]=useState(false);const [title,setTitle]=useState('');const [subject,setSubject]=useState('maths');const [due,setDue]=useState('');const live=data.deadlines.filter(d=>!d.done);
 return <section className="panel deadlines"><div className="section-label"><h2>Assessments</h2><button className="text-button" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Cancel':'Add assessment'}</button></div>{!live.length&&!open&&<p className="muted">No upcoming assessments.</p>}{live.map(d=><div className="deadline-row" key={d.id}><span><strong>{d.title}</strong><small>{shortName(d.subject)} · {date(d.date)}</small></span><button className="text-button" onClick={()=>run(async()=>{await api(`/deadlines/${d.id}/done`,{});await onChange();})}>Mark complete</button></div>)}{open&&<form className="deadline-form" onSubmit={e=>{e.preventDefault();run(async()=>{await api('/deadlines',{title,subject,date:due});setTitle('');setOpen(false);await onChange();});}}><label>Assessment<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Biology depth study"/></label><label>Subject<select value={subject} onChange={e=>setSubject(e.target.value)}>{data.subjects.filter(s=>!s.pending).map(s=><option key={s.id} value={s.id}>{shortName(s.id)}</option>)}</select></label><label>Due date<input type="date" required value={due} onChange={e=>setDue(e.target.value)}/></label><button className="primary">Save</button></form>}</section>;
}
createRoot(document.getElementById('root')!).render(<App/>);
