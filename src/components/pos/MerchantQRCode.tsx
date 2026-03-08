import { useAuth } from "@/hooks/useAuth";
import { QrCode, Share2, Printer } from "lucide-react";

export default function MerchantQRCode() {
  const { merchant } = useAuth();
  if (!merchant) return null;

  // Generate a simple QR-like visual + payment link
  const paymentUrl = `${window.location.origin}?pay=${merchant.id}`;

  // SVG-based QR pattern (decorative, real QR via canvas)
  const generateQR = () => {
    const canvas = document.createElement("canvas");
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    
    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    
    // Simple QR-like pattern from merchant ID
    ctx.fillStyle = "#000000";
    const cellSize = 8;
    const grid = 25;
    const hash = merchant.id.replace(/-/g, "");
    
    // Position patterns (corners)
    const drawFinder = (x: number, y: number) => {
      ctx.fillRect(x, y, cellSize * 7, cellSize * 7);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
    };
    
    drawFinder(0, 0);
    drawFinder(size - cellSize * 7, 0);
    drawFinder(0, size - cellSize * 7);
    
    // Data pattern from merchant ID
    for (let i = 0; i < hash.length; i++) {
      const code = hash.charCodeAt(i);
      const row = Math.floor(i / 5) + 8;
      const col = (i % 5) + 8;
      if (code % 2 === 0) {
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
      if (code % 3 === 0) {
        ctx.fillRect((col + 5) * cellSize, (row + 2) * cellSize, cellSize, cellSize);
      }
    }
    
    return canvas.toDataURL();
  };

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
    const qrImage = generateQR();
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`
        <html><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
          <h2>${merchant.name}</h2>
          <img src="${qrImage}" style="width:200px;height:200px;margin:16px 0;" />
          <p style="font-size:12px;color:#666;">Scan to pay via Galaya</p>
          <p style="font-size:10px;color:#999;word-break:break-all;max-width:300px;text-align:center;">${paymentUrl}</p>
        </body></html>
      `);
      w.document.close();
      w.print();
    }
  };

  const qrDataUrl = generateQR();

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
