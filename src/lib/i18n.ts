import { Language } from './types';

export const t = (lang: Language) => ({
  practice: lang === 'de' ? 'Üben' : 'Ćwiczenia',
  settings: lang === 'de' ? 'Einstellungen' : 'Ustawienia',
  stats: lang === 'de' ? 'Statistiken' : 'Statystyki',
  correct: lang === 'de' ? 'Richtig' : 'Dobrze',
  wrong: lang === 'de' ? 'Falsch' : 'Źle',
  ok: 'OK',
  del: lang === 'de' ? 'Löschen' : 'Usuń'
});
