import { t } from './i18n';
import { Language } from './types';

type Params = {
  language: Language;
  ended: boolean;
  timed: boolean;
  remainingMs: number;
  mistakes: number;
  correctionModeCompleted: boolean;
};

export function getSessionEndMessage(params: Params): string {
  const { language, ended, timed, remainingMs, mistakes, correctionModeCompleted } = params;
  if (!ended) return '';
  const tr = t(language);
  let base = '';
  if (timed && remainingMs <= 0 && !correctionModeCompleted) {
    if (mistakes === 0) base = tr.timeUpPerfect;
    else if (mistakes <= 2) base = tr.timeUpFewMistakes.replace('{mistakes}', String(mistakes));
    else if (mistakes < 5) base = tr.timeUpSomeMistakes.replace('{mistakes}', String(mistakes));
    else base = tr.timeUpManyMistakes.replace('{mistakes}', String(mistakes));
  } else if (mistakes === 0) {
    base = tr.donePerfect;
  } else if (mistakes <= 2) {
    base = tr.doneFewMistakes.replace('{mistakes}', String(mistakes));
  } else if (mistakes < 5) {
    base = tr.doneSomeMistakes.replace('{mistakes}', String(mistakes));
  } else {
    base = tr.doneManyMistakes.replace('{mistakes}', String(mistakes));
  }

  return base;
}
