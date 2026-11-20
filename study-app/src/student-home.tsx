import React, { useState } from 'react';
import { Icon, shortName } from './ui';
import type { AppState } from './types';

type HomeProps = {
  data: AppState;
  busy: boolean;
  budget: number;
  setBudget: (minutes: number) => void;
  start: (subject?: string) => void;
  onSettings: () => void;
  onProgress: () => void;
  children: React.ReactNode;
};

export function StudentHome({ data, busy, budget, setBudget, start, onSettings, onProgress, children }: HomeProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [subject, setSubject] = useState('');
  const session = data.session;
  const subjects = data.subjects.filter(subject => !subject.pending && data.settings.enabledSubjects.includes(subject.id));
  const stats = [
    { label: 'Answers checked', value: data.counts.attempts, icon: 'check' },
    { label: 'Skills remembered', value: data.counts.retained, icon: 'subjects' },
    { label: 'Reviews due', value: data.counts.due, icon: 'loop' },
  ];

  return (
    <>
      <header className="page-heading">
        <h1>Today</h1>
        <p>Your Year 11 study desk</p>
      </header>

      <div className="today-grid">
        <section className="start-desk" aria-labelledby="next-session">
          <div className="start-desk-main">
            <span className="hero-icon"><Icon name="session" size={24} /></span>
            <p className="eyebrow">{session ? 'Session in progress' : 'Next session'}</p>
            <h2 id="next-session">{session ? 'Pick up where you left off.' : 'Make time to study.'}</h2>
            <p>{session ? 'Your current question and working are saved.' : 'Practise a few questions and review what you’re ready to revisit.'}</p>
            <div className="start-row">
              <button className="primary" onClick={() => start()} disabled={busy}>
                {busy ? 'Getting ready…' : session ? 'Resume studying' : 'Start studying'} <Icon name="arrow" size={17} />
              </button>
              {session ? (
                <span className="session-duration"><Icon name="clock" size={16} /> {session.budget} min planned{session.targetSubject && ' · ' + shortName(session.targetSubject)}</span>
              ) : (
                <button className="duration-button" aria-expanded={showOptions} aria-controls="session-options" aria-label={`Session options, ${budget} minutes`}
                  onClick={() => setShowOptions(value => !value)}>
                  <Icon name="clock" size={16} /> {budget} min <Icon name="chevron-down" size={13} />
                </button>
              )}
            </div>
            {!session && (
              <div id="session-options" className="session-options" hidden={!showOptions}>
                <div className="time-options" role="group" aria-label="Session duration">
                  {[...new Set([10, 20, 30, 45, budget])].sort((a, b) => a - b).map(minutes => (
                    <button key={minutes} onClick={() => setBudget(minutes)} aria-pressed={budget === minutes}>
                      {minutes} min
                    </button>
                  ))}
                </div>
                <label>Focus on a subject
                  <select value={subject} onChange={event => setSubject(event.target.value)}>
                    <option value="">Choose a subject</option>
                    {subjects.map(item => <option key={item.id} value={item.id}>{shortName(item.id)}</option>)}
                  </select>
                </label>
                <button disabled={busy || !subjects.some(item => item.id === subject)} onClick={() => start(subject)}>
                  Start focused session
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="panel overview" aria-labelledby="study-overview">
          <h2 id="study-overview">Study overview</h2>
          <dl>
            {stats.map(stat => (
              <div key={stat.label}>
                <dt><span className="metric-icon"><Icon name={stat.icon} size={17} /></span>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
          <button className="text-button" onClick={onProgress}>See progress <Icon name="arrow" size={15} /></button>
        </section>

        <section className="panel subjects-overview">
          <div className="section-label">
            <h2>Your subjects</h2>
            <span className="muted">{subjects.length} active</span>
          </div>
          <ul className="subject-names">
            {subjects.map(subject => <li key={subject.id}>{shortName(subject.id)}</li>)}
          </ul>
        </section>

        {children}
      </div>

      {!data.settings.hasApiKey && (
        <div className="connection-nudge">
          <span>Connect your tutor for personalised explanations and feedback on photos.</span>
          <button className="text-button" onClick={onSettings}>Set up tutor <Icon name="arrow" size={15} /></button>
        </div>
      )}
    </>
  );
}
