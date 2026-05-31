import { describe, expect, it, vi } from 'vitest';
import { playDigitSound, playVisualizationCrossSound, playVisualizationStepCorrectSound, playVisualizationStepWrongSound } from '../src/lib/audio';

describe('audio', () => {
  it('does nothing when disabled', () => {
    const audioContext = vi.fn();
    vi.stubGlobal('window', { AudioContext: audioContext });
    playDigitSound(false);
    playVisualizationCrossSound(false);
    playVisualizationStepCorrectSound(false);
    playVisualizationStepWrongSound(false);
    expect(audioContext).not.toHaveBeenCalled();
  });
});
