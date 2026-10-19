import { useRouter } from "expo-router";
import React from "react";

import { QrScannerScreen } from "@/components/qr-scanner-screen";
import {
  getVerificationErrorMessage,
  scanServiceStart,
} from "@/services/verification-api";
import { showAppAlert } from "@/utils/app-alert";

export default function ScanServiceQrScreen() {
  const router = useRouter();

  return (
    <QrScannerScreen
      title="Start service"
      subtitle="Scan the customer's service QR to lock the start time"
      onScan={async (data) => {
        try {
          const result = await scanServiceStart(data);
          showAppAlert(
            "Service started",
            `${result.customerName} · ${result.serviceName}`,
          );
          router.replace("/barber/appointments");
        } catch (error) {
          throw new Error(getVerificationErrorMessage(error));
        }
      }}
    />
  );
}
