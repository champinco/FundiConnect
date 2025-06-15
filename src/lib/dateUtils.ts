
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

  const dateToFormat = isDate(dateInput) ? dateInput : new Date(dateInput);
  if (isNaN(dateToFormat.getTime())) return 'Invalid Date';

  const now = new Date();
  const oneDayAgo = new Date();
  oneDayAgo.setDate(now.getDate() - 1);

  if (dateToFormat > oneDayAgo) {
    return formatDistanceToNowStrict(dateToFormat, { addSuffix: true });
  }
  return format(dateToFormat, includeTime ? 'MMM d, yyyy p' : 'PPP');
};
