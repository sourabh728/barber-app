import { api } from "./api";
import { isAxiosError } from "axios";

export type ShopSetupItem = {
  key: string;
  label: string;
  hint: string;
  complete: boolean;
  weight: number;
  href: string;
};

export type ShopSetupProgress = {
  shopId: string;
  percent: number;
  items: ShopSetupItem[];
};

export async function fetchMyShopSetupProgress() {
  const response = await api.get<ShopSetupProgress>("/shops/me/setup-progress");
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

export function getSetupProgressErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return "Something went wrong. Please try again.";
  }

  if (!error.response) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  return messageFromResponseData(
    error.response.data,
    "Could not load setup progress.",
  );
}
