export type KeyboardTargetKind = 'page' | 'editable' | 'button';

export function shouldSuppressFullscreenToggleKey(key: string): boolean {
  return key === 'Enter' || key === ' ';
}

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
  const isEnter = input.key === 'Enter';
  const isButtonEnter = isEnter && input.targetKind === 'button';

  if (input.menuOpen) {
    if (input.key === 'Escape') return { type: 'closeMenu' };
    if (isEnter) return { type: 'suppress' };
    return null;
  }

  if (input.targetKind === 'editable') return null;

  if (!input.nameConfirmed) {
    return isEnter ? { type: 'confirmUser' } : null;
  }

  if (!input.practiceScreen) return isButtonEnter ? { type: 'suppress' } : null;

  if (!input.sessionStarted) {
    return isEnter ? { type: 'startSession' } : null;
  }

  if (input.ended) {
    if (!isEnter) return null;
    if (input.canStartCorrection) return { type: 'startCorrection' };
    if (input.canRestartSession) return { type: 'restartSession' };
    return isButtonEnter ? { type: 'suppress' } : null;
  }

  if (/^[0-9]$/.test(input.key)) return { type: 'appendDigit', digit: input.key };
  if (input.key === 'Backspace') return { type: 'deleteDigit' };
  if (isEnter) return { type: 'submitAnswer' };
  return null;
}
