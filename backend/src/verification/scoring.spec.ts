import {
  BASE_ORDER_POINTS,
  calculateBookingScore,
  punctualityPointsForDelayMinutes,
  slotInstantInBusinessTz,
  weekBoundsContaining,
} from './scoring';

describe('punctualityPointsForDelayMinutes', () => {
  it('awards 5 for 0–2 minutes', () => {
    expect(punctualityPointsForDelayMinutes(0)).toBe(5);
    expect(punctualityPointsForDelayMinutes(2)).toBe(5);
  });

  it('awards 4 for >2 up to 4', () => {
    expect(punctualityPointsForDelayMinutes(3)).toBe(4);
    expect(punctualityPointsForDelayMinutes(4)).toBe(4);
  });

  it('awards 3 for >4 up to 6', () => {
    expect(punctualityPointsForDelayMinutes(5)).toBe(3);
    expect(punctualityPointsForDelayMinutes(6)).toBe(3);
  });

  it('awards 1 for >6 up to 10', () => {
    expect(punctualityPointsForDelayMinutes(7)).toBe(1);
    expect(punctualityPointsForDelayMinutes(10)).toBe(1);
  });

  it('awards 0 for >10', () => {
    expect(punctualityPointsForDelayMinutes(11)).toBe(0);
    expect(punctualityPointsForDelayMinutes(60)).toBe(0);
  });

  it('treats negative delay as 0', () => {
    expect(punctualityPointsForDelayMinutes(-5)).toBe(5);
  });
});

describe('calculateBookingScore', () => {
  const slotDate = '2026-10-20';
  const slotStart = '10:00';
  const slotAt = slotInstantInBusinessTz(slotDate, slotStart);

  it('scores 10 for on-time start', () => {
    const result = calculateBookingScore({
      slotDate,
      slotStartTime: slotStart,
      actualStartAt: slotAt,
    });
    expect(result.basePoints).toBe(BASE_ORDER_POINTS);
    expect(result.punctualityPoints).toBe(5);
    expect(result.bookingScore).toBe(10);
  });

  it('scores 10 at exactly 2 minutes late', () => {
    const result = calculateBookingScore({
      slotDate,
      slotStartTime: slotStart,
      actualStartAt: new Date(slotAt.getTime() + 2 * 60_000),
    });
    expect(result.bookingScore).toBe(10);
  });

  it('scores 9 at 3 minutes late', () => {
    const result = calculateBookingScore({
      slotDate,
      slotStartTime: slotStart,
      actualStartAt: new Date(slotAt.getTime() + 3 * 60_000),
    });
    expect(result.bookingScore).toBe(9);
  });

  it('scores 8 at 5 minutes late', () => {
    const result = calculateBookingScore({
      slotDate,
      slotStartTime: slotStart,
      actualStartAt: new Date(slotAt.getTime() + 5 * 60_000),
    });
    expect(result.bookingScore).toBe(8);
  });

  it('scores 6 at 8 minutes late', () => {
    const result = calculateBookingScore({
      slotDate,
      slotStartTime: slotStart,
      actualStartAt: new Date(slotAt.getTime() + 8 * 60_000),
    });
    expect(result.bookingScore).toBe(6);
  });

  it('scores 5 at 12 minutes late', () => {
    const result = calculateBookingScore({
      slotDate,
      slotStartTime: slotStart,
      actualStartAt: new Date(slotAt.getTime() + 12 * 60_000),
    });
    expect(result.bookingScore).toBe(5);
    expect(result.punctualityPoints).toBe(0);
  });

  it('scores 10 for early start', () => {
    const result = calculateBookingScore({
      slotDate,
      slotStartTime: slotStart,
      actualStartAt: new Date(slotAt.getTime() - 5 * 60_000),
    });
    expect(result.bookingScore).toBe(10);
    expect(result.delayMinutes).toBe(0);
  });
});

describe('weekBoundsContaining', () => {
  it('places a Wednesday in Mon–Sun week', () => {
    // 2026-10-21 is Wednesday in IST
    const instant = slotInstantInBusinessTz('2026-10-21', '12:00');
    const { weekKey, weekStart, weekEnd } = weekBoundsContaining(instant);
    expect(weekKey).toBe('2026-10-19'); // Monday
    expect(weekStart.getTime()).toBeLessThanOrEqual(instant.getTime());
    expect(weekEnd.getTime()).toBeGreaterThanOrEqual(instant.getTime());
  });
});
