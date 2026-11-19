import React,{useEffect,useRef,useState} from 'react';
import {api,date,Icon,shortName} from './ui';
import type {AppState,Attempt,AttemptReview,Document,IndependentResult,Skill} from './types';

type Run=(fn:()=>Promise<void>)=>Promise<void>;
const stateName:Record<string,string>={unknown:'Not tried',learning:'Building',practising:'Practising',retained:'Remembered'};
const verdictName:Record<string,string>={correct:'Correct',partial:'Partly correct',incorrect:'Needs practice',uncertain:'Needs review'};

function SkillProgress({skill,run}:{skill:Skill;run:Run}){
 const [results,setResults]=useState<IndependentResult[]|null>(null);
 return <details className="simple-skill" onToggle={event=>{
  if(event.currentTarget.open&&skill.state!=='unknown')run(async()=>setResults(await api('/skill/'+encodeURIComponent(skill.id)+'/attempts')));
 }}>
  <summary><span>{skill.title}</span><span className="state-label"><i className={'status-dot '+skill.state}/>{stateName[skill.state]}</span></summary>
  {skill.description&&skill.description!==skill.title&&<p>{skill.description}</p>}
  {skill.due&&<p>Next review {new Date(skill.due).getTime()<=Date.now()?'is due now':date(skill.due)}</p>}
  {!!skill.misconceptions.length&&<p>To work on {skill.misconceptions.join(', ')}</p>}
  {results&&<div className="independent-results">
   <h3>Recent independent answers</h3>
   {results.length?<ul>{results.map(result=><li key={result.id}>{date(result.created)} · {verdictName[result.verdict]}</li>)}</ul>:<p>No graded independent answers yet.</p>}
  </div>}
  <p className="footnote">{skill.foundation?'Preparation skill':skill.sourceCode} · <a href={skill.sourceUrl} target="_blank" rel="noreferrer">Syllabus ↗</a></p>
 </details>;
}

function ReviewedAnswer({item,onRetry,busy}:{item:AttemptReview;onRetry:(id:string)=>void;busy:boolean}){
 const {attempt,question,skillTitle}=item;
 return <details className="reviewed-answer">
  <summary>{skillTitle} <small>{attempt.status==='pending'?'Awaiting marking':verdictName[attempt.grade?.verdict||'uncertain']}</small></summary>
  {question&&<p className="preserve-lines">{question.prompt}</p>}
  {attempt.answer&&<><h3>Your answer</h3><p className="preserve-lines">{attempt.answer}</p></>}
  {attempt.grade&&<><h3>Feedback</h3><p className="preserve-lines">{attempt.grade.feedback}</p>
   {attempt.disputed&&<p className="muted">Excluded from progress</p>}
  </>}
  {attempt.status==='pending'&&<button disabled={busy} onClick={()=>onRetry(attempt.id)}>Retry marking</button>}
 </details>;
}

