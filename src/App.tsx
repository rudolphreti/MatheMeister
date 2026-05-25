import { useEffect, useMemo, useState } from 'react';
import { buildProblemPool, generateProblem, parseCustomProblems } from './lib/math';
import { coinReward, explainCoinReward, explainSelectionDecision, pickWeightedProblem, updateProblemStat } from './lib/adaptive';
import { clearAllAppData, exportProfile, importProfile, loadLastUserName, loadProfile, loadProfileForUser, saveLastUserName, saveProfile } from './lib/storage';
import { playCoinSound, playDigitSound } from './lib/audio';
import { t } from './lib/i18n';
import { ProfileV1, Settings, ProblemStat } from './lib/types';
import { appendAlgorithmLog, blockProblemForCurrentSession, buildCorrectionQueue, buildNextProblemPool, buildProfileForSessionReset, buildSessionStateBeforeStart, buildSessionStateForUserStart, ensureActiveProblemIsAllowed, finalizeSessionResults, getCorrectionProgress, moveSkippedProblemToQueueEnd, shouldShowCorrectionAction } from './lib/session';
import { getSessionEndMessage } from './lib/sessionEndMessage';

const defaultSettings: Settings = { mode: 'timed', sessionMinutes: 10, min: 0, max: 20, additionEnabled: true, subtractionEnabled: true, subtractionMinuendMin: 0, subtractionMinuendMax: 20, terms: 2, soundEnabled: true, language: 'de', examplesPerSession: 10, excludeResultZero: false, excludePlusMinusZero: false, excludePlusMinusOne: false, customTasksText: '' };
const mkDefault = (): ProfileV1 => ({ schemaVersion: 1, userName: '', leaderboard: [], settings: defaultSettings, session: { activeProblem: null, typedAnswer: '', problemStartedAt: null, sessionStartAt: null, sessionEndsAt: null, sessionDurationMs: 600000, coins: 0, currentStats: { correct: 0, wrong: 0 }, blockedProblemKeys: [], algorithmLog: [], sessionAttempts: [], correctionQueue: [], correctionSolvedKeys: [], correctionModeActive: false, lastScreen: 'practice' }, problemStats: {} });

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
  const [sessionFinalized, setSessionFinalized] = useState(false);
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
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'f') return;
      if (!document.fullscreenElement) {
        void document.documentElement.requestFullscreen();
        return;
      }
      void document.exitFullscreen();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  useEffect(() => {
    if (!nameConfirmed || !profile.session.sessionStartAt) return;
    if (!profile.session.activeProblem) {
      setProfile((p) => ({ ...p, session: { ...p.session, activeProblem: generateProblem(p.settings), problemStartedAt: Date.now() } }));
    }
  }, [nameConfirmed, profile.session.activeProblem, profile.session.sessionStartAt, profile.settings]);

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
  const ended = ((timed && remaining <= 0) || endedByExamples) && !profile.session.correctionModeActive;

  useEffect(() => {
    if (!ended) return;
    if (sessionFinalized && Object.keys(pendingProblemStats).length === 0) return;
    const result = finalizeSessionResults({
      profileProblemStats: profile.problemStats,
      pendingProblemStats,
      leaderboard: profile.leaderboard,
      userName: profile.userName,
      sessionCoins: profile.session.coins,
      sessionAttemptsCount: profile.session.sessionAttempts.length,
      alreadyFinalized: sessionFinalized
    });
    if (!sessionFinalized && result.finalized) setSessionFinalized(true);
    setProfile((p) => ({ ...p, problemStats: result.problemStats, leaderboard: result.leaderboard }));
    if (Object.keys(pendingProblemStats).length > 0) setPendingProblemStats({});
  }, [ended, pendingProblemStats, profile.leaderboard, profile.problemStats, profile.session.coins, profile.session.sessionAttempts.length, profile.userName, sessionFinalized]);


  function pushDigit(digit: string) {
    if (ended) return;
    playDigitSound(profile.settings.soundEnabled);
    setProfile((p) => ({ ...p, session: { ...p.session, typedAnswer: (p.session.typedAnswer + digit).slice(0, 3) } }));
  }



  function restartSession() {
    const durationMs = profile.settings.sessionMinutes * 60000;
    const nextProblem = generateProblem(profile.settings);
    const sessionAttemptCount = profile.session.currentStats.correct + profile.session.currentStats.wrong;
    const finalized = finalizeSessionResults({
      profileProblemStats: profile.problemStats,
      pendingProblemStats,
      leaderboard: profile.leaderboard,
      userName: profile.userName,
      sessionCoins: profile.session.coins,
      sessionAttemptsCount: sessionAttemptCount,
      alreadyFinalized: sessionFinalized
    });
    setFeedback(null);
    setProfile((p) => ({
      ...p,
      problemStats: finalized.problemStats,
      leaderboard: finalized.leaderboard,
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
    setSessionFinalized(false);
  }

  function resetSession() {
    const next = buildProfileForSessionReset(profile, mkDefault());
    setFeedback(null);
    setImportMessage('');
    setMenuOpen(false);
    setNameInput(loadLastUserName());
    setNameConfirmed(false);
    setSessionFinalized(false);
    setProfile(next);
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
    const nextStats = { ...sessionStats, [stat.key]: stat };
    const selectionDebug = explainSelectionDecision(
      nextPool,
      nextStats,
      {
        previousProblemKey: profile.session.activeProblem.key,
        turnNumber: profile.session.currentStats.correct + profile.session.currentStats.wrong + 1,
        consecutiveErrorDebtSelections: 0
      }
    );
    const next = pickWeightedProblem(nextPool, nextStats, profile.session.activeProblem.key);
    const blockedReason = correct
      ? `excluded:none (correct answer, keep problem available)`
      : `excluded:${profile.session.activeProblem.key} (wrong answer, blocked for current session)`;
    const persistenceReason = `result_buffered:true pendingStatsKey:${stat.key} autosave_profile:on`;
    const rewardReason = explainCoinReward(ms, correct);
    setFeedback(correct ? 'correct' : 'wrong');
    setPendingProblemStats((current) => ({ ...current, [stat.key]: stat }));
    setProblemQueue((current) => moveSkippedProblemToQueueEnd(current, profile.session.activeProblem?.key ?? ''));
    setProfile((p) => {
      if (p.session.correctionModeActive) {
        const solvedKeys = correct && p.session.activeProblem ? [...p.session.correctionSolvedKeys, p.session.activeProblem.key] : p.session.correctionSolvedKeys;
        const remainingKeys = p.session.correctionQueue.filter((key) => !solvedKeys.includes(key));
        const nextCorrectionProblem = remainingKeys.length > 0 ? allProblems.find((problem) => problem.key === remainingKeys[0]) ?? null : null;
        return {
          ...p,
          session: {
            ...p.session,
            activeProblem: nextCorrectionProblem,
            problemStartedAt: Date.now(),
            typedAnswer: '',
            correctionSolvedKeys: solvedKeys,
            correctionModeActive: remainingKeys.length > 0
          }
        };
      }
      return { ...p, session: { ...p.session, activeProblem: next, problemStartedAt: Date.now(), typedAnswer: '', coins: p.session.coins + coins, currentStats: { correct: p.session.currentStats.correct + (correct ? 1 : 0), wrong: p.session.currentStats.wrong + (correct ? 0 : 1) }, blockedProblemKeys: nextBlockedKeys, algorithmLog: appendAlgorithmLog(p.session.algorithmLog, `answer:${correct ? 'correct' : 'wrong'} active:${p.session.activeProblem?.key ?? '-'} ${selectionDebug} ${blockedReason} ${rewardReason} ${persistenceReason}`), sessionAttempts: [...p.session.sessionAttempts, { key: p.session.activeProblem?.key ?? '', expression: p.session.activeProblem?.expression ?? '', answer: p.session.activeProblem?.answer ?? 0, correct }] } };
    });
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

  const correctionModeCompleted = profile.session.correctionSolvedKeys.length > 0;
  const showCorrectionAction = shouldShowCorrectionAction(profile.session.correctionQueue, profile.session.correctionSolvedKeys);
  const unfinishedSessionTasks = Math.max(0, sessionExamples - doneExamples);
  const correctionModeMistakes = profile.session.correctionQueue.length;
  const correctionModeUnfinished = Math.max(
    0,
    profile.session.correctionQueue.length - profile.session.correctionSolvedKeys.length
  );

  const sessionEndMessage = getSessionEndMessage({
    language: profile.settings.language,
    ended,
    timed,
    remainingMs: remaining,
    mistakes: profile.session.currentStats.wrong,
    correctionModeCompleted,
    unfinishedSessionTasks,
    correctionModeMistakes,
    correctionModeUnfinished
  });


  const handleConfirmUser = () => {
    const nextName = nameInput.trim();
    if (!nextName) return;

    const durationMs = profile.settings.sessionMinutes * 60000;
    const existingProfile = loadProfileForUser(nextName);
    if (existingProfile) {
      setProfile((p) => ({
        ...existingProfile,
        userName: nextName,
        session: buildSessionStateBeforeStart(existingProfile, durationMs)
      }));
      saveLastUserName(nextName);
      setNameConfirmed(true);
      return;
    }

    setProfile((p) => ({
      ...p,
      userName: nextName,
      session: buildSessionStateBeforeStart({ ...p, userName: nextName }, durationMs)
    }));
    saveLastUserName(nextName);
    setNameConfirmed(true);
  };

  const startPracticeSession = () => {
    if (!nameConfirmed) return;
    const startAt = Date.now();
    const durationMs = profile.settings.sessionMinutes * 60000;
    setFeedback(null);
    setPendingProblemStats({});
    setSessionFinalized(false);
    setProfile((p) => ({ ...p, session: buildSessionStateForUserStart(p, startAt, durationMs) }));
  };

  if (!nameConfirmed) {
    return <div className="min-h-screen w-full max-w-screen-2xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 text-base sm:text-lg md:text-xl lg:text-2xl">
      <section className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:mt-14 sm:p-6">
        <h2 className="text-2xl font-bold sm:text-3xl">{tr.enterNameTitle}</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="h-12 w-full rounded-lg border border-slate-300 px-3 text-xl sm:text-2xl" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmUser(); }} placeholder={tr.namePlaceholder} />
          <button className="h-12 rounded-lg bg-blue-700 px-5 font-bold text-white sm:min-w-24" onClick={handleConfirmUser}>{tr.ok}</button>
        </div>
      </section>
    </div>;
  }

  const sessionStarted = profile.session.sessionStartAt !== null;

  return <div className="min-h-screen w-full max-w-screen-2xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 text-base sm:text-lg md:text-xl lg:text-2xl" onKeyDown={(e) => {
    if (e.key === 'Enter') submit();
    if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
    if (e.key === 'Backspace') {
      setProfile((p) => ({ ...p, session: { ...p.session, typedAnswer: p.session.typedAnswer.slice(0, -1) } }));
    }
  }} tabIndex={0}>
    <nav className="relative mb-3 flex items-center justify-between">
      <button className="min-w-14 rounded border border-slate-700 px-3 py-2 font-bold" aria-label="Vollbild" onClick={() => { if (!document.fullscreenElement) { void document.documentElement.requestFullscreen(); return; } void document.exitFullscreen(); }}>⛶</button>
      <button className="min-w-14 rounded border border-slate-700 px-3 py-2 font-bold" aria-label={tr.menu} onClick={() => setMenuOpen((v) => !v)}>☰</button>
      {menuOpen && <div className="absolute right-0 top-full z-10 mt-1 flex min-w-56 flex-col rounded border border-slate-800 bg-white p-2">{(['practice', 'settings', 'stats', 'problem-stats', 'operations-overview'] as const).map((s) => <button key={s} onClick={() => {
        setProfile((p) => ({ ...p, session: { ...p.session, lastScreen: s } }));
        setMenuOpen(false);
      }}>{s === 'practice' ? tr.practice : s === 'settings' ? tr.settings : s === 'problem-stats' ? tr.problemStats : s === 'operations-overview' ? tr.operationsOverview : tr.stats}</button>)}<button style={{ background: '#c62828', color: '#fff' }} onClick={resetSession}>Reset</button></div>}
    </nav>
    {profile.session.lastScreen === 'practice' && <section className="flex h-[calc(100vh-8rem)] flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xl font-bold sm:text-2xl md:text-3xl">{timed ? `⏱ ${Math.max(0, Math.ceil(remaining / 1000))}s` : '⏱ ∞'}</div>
        <div className="text-xl font-bold sm:text-2xl md:text-3xl">🪙 {profile.session.coins}</div>
        <div className="progress">📘 {tr.sessionProgressLabel}: {doneExamples}/{sessionExamples}</div>
      </div>
      {!sessionStarted && <button className="rounded bg-green-700 px-3 py-2 font-bold text-white" style={{ background: '#2e7d32', color: '#fff' }} onClick={startPracticeSession}>{tr.startSession}</button>}
      {sessionStarted && <><div className="my-2 text-center text-4xl font-bold leading-tight sm:text-5xl md:text-6xl lg:text-7xl">{profile.session.activeProblem?.expression ?? '...'}</div>
      <div className="min-h-20 rounded border-2 border-black p-3 text-center text-3xl sm:text-4xl md:text-5xl">{profile.session.typedAnswer || '0'}</div></>}

      <div className="min-h-10 text-center text-xl font-bold sm:text-2xl md:text-3xl">{!sessionStarted ? ' ' : ended ? sessionEndMessage : feedback === 'correct' ? `✅ ${tr.correct}` : feedback === 'wrong' ? `❌ ${tr.wrong}` : ' '}</div>

      {ended && <div className="timeup">
        <p>{timed && remaining <= 0 ? tr.timeUpQuestion : tr.nextSessionQuestion}</p>
        <button className="rounded bg-green-700 px-3 py-2 font-bold text-white" onClick={restartSession}>{tr.restartSession}</button>
        {showCorrectionAction && <button className="rounded bg-green-700 px-3 py-2 font-bold text-white" style={{ background: '#f9a825', color: '#000' }} onClick={() => {
          const correctionQueue = buildCorrectionQueue(profile.session.sessionAttempts);
          const combinedPoolMap = new Map([...pool, ...customProblems].map((problem) => [problem.key, problem]));
          const nextProblem = correctionQueue.length > 0 ? combinedPoolMap.get(correctionQueue[0]) ?? null : null;
          setProfile((p) => ({ ...p, session: { ...p.session, correctionModeActive: correctionQueue.length > 0, correctionQueue, correctionSolvedKeys: [], activeProblem: nextProblem, typedAnswer: '', problemStartedAt: Date.now(), sessionEndsAt: null } }));
        }}>{tr.correctionMode}</button>}
        {!showCorrectionAction && correctionModeCompleted && <p className="rounded border border-green-300 bg-green-50 px-3 py-2 font-semibold text-green-800">{tr.correctionDoneNotice}</p>}
        <button className="rounded bg-slate-200 px-3 py-2 font-bold text-slate-700" onClick={() => { const content = profile.session.algorithmLog.join('\n'); const blob = new Blob([content], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `session-algorithm-log-${Date.now()}.txt`; a.click(); }}>⬇️ Algorithmus-Log</button>
        <ul>
          {buildCorrectionQueue(profile.session.sessionAttempts).map((key) => {
            const problem = [...pool, ...customProblems].find((p) => p.key === key);
            return <li key={key}>{problem?.expression ?? key}</li>;
          })}
        </ul>
      </div>}

      {sessionStarted && <div className="grid grid-cols-1 gap-2">
        <div className="grid grid-cols-10 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => <button className="min-h-14 rounded border border-slate-400 px-2 py-3 text-lg font-semibold sm:min-h-16 sm:text-xl md:min-h-20 md:text-2xl" key={d} disabled={ended} onClick={() => pushDigit(d)}>{d}</button>)}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button className="rounded bg-red-700 px-3 py-2 font-bold text-white disabled:opacity-50" disabled={ended} onClick={() => setProfile((p) => ({ ...p, session: { ...p.session, typedAnswer: p.session.typedAnswer.slice(0, -1) } }))}>⌫ {tr.del}</button>
          <button className="rounded bg-blue-700 px-3 py-2 font-bold text-white disabled:opacity-50" disabled={ended || profile.session.correctionModeActive} onClick={skipToNextProblem}>→ {tr.next}</button>
          <button className="rounded bg-green-700 px-3 py-2 font-bold text-white disabled:opacity-50" disabled={ended} onClick={submit}>↵ {tr.ok}</button>
        </div>
      </div>}
    </section>}
    {profile.session.lastScreen === 'settings' && <section className="max-h-[calc(100vh-8rem)] space-y-4 overflow-auto pr-1">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-lg font-bold">{tr.settings}</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1"><span className="text-sm font-semibold text-slate-700">{tr.modeLabel}</span><select className="h-11 rounded-lg border border-slate-300 px-3" value={profile.settings.mode} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, mode: e.target.value as Settings['mode'] } }))}><option value="timed">{tr.modeTimed}</option><option value="no-pressure">{tr.modeNoPressure}</option></select></label>
          <label className="flex flex-col gap-1"><span className="text-sm font-semibold text-slate-700">{tr.minutesLabel}</span><select className="h-11 rounded-lg border border-slate-300 px-3" value={profile.settings.sessionMinutes} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, sessionMinutes: Number(e.target.value) as Settings['sessionMinutes'] } }))}>{[1, 3, 5, 10, 15].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className="text-sm font-semibold text-slate-700">{tr.maxLabel}</span><select className="h-11 rounded-lg border border-slate-300 px-3" value={profile.settings.max} onChange={(e) => setProfile((p) => {
            const nextMax = Number(e.target.value) as Settings['max'];
            const nextMinuendMin = Math.min(nextMax, p.settings.subtractionMinuendMin);
            const nextMinuendMax = Math.max(nextMinuendMin, Math.min(nextMax, p.settings.subtractionMinuendMax));
            return { ...p, settings: { ...p.settings, max: nextMax, subtractionMinuendMin: nextMinuendMin, subtractionMinuendMax: nextMinuendMax } };
          })}>{[5, 10, 20].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className="text-sm font-semibold text-slate-700">{tr.termsLabel}</span><select className="h-11 rounded-lg border border-slate-300 px-3" value={profile.settings.terms} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, terms: Number(e.target.value) as Settings['terms'] } }))}>{[2, 3, 4, 5].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
        </div>
      </div>

      <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">{tr.operationsLegend}</legend>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={profile.settings.additionEnabled} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, additionEnabled: e.target.checked } }))} /> {tr.additionLabel}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={profile.settings.subtractionEnabled} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, subtractionEnabled: e.target.checked } }))} /> {tr.subtractionLabel}</label>
        </div>
        {profile.settings.subtractionEnabled && <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1"><span className="text-sm text-slate-700">{tr.subtractionMinuendMinLabel}</span><input className="h-11 rounded-lg border border-slate-300 px-3" type="number" min={profile.settings.min} max={profile.settings.subtractionMinuendMax} step={1} value={profile.settings.subtractionMinuendMin} onChange={(e) => {
            const value = Number(e.target.value);
            if (!Number.isFinite(value)) return;
            setProfile((p) => ({ ...p, settings: { ...p.settings, subtractionMinuendMin: Math.max(p.settings.min, Math.min(p.settings.subtractionMinuendMax, Math.floor(value))) } }));
          }} /></label>
          <label className="flex flex-col gap-1"><span className="text-sm text-slate-700">{tr.subtractionMinuendMaxLabel}</span><input className="h-11 rounded-lg border border-slate-300 px-3" type="number" min={profile.settings.subtractionMinuendMin} max={profile.settings.max} step={1} value={profile.settings.subtractionMinuendMax} onChange={(e) => {
            const value = Number(e.target.value);
            if (!Number.isFinite(value)) return;
            setProfile((p) => ({ ...p, settings: { ...p.settings, subtractionMinuendMax: Math.max(p.settings.subtractionMinuendMin, Math.min(p.settings.max, Math.floor(value))) } }));
          }} /></label>
        </div>}
      </fieldset>

      <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">{tr.exclusionsTitle}</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={profile.settings.excludeResultZero} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, excludeResultZero: e.target.checked } }))} /> {tr.excludeResultZero}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={profile.settings.excludePlusMinusZero} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, excludePlusMinusZero: e.target.checked } }))} /> {tr.excludePlusMinusZero}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={profile.settings.excludePlusMinusOne} onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, excludePlusMinusOne: e.target.checked } }))} /> {tr.excludePlusMinusOne}</label>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">{tr.customTasksTitle}</legend>
        <label className="mt-2 flex flex-col gap-2"><span className="text-sm text-slate-700">{tr.customTasksHint}</span>
          <textarea
            className="min-h-44 rounded-lg border border-slate-300 p-3"
            value={profile.settings.customTasksText}
            onChange={(e) => setProfile((p) => ({ ...p, settings: { ...p.settings, customTasksText: e.target.value } }))}
            rows={8}
            placeholder={tr.customTasksPlaceholder}
          />
        </label>
      </fieldset>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex max-w-xs flex-col gap-1"><span className="text-sm font-semibold text-slate-700">{tr.examplesPerSessionLabel}</span><input className="h-11 rounded-lg border border-slate-300 px-3" type="number" min={1} max={200} step={1} value={profile.settings.examplesPerSession} onChange={(e) => {
          const value = Number(e.target.value);
          if (!Number.isFinite(value)) return;
          setProfile((p) => ({ ...p, settings: { ...p.settings, examplesPerSession: Math.max(1, Math.min(200, Math.floor(value))) } }));
        }} /></label>
      </div>

      <fieldset className="rounded-xl border border-red-300 bg-red-50 p-4">
        <legend className="px-1 text-sm font-semibold text-red-800">{tr.dangerZoneTitle}</legend>
        <button className="mt-2 rounded bg-red-700 px-3 py-2 font-bold text-white" onClick={() => {
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

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <button className="rounded border border-slate-400 px-3 py-2 font-semibold" onClick={() => { const blob = new Blob([exportProfile(profile)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'math-profile.json'; a.click(); }}>{tr.exportJson}</button>
          <input className="block" type="file" accept="application/json" onChange={async (e) => {
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
        </div>
        <div className="mt-2 text-sm">{importMessage}</div>
      </div>
    </section>}
    {profile.session.lastScreen === 'stats' && <section className="max-h-[calc(100vh-8rem)] overflow-auto pr-1"><div>{tr.correct}: {profile.session.currentStats.correct} · {tr.wrong}: {profile.session.currentStats.wrong}</div><table><thead><tr><th>{tr.leaderboardPlayer}</th><th>{tr.leaderboardCoins}</th><th>{tr.leaderboardDate}</th></tr></thead><tbody>{profile.leaderboard.map((entry, idx) => <tr key={`${entry.userName}-${entry.completedAt}-${idx}`}><td>{entry.userName}</td><td>{entry.coins}</td><td>{new Date(entry.completedAt).toLocaleString()}</td></tr>)}</tbody></table></section>}
    {profile.session.lastScreen === 'problem-stats' && <section className="max-h-[calc(100vh-8rem)] overflow-auto pr-1"><table><thead><tr><th>{tr.statsProblem}</th><th>{tr.statsCorrect}</th><th>{tr.statsWrong}</th><th>{tr.statsAvgMs}</th><th>{tr.statsDifficulty}</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.key}><td>{r.expression}</td><td>{r.correct}</td><td>{r.wrong}</td><td>{r.averageResponseTimeMs}</td><td>{r.difficultyScore}</td></tr>)}</tbody></table></section>}

    {profile.session.lastScreen === 'operations-overview' && <section className="max-h-[calc(100vh-8rem)] overflow-auto pr-1">
      <h3>{tr.operationsOverview}</h3>
      {[{ key: '+', title: tr.additionUpToTwenty }, { key: '-', title: tr.subtractionUpToTwenty }].map((operation) => <div key={operation.key} className="my-3">
        <h4>{operation.title}</h4>
        <div className="overflow-auto">
        <table className="w-full min-w-max border-collapse text-xs sm:text-sm md:text-base">
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
                  return <td key={`empty-${operation.key}-${left}-${right}`} className="border border-slate-500 bg-slate-100 p-1 text-center font-bold text-slate-500">—</td>;
                }
                const operationKey = `${operation.key}:${left}:${right}`;
                const stats = operationStats.totals[operationKey] ?? { attempts: 0, correct: 0, wrong: 0 };
                const hasAttempts = stats.attempts > 0;
                const bg = hasAttempts ? toGrayShade(Math.max(0.2, stats.attempts / operationStats.maxAttempts)) : '#fff';
                const color = stats.wrong > 0 ? toErrorRedShade(stats.wrong / operationStats.maxWrong) : '#111';
                const title = `${left} ${operation.key} ${right} = ${result} • ${tr.statsTooltipAttempts}: ${stats.attempts} • ${tr.statsTooltipCorrect}: ${stats.correct} • ${tr.statsTooltipWrong}: ${stats.wrong}`;
                return <td key={`result-${operation.key}-${left}-${right}`} className={`border border-slate-500 p-1 text-center font-bold ${hasAttempts ? 'ring-2 ring-black' : ''}`} style={{ background: bg, color }} title={title}>{result}</td>;
              })}
            </tr>)}
          </tbody>
        </table>
        </div>
      </div>)}
    </section>}
  </div>;
}
