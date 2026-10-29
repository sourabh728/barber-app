import { isAxiosError } from "axios";

import { api } from "./api";

export type ShopQrResponse = {
  shopId: string;
  shopName: string;
  qrPayload: string;
  qrToken: string;
};

export type ArrivalScanResponse = {
  appointmentId: string;
  shopId: string;
  shopName: string;
  arrivedAt: string;
  status: string;
  startTime: string;
  serviceName: string;
};

export type ServiceStartQrResponse = {
  appointmentId: string;
  qrPayload: string;
  expiresAt: string;
};

export type ServiceStartScanResponse = {
  appointmentId: string;
  actualStartAt: string;
  status: string;
  customerName: string;
  serviceName: string;
  startTime: string;
};

export type BookingVerification = {
  appointmentId: string;
  status: string;
  arrivedAt: string | null;
  actualStartAt: string | null;
  basePoints: number | null;
  punctualityPoints: number | null;
  bookingScore: number | null;
  maxBookingScore?: number;
  scoredAt: string | null;
  date: string;
  startTime: string;
};

export type LeaderboardEntry = {
  rank: number;
  staffId: string;
  staffName: string;
  title: string;
  shopName: string;
  totalPoints: number;
  eligibleBookings: number;
  averagePunctualityPoints: number;
};

export type WeeklyLeaderboard = {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  shopId: string;
  shopName: string;
  entries: LeaderboardEntry[];
};

export type ShopLeaderboardEntry = {
  rank: number;
  shopId: string;
  shopName: string;
  city: string;
  state: string;
  totalPoints: number;
  scoredBookings: number;
  isMine: boolean;
};

export type ShopLeaderboard = {
  appliedFilter: { state: string | null; city: string | null };
  myShopId: string | null;
  myRank: number | null;
  states: string[];
  cities: string[];
  entries: ShopLeaderboardEntry[];
};

export type ShopLeaderboardParams = {
  state?: string;
  city?: string;
  all?: boolean;
};

export async function fetchShopLeaderboard(params: ShopLeaderboardParams = {}) {
  const response = await api.get<ShopLeaderboard>("/leaderboard/shops", {
    params: {
      state: params.state || undefined,
      city: params.city || undefined,
      all: params.all ? "true" : undefined,
    },
  });
  return response.data;
}

export function getVerificationErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === "string") return data.message;
    if (Array.isArray(data?.message)) return data.message.join(", ");
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export async function fetchShopQr() {
  const response = await api.get<ShopQrResponse>("/shops/me/qr");
  return response.data;
}

export async function scanShopArrival(qrPayload: string) {
  const response = await api.post<ArrivalScanResponse>(
    "/customers/me/arrivals/scan",
    { qrPayload },
  );
  return response.data;
}

export async function issueServiceStartQr(appointmentId: string) {
  const response = await api.post<ServiceStartQrResponse>(
    `/customers/me/appointments/${appointmentId}/service-start-qr`,
  );
  return response.data;
}

export async function scanServiceStart(qrPayload: string) {
  const response = await api.post<ServiceStartScanResponse>(
    "/shops/me/service-start/scan",
    { qrPayload },
  );
  return response.data;
}

export async function fetchBookingVerification(appointmentId: string) {
  const response = await api.get<BookingVerification>(
    `/customers/me/appointments/${appointmentId}/verification`,
  );
  return response.data;
}

export async function fetchWeeklyLeaderboard(week?: string) {
  const response = await api.get<WeeklyLeaderboard>(
    "/shops/me/leaderboard/weekly",
    { params: week ? { week } : undefined },
  );
  return response.data;
}
