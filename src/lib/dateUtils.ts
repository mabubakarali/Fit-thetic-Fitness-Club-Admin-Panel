/**
 * Timezone-safe local calendar date utilities for membership cycles & billing
 */

export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add N days to a 'YYYY-MM-DD' date string safely without timezone offset issues.
 */
export function addDaysToDate(dateStr: string, days: number): string {
  if (!dateStr || !dateStr.includes('-')) {
    return getTodayDateStr();
  }
  const parts = dateStr.split('T')[0].split('-').map(Number);
  const year = parts[0];
  const month = parts[1] - 1;
  const day = parts[2];

  const date = new Date(year, month, day);
  date.setDate(date.getDate() + days);

  const resYear = date.getFullYear();
  const resMonth = String(date.getMonth() + 1).padStart(2, '0');
  const resDay = String(date.getDate()).padStart(2, '0');
  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Given a previous membership's end date (e.g., '2026-10-10'),
 * calculates the consecutive next cycle start date (e.g., '2026-10-11').
 * If member has 1 day left or expired, the new cycle starts the day after previous expiry.
 */
export function getConsecutiveCycleStartDate(prevEndDate?: string | null): string {
  if (!prevEndDate) {
    return getTodayDateStr();
  }
  return addDaysToDate(prevEndDate, 1);
}

/**
 * Calculate the end date given a start date and plan duration in days.
 */
export function calculateCycleEndDate(startDate: string, durationDays: number): string {
  const safeDuration = durationDays > 0 ? durationDays : 30;
  return addDaysToDate(startDate, safeDuration);
}
