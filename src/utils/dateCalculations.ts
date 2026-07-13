/**
 * Normalizes a Date object to midnight UTC (00:00:00.000Z).
 * This helps avoid timezone shifts when storing or comparing dates.
 */
export function toUTCDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/**
 * Calculates the number of days between two dates, inclusive.
 * Normalizes both dates to UTC midnight before calculating.
 *
 * @param startDate
 * @param endDate
 * @returns
 */
export function calculateLeaveDuration(startDate: Date, endDate: Date): number {
  const normalizedStart = toUTCDateOnly(startDate);
  const normalizedEnd = toUTCDateOnly(endDate);

  const diffTime = normalizedEnd.getTime() - normalizedStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return diffDays > 0 ? diffDays : 0;
}
