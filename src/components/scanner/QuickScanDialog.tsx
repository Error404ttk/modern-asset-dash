import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CameraOff, Loader2, RefreshCw } from "lucide-react";

const DEFAULT_FORMATS = [
  "qr_code",
  "code_128",
  "code_39",
  "code_93",
  "ean_13",
  "ean_8",
  "itf",
  "pdf417",
  "upc_a",
  "upc_e",
  "data_matrix",
];

interface QuickScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (value: string) => void;
  title?: string;
  description?: string;
}

export function QuickScanDialog({
  open,
  onOpenChange,
  onDetected,
  title = "สแกนรหัส",
  description = "นำ QR Code หรือ Barcode มาอยู่ในกรอบของกล้อง",
}: QuickScanDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const detectTimeoutRef = useRef<number | null>(null);

  const [supportsDetector, setSupportsDetector] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [usingEnvironment, setUsingEnvironment] = useState(true);

  const clearDetectionLoop = useCallback(() => {
    if (detectTimeoutRef.current) {
      window.clearTimeout(detectTimeoutRef.current);
      detectTimeoutRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearDetectionLoop();
    detectorRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setLoadingCamera(false);
  }, [clearDetectionLoop]);

  const handleDetected = useCallback(
    (raw: string | undefined) => {
      const value = raw?.trim();
      if (!value) return;
      stopCamera();
      onDetected(value);
      onOpenChange(false);
    },
    [onDetected, onOpenChange, stopCamera],
  );

  const detectOnce = useCallback(async (): Promise<boolean> => {
    if (!supportsDetector || !videoRef.current) {
      return false;
    }

    try {
      if (!detectorRef.current) {
        let formats = DEFAULT_FORMATS;
        if (window.BarcodeDetector?.getSupportedFormats) {
          try {
            const supported = await window.BarcodeDetector.getSupportedFormats();
            if (Array.isArray(supported) && supported.length > 0) {
              const filtered = DEFAULT_FORMATS.filter((format) => supported.includes(format));
              if (filtered.length > 0) {
                formats = filtered;
              }
            }
          } catch (err) {
            console.warn("Unable to query supported formats", err);
          }
        }
        detectorRef.current = new window.BarcodeDetector({ formats });
      }

      const detector = detectorRef.current;
      const codes = await detector.detect(videoRef.current);
      if (codes && codes.length > 0) {
        const first = codes.find((item) => item.rawValue && item.rawValue.trim().length > 0) ?? codes[0];
        handleDetected(first.rawValue ?? "");
        return true;
      }
    } catch (err) {
      console.warn("Barcode detection error", err);
    }

    return false;
  }, [handleDetected, supportsDetector]);

  const queueDetection = useCallback(() => {
    clearDetectionLoop();
    if (!supportsDetector) {
      return;
    }
    const tick = async () => {
      const found = await detectOnce();
      if (!found) {
        detectTimeoutRef.current = window.setTimeout(tick, 250);
      }
    };
    detectTimeoutRef.current = window.setTimeout(tick, 250);
  }, [clearDetectionLoop, detectOnce, supportsDetector]);

  const startCamera = useCallback(async () => {
    if (!supportsDetector) {
      setCameraError("เบราว์เซอร์นี้ยังไม่รองรับการสแกนด้วยกล้อง");
      return;
    }

    stopCamera();
    setCameraError(null);
    setLoadingCamera(true);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: usingEnvironment ? { ideal: "environment" } : { ideal: "user" },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setLoadingCamera(false);
      queueDetection();
    } catch (err: any) {
      console.error("Camera start error", err);
      stopCamera();

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraError("ไม่ได้รับอนุญาตให้ใช้กล้อง");
      } else if (err?.name === "NotFoundError") {
        setCameraError("ไม่พบกล้องบนอุปกรณ์นี้");
      } else {
        setCameraError("เปิดกล้องไม่สำเร็จ");
      }
    }
  }, [queueDetection, stopCamera, supportsDetector, usingEnvironment]);

  useEffect(() => {
    setSupportsDetector(typeof window !== "undefined" && typeof window.BarcodeDetector !== "undefined");
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  const handleRetry = () => {
    startCamera();
  };

  const handleToggleCamera = () => {
    setUsingEnvironment((prev) => !prev);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-md border bg-muted">
            {supportsDetector ? (
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                เบราว์เซอร์นี้ยังไม่รองรับ BarcodeDetector API โปรดอัปเดตเบราว์เซอร์หรือกรอกข้อมูลด้วยตนเอง
              </div>
            )}

            {loadingCamera && supportsDetector && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {cameraError && (
            <Alert variant="destructive">
              <AlertDescription>{cameraError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleRetry} disabled={loadingCamera || !supportsDetector}>
              <RefreshCw className="mr-2 h-4 w-4" />
              รีเฟรชกล้อง
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleCamera}
              disabled={loadingCamera || !supportsDetector}
            >
              {usingEnvironment ? (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  กล้องด้านหน้า
                </>
              ) : (
                <>
                  <CameraOff className="mr-2 h-4 w-4" />
                  กล้องด้านหลัง
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ปิดหน้าต่าง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QuickScanDialog;
