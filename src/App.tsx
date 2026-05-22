import { useEffect, useMemo, useState } from 'react';
import { buildProblemPool, generateProblem } from './lib/math';
import { coinReward, pickWeightedProblem, updateProblemStat } from './lib/adaptive';
import { exportProfile, importProfile, loadProfile, saveProfile } from './lib/storage';
import { playCoinSound } from './lib/audio';
import { t } from './lib/i18n';
import { ProfileV1, Settings, ProblemStat } from './lib/types';

const defaultSettings: Settings = { mode: 'timed', sessionMinutes: 10, min: 0, max: 20, additionEnabled: true, subtractionEnabled: true, terms: 2, soundEnabled: true, language: 'de' };
const mkDefault = (): ProfileV1 => ({ schemaVersion: 1, settings: defaultSettings, session: { activeProblem: null, typedAnswer: '', sessionStartAt: null, sessionEndsAt: null, sessionDurationMs: 600000, coins: 0, currentStats: { correct: 0, wrong: 0 }, lastScreen: 'practice' }, problemStats: {} });

function calculateRemainingMs(profile: ProfileV1): number {
  if (profile.settings.mode !== 'timed') return profile.session.sessionDurationMs;
  if (!profile.session.sessionEndsAt) return profile.session.sessionDurationMs;
  return Math.max(0, profile.session.sessionEndsAt - Date.now());
}

function sortStats(stats: Record<string, ProblemStat>): ProblemStat[] {
  return Object.values(stats).sort((a, b) => b.difficultyScore - a.difficultyScore
    || b.wrong - a.wrong
    || b.averageResponseTimeMs - a.averageResponseTimeMs
    || a.key.localeCompare(b.key));
}

