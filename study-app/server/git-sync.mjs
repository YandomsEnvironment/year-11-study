import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { appRoot, subjects, skills } from './content.mjs';
import { progressFrom } from './engine.mjs';

export function findRepoRoot(startDir = appRoot) {
  let cur = path.resolve(startDir);
  while (cur) {
    if (fs.existsSync(path.join(cur, '.git'))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

export function runGit(args, cwd, timeout = 25000) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      timeout,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch (err) {
    const stderr = err.stderr ? err.stderr.trim() : '';
    const stdout = err.stdout ? err.stdout.trim() : '';
    const msg = stderr || stdout || err.message;
    throw new Error(msg);
  }
}

export function getGitInfo(repoDir = findRepoRoot()) {
  if (!repoDir) return { isRepo: false, configured: false };
  try {
    const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoDir) || 'main';
    let remote = '';
    try {
      remote = runGit(['config', '--get', 'remote.origin.url'], repoDir);
    } catch {}
    let lastCommit = '';
    let lastCommitTime = '';
    try {
      lastCommit = runGit(['log', '-1', '--format=%h %s'], repoDir);
      lastCommitTime = runGit(['log', '-1', '--format=%cI'], repoDir);
    } catch {}
    return {
      isRepo: true,
      configured: !!remote,
      repoDir,
      branch,
      remote,
      lastCommit,
      lastCommitTime
    };
  } catch (e) {
    return { isRepo: false, error: e.message };
  }
}

export function generateProgressMarkdown(store) {
  const attempts = store.all('attempt');
  const sessions = store.all('session');
  const gradedAttempts = attempts.filter(a => a.status === 'graded');
  const independentSuccesses = gradedAttempts.filter(a => a.grade?.verdict === 'correct' && !a.assisted && !a.disputed);
  const finishedSessions = sessions.filter(s => s.status === 'finished');

  const sydneyDate = new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney'
  }).format(new Date());

  const skillStates = Object.fromEntries(skills.map(s => [s.id, progressFrom(attempts.filter(a => a.skillId === s.id))]));

  const subjectRows = subjects.map(sub => {
    const subSkills = skills.filter(s => s.subject === sub.id);
    const retained = subSkills.filter(s => skillStates[s.id]?.state === 'retained').length;
    const practising = subSkills.filter(s => skillStates[s.id]?.state === 'practising').length;
    const learning = subSkills.filter(s => skillStates[s.id]?.state === 'learning').length;
    const total = subSkills.length;
    return `| **${sub.name || sub.id}** | ${retained} | ${practising} | ${learning} | ${total} |`;
  }).join('\n');

  const recentSessions = [...finishedSessions].reverse().slice(0, 10).map(s => {
    const dateStr = s.finished ? new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Australia/Sydney'
    }).format(new Date(s.finished)) : s.created;
    const duration = s.elapsedSeconds ? `${Math.round(s.elapsedSeconds / 60)} min` : `${s.budget} min`;
    const focus = (s.focus && s.focus.length) ? s.focus.join(', ') : 'All subjects';
    const attempted = s.summary?.attempted ?? 0;
    const independent = s.summary?.independent ?? 0;
    return `| ${dateStr} | ${focus} | ${duration} | ${attempted} | ${independent} |`;
  }).join('\n');

  return `# NSW Year 11 & HSC Study Progress

> Auto-generated study progress synced from **Recall**.
> **Last Synced:** ${sydneyDate}

## Overview

| Metric | Value |
|:-------|:------|
| **Total Completed Sessions** | ${finishedSessions.length} |
| **Total Questions Explored** | ${gradedAttempts.length} |
| **Independent Successes** | ${independentSuccesses.length} |
| **Overall Success Rate** | ${gradedAttempts.length ? Math.round((independentSuccesses.length / gradedAttempts.length) * 100) : 0}% |

---

## Subject Mastery

| Subject | Retained / Mastered | Practising | Still Learning | Total Skills |
|:--------|:-------------------:|:----------:|:--------------:|:------------:|
${subjectRows}

---

## Recent Study Sessions

| Date & Time | Focus | Duration | Explored | Independent |
|:------------|:------|:--------:|:--------:|:-----------:|
${recentSessions || '| _No completed sessions yet_ | - | - | - | - |'}

---

*Progress is automatically version-controlled and pushed to GitHub when study sessions end.*
`;
}

