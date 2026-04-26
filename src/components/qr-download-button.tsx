"use client";

/**
 * QrDownloadButton — Genererar en QR-kod för en given URL och låter
 * användaren ladda ned den som PNG-fil.
 */

import { useState } from "react";
import { QrCode } from "lucide-react";
import QRCode from "qrcode";

type Props = {
  url: string;
  filename?: string;
  title?: string;
};

export function QrDownloadButton({ url, filename = "qr.png", title = "Ladda ned QR-kod" }: Props) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: { dark: "#0A0A0A", light: "#FFFFFF" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={loading}
      className="btn-ghost"
      title={title}
      aria-label={title}
    >
      <QrCode className="h-4 w-4" />
    </button>
  );
}
