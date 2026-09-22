import { api } from "./api";
import { isAxiosError } from "axios";

/** Times are 24h "HH:mm". Holidays are YYYY-MM-DD. */
export type ShopSchedule = {
  shopId: string;
  openTime: string;
  closeTime: string;
  lunchStart: string;
  lunchEnd: string;
  holidays: string[];
};

export type UpdateShopSchedulePayload = {
  openTime: string;
  closeTime: string;
  lunchStart: string;
  lunchEnd: string;
  holidays: string[];
};

export async function fetchMyShopSchedule() {
  const response = await api.get<ShopSchedule>("/shops/me/schedule");
  return response.data;
}

export async function updateMyShopSchedule(payload: UpdateShopSchedulePayload) {
  const response = await api.put<ShopSchedule>("/shops/me/schedule", payload);
  return response.data;
}

function messageFromResponseData(data: unknown, fallback: string) {
  const message = (data as { message?: unknown } | undefined)?.message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (
    Array.isArray(message) &&
    message.every((item) => typeof item === "string")
  ) {
    const joined = message.filter(Boolean).join(" ");
    return joined || fallback;
  }

  return fallback;
}

export function getScheduleErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return "Something went wrong. Please try again.";
  }

  if (!error.response) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  if (error.response.status === 404) {
    return messageFromResponseData(
      error.response.data,
      "Shop not found. Complete shop setup first.",
    );
  }

  if (error.response.status === 403) {
    return messageFromResponseData(
      error.response.data,
      "Only shop owners can manage the schedule.",
    );
  }

  if (error.response.status === 400) {
    return messageFromResponseData(
      error.response.data,
      "Check your timings and try again.",
    );
  }

  return messageFromResponseData(
    error.response.data,
    "Could not update schedule. Please try again.",
  );
}
