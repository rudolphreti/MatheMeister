import { describe, expect, it } from 'vitest';
import { getGlobalKeyboardAction } from '../src/lib/keyboard';

describe('global keyboard actions', () => {
  it('confirms the user with Enter when focus is not inside the name input', () => {
    expect(getGlobalKeyboardAction({ key: 'Enter', nameConfirmed: false, sessionStarted: false, ended: false, targetKind: 'page', practiceScreen: true })).toEqual({ type: 'confirmUser' });
  });

  it('starts the practice session with Enter before the workspace is focused', () => {
    expect(getGlobalKeyboardAction({ key: 'Enter', nameConfirmed: true, sessionStarted: false, ended: false, targetKind: 'page', practiceScreen: true })).toEqual({ type: 'startSession' });
  });

  it('accepts answer typing keys globally during an active session', () => {
    expect(getGlobalKeyboardAction({ key: '7', nameConfirmed: true, sessionStarted: true, ended: false, targetKind: 'page', practiceScreen: true })).toEqual({ type: 'appendDigit', digit: '7' });
    expect(getGlobalKeyboardAction({ key: 'Backspace', nameConfirmed: true, sessionStarted: true, ended: false, targetKind: 'page', practiceScreen: true })).toEqual({ type: 'deleteDigit' });
    expect(getGlobalKeyboardAction({ key: 'Enter', nameConfirmed: true, sessionStarted: true, ended: false, targetKind: 'page', practiceScreen: true })).toEqual({ type: 'submitAnswer' });
  });

  it('does not hijack text inputs or ended sessions', () => {
    expect(getGlobalKeyboardAction({ key: '5', nameConfirmed: true, sessionStarted: true, ended: false, targetKind: 'editable', practiceScreen: true })).toBeNull();
    expect(getGlobalKeyboardAction({ key: '5', nameConfirmed: true, sessionStarted: true, ended: true, targetKind: 'page', practiceScreen: true })).toBeNull();
  });

  it('ignores practice shortcuts outside the practice screen', () => {
    expect(getGlobalKeyboardAction({ key: '4', nameConfirmed: true, sessionStarted: true, ended: false, targetKind: 'page', practiceScreen: false })).toBeNull();
    expect(getGlobalKeyboardAction({ key: 'Enter', nameConfirmed: true, sessionStarted: false, ended: false, targetKind: 'page', practiceScreen: false })).toBeNull();
  });
});
