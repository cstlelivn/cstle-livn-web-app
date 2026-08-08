// Cstle Livn currently operates only in Saskatchewan, which does not
// observe daylight saving time (fixed UTC-6 year-round). Site-anchored
// timestamps -- work session start/pause/finish, QC review times, task
// activity -- should always read as "what time did this happen at the
// job site," not "what time is it on whoever's screen is open right now."
// A viewer checking the app from another region (or with their device
// clock/timezone set wrong) must see the same site-local time everyone
// else does.
//
// If Cstle Livn ever takes on a project outside Saskatchewan, this single
// constant stops being correct and timezone needs to move to a per-project
// field instead -- deliberately not built now since there's no real
// multi-region need yet.
export const ORG_TIMEZONE = 'America/Regina';

// IMPORTANT: the functions below convert a real instant (a UTC timestamp
// that actually happened at a specific moment -- session start/pause,
// submitted_at, created_at) into Regina wall-clock time. They are the
// WRONG tool for calendar-date-only fields like due_date/start_date/
// end_date, which are stored as a synthetic UTC-midnight marker
// (`2026-08-08T00:00:00+00:00`) that means "the 8th," full stop -- no
// time-of-day, no timezone. Converting that marker to Regina time (UTC-6)
// rolls it back to 6pm on the 7th, reintroducing the exact due-date bug
// fixed in `lib/dates.ts`. For due dates / start dates / end dates, use
// `formatDate` from `lib/dates.ts` instead, which reads the Y/M/D digits
// directly and never performs a timezone conversion.

function partsToDate(parts: Intl.DateTimeFormatPart[]): { month: string; day: string; year: string; hour: string; minute: string; dayPeriod: string } {
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return {
    month: get('month'),
    day: get('day'),
    year: get('year'),
    hour: get('hour'),
    minute: get('minute'),
    dayPeriod: get('dayPeriod'),
  };
}

/** Formats a Date as MM/DD/YYYY in the fixed org timezone. */
export function formatDateInOrgTz(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ORG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const { month, day, year } = partsToDate(parts);
  return `${month}/${day}/${year}`;
}

/** Formats a Date as MM/DD/YYYY, h:mm A in the fixed org timezone. */
export function formatDateTimeInOrgTz(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ORG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);
  const { month, day, year, hour, minute, dayPeriod } = partsToDate(parts);
  return `${month}/${day}/${year}, ${hour}:${minute} ${dayPeriod}`;
}

/** Formats a Date as h:mm A in the fixed org timezone. */
export function formatTimeInOrgTz(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ORG_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);
  const { hour, minute, dayPeriod } = partsToDate(parts);
  return `${hour}:${minute} ${dayPeriod}`;
}
