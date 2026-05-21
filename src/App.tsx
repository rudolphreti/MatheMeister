import { useEffect, useMemo, useState } from 'react';
import { buildProblemPool, generateProblem } from './lib/math';
import { coinReward, pickWeightedProblem, updateProblemStat } from './lib/adaptive';
import { exportProfile, importProfile, loadProfile, saveProfile } from './lib/storage';
import { playCoinSound } from './lib/audio';
import { t } from './lib/i18n';
import { ProfileV1, Settings } from './lib/types';

const defaultSettings: Settings = { mode: 'timed', sessionMinutes: 10, min: 0, max: 20, additionEnabled: true, subtractionEnabled: true, terms: 2, soundEnabled: true, language: 'de' };
const mkDefault = (): ProfileV1 => ({ schemaVersion: 1, settings: defaultSettings, session: { activeProblem: null, typedAnswer: '', sessionStartAt: null, sessionDurationMs: 600000, coins: 0, currentStats: { correct: 0, wrong: 0 }, lastScreen: 'practice' }, problemStats: {} });

export function App() {
  const [profile, setProfile] = useState<ProfileV1>(() => loadProfile() ?? mkDefault());
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const tr = t(profile.settings.language);
  const pool = useMemo(() => buildProblemPool(profile.settings), [profile.settings]);

  useEffect(() => saveProfile(profile), [profile]);
  useEffect(() => {
    if (!profile.session.activeProblem) {
      setProfile((p) => ({ ...p, session: { ...p.session, activeProblem: generateProblem(p.settings) } }));
    }
  }, [profile.session.activeProblem, profile.settings]);

  const now = Date.now();
  const timed = profile.settings.mode === 'timed';
  const remaining = timed && profile.session.sessionStartAt ? Math.max(0, profile.session.sessionDurationMs - (now - profile.session.sessionStartAt)) : profile.session.sessionDurationMs;
  const ended = timed && remaining <= 0;

  function ensureSessionStart() {
    if (profile.settings.mode === 'timed' && !profile.session.sessionStartAt) {
      setProfile((p) => ({ ...p, session: { ...p.session, sessionStartAt: Date.now(), sessionDurationMs: p.settings.sessionMinutes * 60000 } }));
    }
  }

  function submit() {
    if (!profile.session.activeProblem || ended) return;
    ensureSessionStart();
    const answer = Number(profile.session.typedAnswer);
    const correct = answer === profile.session.activeProblem.answer;
    const start = profile.session.sessionStartAt ?? Date.now();
    const ms = Math.max(0, Date.now() - start);
    const coins = coinReward(ms, correct);
    if (coins > 0) playCoinSound(profile.settings.soundEnabled);
    const stat = updateProblemStat(profile.problemStats[profile.session.activeProblem.key], profile.session.activeProblem, correct, ms, Date.now());
    const next = pickWeightedProblem(pool, { ...profile.problemStats, [stat.key]: stat }, profile.session.activeProblem.key);
    setFeedback(correct ? 'correct' : 'wrong');
    setProfile((p) => ({ ...p, problemStats: { ...p.problemStats, [stat.key]: stat }, session: { ...p.session, activeProblem: next, typedAnswer: '', coins: p.session.coins + coins, currentStats: { correct: p.session.currentStats.correct + (correct ? 1 : 0), wrong: p.session.currentStats.wrong + (correct ? 0 : 1) } } }));
  }

  const rows = Object.values(profile.problemStats).sort((a, b) => b.difficultyScore - a.difficultyScore || b.wrong - a.wrong || b.averageResponseTimeMs - a.averageResponseTimeMs);

  return <div className="app" onKeyDown={(e) => e.key === 'Enter' && submit()} tabIndex={0}>
    <nav>{(['practice','settings','stats'] as const).map((s) => <button key={s} onClick={() => setProfile((p) => ({ ...p, session: { ...p.session, lastScreen: s } }))}>{s === 'practice' ? tr.practice : s === 'settings' ? tr.settings : tr.stats}</button>)}</nav>
    {profile.session.lastScreen === 'practice' && <section>
      <div className="timer">{timed ? `⏱ ${Math.ceil(remaining / 1000)}s` : '∞'}</div>
      <div className="expr">{profile.session.activeProblem?.expression ?? '...'}</div>
      <div className="input">{profile.session.typedAnswer || '0'}</div>
      <div className="pad">{'1234567890'.split('').map((d) => <button key={d} onClick={() => setProfile((p) => ({ ...p, session: { ...p.session, typedAnswer: (p.session.typedAnswer + d).slice(0, 3) } }))}>{d}</button>)}</div>
      <div><button onClick={() => setProfile((p) => ({ ...p, session: { ...p.session, typedAnswer: p.session.typedAnswer.slice(0, -1) } }))}>{tr.del}</button>
      <button onClick={submit}>{tr.ok}</button></div>
      <div>{feedback === 'correct' ? tr.correct : feedback === 'wrong' ? tr.wrong : ''}</div>
      <div>🪙 {profile.session.coins}</div>
    </section>}
    {profile.session.lastScreen === 'settings' && <section>
      <label>Mode <select value={profile.settings.mode} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, mode: e.target.value as Settings['mode'] } }))}><option value="timed">timed</option><option value="no-pressure">no-pressure</option></select></label>
      <label>Minutes <select value={profile.settings.sessionMinutes} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, sessionMinutes: Number(e.target.value) as Settings['sessionMinutes'] } }))}>{[1,3,5,10,15].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label>Max <select value={profile.settings.max} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, max: Number(e.target.value) as Settings['max'] } }))}>{[5,10,20].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label>Terms <select value={profile.settings.terms} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, terms: Number(e.target.value) as Settings['terms'] } }))}>{[2,3,4,5].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <button onClick={() => { const blob = new Blob([exportProfile(profile)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'math-profile.json'; a.click(); }}>{'Export JSON'}</button>
      <input type="file" accept="application/json" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const text = await file.text(); setProfile(importProfile(text)); }} />
    </section>}
    {profile.session.lastScreen === 'stats' && <section><table><thead><tr><th>Problem</th><th>Correct</th><th>Wrong</th><th>Avg ms</th><th>Difficulty</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.key}><td>{r.expression}</td><td>{r.correct}</td><td>{r.wrong}</td><td>{r.averageResponseTimeMs}</td><td>{r.difficultyScore}</td></tr>)}</tbody></table></section>}
  </div>;
}
