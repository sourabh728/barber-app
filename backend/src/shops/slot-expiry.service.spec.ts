import { AppointmentStatus } from '../../generated/prisma/enums';
import { slotInstantInBusinessTz } from '../verification/scoring';
import { SLOT_PASSED_REASON, SlotExpiryService } from './slot-expiry.service';

function makeAppt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    status: AppointmentStatus.PENDING,
    customerId: 'c1',
    customerName: 'Cust',
    serviceName: 'Haircut',
    date: new Date('2026-10-29T00:00:00.000Z'),
    startTime: '10:00',
    endTime: '10:30',
    proposedDate: null,
    proposedEndTime: null,
    shop: { id: 's1', name: 'Shop', ownerId: 'o1' },
    ...overrides,
  };
}

describe('SlotExpiryService', () => {
  function setup(appts: ReturnType<typeof makeAppt>[]) {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      appointment: {
        findMany: jest.fn().mockResolvedValue(appts),
        updateMany,
      },
    };
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const service = new SlotExpiryService(prisma as never, notifications as never);
    return { service, updateMany, notifications };
  }

  const at = (hhmm: string) => slotInstantInBusinessTz('2026-10-29', hhmm);

  it('cancels an unattended booking once the next slot starts', async () => {
    const { service, updateMany, notifications } = setup([makeAppt()]);
    expect(await service.sweep(at('10:30'))).toBe(1);
    expect(updateMany.mock.calls[0][0].data).toMatchObject({
      status: AppointmentStatus.CANCELLED,
      cancelReason: SLOT_PASSED_REASON,
    });
    expect(notifications.create).toHaveBeenCalledTimes(2);
  });

  it('leaves a booking alone while its slot is still running', async () => {
    const { service, updateMany } = setup([makeAppt()]);
    expect(await service.sweep(at('10:29'))).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('waits for a pending suggested slot to end instead', async () => {
    const appt = makeAppt({
      proposedDate: new Date('2026-10-29T00:00:00.000Z'),
      proposedEndTime: '12:00',
    });
    const { service, updateMany } = setup([appt]);
    expect(await service.sweep(at('10:45'))).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
