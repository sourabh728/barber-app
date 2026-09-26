import { api } from "./api";
import { isAxiosError } from "axios";

import type { AppointmentStatus } from "./shop-appointments-api";

export type CustomerBooking = {
  id: string;
  shopId: string;
  shopName: string;
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

export type CustomerBookingStats = {
  completedBookings: number;
  totalBookings: number;
};

export async function fetchMyBookings(params?: { status?: AppointmentStatus }) {
  const response = await api.get<CustomerBooking[]>(
    "/customers/me/appointments",
    { params },
  );
  return response.data;
}

export async function fetchMyBookingStats() {
  const response = await api.get<CustomerBookingStats>("/customers/me/stats");
  return response.data;
}

export type CreateCustomerBookingPayload = {
  serviceName: string;
  staffId: string;
  priceInr: number;
  date: string;
  startTime: string;
  endTime: string;
};

export async function createCustomerBooking(
  shopId: string,
  payload: CreateCustomerBookingPayload,
) {
  const response = await api.post<CustomerBooking>(
    `/shops/${shopId}/appointments`,
    payload,
  );
  return response.data;
}

export async function cancelMyBooking(appointmentId: string) {
  const response = await api.patch<CustomerBooking>(
    `/customers/me/appointments/${appointmentId}/cancel`,
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

export function getCustomerBookingErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return "Something went wrong. Please try again.";
  }

  if (!error.response) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  if (error.response.status === 401) {
    return messageFromResponseData(
      error.response.data,
      "Your session expired. Please sign in again.",
    );
  }

  if (error.response.status === 404) {
    return messageFromResponseData(
      error.response.data,
      "Your account could not be found.",
    );
  }

  if (error.response.status === 409) {
    return messageFromResponseData(
      error.response.data,
      "This time slot is already booked for that barber.",
    );
  }

  if (error.response.status === 400) {
    return messageFromResponseData(
      error.response.data,
      "Check the booking details and try again.",
    );
  }

  return messageFromResponseData(
    error.response.data,
    "Could not load your bookings. Please try again.",
  );
}
