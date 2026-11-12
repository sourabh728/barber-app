import assert from "node:assert/strict";
import { test } from "node:test";

import {
  reconcileDismissedRequests,
  selectRingingRequest,
} from "../src/utils/incoming-booking-state.ts";

const request = { id: "request", proposedStartTime: null };
const other = { id: "other", proposedStartTime: null };

test("the call closes while picking a slot and stays dismissed if cancelled", () => {
  assert.equal(selectRingingRequest([request], {}, false), request);
  assert.equal(selectRingingRequest([request], { request: "dismissed" }, true), null);
  assert.equal(selectRingingRequest([request], { request: "dismissed" }, false), null);
  assert.equal(selectRingingRequest([request, other], { request: "dismissed" }, false), other);
});

test("a submitted suggestion remains silent through stale polls and rings again if declined", () => {
  const suppressed = reconcileDismissedRequests({ request: "suggested" }, [request]);
  assert.equal(selectRingingRequest([request], suppressed, false), null);
  const offered = { ...request, proposedStartTime: "10:30" };
  const acknowledged = reconcileDismissedRequests(suppressed, [offered]);
  assert.deepEqual(acknowledged, {});
  assert.equal(selectRingingRequest([offered], acknowledged, false), null);
  assert.equal(selectRingingRequest([request], acknowledged, false), request);
  assert.deepEqual(reconcileDismissedRequests({ request: "dismissed" }, []), {});
});
