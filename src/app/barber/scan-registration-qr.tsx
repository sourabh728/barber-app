import { useRouter } from "expo-router";
import React from "react";

import { QrScannerScreen } from "@/components/qr-scanner-screen";
import { setPendingRegistrationQr } from "@/utils/registration-qr";

export default function ScanRegistrationQrScreen() {
  const router = useRouter();

  return (
    <QrScannerScreen
      title="Scan registration QR"
      subtitle="Scan the QR code given to you by Trimshim to link it to your shop."
      onScan={async (data) => {
        if (!/"t"\s*:\s*"shop"|^trimshim:shop:/.test(data.trim())) {
          throw new Error("This is not a Trimshim shop QR code.");
        }
        setPendingRegistrationQr(data);
        router.back();
      }}
    />
  );
}
