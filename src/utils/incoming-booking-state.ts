import type { ShopAppointment } from "@/services/shop-appointments-api";

export type DismissedRequests = Record<string, "dismissed" | "suggested">;

export function selectRingingRequest(
  pending: ShopAppointment[],
  dismissed: DismissedRequests,
  selectingAction: boolean,
) {
  if (selectingAction) return null;
  return pending.find(
    (appointment) =>
      !dismissed[appointment.id] && !appointment.proposedStartTime,
  ) ?? null;
}

export function reconcileDismissedRequests(
  current: DismissedRequests,
  pending: ShopAppointment[],
) {
  const next: DismissedRequests = {};
  for (const [id, reason] of Object.entries(current)) {
    const item = pending.find((appointment) => appointment.id === id);
    if (item && !(reason === "suggested" && item.proposedStartTime)) {
      next[id] = reason;
    }
  }
  return next;
}
