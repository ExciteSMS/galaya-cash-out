import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Detector { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> }
type DetectorCtor = new (opts?: { formats: string[] }) => Detector;

export const scannerSupported = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && "BarcodeDetector" in window;

interface Props { onScan: (code: string) => void; onClose: () => void }

// Uses the camera and the platform BarcodeDetector. Hardware scanners that type into a field work without this.
export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    let cancelled = false;

    (async () => {
      try {
        const Detector = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
        const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found[0]?.rawValue) { onScanRef.current(found[0].rawValue); return; }
          } catch {
            // frame not ready; try again
          }
          timer = window.setTimeout(tick, 250);
        };
        tick();
      } catch {
        setError("Camera unavailable. Allow camera access or type the code.");
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 gap-4">
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close scanner" className="absolute top-4 right-4 text-white"><X /></Button>
      {error ? <p className="text-white text-sm text-center">{error}</p> : (
        <>
          <video ref={videoRef} muted playsInline className="w-full max-w-sm rounded-lg" />
          <p className="text-white/80 text-xs">Point the camera at a barcode</p>
        </>
      )}
    </div>
  );
}
