import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  "aztec",
  "codabar",
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
  const fallbackWaitTimeoutRef = useRef<number | null>(null);
  const detectorWaitTimeoutRef = useRef<number | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const [supportsDetector, setSupportsDetector] = useState(false);
  const [supportsMediaDevices, setSupportsMediaDevices] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [usingEnvironment, setUsingEnvironment] = useState(true);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [zoomState, setZoomState] = useState<{
    min: number;
    max: number;
    step: number;
    value: number;
  } | null>(null);

  const zoomDisplay = useMemo(() => {
    if (!zoomState) {
      return { decimals: 1, formatted: "1.0" };
    }
    const decimals = zoomState.step >= 1 ? 0 : zoomState.step >= 0.1 ? 1 : 2;
    return {
      decimals,
      formatted: zoomState.value.toFixed(decimals),
    };
  }, [zoomState]);

  const clearDetectionLoop = useCallback(() => {
    if (detectTimeoutRef.current) {
      window.clearTimeout(detectTimeoutRef.current);
      detectTimeoutRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearDetectionLoop();
    if (detectorWaitTimeoutRef.current) {
      window.clearTimeout(detectorWaitTimeoutRef.current);
      detectorWaitTimeoutRef.current = null;
    }
    if (fallbackWaitTimeoutRef.current) {
      window.clearTimeout(fallbackWaitTimeoutRef.current);
      fallbackWaitTimeoutRef.current = null;
    }
    detectorRef.current = null;
    if (trackRef.current) {
      try {
        trackRef.current.stop();
      } catch {}
      trackRef.current = null;
    }
    setZoomState(null);
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

  const configureZoomFromStream = useCallback((stream: MediaStream) => {
    try {
      const track = stream.getVideoTracks()[0];
      if (!track) {
        setZoomState(null);
        trackRef.current = null;
        return;
      }

      trackRef.current = track;

      if (typeof track.getCapabilities !== "function") {
        setZoomState(null);
        return;
      }

      const capabilities = track.getCapabilities();
      const zoomCap = (capabilities as MediaTrackCapabilities & { zoom?: any }).zoom as
        | { min?: number; max?: number; step?: number }
        | undefined;

      if (!zoomCap || typeof zoomCap.min !== "number" || typeof zoomCap.max !== "number") {
        setZoomState(null);
        return;
      }

      const min = zoomCap.min ?? 1;
      const max = zoomCap.max ?? min;
      let step = zoomCap.step ?? 0.1;
      if (!step || step <= 0) {
        step = 0.1;
      }

      let current = min;
      if (typeof track.getSettings === "function") {
        const settings = track.getSettings() as MediaTrackSettings & { zoom?: number };
        if (typeof settings.zoom === "number") {
          current = settings.zoom;
        }
      }
      current = Math.min(Math.max(current, min), max);

      setZoomState({ min, max, step, value: current });
    } catch (error) {
      console.warn("Zoom capability unavailable", error);
      setZoomState(null);
      trackRef.current = null;
    }
  }, []);

  const applyZoom = useCallback(
    async (value: number): Promise<boolean> => {
      const track = trackRef.current;
      if (!track || typeof track.applyConstraints !== "function") {
        return false;
      }
      try {
        await track.applyConstraints({ advanced: [{ zoom: value }] });
        return true;
      } catch (primaryError) {
        try {
          await track.applyConstraints({ zoom: value });
          return true;
        } catch (fallbackError) {
          console.warn("Zoom apply failed", primaryError, fallbackError);
          setCameraError("ไม่สามารถปรับซูมได้");
          return false;
        }
      }
    },
    [setCameraError],
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
    if (!videoRef.current) {
      detectorWaitTimeoutRef.current = window.setTimeout(() => {
        startDetectorCamera();
      }, 60);
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

      configureZoomFromStream(stream);
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
  }, [configureZoomFromStream, queueDetection, stopCamera, usingEnvironment]);

  const startFallbackScanner = useCallback(async () => {
    if (!videoRef.current) {
      fallbackWaitTimeoutRef.current = window.setTimeout(() => {
        startFallbackScanner();
      }, 60);
      return;
    }

    stopCamera();
    setCameraError(null);
    setFallbackLoading(true);

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
      const attachZoom = () => {
        if (!videoRef.current) {
          return;
        }
        const currentStream = videoRef.current.srcObject as MediaStream | null;
        if (currentStream) {
          streamRef.current = currentStream;
          configureZoomFromStream(currentStream);
        } else {
          window.setTimeout(attachZoom, 120);
        }
      };
      window.setTimeout(attachZoom, 120);
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
  }, [configureZoomFromStream, handleDetected, stopCamera]);

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

          {zoomState && zoomState.max > zoomState.min && (
            <div className="space-y-2">
              <div className="text-sm font-medium">ซูมกล้อง</div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={zoomState.min}
                  max={zoomState.max}
                  step={zoomState.step}
                  value={zoomState.value}
                  onChange={async (event) => {
                    const next = Number(event.target.value);
                    const previous = zoomState.value;
                    setZoomState((prev) => (prev ? { ...prev, value: next } : prev));
                    setCameraError(null);
                    const success = await applyZoom(next);
                    if (!success) {
                      setZoomState((prev) => (prev ? { ...prev, value: previous } : prev));
                    }
                  }}
                  className="flex-1"
                />
                <span className="w-12 text-right text-sm text-muted-foreground">
                  {zoomDisplay.formatted}x
                </span>
              </div>
            </div>
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
