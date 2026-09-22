import { api } from "./api";
import { isAxiosError } from "axios";

export type ShopStats = {
  shopId: string;
  completedBookings: number;
  ratingAverage: number;
  reviewCount: number;
};

export async function fetchMyShopStats() {
  const response = await api.get<ShopStats>("/shops/me/stats");
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

export function getShopStatsErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return "Something went wrong. Please try again.";
  }

  if (!error.response) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  if (error.response.status === 404) {
    return messageFromResponseData(
      error.response.data,
      "Shop not found. Create your shop from Profile first.",
    );
  }

  if (error.response.status === 403) {
    return messageFromResponseData(
      error.response.data,
      "Only shop owners can view shop stats.",
    );
  }

  return messageFromResponseData(
    error.response.data,
    "Could not load shop stats. Please try again.",
  );
}
