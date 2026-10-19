import { isAxiosError } from "axios";

import { api } from "@/services/api";
import type { PaymentMode } from "@/services/public-settings-api";

export type AdminSettings = {
  id: string;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  maintenanceUntil: string | null;
  paymentMode: PaymentMode;
  bookingFeeInr: number;
  payoutAccountName: string | null;
  payoutUpiId: string | null;
  payoutBankName: string | null;
  payoutAccountNumber: string | null;
  payoutIfsc: string | null;
  updatedAt: string;
};

export type AdminOverview = {
  shops: number;
  customers: number;
  barbers: number;
  bookings: {
    total: number;
    byStatus: Record<string, number>;
  };
  points: {
    scoredBookings: number;
    totalPoints: number;
    totalBasePoints: number;
    totalPunctualityPoints: number;
    averageBookingScore: number;
    averagePunctuality: number;
  };
  shopList: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    ownerName: string;
    ownerEmail: string;
    bookings: number;
    staff: number;
  }[];
  recentActivity: {
    id: string;
    status: string;
    serviceName: string;
    customerName: string;
    shopName: string;
    shopId: string;
    date: string;
    startTime: string;
    bookingScore: number | null;
    arrivedAt: string | null;
    actualStartAt: string | null;
    createdAt: string;
  }[];
  paymentModes: PaymentMode[];
  statuses: string[];
};

export type UpdateAdminSettingsInput = {
  maintenanceEnabled?: boolean;
  maintenanceMessage?: string;
  maintenanceUntil?: string | null;
  paymentMode?: PaymentMode;
  bookingFeeInr?: number;
  payoutAccountName?: string | null;
  payoutUpiId?: string | null;
  payoutBankName?: string | null;
  payoutAccountNumber?: string | null;
  payoutIfsc?: string | null;
};

export async function fetchAdminOverview() {
  const response = await api.get<AdminOverview>("/admin/overview");
  return response.data;
}

export async function fetchAdminSettings() {
  const response = await api.get<AdminSettings>("/admin/settings");
  return response.data;
}

export async function updateAdminSettings(input: UpdateAdminSettingsInput) {
  const response = await api.patch<AdminSettings>("/admin/settings", input);
  return response.data;
}

export function getAdminErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
) {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(data?.message)) {
      return data.message.join(" ");
    }
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
