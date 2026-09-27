import { apiBaseUrl } from "@/services/api";

const PROFILE_PLACEHOLDER = require("@/assets/images/profile.png");
const SHOP_PLACEHOLDER = require("@/assets/images/hero.jpg");

/** Turn a stored `/uploads/...` path (or absolute URL) into a loadable URI. */
export function resolveMediaUrl(
  pathOrUrl: string | null | undefined,
): string | null {
  if (!pathOrUrl?.trim()) {
    return null;
  }

  const value = pathOrUrl.trim();
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const base = apiBaseUrl.replace(/\/$/, "");
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${base}${path}`;
}

export function profileImageSource(photoUrl: string | null | undefined) {
  const uri = resolveMediaUrl(photoUrl);
  return uri ? { uri } : PROFILE_PLACEHOLDER;
}

export function shopImageSource(photoUrl: string | null | undefined) {
  const uri = resolveMediaUrl(photoUrl);
  return uri ? { uri } : SHOP_PLACEHOLDER;
}
