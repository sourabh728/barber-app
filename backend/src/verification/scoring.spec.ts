import {
  calculateBookingScore,
  maxBookingScore,
  punctualityPointsForDelaySeconds,
  slotInstantInBusinessTz,
  weekBoundsContaining,
} from './scoring';

describe('punctualityPointsForDelaySeconds', () => {
  // Delay (seconds) → expected points per tier [solo, medium, large]
  const cases: [number, [number, number, number]][] = [
    [0, [5, 4, 3]],
    [120, [5, 4, 3]],
    [121, [4, 3.2, 2.4]],
    [240, [4, 3.2, 2.4]],
    [241, [3, 2.4, 1.8]],
    [360, [3, 2.4, 1.8]],
    [361, [2, 1.6, 1.2]],
    [480, [2, 1.6, 1.2]],
    [481, [1, 0.8, 0.6]],
    [600, [1, 0.8, 0.6]],
    [601, [0, 0, 0]],
    [3600, [0, 0, 0]],
    [-300, [5, 4, 3]],
  ];

  it.each(cases)('delay %ss follows the chart', (seconds, expected) => {
    expect(punctualityPointsForDelaySeconds(seconds, 1)).toBe(expected[0]);
    expect(punctualityPointsForDelaySeconds(seconds, 2)).toBe(expected[1]);
    expect(punctualityPointsForDelaySeconds(seconds, 3)).toBe(expected[2]);
  });

  it('treats 4+ barbers as the large tier', () => {
    expect(punctualityPointsForDelaySeconds(0, 7)).toBe(3);
  });
});

describe('calculateBookingScore', () => {
  const slotDate = '2026-10-20';
  const slotStart = '10:00';
  const slotAt = slotInstantInBusinessTz(slotDate, slotStart);
  const at = (offsetSeconds: number) =>
    new Date(slotAt.getTime() + offsetSeconds * 1000);

  it('max booking score is 10 / 8 / 6 per tier', () => {
    expect(maxBookingScore(1)).toBe(10);
    expect(maxBookingScore(2)).toBe(8);
    expect(maxBookingScore(3)).toBe(6);
  });

  it('scores the maximum for an on-time start', () => {
    for (const [count, max] of [
      [1, 10],
      [2, 8],
      [3, 6],
    ] as const) {
      const result = calculateBookingScore({
        slotDate,
        slotStartTime: slotStart,
        actualStartAt: slotAt,
        barberCount: count,
      });
      expect(result.bookingScore).toBe(max);
      expect(result.basePoints).toBe(max / 2);
    }
  });

  it('scores a medium shop 3 minutes late as 4 + 3.2', () => {
    const result = calculateBookingScore({
      slotDate,
      slotStartTime: slotStart,
      actualStartAt: at(180),
      barberCount: 2,
    });
    expect(result.punctualityPoints).toBe(3.2);
    expect(result.bookingScore).toBe(7.2);
    expect(result.delayMinutes).toBe(3);
  });

  it('keeps only the base points after the 10 minute grace', () => {
    const result = calculateBookingScore({
      slotDate,
      slotStartTime: slotStart,
      actualStartAt: at(601),
      barberCount: 3,
    });
    expect(result.punctualityPoints).toBe(0);
    expect(result.bookingScore).toBe(3);
  });

  it('defaults to the solo tier and gives early starts full points', () => {
    const result = calculateBookingScore({
      slotDate,
      slotStartTime: slotStart,
      actualStartAt: at(-300),
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
