import { api } from "./api";
import { isAxiosError } from "axios";

export type ShopServiceItem = {
  id: string;
  shopId: string;
  name: string;
  priceInr: number;
  durationMin: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type UpsertShopServicePayload = {
  name: string;
  priceInr: number;
  durationMin?: number;
  active?: boolean;
  sortOrder?: number;
};

export async function fetchMyShopServices() {
  const response = await api.get<ShopServiceItem[]>("/shops/me/services");
  return response.data;
}

export async function createMyShopService(payload: UpsertShopServicePayload) {
  const response = await api.post<ShopServiceItem>(
    "/shops/me/services",
    payload,
  );
  return response.data;
}

export async function updateMyShopService(
  serviceId: string,
  payload: Partial<UpsertShopServicePayload>,
) {
  const response = await api.patch<ShopServiceItem>(
    `/shops/me/services/${serviceId}`,
    payload,
  );
  return response.data;
}

export async function deleteMyShopService(serviceId: string) {
  const response = await api.delete<{ id: string; deleted: boolean }>(
    `/shops/me/services/${serviceId}`,
  );
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

export function getShopServiceErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return "Something went wrong. Please try again.";
  }

  if (!error.response) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  if (error.response.status === 404) {
    return messageFromResponseData(
      error.response.data,
      "Shop or service not found.",
    );
  }

  if (error.response.status === 403) {
    return messageFromResponseData(
      error.response.data,
      "Only shop owners can manage services.",
    );
  }

  if (error.response.status === 400) {
    return messageFromResponseData(
      error.response.data,
      "Check the service details and try again.",
    );
  }

  return messageFromResponseData(
    error.response.data,
    "Could not update services. Please try again.",
  );
}