export function App() {
  const [profile, setProfile] = useState<ProfileV1>(() => loadProfile() ?? mkDefault());
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [importMessage, setImportMessage] = useState<string>('');
  const [now, setNow] = useState(() => Date.now());
  const tr = t(profile.settings.language);
  const pool = useMemo(() => buildProblemPool(profile.settings), [profile.settings]);

  useEffect(() => saveProfile(profile), [profile]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!profile.session.activeProblem) {
      setProfile((p) => ({ ...p, session: { ...p.session, activeProblem: generateProblem(p.settings) } }));
    }
  }, [profile.session.activeProblem, profile.settings]);

  const timed = profile.settings.mode === 'timed';
  const remaining = profile.settings.mode === 'timed' && profile.session.sessionEndsAt
    ? Math.max(0, profile.session.sessionEndsAt - now)
    : calculateRemainingMs(profile);
  const ended = timed && remaining <= 0;

  function ensureSessionStart() {
    if (profile.settings.mode === 'timed' && !profile.session.sessionStartAt) {
      const startAt = Date.now();
      const durationMs = profile.settings.sessionMinutes * 60000;
      setProfile((p) => ({ ...p, session: { ...p.session, sessionStartAt: startAt, sessionEndsAt: startAt + durationMs, sessionDurationMs: durationMs } }));
    }
  }

  function pushDigit(digit: string) {
    if (ended) return;
    setProfile((p) => ({ ...p, session: { ...p.session, typedAnswer: (p.session.typedAnswer + digit).slice(0, 3) } }));
  }



  function restartSession() {
    const durationMs = profile.settings.sessionMinutes * 60000;
    const nextProblem = generateProblem(profile.settings);
    setFeedback(null);
    setProfile((p) => ({
      ...p,
      session: {
        ...p.session,
        activeProblem: nextProblem,
        typedAnswer: '',
        sessionStartAt: null,
        sessionEndsAt: null,
        sessionDurationMs: durationMs,
        currentStats: { correct: 0, wrong: 0 }
      }
    }));
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

  const rows = sortStats(profile.problemStats);

  return <div className="app" onKeyDown={(e) => {
    if (e.key === 'Enter') submit();
    if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
    if (e.key === 'Backspace') {
      setProfile((p) => ({ ...p, session: { ...p.session, typedAnswer: p.session.typedAnswer.slice(0, -1) } }));
    }
  }} tabIndex={0}>
    <nav>{(['practice', 'settings', 'stats', 'problem-stats'] as const).map((s) => <button key={s} onClick={() => setProfile((p) => ({ ...p, session: { ...p.session, lastScreen: s } }))}>{s === 'practice' ? tr.practice : s === 'settings' ? tr.settings : s === 'problem-stats' ? tr.problemStats : tr.stats}</button>)}</nav>
    {profile.session.lastScreen === 'practice' && <section className="practice">
      <div className="topbar">
        <div className="timer">{timed ? `⏱ ${Math.max(0, Math.ceil(remaining / 1000))}s` : '⏱ ∞'}</div>
        <div className="coins">🪙 {profile.session.coins}</div>
      </div>
      <div className="expr">{profile.session.activeProblem?.expression ?? '...'}</div>
      <div className="input">{profile.session.typedAnswer || '0'}</div>

      <div className="feedback">{ended ? `⏰ ${tr.timeUpTitle}` : feedback === 'correct' ? `✅ ${tr.correct}` : feedback === 'wrong' ? `❌ ${tr.wrong}` : ' '}</div>

      {ended && <div className="timeup">
        <p>{tr.timeUpQuestion}</p>
        <button className="restart" onClick={restartSession}>{tr.restartSession}</button>
      </div>}

      <div className="pad">
        <div className="digits-row">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => <button key={d} disabled={ended} onClick={() => pushDigit(d)}>{d}</button>)}
        </div>
        <button disabled={ended} onClick={() => setProfile((p) => ({ ...p, session: { ...p.session, typedAnswer: p.session.typedAnswer.slice(0, -1) } }))}>{tr.del}</button>
        <button className="enter" disabled={ended} onClick={submit}>{tr.ok} / Enter</button>
      </div>
    </section>}
    {profile.session.lastScreen === 'settings' && <section>
      <label>{tr.modeLabel} <select value={profile.settings.mode} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, mode: e.target.value as Settings['mode'] } }))}><option value="timed">{tr.modeTimed}</option><option value="no-pressure">{tr.modeNoPressure}</option></select></label>
      <label>{tr.minutesLabel} <select value={profile.settings.sessionMinutes} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, sessionMinutes: Number(e.target.value) as Settings['sessionMinutes'] } }))}>{[1, 3, 5, 10, 15].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label>{tr.maxLabel} <select value={profile.settings.max} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, max: Number(e.target.value) as Settings['max'] } }))}>{[5, 10, 20].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label>{tr.termsLabel} <select value={profile.settings.terms} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, terms: Number(e.target.value) as Settings['terms'] } }))}>{[2, 3, 4, 5].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <button onClick={() => { const blob = new Blob([exportProfile(profile)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'math-profile.json'; a.click(); }}>{tr.exportJson}</button>
      <input type="file" accept="application/json" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const imported = importProfile(text);
          setProfile(imported);
          setImportMessage('✅ JSON imported');
        } catch {
          setImportMessage('❌ Invalid JSON profile');
        }
        e.currentTarget.value = '';
      }} />
      <div>{importMessage}</div>
    </section>}
    {profile.session.lastScreen === 'stats' && <section><div>{tr.correct}: {profile.session.currentStats.correct} · {tr.wrong}: {profile.session.currentStats.wrong}</div></section>}
    {profile.session.lastScreen === 'problem-stats' && <section><table><thead><tr><th>{tr.statsProblem}</th><th>{tr.statsCorrect}</th><th>{tr.statsWrong}</th><th>{tr.statsAvgMs}</th><th>{tr.statsDifficulty}</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.key}><td>{r.expression}</td><td>{r.correct}</td><td>{r.wrong}</td><td>{r.averageResponseTimeMs}</td><td>{r.difficultyScore}</td></tr>)}</tbody></table></section>}
  </div>;
}
