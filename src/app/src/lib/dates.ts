/**
 * Date utilities
 */

export const iso = (d: Date = new Date()): string => d.toISOString();

export const now = (): string => iso();

// Every calendar-date field in this app (task due date, project start/end
// date) means a day with no time-of-day meaning -- but the database stores
// it as a UTC-midnight timestamp (`2026-08-08T00:00:00+00:00`). Parsing
// that with `new Date(...)` and then formatting in the browser's local
// timezone rolls it back a day in any negative-UTC-offset zone (e.g.
// UTC-6): midnight UTC on the 8th is 6pm on the 7th locally. Reading the
// Y/M/D digits directly out of the string and building a *local* date from
// them sidesteps that conversion entirely, so "Aug 8" always displays as
// "Aug 8" no matter the viewer's timezone. Every calendar-date formatter in
// this file must go through this helper -- never `new Date(calendarDateStr)`
// directly.
const toLocalCalendarDate = (date: string | Date): Date => {
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return new Date(date);
  }
  return date;
};

export const formatDate = (date: string | Date): string =>
  toLocalCalendarDate(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

/** Same as formatDate but without the year, e.g. "Aug 8". */
export const formatDateShort = (date: string | Date): string =>
  toLocalCalendarDate(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
