import { useAuth } from "@/hooks/useAuth";
import { QrCode, Share2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function MerchantQRCode() {
  const { merchant } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const paymentUrl = merchant ? `${window.location.origin}?pay=${merchant.id}` : "";

  useEffect(() => {
    if (!merchant) return;
    QRCode.toDataURL(paymentUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl).catch(console.error);
  }, [merchant, paymentUrl]);

  if (!merchant || !qrDataUrl) return null;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Pay ${merchant.name}`,
        text: `Pay ${merchant.name} via Galaya`,
        url: paymentUrl,
      });
    } else {
      await navigator.clipboard.writeText(paymentUrl);
      alert("Payment link copied!");
    }
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`
        <html><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
          <h2>${merchant.name}</h2>
          <img src="${qrDataUrl}" style="width:200px;height:200px;margin:16px 0;" />
          <p style="font-size:12px;color:#666;">Scan to pay via Galaya</p>
          <p style="font-size:10px;color:#999;word-break:break-all;max-width:300px;text-align:center;">${paymentUrl}</p>
        </body></html>
      `);
      w.document.close();
      w.print();
    }
  };

  return (
    <div className="bg-secondary rounded-lg border border-border p-3">
      <div className="flex items-center gap-1 mb-2">
        <QrCode className="w-3 h-3 text-primary" />
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Your QR Code</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 bg-white rounded-lg p-1 flex-shrink-0">
          <img src={qrDataUrl} alt="QR Code" className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground mb-1">{merchant.name}</p>
          <p className="text-[10px] text-muted-foreground mb-2">Customers scan to pay you</p>
          <div className="flex gap-2">
            <button onClick={handleShare} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
              <Share2 className="w-3 h-3" /> Share
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
              <Printer className="w-3 h-3" /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
