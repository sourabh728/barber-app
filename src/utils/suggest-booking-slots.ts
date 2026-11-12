import type { ShopAppointment } from "@/services/shop-appointments-api";
import type { ShopSchedule } from "@/services/shop-schedule-api";

const SLOT_STEP_MINUTES = 30;

export function timeToMinutes(time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function minutesToTime(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function formatSuggestedTime(time: string) {
  const minutes = timeToMinutes(time);
  if (minutes === null) return time;
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour >= 12 ? "pm" : "am"}`;
}

export function suggestedBookingDuration(appointment: ShopAppointment) {
  const start = timeToMinutes(appointment.startTime);
  const end = timeToMinutes(appointment.endTime);
  return start === null || end === null || end <= start
    ? SLOT_STEP_MINUTES
    : Math.max(SLOT_STEP_MINUTES, end - start);
}

export function buildSuggestedSlots(
  schedule: ShopSchedule,
  appointment: ShopAppointment,
  appointments: ShopAppointment[],
  now = new Date(),
) {
  const open = timeToMinutes(schedule.openTime);
  const close = timeToMinutes(schedule.closeTime);
  const lunchStart = timeToMinutes(schedule.lunchStart);
  const lunchEnd = timeToMinutes(schedule.lunchEnd);
  const duration = suggestedBookingDuration(appointment);
  if (open === null || close === null) return [];

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const slots: string[] = [];

  for (let start = open; start + duration <= close; start += SLOT_STEP_MINUTES) {
    const end = start + duration;
    if (lunchStart !== null && lunchEnd !== null && start < lunchEnd && end > lunchStart) continue;
    if (appointment.date === today && start < nowMinutes + 15) continue;

    const startTime = minutesToTime(start);
    const endTime = minutesToTime(end);
    const clash = appointments.some(
      (item) =>
        item.id !== appointment.id &&
        item.status !== "CANCELLED" &&
        item.status !== "REJECTED" &&
        (appointment.staffId == null || item.staffId === appointment.staffId) &&
        startTime < item.endTime &&
        item.startTime < endTime,
    );
    if (!clash) slots.push(startTime);
  }

  return slots;
}
