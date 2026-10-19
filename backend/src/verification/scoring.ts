/** Business timezone for slot wall-clock → instant comparisons and weekly windows. */
export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

export const BASE_ORDER_POINTS = 5;
export const MAX_PUNCTUALITY_POINTS = 5;
export const MAX_BOOKING_SCORE = BASE_ORDER_POINTS + MAX_PUNCTUALITY_POINTS;

/**
 * Punctuality points from delay minutes (Actual_Start − Slot_Time).
 * Early starts are treated as 0 delay → full punctuality points.
 */
export function punctualityPointsForDelayMinutes(delayMinutes: number): number {
  const delay = Math.max(0, delayMinutes);
  if (delay <= 2) return 5;
  if (delay <= 4) return 4;
  if (delay <= 6) return 3;
  if (delay <= 10) return 1;
  return 0;
}

export type BookingScoreBreakdown = {
  basePoints: number;
  punctualityPoints: number;
  bookingScore: number;
  delayMinutes: number;
};

/**
 * Build UTC Date for a calendar date (YYYY-MM-DD or Date) + HH:mm in Asia/Kolkata.
 */
export function slotInstantInBusinessTz(
  date: Date | string,
  startTimeHhmm: string,
): Date {
  const dateKey =
    typeof date === 'string'
      ? date.slice(0, 10)
      : formatDateKeyInTimeZone(date, BUSINESS_TIMEZONE);

  const match = /^(\d{2}):(\d{2})$/.exec(startTimeHhmm);
  if (!match) {
    throw new Error(`Invalid startTime: ${startTimeHhmm}`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  // Interpret wall clock in IST (UTC+05:30) as an absolute instant.
  const utcMs = Date.UTC(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(5, 7)) - 1,
    Number(dateKey.slice(8, 10)),
    hour,
    minute,
    0,
    0,
  );
  // IST is +5:30 ahead of UTC → subtract offset to get UTC instant.
  return new Date(utcMs - (5 * 60 + 30) * 60 * 1000);
}

export function formatDateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

/** Monday 00:00:00.000 IST → Sunday 23:59:59.999 IST as UTC Date bounds. */
export function weekBoundsContaining(
  instant: Date,
  timeZone: string = BUSINESS_TIMEZONE,
): { weekStart: Date; weekEnd: Date; weekKey: string } {
  const dateKey = formatDateKeyInTimeZone(instant, timeZone);
  const [y, m, d] = dateKey.split('-').map(Number);
  // Noon UTC on that calendar day avoids DST edge cases; IST has no DST.
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(noonUtc);
  const weekdayIndex: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offsetFromMonday = weekdayIndex[weekday] ?? 0;
  const mondayKey = shiftDateKey(dateKey, -offsetFromMonday);
  const sundayKey = shiftDateKey(mondayKey, 6);

  const weekStart = slotInstantInBusinessTz(mondayKey, '00:00');
  // End of Sunday: Monday 00:00 next week minus 1 ms
  const nextMonday = shiftDateKey(mondayKey, 7);
  const weekEnd = new Date(
    slotInstantInBusinessTz(nextMonday, '00:00').getTime() - 1,
  );

  return { weekStart, weekEnd, weekKey: mondayKey };
}

function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function calculateBookingScore(params: {
  slotDate: Date | string;
  slotStartTime: string;
  actualStartAt: Date;
}): BookingScoreBreakdown {
  const slotAt = slotInstantInBusinessTz(params.slotDate, params.slotStartTime);
  const delayMs = params.actualStartAt.getTime() - slotAt.getTime();
  const delayMinutes = Math.floor(delayMs / 60_000);
  const punctualityPoints = punctualityPointsForDelayMinutes(delayMinutes);
  const basePoints = BASE_ORDER_POINTS;
  return {
    basePoints,
    punctualityPoints,
    bookingScore: basePoints + punctualityPoints,
    delayMinutes: Math.max(0, delayMinutes),
  };
}
