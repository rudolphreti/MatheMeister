import { describe, expect, it } from 'vitest';
import { getSessionEndMessage } from '../src/lib/sessionEndMessage';

describe('getSessionEndMessage', () => {
  it('uses time-up message when timed mode ends by timeout without correction completion', () => {
    const message = getSessionEndMessage({
      language: 'de', ended: true, timed: true, remainingMs: 0, mistakes: 0, correctionModeCompleted: false,
      unfinishedSessionTasks: 3, correctionModeMistakes: 0, correctionModeUnfinished: 0
    });
    expect(message).toContain('Die Zeit ist um');
    expect(message).toContain('3 Aufgaben wurden in dieser Sitzung nicht erledigt');
  });

  it('uses non-time message when correction mode has been completed', () => {
    const message = getSessionEndMessage({
      language: 'de', ended: true, timed: true, remainingMs: 0, mistakes: 1, correctionModeCompleted: true,
      unfinishedSessionTasks: 0, correctionModeMistakes: 0, correctionModeUnfinished: 0
    });
    expect(message).not.toContain('Zeit');
    expect(message).not.toContain('vor Ablauf der Zeit');
  });

  it('separates correction mistakes and correction unfinished tasks from session unfinished tasks', () => {
    const message = getSessionEndMessage({
      language: 'de', ended: true, timed: false, remainingMs: 1000, mistakes: 4, correctionModeCompleted: true,
      unfinishedSessionTasks: 2, correctionModeMistakes: 3, correctionModeUnfinished: 5
    });

    expect(message).toContain('2 Aufgaben wurden in dieser Sitzung nicht erledigt');
    expect(message).toContain('Korrektur – Aufgaben mit Fehlern: 3');
    expect(message).toContain('Korrektur – nicht erledigte Aufgaben: 5');
  });
});
