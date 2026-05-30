import { describe, expect, it } from 'vitest';
import { getGlobalKeyboardAction, shouldSuppressFullscreenToggleKey } from '../src/lib/keyboard';

type KeyboardInput = Parameters<typeof getGlobalKeyboardAction>[0];

const baseInput: KeyboardInput = {
  key: 'Enter',
  nameConfirmed: true,
  sessionStarted: true,
  ended: false,
  targetKind: 'page',
  practiceScreen: true,
  menuOpen: false,
  canStartCorrection: false,
  canRestartSession: false
};

const actionFor = (overrides: Partial<KeyboardInput>) => getGlobalKeyboardAction({ ...baseInput, ...overrides });

describe('global keyboard actions', () => {
  it('confirms the user with Enter when focus is not inside the name input', () => {
    expect(actionFor({ key: 'Enter', nameConfirmed: false, sessionStarted: false, ended: false })).toEqual({ type: 'confirmUser' });
  });

  it('starts the practice session with Enter before the workspace is focused', () => {
    expect(actionFor({ key: 'Enter', sessionStarted: false, ended: false })).toEqual({ type: 'startSession' });
  });

  it('starts correction with Enter when the main session has mistakes to correct', () => {
    expect(actionFor({ key: 'Enter', ended: true, canStartCorrection: true, canRestartSession: true })).toEqual({ type: 'startCorrection' });
  });

  it('restarts with Enter after correction is completed', () => {
    expect(actionFor({ key: 'Enter', ended: true, canRestartSession: true })).toEqual({ type: 'restartSession' });
  });

  it('accepts answer typing keys globally during an active session', () => {
    expect(actionFor({ key: '7' })).toEqual({ type: 'appendDigit', digit: '7' });
    expect(actionFor({ key: 'Backspace' })).toEqual({ type: 'deleteDigit' });
    expect(actionFor({ key: 'Enter' })).toEqual({ type: 'submitAnswer' });
  });

  it('does not hijack text inputs or ended sessions without a visible end action', () => {
    expect(actionFor({ key: '5', targetKind: 'editable' })).toBeNull();
    expect(actionFor({ key: '5', ended: true })).toBeNull();
    expect(actionFor({ key: 'Enter', ended: true })).toBeNull();
  });

  it('suppresses Enter actions while the menu is open', () => {
    expect(actionFor({ key: 'Enter', menuOpen: true, ended: true, canStartCorrection: true, canRestartSession: true })).toEqual({ type: 'suppress' });
    expect(actionFor({ key: 'Enter', menuOpen: true, sessionStarted: false })).toEqual({ type: 'suppress' });
  });

  it('closes an open menu with Escape', () => {
    expect(actionFor({ key: 'Escape', menuOpen: true })).toEqual({ type: 'closeMenu' });
  });

  it('ignores practice shortcuts outside the practice screen', () => {
    expect(actionFor({ key: '4', practiceScreen: false })).toBeNull();
    expect(actionFor({ key: 'Enter', sessionStarted: false, ended: false, practiceScreen: false })).toBeNull();
  });
});

describe('fullscreen keyboard behavior', () => {
  it('suppresses keyboard activation keys on the fullscreen toggle button', () => {
    expect(shouldSuppressFullscreenToggleKey('Enter')).toBe(true);
    expect(shouldSuppressFullscreenToggleKey(' ')).toBe(true);
    expect(shouldSuppressFullscreenToggleKey('f')).toBe(false);
  });
});
