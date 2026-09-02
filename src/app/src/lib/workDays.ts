// Single source of truth for "is this a working day" -- the crew works
// Monday-Saturday, off Sundays only. Before this file existed, this logic
// was duplicated and INCONSISTENT in two places: applyTemplateToProject's
// local addWorkDays (skipped only Sunday -- correct) and
// TaskGanttChart's isWeekend (flagged both Saturday AND Sunday as
// non-working -- wrong, contradicted the real 6-day week). Both now import
// from here instead of hand-rolling their own version.
//
// All functions here operate on calendar-date-only values (no time-of-day),
// consistent with src/app/src/lib/dates.ts's convention -- never use these
// for real timestamps (session start/pause/etc), which belong in
// src/app/src/lib/timezone.ts instead.

/** Sunday is the only non-working day. */
export function isWorkingDay(date: Date): boolean {
  return date.getDay() !== 0;
}

/** Adds `days` work-days to a date, skipping Sundays. */
export function addWorkDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (isWorkingDay(result)) {
      remaining--;
    }
  }
  return result;
}

/** Number of working days (Sundays excluded) strictly between two dates,
 *  counting the days after `start` up to and including `end`. Returns 0 or
 *  negative if `end` is not after `start`. */
export function workDaysBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    if (isWorkingDay(cursor)) count++;
  }
  return count;
}
