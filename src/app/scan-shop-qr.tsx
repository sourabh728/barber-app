import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

import { QrScannerScreen } from "@/components/qr-scanner-screen";
import {
  getVerificationErrorMessage,
  scanShopArrival,
} from "@/services/verification-api";

export default function ScanShopQrScreen() {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();

  return (
    <QrScannerScreen
      title="Scan shop QR"
      subtitle="Your appointment is confirmed. Scan the shop QR when you arrive to check in."
      onScan={async (data) => {
        try {
          const result = await scanShopArrival(data);
          // After arrival, show the service QR the barber will scan at start.
          router.replace(`/service-start-qr?id=${result.appointmentId}`);
        } catch (error) {
          const message = getVerificationErrorMessage(error);
          // If already checked in, open service QR for that booking when known.
          if (
            appointmentId &&
            /already recorded|already/i.test(message)
          ) {
            router.replace(`/service-start-qr?id=${appointmentId}`);
            return;
          }
          throw new Error(message);
        }
      }}
    />
  );
}
