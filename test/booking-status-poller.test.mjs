import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BOOKING_STATUS_POLL_INTERVAL_MS,
  startBookingStatusPoller,
} from "../src/utils/booking-status-poller.ts";

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

test("polls immediately and reflects approval, rejection, and suggested times", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const statuses = [
    { status: "PENDING" },
    { status: "CONFIRMED" },
    { status: "REJECTED" },
    { status: "PENDING", proposedStartTime: "12:30" },
  ];
  const seen = [];
  const stop = startBookingStatusPoller(
    async () => statuses.shift(),
    (status) => seen.push(status),
    assert.fail,
  );
  await flush();
  assert.deepEqual(seen, [{ status: "PENDING" }]);
  for (let i = 0; i < 3; i++) {
    t.mock.timers.tick(BOOKING_STATUS_POLL_INTERVAL_MS);
    await flush();
  }
  assert.deepEqual(seen, [
    { status: "PENDING" },
    { status: "CONFIRMED" },
    { status: "REJECTED" },
    { status: "PENDING", proposedStartTime: "12:30" },
  ]);
  stop();
});

test("reports errors and retries without overlapping requests", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let resolveFirst;
  let calls = 0;
  const errors = [];
  const updates = [];
  const stop = startBookingStatusPoller(
    () => {
      calls++;
      if (calls === 1) return new Promise((resolve) => { resolveFirst = resolve; });
      if (calls === 2) return Promise.reject(new Error("offline"));
      return Promise.resolve("reconnected");
    },
    (value) => updates.push(value),
    (error) => errors.push(error.message),
  );
  t.mock.timers.tick(BOOKING_STATUS_POLL_INTERVAL_MS * 2);
  assert.equal(calls, 1);
  resolveFirst("waiting");
  await flush();
  t.mock.timers.tick(BOOKING_STATUS_POLL_INTERVAL_MS);
  await flush();
  assert.deepEqual(errors, ["offline"]);
  t.mock.timers.tick(BOOKING_STATUS_POLL_INTERVAL_MS);
  await flush();
  assert.deepEqual(updates, ["waiting", "reconnected"]);
  stop();
});

test("stopping aborts in-flight requests and ignores late responses", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let resolve;
  let signal;
  let calls = 0;
  const updates = [];
  const errors = [];
  const stop = startBookingStatusPoller(
    (requestSignal) => {
      calls++;
      signal = requestSignal;
      return new Promise((done) => { resolve = done; });
    },
    (value) => updates.push(value),
    (error) => errors.push(error),
  );
  stop();
  assert.equal(signal.aborted, true);
  resolve("late");
  await flush();
  t.mock.timers.tick(BOOKING_STATUS_POLL_INTERVAL_MS * 2);
  assert.equal(calls, 1);
  assert.deepEqual(updates, []);
  assert.deepEqual(errors, []);
});
