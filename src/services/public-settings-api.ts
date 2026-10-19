import { api } from "@/services/api";

export type PaymentMode = "PAY_AT_SHOP" | "ONLINE_FEE_REST_AT_SHOP";

export type PublicAppSettings = {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  maintenanceUntil: string | null;
  paymentMode: PaymentMode;
  bookingFeeInr: number;
  payoutAccountName: string | null;
  payoutUpiId: string | null;
  payoutBankName: string | null;
  payoutAccountLast4: string | null;
  payoutIfsc: string | null;
};

export async function fetchPublicSettings() {
  const response = await api.get<PublicAppSettings>("/settings/public");
  return response.data;
}

export function formatPaymentLabel(
  settings: Pick<
    PublicAppSettings,
    "paymentMode" | "bookingFeeInr" | "payoutUpiId"
  > | null,
  priceInr?: number,
): string {
  if (!settings || settings.paymentMode === "PAY_AT_SHOP") {
    return priceInr != null
      ? `₹${priceInr.toLocaleString("en-IN")} · Pay at shop`
      : "Pay at shop";
  }

  const fee = settings.bookingFeeInr;
  const rest =
    priceInr != null
      ? ` · rest ₹${Math.max(0, priceInr - fee).toLocaleString("en-IN")} at shop`
      : " · rest at shop after service";
  const upi = settings.payoutUpiId ? ` (UPI: ${settings.payoutUpiId})` : "";
  return `Pay ₹${fee} online now${rest}${upi}`;
}
