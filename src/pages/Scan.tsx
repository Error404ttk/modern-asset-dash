import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ScanLine, Camera, CameraOff, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Helper to extract equipment id from a scanned text/URL
function extractEquipmentId(text: string): string | null {
  try {
    // If it's a URL and has /equipment/:id
    const url = new URL(text);
    const parts = url.pathname.split("/").filter(Boolean);
    const eqIdx = parts.findIndex((p) => p === "equipment");
    if (eqIdx !== -1 && parts[eqIdx + 1]) return parts[eqIdx + 1];
  } catch {
    // Not a URL; maybe it's already an id
    if (text && text.length >= 8) return text; // naive check
  }
  return null;
}

export default function Scan() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastText, setLastText] = useState<string | null>(null);
  const [usingEnvironment, setUsingEnvironment] = useState(true);
  const navigate = useNavigate();
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const navTimerRef = useRef<number | null>(null);

  const [preview, setPreview] = useState<{ id: string; name: string; image?: string } | null>(null);
  const [devices, setDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [manualText, setManualText] = useState<string>("");

  const scheduleNavigate = useCallback((id: string) => {
    if (navTimerRef.current) {
      window.clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    navTimerRef.current = window.setTimeout(() => {
      navigate(`/equipment/${id}`);
    }, 600);
  }, [navigate]);

  const fetchPreview = useCallback(async (id: string) => {
    try {
      const { data } = await supabase
        .from('equipment')
        .select('id,name,images')
        .eq('id', id)
        .single();
      if (data) {
        const img = Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : undefined;
        setPreview({ id: data.id, name: data.name, image: img });
      } else {
        setPreview({ id, name: 'พบอุปกรณ์', image: undefined });
      }
    } catch {
      setPreview({ id, name: 'พบอุปกรณ์', image: undefined });
    }
  }, []);

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setPermissionDenied(false);
    setScanning(false);
    stopStream();
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          ...(selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: usingEnvironment ? { ideal: "environment" } : { ideal: "user" } }
          ),
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      // Load devices list after permission granted
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        const cams = all.filter(d => d.kind === 'videoinput').map((d, i) => ({ deviceId: d.deviceId, label: d.label || `กล้อง ${i + 1}` }));
        setDevices(cams);
      } catch {}
    } catch (e: any) {
      console.error(e);
      if (e && (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")) {
        setPermissionDenied(true);
        setError("ไม่ได้รับอนุญาตให้ใช้กล้อง");
      } else if (e && e.name === "NotFoundError") {
        setError("ไม่พบกล้องบนอุปกรณ์นี้");
      } else {
        setError("เปิดกล้องไม่สำเร็จ");
      }
    }
  }, [stopStream, usingEnvironment, selectedDeviceId]);

  // Scan loop using BarcodeDetector if available
  const scanLoop = useCallback(() => {
    if (!scanning || !videoRef.current) return;
    const run = async () => {
      // @ts-ignore - BarcodeDetector may not exist in types; we add a custom d.ts
      const supported = typeof window !== "undefined" && "BarcodeDetector" in window;
      if (!supported) return; // we will show fallback UI
      try {
        // @ts-ignore
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const video = videoRef.current!;
        if (video.readyState >= 2) {
          const bitmaps = await createImageBitmap(video);
          const codes = await detector.detect(bitmaps);
          if (codes && codes.length > 0) {
            const raw = codes[0].rawValue || codes[0].rawValue || "";
            if (raw) {
              setLastText(raw);
              const id = extractEquipmentId(raw);
              if (id) {
                stopStream();
                await fetchPreview(id);
                scheduleNavigate(id);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.warn("Barcode detect error", err);
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    };
    rafRef.current = requestAnimationFrame(run);
  }, [fetchPreview, scheduleNavigate, scanning, stopStream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
      if (navTimerRef.current) {
        window.clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
    };
  }, [startCamera, stopStream]);

  useEffect(() => {
    // Only start scanning if BarcodeDetector exists
    // @ts-ignore
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [scanLoop]);

  // ZXing fallback for browsers without BarcodeDetector (e.g., iOS Safari)
  useEffect(() => {
    let codeReader: any = null;
    let stopFallback: (() => void) | null = null;
    if (typeof window !== "undefined" && !("BarcodeDetector" in window)) {
      const mount = async () => {
        try {
          // Dynamically import ZXing browser package from CDN
          // @vite-ignore
          const zxing = await import("https://esm.sh/@zxing/browser@0.1.5");
          codeReader = new zxing.BrowserMultiFormatReader();
          const video = videoRef.current;
          if (!video) return;
          const deviceId = undefined; // let ZXing pick default based on facingMode constraint already applied to stream
          const controls = await codeReader.decodeFromVideoDevice(
            deviceId,
            video,
            (result: any, err: any) => {
              if (result) {
                const text: string = result.getText ? result.getText() : String(result.text || "");
                if (text) {
                  setLastText(text);
                  const id = extractEquipmentId(text);
                  if (id) {
                    stopStream();
                    if (controls && controls.stop) controls.stop();
                    fetchPreview(id);
                    scheduleNavigate(id);
                  }
                }
              }
            }
          );
          stopFallback = () => {
            try { controls && controls.stop && controls.stop(); } catch {}
            try { codeReader && codeReader.reset && codeReader.reset(); } catch {}
          };
        } catch (e) {
          console.warn("ZXing fallback failed", e);
        }
      };
      mount();
    }
    return () => {
      try { stopFallback && stopFallback(); } catch {}
      try { codeReader && codeReader.reset && codeReader.reset(); } catch {}
    };
  }, [navigate, stopStream]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">สแกน QR Code</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-64">
            <Select value={selectedDeviceId || ""} onValueChange={(val) => setSelectedDeviceId(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder={devices.length ? "เลือกกล้อง" : "รออนุญาตกล้อง..."} />
              </SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d.deviceId} value={d.deviceId}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => setUsingEnvironment((v) => !v)}>
            {usingEnvironment ? <Camera className="h-4 w-4 mr-2" /> : <CameraOff className="h-4 w-4 mr-2" />}
            สลับกล้อง
          </Button>
          <Button variant="outline" onClick={startCamera}>
            <RefreshCw className="h-4 w-4 mr-2" /> รีเฟรช
          </Button>
        </div>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            กล้องสแกน QR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="relative w-full rounded-xl overflow-hidden border bg-black aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <div className="pointer-events-none absolute inset-0 border-2 border-primary/40 m-8 rounded-xl" />
              </div>
              {!("BarcodeDetector" in window) && (
                <div className="mt-3 text-sm text-muted-foreground">
                  เบราว์เซอร์ไม่รองรับการสแกนในแอปโดยตรง กรุณาใช้กล้องของสมาร์ทโฟนเพื่อสแกน QR ที่ชี้ไปยังลิงก์ครุภัณฑ์ หรือกรอกลิงก์/รหัสด้านขวา
                </div>
              )}
              {permissionDenied && (
                <div className="mt-3 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> ไม่ได้รับสิทธิ์ใช้งานกล้อง โปรดให้สิทธิ์แล้วกดรีเฟรช
                </div>
              )}
              {error && (
                <div className="mt-3 text-sm text-destructive">{error}</div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">ผลการสแกนล่าสุด</p>
                <div className="mt-2 p-3 rounded border bg-muted/30 text-sm break-all min-h-[72px]">
                  {lastText || "-"}
                </div>
                {lastText && (
                  <div className="mt-2">
                    <Badge variant="secondary">กำลังรอเปิดรายละเอียด...</Badge>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">กรอกลิงก์หรือรหัสครุภัณฑ์ (ทางเลือก)</p>
                <div className="flex gap-2">
                  <Input value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="วางลิงก์ /equipment/:id หรือรหัส" />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const id = extractEquipmentId(manualText.trim());
                      if (!id) return;
                      await fetchPreview(id);
                      scheduleNavigate(id);
                    }}
                  >
                    ไป
                  </Button>
                </div>
              </div>
              {preview && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">พรีวิวครุภัณฑ์</p>
                  <div className="p-3 rounded border bg-muted/30 flex items-center gap-3">
                    <div className="w-16 h-16 rounded overflow-hidden bg-background border">
                      {preview.image ? (
                        <img src={preview.image} alt={preview.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">ไม่มีรูป</div>
                      )}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{preview.name}</div>
                      <div className="text-muted-foreground">ID: {preview.id}</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                เคล็ดลับ: ใช้แสงสว่างเพียงพอและถือกล้องให้นิ่ง เพื่อให้จับโฟกัสและอ่านโค้ดได้เร็วขึ้น
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