function SourceDialog({source,onClose}:{source:Document;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog className="source-modal" ref={dialog} aria-labelledby="source-title" onClose={onClose}>
  <header><h2 id="source-title">{shortName(source.id)} · {source.version}</h2><button aria-label="Close source" onClick={()=>dialog.current?.close()}><Icon name="close"/></button></header>
  <div className="source-text">{source.paragraphs?.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
 </dialog>;
}

export function StudentProgress({data,busy,run,refresh,notice}:{data:AppState;busy:boolean;run:Run;refresh:()=>Promise<unknown>;notice:(message:string)=>void}){
 const [selected,setSelected]=useState<string|null>(null);
 const [search,setSearch]=useState('');
 const [all,setAll]=useState(false);
 const [source,setSource]=useState<Document|null>(null);
 const [pending,setPending]=useState<AttemptReview[]>([]);
 const [recaps,setRecaps]=useState<Record<string,AttemptReview[]>>({});
 const list=data.skills.filter(s=>s.subject===selected&&(all||s.state!=='unknown')&&s.title.toLowerCase().includes(search.toLowerCase()));
 const retry=(id:string)=>run(async()=>{
  const {attempt}=await api<{attempt:Attempt}>('/attempt/'+encodeURIComponent(id)+'/retry',{});
  const update=(item:AttemptReview)=>item.attempt.id===id?{...item,attempt}:item;
  setPending(items=>items.filter(item=>item.attempt.id!==id));
  setRecaps(items=>Object.fromEntries(Object.entries(items).map(([session,entries])=>[session,entries.map(update)])));
  await refresh();
  notice('Feedback saved. You can find it in the session recap.');
 });
 return <>
  <h1 className="standard-heading">Progress</h1>
  {!!data.counts.pending&&<details className="quiet-disclosure review-section" onToggle={event=>{
   if(event.currentTarget.open)run(async()=>setPending(await api('/attempts/pending')));
  }}>
   <summary>Awaiting marking ({data.counts.pending})</summary>
   {pending.map(item=><ReviewedAnswer key={item.attempt.id} item={item} busy={busy} onRetry={retry}/>)}
  </details>}
  <div className="subject-progress-list">
   {data.subjects.filter(s=>data.settings.enabledSubjects.includes(s.id)).map(subject=>{
    const skills=data.skills.filter(skill=>skill.subject===subject.id);
    const explored=skills.filter(skill=>skill.state!=='unknown').length;
    const retained=skills.filter(skill=>skill.state==='retained').length;
    return <button key={subject.id} className={'progress-subject '+(selected===subject.id?'selected':'')} aria-expanded={selected===subject.id} onClick={()=>{setSelected(selected===subject.id?null:subject.id);setSearch('');setAll(false);}}>
     <span><strong>{shortName(subject.id)}</strong><small>{explored} explored · {retained} remembered</small></span>
     <span aria-hidden="true">{selected===subject.id?'−':'+'}</span>
    </button>;
   })}
  </div>
  {selected&&<section className="skills-simple">
   <h2>{shortName(selected)}</h2>
   <div className="filter-bar">
    <input aria-label="Search this subject" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find a skill…"/>
    <label className="checkbox-label"><input type="checkbox" checked={all} onChange={event=>setAll(event.target.checked)}/>Include skills not yet tried</label>
   </div>
   {list.length?list.map(skill=><SkillProgress key={skill.id} skill={skill} run={run}/>):<p className="muted">{search||all?'No matching skills.':'No graded skills yet.'}</p>}
  </section>}
  {!!data.history.length&&<section className="review-section">
   <h2>Recent sessions</h2>
   {data.history.map(session=><details className="quiet-disclosure session-recap" key={session.id} onToggle={event=>{
    if(event.currentTarget.open)run(async()=>{
     const entries=await api<AttemptReview[]>('/session/'+encodeURIComponent(session.id)+'/recap');
     setRecaps(previous=>({...previous,[session.id]:entries}));
    });
   }}>
    <summary>{date(session.finished||session.created)}{session.targetSubject&&' · '+shortName(session.targetSubject)} · {session.summary.attempted} graded</summary>
    {!!session.summary.gaps.length&&<p>To revisit {session.summary.gaps.join(', ')}</p>}
    {recaps[session.id]?.map(item=><ReviewedAnswer key={item.attempt.id} item={item} busy={busy} onRetry={retry}/>)}
    {recaps[session.id]?.length===0&&<p>No answers saved in this session.</p>}
   </details>)}
  </section>}
  <details className="quiet-disclosure curriculum-disclosure">
   <summary>Curriculum and course details</summary>
   <p>Year 11 in 2027 · HSC in 2028. Software Engineering is through Sydney Distance Education High School. TAFE details are pending.</p>
   {data.documents.map(doc=><div className="source-row" key={doc.id}>
    <span><strong>{shortName(doc.id)}</strong><small>Syllabus {doc.version}</small></span>
    <button onClick={()=>run(async()=>{setSource(await api<Document>('/source/'+doc.id));})}>Read source</button>
    <a href={doc.url} target="_blank" rel="noreferrer">NESA ↗</a>
   </div>)}
  </details>
  {source&&<SourceDialog source={source} onClose={()=>setSource(null)}/>}
 </>;
}
