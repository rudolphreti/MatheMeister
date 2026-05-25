import { useEffect, useMemo, useState } from 'react';
import { buildProblemPool, generateProblem, parseCustomProblems } from './lib/math';
import { coinReward, pickWeightedProblem, updateProblemStat } from './lib/adaptive';
import { clearAllAppData, exportProfile, importProfile, loadLastUserName, loadProfile, loadProfileForUser, saveLastUserName, saveProfile } from './lib/storage';
import { playCoinSound } from './lib/audio';
import { t } from './lib/i18n';
import { ProfileV1, Settings, ProblemStat } from './lib/types';
import { appendAlgorithmLog, blockProblemForCurrentSession, buildNextProblemPool, ensureActiveProblemIsAllowed, moveSkippedProblemToQueueEnd } from './lib/session';

const defaultSettings: Settings = { mode: 'timed', sessionMinutes: 10, min: 0, max: 20, additionEnabled: true, subtractionEnabled: true, subtractionMinuendMin: 0, subtractionMinuendMax: 20, terms: 2, soundEnabled: true, language: 'de', examplesPerSession: 10, excludeResultZero: false, excludePlusMinusZero: false, excludePlusMinusOne: false, customTasksText: '' };
const mkDefault = (): ProfileV1 => ({ schemaVersion: 1, userName: '', leaderboard: [], settings: defaultSettings, session: { activeProblem: null, typedAnswer: '', problemStartedAt: null, sessionStartAt: null, sessionEndsAt: null, sessionDurationMs: 600000, coins: 0, currentStats: { correct: 0, wrong: 0 }, blockedProblemKeys: [], algorithmLog: [], lastScreen: 'practice' }, problemStats: {} });

function calculateRemainingMs(profile: ProfileV1): number {
  if (profile.settings.mode !== 'timed') return profile.session.sessionDurationMs;
  if (!profile.session.sessionEndsAt) return profile.session.sessionDurationMs;
  return Math.max(0, profile.session.sessionEndsAt - Date.now());
}


function sortLeaderboard(rows: ProfileV1['leaderboard']) {
  return rows.slice().sort((a, b) => b.coins - a.coins || b.completedAt - a.completedAt);
}

function mergeProblemStats(base: Record<string, ProblemStat>, pending: Record<string, ProblemStat>): Record<string, ProblemStat> {
  return { ...base, ...pending };
}

function sortStats(stats: Record<string, ProblemStat>): ProblemStat[] {
  return Object.values(stats).sort((a, b) => b.difficultyScore - a.difficultyScore
    || b.wrong - a.wrong
    || b.averageResponseTimeMs - a.averageResponseTimeMs
    || a.key.localeCompare(b.key));
}


function toGrayShade(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const value = Math.round(250 - (120 * clamped));
  return `rgb(${value}, ${value}, ${value})`;
}

function toErrorRedShade(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const channel = Math.round(50 + 140 * clamped);
  return `rgb(${channel}, 0, 0)`;
}


function parseBinaryOperation(expression: string): { left: number; right: number; operator: '+' | '-'; result: number } | null {
  const match = expression.match(/^\s*(\d+)\s*([+-])\s*(\d+)(?:\s*=\s*(-?\d+))?\s*$/);
  if (!match) return null;
  const left = Number(match[1]);
  const operator = match[2] as '+' | '-';
  const right = Number(match[3]);
  const computed = operator === '+' ? left + right : left - right;
  const result = match[4] !== undefined ? Number(match[4]) : computed;
  if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(result)) return null;
  return { left, right, operator, result };
}

