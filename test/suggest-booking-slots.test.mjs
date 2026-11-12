import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildSuggestedSlots,
  minutesToTime,
  suggestedBookingDuration,
  timeToMinutes,
} from "../src/utils/suggest-booking-slots.ts";

const schedule = { openTime: "09:00", closeTime: "12:00", lunchStart: "10:00", lunchEnd: "10:30" };
const request = { id: "request", date: "2026-11-10", startTime: "09:00", endTime: "09:30", staffId: "a" };
const now = new Date(2026, 10, 9, 8, 0);

test("suggestions exclude lunch and occupied slots for the requested barber", () => {
  const appointments = [
    { ...request, status: "PENDING" },
    { id: "busy", staffId: "a", startTime: "10:30", endTime: "11:00", status: "CONFIRMED" },
    { id: "other", staffId: "b", startTime: "11:00", endTime: "11:30", status: "CONFIRMED" },
    { id: "cancelled", staffId: "a", startTime: "11:30", endTime: "12:00", status: "CANCELLED" },
  ];
  assert.deepEqual(buildSuggestedSlots(schedule, request, appointments, now), ["09:00", "09:30", "11:00", "11:30"]);
});

test("today's slots respect the lead time and booking duration", () => {
  const appointment = { ...request, date: "2026-11-09", endTime: "10:00" };
  assert.equal(suggestedBookingDuration(appointment), 60);
  assert.deepEqual(buildSuggestedSlots(schedule, appointment, [], new Date(2026, 10, 9, 9, 15)), ["10:30", "11:00"]);
  assert.equal(minutesToTime(timeToMinutes("10:30") + 60), "11:30");
});

test("unassigned requests avoid slots occupied by any barber", () => {
  const appointment = { ...request, staffId: null };
  const occupied = [{ id: "other", staffId: "b", startTime: "09:00", endTime: "09:30", status: "PENDING" }];
  assert.deepEqual(buildSuggestedSlots(schedule, appointment, occupied, now), ["09:30", "10:30", "11:00", "11:30"]);
});
