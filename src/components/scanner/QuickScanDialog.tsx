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
  const fallbackReaderRef = useRef<any>(null);
  const fallbackControlsRef = useRef<{ stop: () => void } | null>(null);
  const fallbackActiveRef = useRef(false);

  const [supportsDetector, setSupportsDetector] = useState(false);
  const [supportsMediaDevices, setSupportsMediaDevices] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [usingEnvironment, setUsingEnvironment] = useState(true);
  const [fallbackLoading, setFallbackLoading] = useState(false);

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
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
      videoRef.current.removeAttribute("srcObject");
      videoRef.current.removeAttribute("src");
      try {
        videoRef.current.load();
      } catch {}
    }
    if (fallbackControlsRef.current) {
      try {
        fallbackControlsRef.current.stop();
      } catch (err) {
        console.warn("Error stopping fallback controls", err);
      }
      fallbackControlsRef.current = null;
    }
    if (fallbackReaderRef.current) {
      try {
        fallbackReaderRef.current.reset?.();
      } catch (err) {
        console.warn("Error resetting fallback reader", err);
      }
      fallbackReaderRef.current = null;
    }
    fallbackActiveRef.current = false;
    setLoadingCamera(false);
    setFallbackLoading(false);
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

  const startDetectorCamera = useCallback(async () => {
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
  }, [queueDetection, stopCamera, usingEnvironment]);

  const startFallbackScanner = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setFallbackLoading(true);

    if (!videoRef.current) {
      setCameraError("ไม่พบวิดีโอสำหรับแสดงผล");
      setFallbackLoading(false);
      return;
    }

    try {
      // Dynamically load ZXing reader for browsers without BarcodeDetector (e.g., iOS Safari)
      // @vite-ignore
      const zxing = await import("https://esm.sh/@zxing/browser@0.1.5");
      const reader = new zxing.BrowserMultiFormatReader();
      fallbackReaderRef.current = reader;
      fallbackActiveRef.current = true;

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result: any, err: any) => {
          if (!fallbackActiveRef.current) {
            return;
          }
          if (result) {
            const text = result.getText ? result.getText() : String(result.text || "");
            if (text) {
              handleDetected(text);
            }
          }
          if (err && err.name !== "NotFoundException") {
            console.warn("ZXing detection error", err);
          }
        },
      );

      fallbackControlsRef.current = controls;
      setFallbackLoading(false);
    } catch (err: any) {
      console.error("Fallback scanner error", err);
      stopCamera();
      if (err?.message?.includes("Could not start video source")) {
        setCameraError("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาต");
      } else {
        setCameraError("ไม่สามารถเปิดการสแกนได้");
      }
    }
  }, [handleDetected, stopCamera]);

  const startCamera = useCallback(async () => {
    if (supportsDetector) {
      await startDetectorCamera();
      return;
    }

    if (!supportsMediaDevices) {
      setCameraError("อุปกรณ์นี้ไม่รองรับการใช้งานกล้อง");
      return;
    }

    await startFallbackScanner();
  }, [startDetectorCamera, startFallbackScanner, supportsDetector, supportsMediaDevices]);

  useEffect(() => {
    const hasDetector = typeof window !== "undefined" && typeof window.BarcodeDetector !== "undefined";
    setSupportsDetector(hasDetector);
    setSupportsMediaDevices(typeof navigator !== "undefined" && !!navigator.mediaDevices);
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
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />

            {(loadingCamera || fallbackLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!supportsDetector && (
              <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-background/70 p-2 text-center text-xs text-muted-foreground">
                โหมดสแกนสำหรับสมาร์ตโฟน: ใช้กล้องหน้า/หลังตามค่าเริ่มต้นของอุปกรณ์
              </div>
            )}
          </div>

          {cameraError && (
            <Alert variant="destructive">
              <AlertDescription>{cameraError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRetry}
              disabled={loadingCamera || fallbackLoading || !supportsMediaDevices}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              รีเฟรชกล้อง
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleCamera}
              disabled={loadingCamera || fallbackLoading || !supportsMediaDevices || !supportsDetector}
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
