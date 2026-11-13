import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../server/store.mjs';
import { findRepoRoot, getGitInfo, exportProgress, generateProgressMarkdown, importProgressIfPresent } from '../server/git-sync.mjs';

test('findRepoRoot identifies repository root and getGitInfo extracts branch and remote', () => {
  const root = findRepoRoot();
  assert.ok(root, 'Repository root should be found');
  assert.ok(fs.existsSync(path.join(root, '.git')), '.git directory should exist in root');

  const info = getGitInfo(root);
  assert.equal(info.isRepo, true);
  assert.ok(info.branch, 'Branch should be detected');
  assert.ok(info.remote, 'Remote should be detected');
});

test('exportProgress writes study-progress.json and progress/README.md correctly', () => {
  const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-git-test-data-'));
  const tmpRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-git-test-repo-'));
  const store = new Store(tmpDataDir);

  // Add dummy attempt and session
  store.put('settings', 'main', { id: 'main', budget: 30 });
  store.put('session', 's1', {
    id: 's1',
    status: 'finished',
    finished: new Date().toISOString(),
    created: new Date().toISOString(),
    budget: 30,
    elapsedSeconds: 600,
    summary: { attempted: 2, independent: 1, gaps: [] },
    focus: ['maths']
  });
  store.put('attempt', 'a1', {
    id: 'a1',
    sessionId: 's1',
    skillId: 'maths-linear',
    status: 'graded',
    assisted: false,
    disputed: false,
    created: new Date().toISOString(),
    grade: { verdict: 'correct', score: 1 }
  });

  const res = exportProgress(store, tmpRepoDir);
  assert.ok(res);
  assert.ok(fs.existsSync(res.jsonPath));
  assert.ok(fs.existsSync(res.mdPath));

  const jsonContent = JSON.parse(fs.readFileSync(res.jsonPath, 'utf8'));
  assert.equal(jsonContent.format, 'recall-backup');
  assert.ok(jsonContent.records.some(r => r.id === 's1'));
  assert.ok(jsonContent.records.some(r => r.id === 'a1'));

  const mdContent = fs.readFileSync(res.mdPath, 'utf8');
  assert.match(mdContent, /NSW Year 11 & HSC Study Progress/);
  assert.match(mdContent, /Mathematics Advanced/);

  // Test importProgressIfPresent
  const secondDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-git-test-second-'));
  const secondStore = new Store(secondDataDir);
  assert.equal(secondStore.all('attempt').length, 0);

  const importRes = importProgressIfPresent(secondStore, tmpRepoDir);
  assert.ok(importRes.imported > 0);
  assert.equal(secondStore.all('attempt').length, 1);
  assert.equal(secondStore.all('session').length, 1);

  store.close();
  secondStore.close();
  fs.rmSync(tmpDataDir, { recursive: true, force: true });
  fs.rmSync(tmpRepoDir, { recursive: true, force: true });
  fs.rmSync(secondDataDir, { recursive: true, force: true });
});

test('finishing a study session commits progress into the git repository', async () => {
  const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-session-git-data-'));
  const tmpRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-session-git-repo-'));

  const { execFileSync } = await import('node:child_process');
  execFileSync('git', ['init', '-b', 'main'], { cwd: tmpRepoDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Tester'], { cwd: tmpRepoDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpRepoDir, stdio: 'ignore' });

  fs.writeFileSync(path.join(tmpRepoDir, '.gitkeep'), '');
  execFileSync('git', ['add', '.gitkeep'], { cwd: tmpRepoDir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'Initial commit'], { cwd: tmpRepoDir, stdio: 'ignore' });

  const { createApp } = await import('../server/app.mjs');
  const service = createApp({ dataDir: tmpDataDir, repoDir: tmpRepoDir });
  const server = service.app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const call = async (url, body) => {
    const res = await fetch(base + '/api' + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res.json();
  };

  const s = await call('/session/start', { budget: 30 });
  const next = await call(`/session/${s.id}/next`, {});
  assert.ok(next.question);

  await call(`/session/${s.id}/answer`, {
    submissionId: crypto.randomUUID(),
    questionId: next.question.id,
    answer: '6'
  });

  const finished = await call(`/session/${s.id}/action`, { action: 'finish' });
  assert.equal(finished.status, 'finished');
  assert.ok(finished.gitSync);
  assert.equal(finished.gitSync.committed, true);
  assert.ok(finished.gitSync.commit);

  const log = execFileSync('git', ['log', '-1', '--format=%s'], { cwd: tmpRepoDir, encoding: 'utf8' }).trim();
  assert.match(log, /Study session:/);

  assert.ok(fs.existsSync(path.join(tmpRepoDir, 'progress', 'study-progress.json')));
  assert.ok(fs.existsSync(path.join(tmpRepoDir, 'progress', 'README.md')));

  server.close();
  service.store.close();
  fs.rmSync(tmpDataDir, { recursive: true, force: true });
  fs.rmSync(tmpRepoDir, { recursive: true, force: true });
});
