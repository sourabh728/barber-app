// Hands a scanned onboarding QR from the scanner screen back to shop setup.
let pendingPayload: string | null = null;

export function setPendingRegistrationQr(payload: string | null) {
  pendingPayload = payload;
}

export function takePendingRegistrationQr() {
  const value = pendingPayload;
  pendingPayload = null;
  return value;
}
