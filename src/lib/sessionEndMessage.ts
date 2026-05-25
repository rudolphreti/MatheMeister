import { t } from './i18n';
import { Language } from './types';

type Params = {
  language: Language;
  ended: boolean;
  timed: boolean;
  remainingMs: number;
  mistakes: number;
  correctionModeCompleted: boolean;
  unfinishedSessionTasks: number;
  correctionModeMistakes: number;
  correctionModeUnfinished: number;
};

function buildSuffix(tr: ReturnType<typeof t>, params: Params): string {
  const details: string[] = [];

  if (params.unfinishedSessionTasks > 0) {
    details.push(tr.sessionUnfinishedTasks.replace('{count}', String(params.unfinishedSessionTasks)));
  }

  if (params.correctionModeMistakes > 0) {
    details.push(tr.correctionMistakes.replace('{count}', String(params.correctionModeMistakes)));
  }

  if (params.correctionModeUnfinished > 0) {
    details.push(tr.correctionUnfinished.replace('{count}', String(params.correctionModeUnfinished)));
  }

  if (details.length === 0) return '';
  return ` ${details.join(' ')}`;
}

export function getSessionEndMessage(params: Params): string {
  const { language, ended, timed, remainingMs, mistakes, correctionModeCompleted } = params;
  if (!ended) return '';
  const tr = t(language);
  const suffix = buildSuffix(tr, params);

  let base = '';
  if (timed && remainingMs <= 0 && !correctionModeCompleted) {
    if (mistakes === 0) base = tr.timeUpPerfect;
    else if (mistakes <= 2) base = tr.timeUpFewMistakes.replace('{mistakes}', String(mistakes));
    else if (mistakes <= 5) base = tr.timeUpSomeMistakes.replace('{mistakes}', String(mistakes));
    else base = tr.timeUpManyMistakes.replace('{mistakes}', String(mistakes));
  } else if (mistakes === 0) {
    base = tr.donePerfect;
  } else if (mistakes <= 2) {
    base = tr.doneFewMistakes.replace('{mistakes}', String(mistakes));
  } else if (mistakes <= 5) {
    base = tr.doneSomeMistakes.replace('{mistakes}', String(mistakes));
  } else {
    base = tr.doneManyMistakes.replace('{mistakes}', String(mistakes));
  }

  return `${base}${suffix}`;
}
