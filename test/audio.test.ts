import { describe, expect, it, vi } from 'vitest';
import { playDigitSound } from '../src/lib/audio';

describe('audio', () => {
  it('does nothing when disabled', () => {
    const audioContext = vi.fn();
    vi.stubGlobal('window', { AudioContext: audioContext });
    playDigitSound(false);
    expect(audioContext).not.toHaveBeenCalled();
  });
});
