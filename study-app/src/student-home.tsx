import React,{useState} from 'react';
import {Icon,shortName} from './ui';
import type {AppState} from './types';

export function StudentHome({data,busy,budget,setBudget,start,onProgress,children}:{data:AppState;busy:boolean;budget:number;setBudget:(n:number)=>void;start:(subject?:string)=>void;onProgress:()=>void;children:React.ReactNode}){
 const [subject,setSubject]=useState('');
 const subjects=data.subjects.filter(s=>!s.pending&&data.settings.enabledSubjects.includes(s.id));
 const session=data.session;
 return <>
  <h1 className="simple-heading">Today</h1>
  <section className="start-desk">
   <div className="start-desk-main">
    <h2>{session?'Continue your session':'Study session'}</h2>
    <div className="start-row">
     <button className="primary" onClick={()=>start()} disabled={busy}>{busy?'Getting ready…':session?'Resume studying':'Start studying'}<Icon name="arrow" size={18}/></button>
     <span className="session-duration"><Icon name="clock" size={16}/>{session?.budget??budget} min{session?.targetSubject&&' · '+shortName(session.targetSubject)}</span>
    </div>
    {!session&&<details className="time-picker">
     <summary>Session options</summary>
     <div className="session-options">
      <label>Time <select value={budget} onChange={e=>setBudget(Number(e.target.value))}>
       {[...new Set([10,20,30,45,budget])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n} min</option>)}
      </select></label>
      <label>Focus on a subject <select value={subject} onChange={e=>setSubject(e.target.value)}>
       <option value="">Choose a subject</option>
       {subjects.map(s=><option key={s.id} value={s.id}>{shortName(s.id)}</option>)}
      </select></label>
      <button disabled={busy||!subjects.some(s=>s.id===subject)} onClick={()=>start(subject)}>Start focused session</button>
     </div>
    </details>}
   </div>
  </section>
  <section className="home-progress">
   <div className="section-label"><h2>Your subjects</h2><button className="text-button" onClick={onProgress}>See progress <Icon name="arrow" size={16}/></button></div>
   <div className="subject-names">{subjects.map(s=><span key={s.id}>{shortName(s.id)}</span>)}</div>
  </section>
  {children}
 </>;
}
