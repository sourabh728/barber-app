import { api } from "./api";
import { isAxiosError } from "axios";

export type DailyReportBarberRow = {
  staffId: string | null;
  staffName: string;
  appointments: number;
  servicesCompleted: number;
  revenueInr: number;
};

export type DailyReport = {
  date: string;
  shopId: string;
  shopName: string;
  overview: {
    totalCollectionInr: number;
    totalAppointments: number;
    totalServicesCompleted: number;
  };
  byBarber: DailyReportBarberRow[];
};

export async function fetchMyShopDailyReport(params?: { date?: string }) {
  const response = await api.get<DailyReport>("/shops/me/reports/daily", {
    params,
  });
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

export function getDailyReportErrorMessage(error: unknown) {
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
      "Only shop owners can view the daily report.",
    );
  }

  if (error.response.status === 400) {
    return messageFromResponseData(
      error.response.data,
      "Check the selected date and try again.",
    );
  }

  return messageFromResponseData(
    error.response.data,
    "Could not load the daily report. Please try again.",
  );
}
