import { describe, expect, it } from 'vitest';
import { getSessionEndMessage } from '../src/lib/sessionEndMessage';

describe('getSessionEndMessage', () => {
  it('uses time-up message when timed mode ends by timeout without correction completion', () => {
    const message = getSessionEndMessage({ language: 'de', ended: true, timed: true, remainingMs: 0, mistakes: 0, correctionModeCompleted: false });
    expect(message).toContain('Die Zeit ist um');
  });

  it('uses non-time message when correction mode has been completed', () => {
    const message = getSessionEndMessage({ language: 'de', ended: true, timed: true, remainingMs: 0, mistakes: 1, correctionModeCompleted: true });
    expect(message).not.toContain('Zeit');
    expect(message).not.toContain('vor Ablauf der Zeit');
  });
});
