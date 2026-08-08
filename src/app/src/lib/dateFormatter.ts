/**
 * Centralized Date/Time Formatting Utility
 * 
 * All timestamps in the app should use these functions to ensure consistent formatting
 * across all components and features.
 * 
 * Format Standard: MM/DD/YYYY, h:mm A (e.g., 11/26/2025, 1:35 PM)
 * Timezone: Always displays in the fixed org timezone (see lib/timezone.ts)
 *   -- NOT the viewer's device timezone. Cstle Livn's work happens at a
 *   physical job site; "what time did this happen" must read the same
 *   regardless of who's looking or from where.
 * Storage: Timestamps are stored in UTC in the database
 */

import { format, parseISO, isValid } from 'date-fns';
import { formatDateInOrgTz, formatDateTimeInOrgTz, formatTimeInOrgTz } from './timezone';

/**
 * Standard date/time format for the entire application
 * Format: MM/DD/YYYY, h:mm A
 * Example: 11/26/2025, 1:35 PM
 */
export const STANDARD_DATETIME_FORMAT = "MM/dd/yyyy, h:mm a";

/**
 * Date-only format (without time)
 * Format: MM/DD/YYYY
 * Example: 11/26/2025
 */
export const STANDARD_DATE_FORMAT = "MM/dd/yyyy";

/**
 * Time-only format
 * Format: h:mm A
 * Example: 1:35 PM
 */
export const STANDARD_TIME_FORMAT = "h:mm a";

/**
 * Format a timestamp to the standard app format
 * Converts UTC timestamps to local timezone automatically
 * 
 * @param timestamp - ISO string, Date object, or timestamp
 * @param includeTime - Whether to include time (default: true)
 * @returns Formatted date string in local timezone
 */
export function formatDateTime(timestamp: string | Date | number | null | undefined, includeTime: boolean = true): string {
  if (!timestamp) {
    return 'N/A';
  }

  try {
    let date: Date;

    // Parse the timestamp into a Date object
    if (typeof timestamp === 'string') {
      date = parseISO(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return 'Invalid Date';
    }

    // Validate the date
    if (!isValid(date)) {
      return 'Invalid Date';
    }

    return includeTime ? formatDateTimeInOrgTz(date) : formatDateInOrgTz(date);
  } catch (error) {
    console.error('Error formatting date:', error, 'Timestamp:', timestamp);
    return 'Invalid Date';
  }
}

/**
 * Format a timestamp to date only (no time)
 * 
 * @param timestamp - ISO string, Date object, or timestamp
 * @returns Formatted date string (MM/DD/YYYY)
 */
export function formatDate(timestamp: string | Date | number | null | undefined): string {
  return formatDateTime(timestamp, false);
}

/**
 * Format a timestamp to time only (no date)
 * 
 * @param timestamp - ISO string, Date object, or timestamp
 * @returns Formatted time string (h:mm A)
 */
export function formatTime(timestamp: string | Date | number | null | undefined): string {
  if (!timestamp) {
    return 'N/A';
  }

  try {
    let date: Date;

    if (typeof timestamp === 'string') {
      date = parseISO(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return 'Invalid Time';
    }

    if (!isValid(date)) {
      return 'Invalid Time';
    }

    return formatTimeInOrgTz(date);
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid Time';
  }
}

/**
 * Get the current timestamp in the standard format
 * 
 * @param includeTime - Whether to include time (default: true)
 * @returns Current date/time in standard format
 */
export function formatNow(includeTime: boolean = true): string {
  return formatDateTime(new Date(), includeTime);
}

/**
 * Format a date for use in date inputs (YYYY-MM-DD)
 * This is the HTML5 date input format
 * 
 * @param timestamp - ISO string, Date object, or timestamp
 * @returns Date string in YYYY-MM-DD format
 */
export function formatForInput(timestamp: string | Date | number | null | undefined): string {
  if (!timestamp) {
    return '';
  }

  try {
    let date: Date;

    if (typeof timestamp === 'string') {
      date = parseISO(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return '';
    }

    if (!isValid(date)) {
      return '';
    }

    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
}

/**
 * Parse a date input value (YYYY-MM-DD) and return ISO string
 * 
 * @param inputValue - Date string in YYYY-MM-DD format
 * @returns ISO string for database storage
 */
export function parseInputDate(inputValue: string): string {
  if (!inputValue) {
    return '';
  }

  try {
    const date = parseISO(inputValue);
    if (!isValid(date)) {
      return '';
    }
    return date.toISOString();
  } catch (error) {
    console.error('Error parsing input date:', error);
    return '';
  }
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 * Falls back to standard format for dates older than 7 days
 * 
 * @param timestamp - ISO string, Date object, or timestamp
 * @returns Relative or formatted date string
 */
export function formatRelative(timestamp: string | Date | number | null | undefined): string {
  if (!timestamp) {
    return 'N/A';
  }

  try {
    let date: Date;

    if (typeof timestamp === 'string') {
      date = parseISO(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return 'Invalid Date';
    }

    if (!isValid(date)) {
      return 'Invalid Date';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Less than 1 minute
    if (diffMins < 1) {
      return 'Just now';
    }

    // Less than 1 hour
    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    }

    // Less than 24 hours
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }

    // Less than 7 days
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }

    // Older than 7 days - use standard format
    return formatDateTime(date);
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return 'Invalid Date';
  }
}
