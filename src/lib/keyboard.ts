export type KeyboardTargetKind = 'page' | 'editable' | 'button';

export type GlobalKeyboardAction =
  | { type: 'confirmUser' }
  | { type: 'startSession' }
  | { type: 'startCorrection' }
  | { type: 'restartSession' }
  | { type: 'closeMenu' }
  | { type: 'suppress' }
  | { type: 'submitAnswer' }
  | { type: 'appendDigit'; digit: string }
  | { type: 'deleteDigit' };

type GlobalKeyboardActionInput = {
  key: string;
  nameConfirmed: boolean;
  sessionStarted: boolean;
  ended: boolean;
  targetKind: KeyboardTargetKind;
  practiceScreen: boolean;
  menuOpen: boolean;
  canStartCorrection: boolean;
  canRestartSession: boolean;
};

export function getKeyboardTargetKind(target: EventTarget | null): KeyboardTargetKind {
  if (!(target instanceof Element)) return 'page';
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return 'editable';
  if (target.closest('button, a[href]')) return 'button';
  return 'page';
}

export function getGlobalKeyboardAction(input: GlobalKeyboardActionInput): GlobalKeyboardAction | null {
  if (input.menuOpen) {
    if (input.key === 'Escape') return { type: 'closeMenu' };
    if (input.key === 'Enter') return { type: 'suppress' };
    return null;
  }

  if (input.targetKind === 'editable') return null;

  if (!input.nameConfirmed) {
    return input.key === 'Enter' ? { type: 'confirmUser' } : null;
  }

  if (!input.practiceScreen) return null;

  if (!input.sessionStarted) {
    if (input.targetKind === 'button') return null;
    return input.key === 'Enter' ? { type: 'startSession' } : null;
  }

  if (input.ended) {
    if (input.key !== 'Enter' || input.targetKind === 'button') return null;
    if (input.canStartCorrection) return { type: 'startCorrection' };
    if (input.canRestartSession) return { type: 'restartSession' };
    return null;
  }

  if (/^[0-9]$/.test(input.key)) return { type: 'appendDigit', digit: input.key };
  if (input.key === 'Backspace') return { type: 'deleteDigit' };
  if (input.key === 'Enter' && input.targetKind !== 'button') return { type: 'submitAnswer' };
  return null;
}
