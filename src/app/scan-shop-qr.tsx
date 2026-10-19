import { useRouter } from "expo-router";
import React from "react";

import { QrScannerScreen } from "@/components/qr-scanner-screen";
import {
  getVerificationErrorMessage,
  scanShopArrival,
} from "@/services/verification-api";
import { showAppAlert } from "@/utils/app-alert";

export default function ScanShopQrScreen() {
  const router = useRouter();

  return (
    <QrScannerScreen
      title="Check in"
      subtitle="Scan the shop QR code when you arrive"
      onScan={async (data) => {
        try {
          const result = await scanShopArrival(data);
          showAppAlert(
            "Checked in",
            `Arrived for ${result.serviceName} at ${result.startTime}. Show your service QR to the barber when ready.`,
          );
          router.replace(`/history/${result.appointmentId}`);
        } catch (error) {
          throw new Error(getVerificationErrorMessage(error));
        }
      }}
    />
  );
}
