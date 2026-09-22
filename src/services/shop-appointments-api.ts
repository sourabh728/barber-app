import { api } from "./api";
import { isAxiosError } from "axios";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export type AppointmentTab = "upcoming" | "past" | "cancelled";

export type ShopAppointment = {
  id: string;
  shopId: string;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  staffId: string | null;
  staffName: string | null;
  priceInr: number;
  status: AppointmentStatus;
  date: string;
  startTime: string;
  endTime: string;
  isWalkIn: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertAppointmentPayload = {
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  staffId?: string | null;
  priceInr: number;
  date: string;
  startTime: string;
  endTime: string;
  isWalkIn?: boolean;
  status?: AppointmentStatus;
};

export async function fetchMyShopAppointments(params: {
  date: string;
  tab: AppointmentTab;
}) {
  const response = await api.get<ShopAppointment[]>("/shops/me/appointments", {
    params,
  });
  return response.data;
}

export async function createMyShopAppointment(
  payload: UpsertAppointmentPayload,
) {
  const response = await api.post<ShopAppointment>(
    "/shops/me/appointments",
    payload,
  );
  return response.data;
}

export async function updateMyShopAppointment(
  appointmentId: string,
  payload: Partial<UpsertAppointmentPayload>,
) {
  const response = await api.patch<ShopAppointment>(
    `/shops/me/appointments/${appointmentId}`,
    payload,
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

export function getAppointmentErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return "Something went wrong. Please try again.";
  }

  if (!error.response) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  if (error.response.status === 404) {
    return messageFromResponseData(
      error.response.data,
      "Shop or appointment not found.",
    );
  }

  if (error.response.status === 403) {
    return messageFromResponseData(
      error.response.data,
      "Only shop owners can manage appointments.",
    );
  }

  if (error.response.status === 400) {
    return messageFromResponseData(
      error.response.data,
      "Check the appointment details and try again.",
    );
  }

  if (error.response.status === 409) {
    return messageFromResponseData(
      error.response.data,
      "This time slot is already occupied for this barber.",
    );
  }

  return messageFromResponseData(
    error.response.data,
    "Could not update appointments. Please try again.",
  );
}
