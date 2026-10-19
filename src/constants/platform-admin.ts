/** Sole platform admin identity — must never use customer booking UI. */
export const PLATFORM_ADMIN_EMAIL = "solutionsfromyukti@gmail.com";

export function isPlatformAdminUser(user: {
  role?: string | null;
  email?: string | null;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return (user.email ?? "").trim().toLowerCase() === PLATFORM_ADMIN_EMAIL;
}
