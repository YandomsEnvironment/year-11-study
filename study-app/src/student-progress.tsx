import React, { useEffect, useRef, useState } from 'react';
import { api, date, Icon, shortName } from './ui';
import type { AppState, Attempt, AttemptReview, Document, IndependentResult, Skill } from './types';

const skillStates: Record<string, string> = {
  unknown: 'Not tried',
  learning: 'Building',
  practising: 'Practising',
  retained: 'Remembered',
};

const verdictName:Record<string,string>={correct:'Correct',partial:'Partly correct',incorrect:'Needs practice',uncertain:'Needs review'};

function SkillProgress({skill,run}:{skill:Skill;run:Run}){
 const [results,setResults]=useState<IndependentResult[]|null>(null);
 return <details className="simple-skill" onToggle={event=>{
  if(event.currentTarget.open&&skill.state!=='unknown')run(async()=>setResults(await api('/skill/'+encodeURIComponent(skill.id)+'/attempts')));
 }}>
  <summary><span>{skill.title}</span><span className="state-label">{skillStates[skill.state]}</span></summary>
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

type Run = (fn: () => Promise<void>) => Promise<void>;

type ProgressProps = {
  data: AppState;
  busy: boolean;
  run: Run;
  refresh: () => Promise<unknown>;
  notice: (message: string) => void;
};

export function StudentProgress({ data, busy, run, refresh, notice }: ProgressProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [all, setAll] = useState(false);
  const [source, setSource] = useState<Document | null>(null);
 const [pending,setPending]=useState<AttemptReview[]>([]);
 const [recaps,setRecaps]=useState<Record<string,AttemptReview[]>>({});
 const retry=(id:string)=>run(async()=>{
  const {attempt}=await api<{attempt:Attempt}>('/attempt/'+encodeURIComponent(id)+'/retry',{});
  const update=(item:AttemptReview)=>item.attempt.id===id?{...item,attempt}:item;
  setPending(items=>items.filter(item=>item.attempt.id!==id));
  setRecaps(items=>Object.fromEntries(Object.entries(items).map(([session,entries])=>[session,entries.map(update)])));
  await refresh();
  notice('Feedback saved. You can find it in the session recap.');
 });
  const sourceOpener = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const subjects = data.subjects.filter(subject => data.settings.enabledSubjects.includes(subject.id));

  useEffect(() => {
    if (source && !dialog.current?.open) dialog.current?.showModal();
  }, [source]);

  function toggleSubject(subjectId: string) {
    setSelected(selected === subjectId ? null : subjectId);
    setSearch('');
    setAll(false);
  }

  function closeSource() {
    setSource(null);
    sourceOpener.current?.focus();
  }

  return (
    <>
      <header className="standard-heading">
        <h1>Progress</h1>
        <p>See what you’ve practised and what you remember across sessions.</p>
      </header>

  {!!data.counts.pending&&<details className="quiet-disclosure panel review-section" onToggle={event=>{
   if(event.currentTarget.open)run(async()=>setPending(await api('/attempts/pending')));
  }}>
   <summary>Awaiting marking ({data.counts.pending})</summary>
   {pending.map(item=><ReviewedAnswer key={item.attempt.id} item={item} busy={busy} onRetry={retry}/>)}
  </details>}

      <div className="subject-progress-list panel">
        {subjects.map(subject => {
          const skills = data.skills.filter(skill => skill.subject === subject.id);
          const explored = skills.filter(skill => skill.state !== 'unknown').length;
          const retained = skills.filter(skill => skill.state === 'retained').length;
          const expanded = selected === subject.id;
          const visibleSkills = expanded
            ? skills.filter(skill => (all || skill.state !== 'unknown') && skill.title.toLowerCase().includes(search.trim().toLowerCase()))
            : [];

          return (
            <section className="progress-group" key={subject.id}>
              <h2>
                <button className="progress-subject" aria-expanded={expanded} aria-controls={'skills-' + subject.id}
                  onClick={() => toggleSubject(subject.id)}>
                  <span className="metric-icon"><Icon name="subjects" size={18} /></span>
                  <span className="progress-subject-name">
                    <strong>{shortName(subject.id)}</strong>
                    <small>{explored ? `${explored} explored · ${retained} remembered` : 'No skills tried yet'}</small>
                  </span>
                  <Icon name="chevron-down" size={17} />
                </button>
              </h2>
              <div id={'skills-' + subject.id} className="skills-simple" hidden={!expanded}>
                {expanded && (
                  <>
                    <div className="filter-bar">
                      <input type="search" aria-label="Search this subject" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a skill…" />
                      <label className="checkbox-label">
                        <input type="checkbox" checked={all} onChange={event => setAll(event.target.checked)} /> Include skills not yet tried
                      </label>
                    </div>
                    {!visibleSkills.length ? (
                      <p className="muted">{all || search ? 'No matching skills.' : 'Try a study session to start tracking skills here.'}</p>
                    ) : visibleSkills.map(skill => (
                      <SkillProgress key={skill.id} skill={skill} run={run} />
                    ))}
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>

  {!!data.history.length&&<section className="panel review-section">
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

      <details className="quiet-disclosure panel curriculum-disclosure">
        <summary>Curriculum and course details</summary>
        <p>For Year 11 in 2027 and HSC in 2028. Software Engineering is confirmed at Sydney Distance Education High School. Information and Digital Technology at TAFE is planned. Your place and qualification details are still pending.</p>
        {data.documents.map(document => (
          <div className="source-row" key={document.id}>
            <span><strong>{shortName(document.id)}</strong><small>Syllabus {document.version}</small></span>
            <button onClick={event => {
              sourceOpener.current = event.currentTarget;
              run(async () => setSource(await api<Document>('/source/' + document.id)));
            }}>Read source</button>
            <a href={document.url} target="_blank" rel="noreferrer">NESA ↗</a>
          </div>
        ))}
      </details>

      {source && (
        <dialog className="source-modal" ref={dialog} aria-labelledby="source-title" onClose={closeSource}
          onClick={event => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}>
          <header>
            <h2 id="source-title">{shortName(source.id)} · {source.version}</h2>
            <button aria-label="Close source" autoFocus onClick={() => dialog.current?.close()}><Icon name="close" size={18} /></button>
          </header>
          <div className="source-text" tabIndex={0} role="region" aria-label="Syllabus text">
            {source.paragraphs?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
        </dialog>
      )}
    </>
  );
}
