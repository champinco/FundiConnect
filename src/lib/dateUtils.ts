
import { format, formatDistanceToNowStrict, isDate } from 'date-fns';

/**
 * Formats a date dynamically. If the date is within the last 24 hours,
 * it returns a relative time string (e.g., "2 hours ago"). Otherwise,
 * it returns a formatted date string (e.g., "Jan 1, 2023").
 *
 * This version avoids mutating the 'now' date.
 *
 * @param dateInput - The date to format, can be a Date object, string, or number.
 * @param includeTime - Whether to include time in the formatted string for older dates.
 * @returns A formatted date string or 'N/A' if the input is invalid.
 */
export const formatDynamicDate = (dateInput: Date | string | number | undefined | null, includeTime: boolean = false): string => {
  if (!dateInput) return 'N/A';

  let dateToFormat: Date;
  if (dateInput instanceof Date) {
    dateToFormat = dateInput;
  } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    dateToFormat = new Date(dateInput);
  } else {
    return 'Invalid Date Input'; // Should not happen with TS, but defensive
  }
  
  if (isNaN(dateToFormat.getTime())) return 'Invalid Date';

  const now = new Date();
  const oneDayAgo = new Date();
  oneDayAgo.setDate(now.getDate() - 1);

  if (dateToFormat > oneDayAgo) {
    return formatDistanceToNowStrict(dateToFormat, { addSuffix: true });
  }
  return format(dateToFormat, includeTime ? 'MMM d, yyyy p' : 'PPP');
};

/**
 * Safely formats a date, returning a fallback string if the date is invalid or null/undefined.
 * @param dateInput The date to format (Date object, string, number, null, or undefined).
 * @param formatString The date-fns format string (e.g., 'PPP', 'yyyy-MM-dd').
 * @param fallbackString The string to return if the date is invalid or not provided (defaults to 'N/A').
 * @returns The formatted date string or the fallback string.
 */
export function formatSafeDate(
  dateInput: Date | string | number | null | undefined,
  formatString: string,
  fallbackString: string = 'N/A'
): string {
  if (dateInput === null || dateInput === undefined) {
    return fallbackString;
  }
  try {
    const date = new Date(dateInput);
    // Check if the date is valid after parsing
    if (isNaN(date.getTime())) {
      return `Invalid Date (${String(dateInput).substring(0,15)}...)`;
    }
    return format(date, formatString);
  } catch (e) {
    // Catch any errors during new Date() or format()
    return `Format Err (${String(dateInput).substring(0,15)}...)`;
  }
}
