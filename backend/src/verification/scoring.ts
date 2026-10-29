/** Business timezone for slot wall-clock → instant comparisons and weekly windows. */
export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

export const BASE_ORDER_POINTS = 5;
export const MAX_PUNCTUALITY_POINTS = 5;
export const MAX_BOOKING_SCORE = BASE_ORDER_POINTS + MAX_PUNCTUALITY_POINTS;

/** Grace window (seconds) before punctuality drops to 0. */
export const PUNCTUALITY_GRACE_SECONDS = 10 * 60;
const PUNCTUALITY_STEP_SECONDS = 2 * 60;
const PUNCTUALITY_STEPS = 5;

/** Barber tier: 1 = solo, 2 = medium, 3 = large (3+). */
export type BarberTier = 1 | 2 | 3;

/** Max booking points and max punctuality points per tier, in tenths. */
const TIER_POINTS_TENTHS: Record<
  BarberTier,
  { base: number; punctuality: number }
> = {
  1: { base: 50, punctuality: 50 },
  2: { base: 40, punctuality: 40 },
  3: { base: 30, punctuality: 30 },
};

export function normalizeBarberTier(barberCount: number | null | undefined): BarberTier {
  if (!barberCount || barberCount <= 1) return 1;
  return barberCount === 2 ? 2 : 3;
}

/**
 * Punctuality points from the delay in seconds (Actual_Start − Slot_Time).
 * Five equal 2-minute steps up to the 10-minute grace, then 0.
 * Early starts count as 0 delay → full punctuality points.
 */
export function punctualityPointsForDelaySeconds(
  delaySeconds: number,
  barberCount: number = 1,
): number {
  const { punctuality } = TIER_POINTS_TENTHS[normalizeBarberTier(barberCount)];
  const delay = Math.max(0, delaySeconds);
  if (delay > PUNCTUALITY_GRACE_SECONDS) return 0;
  const stepIndex = Math.max(0, Math.ceil(delay / PUNCTUALITY_STEP_SECONDS) - 1);
  const tenths = (punctuality * (PUNCTUALITY_STEPS - stepIndex)) / PUNCTUALITY_STEPS;
  return tenths / 10;
}

export function maxBookingScore(barberCount?: number | null): number {
  const { base, punctuality } = TIER_POINTS_TENTHS[normalizeBarberTier(barberCount)];
  return (base + punctuality) / 10;
}

export type BookingScoreBreakdown = {
  basePoints: number;
  punctualityPoints: number;
  bookingScore: number;
  delayMinutes: number;
  barberTier: BarberTier;
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
  barberCount?: number | null;
}): BookingScoreBreakdown {
  const barberTier = normalizeBarberTier(params.barberCount);
  const slotAt = slotInstantInBusinessTz(params.slotDate, params.slotStartTime);
  const delayMs = params.actualStartAt.getTime() - slotAt.getTime();
  const punctualityPoints = punctualityPointsForDelaySeconds(
    delayMs / 1000,
    barberTier,
  );
  const basePoints = TIER_POINTS_TENTHS[barberTier].base / 10;
  return {
    basePoints,
    punctualityPoints,
    bookingScore: Math.round((basePoints + punctualityPoints) * 10) / 10,
    delayMinutes: Math.max(0, Math.floor(delayMs / 60_000)),
    barberTier,
  };
}

/** Prisma Decimal (or number) → number; null stays null. */
export function pointsToNumber(
  value: { toNumber(): number } | number | null | undefined,
): number | null {
  if (value == null) return null;
  return typeof value === 'number' ? value : value.toNumber();
}

export function roundPoints(value: number): number {
  return Math.round(value * 10) / 10;
}
