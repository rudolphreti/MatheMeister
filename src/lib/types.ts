export type Mode = 'timed' | 'no-pressure';
export type Language = 'de';
export type Operator = '+' | '-';

export interface Settings {
  mode: Mode;
  sessionMinutes: 1 | 3 | 5 | 10 | 15;
  min: number;
  max: 5 | 10 | 20;
  additionEnabled: boolean;
  subtractionEnabled: boolean;
  terms: 2 | 3 | 4 | 5;
  soundEnabled: boolean;
  language: Language;
  examplesPerSession: number;
}

export interface Problem {
  key: string;
  expression: string;
  answer: number;
}

export interface ProblemStat {
  key: string;
  expression: string;
  attempts: number;
  correct: number;
  wrong: number;
  averageResponseTimeMs: number;
  difficultyScore: number;
  lastSeenAt: number;
}

export interface SessionState {
  activeProblem: Problem | null;
  typedAnswer: string;
  sessionStartAt: number | null;
  sessionEndsAt: number | null;
  sessionDurationMs: number;
  coins: number;
  currentStats: { correct: number; wrong: number };
  lastScreen: 'practice' | 'settings' | 'stats' | 'problem-stats';
}

export interface ProfileV1 {
  schemaVersion: 1;
  userName: string;
  leaderboard: Array<{ userName: string; coins: number; completedAt: number }>;
  settings: Settings;
  session: SessionState;
  problemStats: Record<string, ProblemStat>;
}
