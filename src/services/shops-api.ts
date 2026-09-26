import { api } from "./api";
import { isAxiosError } from "axios";

export type PublicShop = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  openTime: string;
  closeTime: string;
};

export type ShopListParams = {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  state?: string;
};

export type ShopListResponse = {
  items: PublicShop[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  cities: string[];
  states: string[];
};

export async function fetchShops(params: ShopListParams = {}) {
  const response = await api.get<ShopListResponse>("/shops", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.city?.trim() ? { city: params.city.trim() } : {}),
      ...(params.state?.trim() ? { state: params.state.trim() } : {}),
    },
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

export function getShopsErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return "Something went wrong. Please try again.";
  }

  if (!error.response) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  return messageFromResponseData(
    error.response.data,
    "Could not load shops. Please try again.",
  );
}

export function formatShopAddress(shop: PublicShop) {
  return [shop.address, shop.city, shop.state, shop.pincode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export type ShopStaffOption = {
  id: string;
  name: string;
  title: string;
  status: "ACTIVE" | "ON_LEAVE";
};

export type ShopReview = {
  id: string;
  rating: number;
  comment: string;
  customerName: string;
  createdAt: string;
};

export type ShopDetail = PublicShop & {
  lunchStart: string;
  lunchEnd: string;
  holidays: string[];
  staff: ShopStaffOption[];
  ratingAverage: number;
  reviewCount: number;
  reviews: ShopReview[];
};

/** Shared menu until shops have their own service catalog. */
export const DEFAULT_SHOP_SERVICES = [
  { id: "haircut", name: "Haircut", priceInr: 199 },
  { id: "beard", name: "Beard Trim", priceInr: 99 },
  { id: "haircut-beard", name: "Haircut + Beard", priceInr: 249 },
  { id: "spa", name: "Head Spa", priceInr: 299 },
  { id: "color", name: "Hair Color", priceInr: 499 },
  { id: "kids", name: "Kids Haircut", priceInr: 149 },
] as const;

export async function fetchShopById(shopId: string) {
  const response = await api.get<ShopDetail>(`/shops/${shopId}`);
  return response.data;
}

/** One decimal max, never above 5. Empty/missing → 0.0 */
export function formatRatingAverage(value: number | null | undefined) {
  const safe = Number.isFinite(value) ? Number(value) : 0;
  const clamped = Math.min(5, Math.max(0, safe));
  return clamped.toFixed(1);
}

export function formatRatingSummary(
  ratingAverage: number | null | undefined,
  reviewCount: number | null | undefined,
) {
  const average = formatRatingAverage(ratingAverage);
  const count = Math.max(0, Math.floor(reviewCount ?? 0));
  return `${average}/5 (${count} ${count === 1 ? "review" : "reviews"})`;
}

export function staffFirstName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return "Barber";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function toMinutes(time24: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time24);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function todayLocalDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Open if now is within open–close and outside lunch, and today is not a holiday. */
export function isShopOpenNow(
  shop: Pick<
    ShopDetail,
    "openTime" | "closeTime" | "lunchStart" | "lunchEnd" | "holidays"
  >,
  now = new Date(),
) {
  const todayKey = todayLocalDateKey(now);
  if (shop.holidays.includes(todayKey)) {
    return false;
  }

  const open = toMinutes(shop.openTime);
  const close = toMinutes(shop.closeTime);
  const lunchStart = toMinutes(shop.lunchStart);
  const lunchEnd = toMinutes(shop.lunchEnd);
  if (open === null || close === null) {
    return false;
  }

  const current = now.getHours() * 60 + now.getMinutes();
  if (current < open || current >= close) {
    return false;
  }

  if (
    lunchStart !== null &&
    lunchEnd !== null &&
    current >= lunchStart &&
    current < lunchEnd
  ) {
    return false;
  }

  return true;
}

