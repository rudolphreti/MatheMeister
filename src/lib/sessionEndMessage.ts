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

  if (timed && remainingMs <= 0 && !correctionModeCompleted) {
    if (mistakes === 0) return tr.timeUpPerfect;
    if (mistakes <= 2) return tr.timeUpFewMistakes.replace('{mistakes}', String(mistakes));
    if (mistakes <= 5) return tr.timeUpSomeMistakes.replace('{mistakes}', String(mistakes));
    return tr.timeUpManyMistakes.replace('{mistakes}', String(mistakes));
  }

  if (mistakes === 0) return tr.donePerfect;
  if (mistakes <= 2) return tr.doneFewMistakes.replace('{mistakes}', String(mistakes));
  if (mistakes <= 5) return tr.doneSomeMistakes.replace('{mistakes}', String(mistakes));
  return tr.doneManyMistakes.replace('{mistakes}', String(mistakes));
}
