import { describe, expect, it } from 'vitest';
import { getSessionEndMessage } from '../src/lib/sessionEndMessage';

describe('getSessionEndMessage', () => {
  it('uses time-up message when timed mode ends by timeout without correction completion', () => {
    const message = getSessionEndMessage({
      language: 'de', ended: true, timed: true, remainingMs: 0, mistakes: 0, correctionModeCompleted: false
    });
    expect(message).toContain('Die Zeit ist um');
    expect(message).not.toContain('Aufgaben wurden in dieser Sitzung nicht erledigt');
  });

  it('uses non-time message when correction mode has been completed', () => {
    const message = getSessionEndMessage({
      language: 'de', ended: true, timed: true, remainingMs: 0, mistakes: 1, correctionModeCompleted: true
    });
    expect(message).not.toContain('Zeit');
    expect(message).not.toContain('vor Ablauf der Zeit');
  });

  it('keeps correction and unfinished details out of the compact message', () => {
    const message = getSessionEndMessage({
      language: 'de', ended: true, timed: false, remainingMs: 1000, mistakes: 4, correctionModeCompleted: true
    });

    expect(message).not.toContain('Aufgaben wurden in dieser Sitzung nicht erledigt');
    expect(message).not.toContain('Korrektur – Aufgaben mit Fehlern');
    expect(message).not.toContain('Korrektur – nicht erledigte Aufgaben');
  });
});