export function App() {
  const [profile, setProfile] = useState<ProfileV1>(() => loadProfile() ?? mkDefault());
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [importMessage, setImportMessage] = useState<string>('');
  const [now, setNow] = useState(() => Date.now());
  const [nameInput, setNameInput] = useState(() => loadLastUserName());
  const [nameConfirmed, setNameConfirmed] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingProblemStats, setPendingProblemStats] = useState<Record<string, ProblemStat>>({});
  const [problemQueue, setProblemQueue] = useState<string[]>([]);
  const tr = t(profile.settings.language);
  const pool = useMemo(() => buildProblemPool(profile.settings), [profile.settings]);
  const customProblems = useMemo(() => parseCustomProblems(profile.settings), [profile.settings]);

  useEffect(() => saveProfile(profile), [profile]);
  useEffect(() => {
    setNameInput(profile.userName || loadLastUserName());
  }, [profile.userName]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!profile.session.activeProblem) {
      setProfile((p) => ({ ...p, session: { ...p.session, activeProblem: generateProblem(p.settings), problemStartedAt: Date.now() } }));
    }
  }, [profile.session.activeProblem, profile.settings]);

  useEffect(() => {
    const combinedPoolMap = new Map([...pool, ...customProblems].map((problem) => [problem.key, problem]));
    const allowedProblems = Array.from(combinedPoolMap.values());
    if (allowedProblems.length === 0) {
      setProblemQueue([]);
      return;
    }

    setProblemQueue((current) => {
      const allowedKeys = new Set(allowedProblems.map((problem) => problem.key));
      const kept = current.filter((key) => allowedKeys.has(key));
      const missing = allowedProblems.map((problem) => problem.key).filter((key) => !kept.includes(key));
      return [...kept, ...missing];
    });
  }, [customProblems, pool]);


  useEffect(() => {
    if (!profile.session.activeProblem) return;
    const combinedPoolMap = new Map([...pool, ...customProblems].map((problem) => [problem.key, problem]));
    const allowedProblems = Array.from(combinedPoolMap.values());
    if (ensureActiveProblemIsAllowed(profile.session.activeProblem, allowedProblems)) return;
    const nextProblem = pickWeightedProblem(
      allowedProblems,
      mergeProblemStats(profile.problemStats, pendingProblemStats),
      profile.session.activeProblem.key
    );
    setProfile((p) => ({ ...p, session: { ...p.session, activeProblem: nextProblem, typedAnswer: '', problemStartedAt: Date.now() } }));
    setFeedback(null);
  }, [customProblems, pendingProblemStats, pool, profile.problemStats, profile.session.activeProblem]);

  const timed = profile.settings.mode === 'timed';
  const remaining = profile.settings.mode === 'timed' && profile.session.sessionEndsAt
    ? Math.max(0, profile.session.sessionEndsAt - now)
    : calculateRemainingMs(profile);
  const doneExamples = profile.session.currentStats.correct + profile.session.currentStats.wrong;
  const sessionExamples = profile.settings.examplesPerSession;
  const endedByExamples = doneExamples >= sessionExamples;
  const ended = (timed && remaining <= 0) || endedByExamples;


  function pushDigit(digit: string) {
    if (ended) return;
    setProfile((p) => ({ ...p, session: { ...p.session, typedAnswer: (p.session.typedAnswer + digit).slice(0, 3) } }));
  }



  function restartSession() {
    const durationMs = profile.settings.sessionMinutes * 60000;
    const nextProblem = generateProblem(profile.settings);
    const shouldSaveScore = profile.userName.trim().length > 0 && (profile.session.currentStats.correct + profile.session.currentStats.wrong > 0);
    setFeedback(null);
    setProfile((p) => ({
      ...p,
      problemStats: mergeProblemStats(p.problemStats, pendingProblemStats),
      leaderboard: shouldSaveScore ? sortLeaderboard([...p.leaderboard, { userName: p.userName.trim(), coins: p.session.coins, completedAt: Date.now() }]) : p.leaderboard,
      session: {
        ...p.session,
        activeProblem: nextProblem,
        problemStartedAt: Date.now(),
        typedAnswer: '',
        sessionStartAt: null,
        sessionEndsAt: null,
        sessionDurationMs: durationMs,
        currentStats: { correct: 0, wrong: 0 },
        blockedProblemKeys: [],
        algorithmLog: []
      }
    }));
    setPendingProblemStats({});
  }

  function resetSession() {
    const next = mkDefault();
    const settingsToKeep = profile.settings;
    setFeedback(null);
    setImportMessage('');
    setMenuOpen(false);
    setNameInput(profile.userName);
    setNameConfirmed(false);
    setProfile({ ...next, settings: settingsToKeep });
  }

  function submit() {
    if (!profile.session.activeProblem || ended) return;
    const answer = Number(profile.session.typedAnswer);
    const correct = answer === profile.session.activeProblem.answer;
    const start = profile.session.problemStartedAt ?? Date.now();
    const ms = Math.max(0, Date.now() - start);
    const coins = coinReward(ms, correct);
    if (coins > 0) playCoinSound(profile.settings.soundEnabled);
    const sessionStats = mergeProblemStats(profile.problemStats, pendingProblemStats);
    const stat = updateProblemStat(sessionStats[profile.session.activeProblem.key], profile.session.activeProblem, correct, ms, Date.now());
    const combinedPoolMap = new Map([...pool, ...customProblems].map((problem) => [problem.key, problem]));
    const allProblems = Array.from(combinedPoolMap.values());
    const nextBlockedKeys = correct
      ? profile.session.blockedProblemKeys
      : blockProblemForCurrentSession(profile.session.blockedProblemKeys, profile.session.activeProblem.key);
    const nextPool = buildNextProblemPool(allProblems, nextBlockedKeys);
    const next = pickWeightedProblem(
      nextPool,
      { ...sessionStats, [stat.key]: stat },
      profile.session.activeProblem.key
    );
    setFeedback(correct ? 'correct' : 'wrong');
    setPendingProblemStats((current) => ({ ...current, [stat.key]: stat }));
    setProblemQueue((current) => moveSkippedProblemToQueueEnd(current, profile.session.activeProblem?.key ?? ''));
    setProfile((p) => ({ ...p, session: { ...p.session, activeProblem: next, problemStartedAt: Date.now(), typedAnswer: '', coins: p.session.coins + coins, currentStats: { correct: p.session.currentStats.correct + (correct ? 1 : 0), wrong: p.session.currentStats.wrong + (correct ? 0 : 1) }, blockedProblemKeys: nextBlockedKeys, algorithmLog: appendAlgorithmLog(p.session.algorithmLog, `answer:${correct ? 'correct' : 'wrong'} active:${p.session.activeProblem?.key ?? '-'} next:${next.key} pool:${nextPool.length} blocked:${nextBlockedKeys.length}`) } }));
  }

  function skipToNextProblem() {
    if (!profile.session.activeProblem || ended) return;

    const combinedPoolMap = new Map([...pool, ...customProblems].map((problem) => [problem.key, problem]));
    const nextPool = Array.from(combinedPoolMap.values());
    const nextQueue = moveSkippedProblemToQueueEnd(problemQueue, profile.session.activeProblem.key);
    const byKey = new Map(nextPool.map((problem) => [problem.key, problem]));
    const nextKey = nextQueue.find((key) => key !== profile.session.activeProblem?.key && byKey.has(key));
    const nextProblem = nextKey ? byKey.get(nextKey) ?? null : null;
    if (!nextProblem) return;

    setProblemQueue(nextQueue);
    setFeedback(null);
    setProfile((p) => ({ ...p, session: { ...p.session, activeProblem: nextProblem, problemStartedAt: Date.now(), typedAnswer: '' } }));
  }

  const rows = sortStats(mergeProblemStats(profile.problemStats, pendingProblemStats));

  const operationStats = useMemo(() => {
    const sourceStats = mergeProblemStats(profile.problemStats, pendingProblemStats);
    const totals: Record<string, { attempts: number; correct: number; wrong: number }> = {};

    Object.values(sourceStats).forEach((stat) => {
      const parsed = parseBinaryOperation(stat.expression);
      if (!parsed) return;
      const bucketKey = `${parsed.operator}:${parsed.left}:${parsed.right}`;
      totals[bucketKey] = {
        attempts: stat.attempts,
        correct: stat.correct,
        wrong: stat.wrong,
      };
    });

    const maxAttempts = Math.max(1, ...Object.values(totals).map((x) => x.attempts));
    const maxWrong = Math.max(1, ...Object.values(totals).map((x) => x.wrong));

    return { totals, maxAttempts, maxWrong };
  }, [profile.problemStats, pendingProblemStats]);

  function getSessionEndMessage(): string {
    if (!ended) return '';
    const mistakes = profile.session.currentStats.wrong;
    if (timed && remaining <= 0) {
      if (mistakes === 0) return tr.timeUpPerfect;
      if (mistakes <= 2) return tr.timeUpFewMistakes.replace('{mistakes}', String(mistakes));
      if (mistakes <= 5) return tr.timeUpSomeMistakes.replace('{mistakes}', String(mistakes));
      return tr.timeUpManyMistakes.replace('{mistakes}', String(mistakes));
    }
    if (mistakes === 0) return tr.donePerfect;
    if (mistakes <= 2) return tr.doneFewMistakes.replace('{mistakes}', String(mistakes));
    if (mistakes <= 5) return tr.doneSomeMistakes.replace('{mistakes}', String(mistakes));
    return tr.doneManyMistakes.replace('{mistakes}', String(mistakes));
  }

  const sessionEndMessage = getSessionEndMessage();

  const handleStartSession = () => {
    const nextName = nameInput.trim();
    if (!nextName) return;

    const startAt = Date.now();
    const durationMs = profile.settings.sessionMinutes * 60000;
    const existingProfile = loadProfileForUser(nextName);
    if (existingProfile) {
      setProfile((p) => ({
        ...existingProfile,
        userName: nextName,
        session: {
          ...existingProfile.session,
          sessionStartAt: existingProfile.settings.mode === 'timed' ? startAt : null,
          sessionEndsAt: existingProfile.settings.mode === 'timed' ? startAt + durationMs : null,
          sessionDurationMs: durationMs,
          algorithmLog: appendAlgorithmLog(existingProfile.session.algorithmLog, `session_started mode:${existingProfile.settings.mode} examples:${existingProfile.settings.examplesPerSession}`)
        }
      }));
      saveLastUserName(nextName);
      setNameConfirmed(true);
      return;
    }

    setProfile((p) => ({
      ...p,
      userName: nextName,
      session: {
        ...p.session,
        sessionStartAt: p.settings.mode === 'timed' ? startAt : null,
        sessionEndsAt: p.settings.mode === 'timed' ? startAt + durationMs : null,
        sessionDurationMs: durationMs,
        algorithmLog: appendAlgorithmLog(p.session.algorithmLog, `session_started mode:${p.settings.mode} examples:${p.settings.examplesPerSession}`)
      }
    }));
    saveLastUserName(nextName);
    setNameConfirmed(true);
  };

  if (!nameConfirmed) {
    return <div className="app">
      <section>
        <h2>{tr.enterNameTitle}</h2>
        <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleStartSession(); }} placeholder={tr.namePlaceholder} />
        <button onClick={handleStartSession}>{tr.startSession}</button>
      </section>
    </div>;
  }

  return <div className="app" onKeyDown={(e) => {
    if (e.key === 'Enter') submit();
    if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
    if (e.key === 'Backspace') {
      setProfile((p) => ({ ...p, session: { ...p.session, typedAnswer: p.session.typedAnswer.slice(0, -1) } }));
    }
  }} tabIndex={0}>
    <nav className="main-nav">
      <button className="hamburger" aria-label={tr.menu} onClick={() => setMenuOpen((v) => !v)}>☰</button>
      {menuOpen && <div className="menu-panel">{(['practice', 'settings', 'stats', 'problem-stats', 'operations-overview'] as const).map((s) => <button key={s} onClick={() => {
        setProfile((p) => ({ ...p, session: { ...p.session, lastScreen: s } }));
        setMenuOpen(false);
      }}>{s === 'practice' ? tr.practice : s === 'settings' ? tr.settings : s === 'problem-stats' ? tr.problemStats : s === 'operations-overview' ? tr.operationsOverview : tr.stats}</button>)}<button style={{ background: '#c62828', color: '#fff' }} onClick={resetSession}>Reset</button></div>}
    </nav>
    {profile.session.lastScreen === 'practice' && <section className="practice">
      <div className="topbar">
        <div className="timer">{timed ? `⏱ ${Math.max(0, Math.ceil(remaining / 1000))}s` : '⏱ ∞'}</div>
        <div className="coins">🪙 {profile.session.coins}</div>
        <div className="progress">📘 {tr.sessionProgressLabel}: {doneExamples}/{sessionExamples}</div>
      </div>
      <div className="expr">{profile.session.activeProblem?.expression ?? '...'}</div>
      <div className="input">{profile.session.typedAnswer || '0'}</div>

      <div className="feedback">{ended ? sessionEndMessage : feedback === 'correct' ? `✅ ${tr.correct}` : feedback === 'wrong' ? `❌ ${tr.wrong}` : ' '}</div>

      {ended && <div className="timeup">
        <p>{timed && remaining <= 0 ? tr.timeUpQuestion : tr.nextSessionQuestion}</p>
        <button className="restart" onClick={restartSession}>{tr.restartSession}</button>
        <button className="restart" onClick={() => { const content = profile.session.algorithmLog.join('\n'); const blob = new Blob([content], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `session-algorithm-log-${Date.now()}.txt`; a.click(); }}>⬇️ Algorithmus-Log</button>
      </div>}

      <div className="pad">
        <div className="digits-row">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => <button key={d} disabled={ended} onClick={() => pushDigit(d)}>{d}</button>)}
        </div>
        <button className="delete" disabled={ended} onClick={() => setProfile((p) => ({ ...p, session: { ...p.session, typedAnswer: p.session.typedAnswer.slice(0, -1) } }))}>⌫ {tr.del}</button>
        <button className="next" disabled={ended} onClick={skipToNextProblem}>→ {tr.next}</button>
        <button className="enter" disabled={ended} onClick={submit}>↵ {tr.ok}</button>
      </div>
    </section>}
    {profile.session.lastScreen === 'settings' && <section>
      <label>{tr.modeLabel} <select value={profile.settings.mode} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, mode: e.target.value as Settings['mode'] } }))}><option value="timed">{tr.modeTimed}</option><option value="no-pressure">{tr.modeNoPressure}</option></select></label>
      <label>{tr.minutesLabel} <select value={profile.settings.sessionMinutes} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, sessionMinutes: Number(e.target.value) as Settings['sessionMinutes'] } }))}>{[1, 3, 5, 10, 15].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label>{tr.maxLabel} <select value={profile.settings.max} onChange={(e) => setProfile((p) => {
        const nextMax = Number(e.target.value) as Settings['max'];
        const nextMinuendMin = Math.min(nextMax, p.settings.subtractionMinuendMin);
        const nextMinuendMax = Math.max(nextMinuendMin, Math.min(nextMax, p.settings.subtractionMinuendMax));
        return { ...p, settings: { ...p.settings, max: nextMax, subtractionMinuendMin: nextMinuendMin, subtractionMinuendMax: nextMinuendMax } };
      })}>{[5, 10, 20].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <fieldset>
        <legend>{tr.operationsLegend}</legend>
        <label><input type="checkbox" checked={profile.settings.additionEnabled} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, additionEnabled: e.target.checked } }))} /> {tr.additionLabel}</label>
        <label><input type="checkbox" checked={profile.settings.subtractionEnabled} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, subtractionEnabled: e.target.checked } }))} /> {tr.subtractionLabel}</label>
        {profile.settings.subtractionEnabled && <label>{tr.subtractionMinuendMinLabel} <input type="number" min={profile.settings.min} max={profile.settings.subtractionMinuendMax} step={1} value={profile.settings.subtractionMinuendMin} onChange={(e) => {
          const value = Number(e.target.value);
          if (!Number.isFinite(value)) return;
          setProfile((p) => ({ ...p, settings: { ...p.settings, subtractionMinuendMin: Math.max(p.settings.min, Math.min(p.settings.subtractionMinuendMax, Math.floor(value))) } }));
        }} /></label>}
        {profile.settings.subtractionEnabled && <label>{tr.subtractionMinuendMaxLabel} <input type="number" min={profile.settings.subtractionMinuendMin} max={profile.settings.max} step={1} value={profile.settings.subtractionMinuendMax} onChange={(e) => {
          const value = Number(e.target.value);
          if (!Number.isFinite(value)) return;
          setProfile((p) => ({ ...p, settings: { ...p.settings, subtractionMinuendMax: Math.max(p.settings.subtractionMinuendMin, Math.min(p.settings.max, Math.floor(value))) } }));
        }} /></label>}
      </fieldset>
      <label>{tr.termsLabel} <select value={profile.settings.terms} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, terms: Number(e.target.value) as Settings['terms'] } }))}>{[2, 3, 4, 5].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label>{tr.examplesPerSessionLabel} <input type="number" min={1} max={200} step={1} value={profile.settings.examplesPerSession} onChange={(e) => {
        const value = Number(e.target.value);
        if (!Number.isFinite(value)) return;
        setProfile((p) => ({ ...p, settings: { ...p.settings, examplesPerSession: Math.max(1, Math.min(200, Math.floor(value))) } }));
      }} /></label>
      <fieldset>
        <legend>{tr.exclusionsTitle}</legend>
        <label><input type="checkbox" checked={profile.settings.excludeResultZero} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, excludeResultZero: e.target.checked } }))} /> {tr.excludeResultZero}</label>
        <label><input type="checkbox" checked={profile.settings.excludePlusMinusZero} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, excludePlusMinusZero: e.target.checked } }))} /> {tr.excludePlusMinusZero}</label>
        <label><input type="checkbox" checked={profile.settings.excludePlusMinusOne} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, excludePlusMinusOne: e.target.checked } }))} /> {tr.excludePlusMinusOne}</label>
      </fieldset>
      <fieldset>
        <legend>{tr.customTasksTitle}</legend>
        <label>{tr.customTasksHint}
          <textarea
            value={profile.settings.customTasksText}
            onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, customTasksText: e.target.value } }))}
            rows={8}
            placeholder={tr.customTasksPlaceholder}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>{tr.dangerZoneTitle}</legend>
        <button style={{ background: '#b71c1c', color: '#fff' }} onClick={() => {
          if (!window.confirm(tr.clearAllDataConfirm)) return;
          clearAllAppData();
          setPendingProblemStats({});
          setProblemQueue([]);
          setFeedback(null);
          setMenuOpen(false);
          setImportMessage(tr.clearAllDataDone);
          setNameInput('');
          setNameConfirmed(false);
          setProfile(mkDefault());
        }}>{tr.clearAllDataButton}</button>
      </fieldset>
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
    {profile.session.lastScreen === 'stats' && <section><div>{tr.correct}: {profile.session.currentStats.correct} · {tr.wrong}: {profile.session.currentStats.wrong}</div><table><thead><tr><th>{tr.leaderboardPlayer}</th><th>{tr.leaderboardCoins}</th><th>{tr.leaderboardDate}</th></tr></thead><tbody>{profile.leaderboard.map((entry, idx) => <tr key={`${entry.userName}-${entry.completedAt}-${idx}`}><td>{entry.userName}</td><td>{entry.coins}</td><td>{new Date(entry.completedAt).toLocaleString()}</td></tr>)}</tbody></table></section>}
    {profile.session.lastScreen === 'problem-stats' && <section><table><thead><tr><th>{tr.statsProblem}</th><th>{tr.statsCorrect}</th><th>{tr.statsWrong}</th><th>{tr.statsAvgMs}</th><th>{tr.statsDifficulty}</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.key}><td>{r.expression}</td><td>{r.correct}</td><td>{r.wrong}</td><td>{r.averageResponseTimeMs}</td><td>{r.difficultyScore}</td></tr>)}</tbody></table></section>}

    {profile.session.lastScreen === 'operations-overview' && <section>
      <h3>{tr.operationsOverview}</h3>
      {[{ key: '+', title: tr.additionUpToTwenty }, { key: '-', title: tr.subtractionUpToTwenty }].map((operation) => <div key={operation.key} className="overview-block">
        <h4>{operation.title}</h4>
        <table className="overview-table">
          <thead>
            <tr>
              <th> </th>
              {Array.from({ length: 21 }, (_, right) => <th key={`head-${operation.key}-${right}`}>{right}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 21 }, (_, left) => <tr key={`row-${operation.key}-${left}`}>
              <th>{left}</th>
              {Array.from({ length: 21 }, (_, right) => {
                const result = operation.key === '+' ? left + right : left - right;
                if (operation.key === '-' && result < 0) {
                  return <td key={`empty-${operation.key}-${left}-${right}`} className="overview-cell overview-empty">—</td>;
                }
                const operationKey = `${operation.key}:${left}:${right}`;
                const stats = operationStats.totals[operationKey] ?? { attempts: 0, correct: 0, wrong: 0 };
                const hasAttempts = stats.attempts > 0;
                const bg = hasAttempts ? toGrayShade(Math.max(0.2, stats.attempts / operationStats.maxAttempts)) : '#fff';
                const color = stats.wrong > 0 ? toErrorRedShade(stats.wrong / operationStats.maxWrong) : '#111';
                const title = `${left} ${operation.key} ${right} = ${result} • ${tr.statsTooltipAttempts}: ${stats.attempts} • ${tr.statsTooltipCorrect}: ${stats.correct} • ${tr.statsTooltipWrong}: ${stats.wrong}`;
                return <td key={`result-${operation.key}-${left}-${right}`} className={`overview-cell ${hasAttempts ? 'overview-hit' : ''}`} style={{ background: bg, color }} title={title}>{result}</td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>)}
    </section>}
  </div>;
}
