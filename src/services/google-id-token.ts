export function emailFromIdToken(idToken: string): {
  email?: string;
  name?: string;
} {
  try {
    const payloadPart = idToken.split(".")[1];
    if (!payloadPart) {
      return {};
    }

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );

    if (typeof globalThis.atob !== "function") {
      return {};
    }

    const json = globalThis.atob(padded);
    const payload = JSON.parse(json) as {
      email?: string;
      name?: string;
      email_verified?: boolean | string;
    };

    const verified =
      payload.email_verified === true || payload.email_verified === "true";

    if (!payload.email || !verified) {
      return {};
    }

    return {
      email: payload.email.trim().toLowerCase(),
      name: payload.name?.trim() || undefined,
    };
  } catch {
    return {};
  }
}
