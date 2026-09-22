import { api } from "./api";
import { isAxiosError } from "axios";

export type StaffStatus = "ACTIVE" | "ON_LEAVE";

export type ShopStaff = {
  id: string;
  shopId: string;
  name: string;
  title: string;
  phone: string;
  status: StaffStatus;
  leaveReturnDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertShopStaffPayload = {
  name: string;
  title: string;
  phone: string;
  status: StaffStatus;
  leaveReturnDate?: string;
};

export async function fetchMyShopStaff() {
  const response = await api.get<ShopStaff[]>("/shops/me/staff");
  return response.data;
}

export async function createMyShopStaff(payload: UpsertShopStaffPayload) {
  const response = await api.post<ShopStaff>("/shops/me/staff", payload);
  return response.data;
}

export async function updateMyShopStaff(
  staffId: string,
  payload: Partial<UpsertShopStaffPayload>,
) {
  const response = await api.patch<ShopStaff>(
    `/shops/me/staff/${staffId}`,
    payload,
  );
  return response.data;
}

export async function deleteMyShopStaff(staffId: string) {
  const response = await api.delete<{ id: string; deleted: boolean }>(
    `/shops/me/staff/${staffId}`,
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

export function getStaffErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return "Something went wrong. Please try again.";
  }

  if (!error.response) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  if (error.response.status === 404) {
    return messageFromResponseData(
      error.response.data,
      "Shop or staff member not found.",
    );
  }

  if (error.response.status === 403) {
    return messageFromResponseData(
      error.response.data,
      "Only shop owners can manage staff.",
    );
  }

  if (error.response.status === 400) {
    return messageFromResponseData(
      error.response.data,
      "Check the staff details and try again.",
    );
  }

  return messageFromResponseData(
    error.response.data,
    "Could not update staff. Please try again.",
  );
}