export function exportProgress(store, repoDir = findRepoRoot()) {
  if (!repoDir) return null;
  const progressDir = path.join(repoDir, 'progress');
  fs.mkdirSync(progressDir, { recursive: true });

  const exportData = store.export();
  const jsonPath = path.join(progressDir, 'study-progress.json');
  fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2), 'utf8');

  const mdPath = path.join(progressDir, 'README.md');
  const markdown = generateProgressMarkdown(store);
  fs.writeFileSync(mdPath, markdown, 'utf8');

  return { progressDir, jsonPath, mdPath, count: exportData.records.length };
}

export async function commitAndPushProgress(store, session, repoDir = findRepoRoot()) {
  if (!repoDir) {
    return { success: false, committed: false, pushed: false, error: 'Not inside a Git repository.' };
  }

  const exported = exportProgress(store, repoDir);
  if (!exported) {
    return { success: false, committed: false, pushed: false, error: 'Failed to write progress files.' };
  }

  let status = '';
  try {
    status = runGit(['status', '--porcelain', 'progress'], repoDir);
  } catch (e) {
    return { success: false, committed: false, pushed: false, error: `Git status failed: ${e.message}` };
  }

  if (!status) {
    return {
      success: true,
      committed: false,
      pushed: false,
      message: 'Progress already up to date.'
    };
  }

  try {
    runGit(['add', 'progress'], repoDir);
  } catch (e) {
    return { success: false, committed: false, pushed: false, error: `Git add failed: ${e.message}` };
  }

  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const summary = session?.summary || { attempted: 0, independent: 0 };
  const subject = (session?.focus && session.focus[0]) || session?.skill?.subject || 'Study';
  const commitMsg = `Study session: ${subject} (${summary.attempted} explored, ${summary.independent} independent) - ${dateStr}`;

  let commitHash = '';
  try {
    runGit(['commit', '-m', commitMsg], repoDir);
    commitHash = runGit(['rev-parse', '--short', 'HEAD'], repoDir);
  } catch (e) {
    return { success: false, committed: false, pushed: false, error: `Git commit failed: ${e.message}` };
  }

  try {
    const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoDir) || 'main';
    runGit(['push', 'origin', branch], repoDir);
    return {
      success: true,
      committed: true,
      pushed: true,
      commit: commitHash,
      message: `Progress pushed to GitHub (${commitHash})`,
      at: new Date().toISOString()
    };
  } catch (pushErr) {
    return {
      success: true,
      committed: true,
      pushed: false,
      commit: commitHash,
      error: `Local commit saved (${commitHash}), push to GitHub failed: ${pushErr.message}`,
      message: `Committed locally (${commitHash}), but could not push to GitHub.`,
      at: new Date().toISOString()
    };
  }
}

export function importProgressIfPresent(store, repoDir = findRepoRoot()) {
  if (!repoDir) return { imported: 0 };
  const jsonPath = path.join(repoDir, 'progress', 'study-progress.json');
  if (!fs.existsSync(jsonPath)) return { imported: 0 };

  try {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    if (data.format !== 'recall-backup' || !Array.isArray(data.records)) {
      return { imported: 0, error: 'Invalid backup format' };
    }

    let count = 0;
    store.transaction(() => {
      for (const r of data.records) {
        if (!r.type || !r.id || !r.value) continue;
        if (r.type === 'settings') {
          const cur = store.get('settings', 'main');
          if (!cur) {
            store.put('settings', 'main', r.value);
            count++;
          }
        } else {
          const existing = store.get(r.type, r.id);
          if (!existing) {
            store.put(r.type, r.id, r.value);
            count++;
          } else if (r.value.updated && existing.updated && r.value.updated > existing.updated) {
            store.put(r.type, r.id, r.value);
            count++;
          }
        }
      }
    });
    return { imported: count };
  } catch (e) {
    return { imported: 0, error: e.message };
  }
}

export async function pullProgress(store, repoDir = findRepoRoot()) {
  if (!repoDir) return { success: false, error: 'Not inside a Git repository.' };
  try {
    const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoDir) || 'main';
    runGit(['pull', '--rebase', 'origin', branch], repoDir);
    const imported = importProgressIfPresent(store, repoDir);
    return { success: true, message: 'Pulled latest progress from GitHub.', imported: imported.imported };
  } catch (e) {
    return { success: false, error: `Pull failed: ${e.message}` };
  }
}
