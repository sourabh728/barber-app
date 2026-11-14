import { buildAlertSummary } from './admin.service';

describe('buildAlertSummary', () => {
  it('keeps the latest alert info and preserves a readable severity', () => {
    const summary = buildAlertSummary({
      id: 'alert-1',
      type: 'api_error',
      level: 'warning',
      source: 'customer',
      title: 'Booking failed',
      message: 'The booking request did not complete.',
      route: '/shop/abc',
      userId: 'user-123',
      createdAt: new Date('2026-01-01T12:00:00.000Z'),
      acknowledgedAt: null,
    });

    expect(summary).toMatchObject({
      id: 'alert-1',
      type: 'api_error',
      level: 'warning',
      source: 'customer',
      title: 'Booking failed',
      message: 'The booking request did not complete.',
      route: '/shop/abc',
      userId: 'user-123',
      active: true,
    });
  });
});
