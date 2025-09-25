import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, User, HardDrive, Cpu, Monitor, Zap, Image, ZoomIn, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { normalizeAssetNumber } from "@/lib/asset-number";

const SPEC_LABELS: Record<string, string> = {
  cpu: "CPU",
  cpuSeries: "CPU Series",
  ramGb: "RAM (GB)",
  harddisk: "Harddisk",
  operatingSystem: "Operating System",
  officeSuite: "Office",
  gpu: "Graphic Card (GPU)",
  productKey: "Product Key",
  ipAddress: "IP Address",
  macAddress: "MAC Address",
  hostname: "Hostname",
};

const PRIMARY_SPEC_ORDER = [
  "cpu",
  "cpuSeries",
  "ramGb",
  "harddisk",
  "operatingSystem",
  "officeSuite",
  "gpu",
  "productKey",
  "ipAddress",
  "macAddress",
  "hostname",
];

const formatSpecLabel = (key: string) => {
  if (SPEC_LABELS[key]) return SPEC_LABELS[key];
  const prettified = key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .trim();
  return prettified.charAt(0).toUpperCase() + prettified.slice(1);
};

interface Equipment {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  assetNumber: string;
  status: string;
  location: string;
  user: string;
  purchaseDate: string;
  warrantyEnd: string;
  quantity: string;
  images?: string[];
  specs: {
    [key: string]: string;
  };
}

interface EquipmentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment;
}

export default function EquipmentViewDialog({ open, onOpenChange, equipment }: EquipmentViewDialogProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  
  const getStatusBadge = (status: string) => {
    const variants = {
      available: { color: "bg-success text-success-foreground", label: "พร้อมใช้งาน" },
      borrowed: { color: "bg-primary text-primary-foreground", label: "ถูกยืม" },
      maintenance: { color: "bg-warning text-warning-foreground", label: "ซ่อมบำรุง" },
      damaged: { color: "bg-destructive text-destructive-foreground", label: "ชำรุด" },
      pending_disposal: { color: "bg-secondary text-secondary-foreground", label: "รอจำหน่าย" },
      disposed: { color: "bg-disposed text-disposed-foreground", label: "จำหน่าย" },
      lost: { color: "bg-destructive text-destructive-foreground", label: "สูญหาย" }
    };
    
    const config = variants[status as keyof typeof variants] || { color: "bg-muted text-muted-foreground", label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getSpecIcon = (key: string) => {
    const iconMap: { [key: string]: any } = {
      cpu: Cpu,
      cpuseries: Cpu,
      ram: Monitor,
      ramgb: Monitor,
      harddisk: HardDrive,
      storage: HardDrive,
      operatingsystem: Monitor,
      officesuite: Monitor,
      gpu: Monitor,
      productkey: Zap,
      ipaddress: Monitor,
      macaddress: Monitor,
      hostname: Monitor,
    };

    const IconComponent = iconMap[key.toLowerCase()] || HardDrive;
    return <IconComponent className="h-4 w-4 text-muted-foreground" />;
  };

  const specs = equipment && typeof equipment.specs === "object" && equipment.specs !== null && !Array.isArray(equipment.specs)
    ? (equipment.specs as Record<string, unknown>)
    : {};
  const assetInfo = normalizeAssetNumber(equipment?.assetNumber, equipment?.quantity);
  const fullAssetNumber = assetInfo.formatted;
  const reason = typeof specs.reason === "string" ? specs.reason.trim() : "";
  const notes = typeof specs.notes === "string" ? specs.notes.trim() : "";
  const reasonText = reason || notes;
  const primarySpecs = PRIMARY_SPEC_ORDER
    .map((key) => {
      const rawValue = specs[key];
      const value = rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
      return value ? { key, value } : null;
    })
    .filter((entry): entry is { key: string; value: string } => Boolean(entry));

  const additionalSpecs = Object.entries(specs)
    .filter(([key]) => !PRIMARY_SPEC_ORDER.includes(key))
    .map(([key, rawValue]) => {
      const value = rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
      return value ? { key, value } : null;
    })
    .filter((entry): entry is { key: string; value: string } => Boolean(entry));

  useEffect(() => {
    setActivePreviewIndex(0);
    setSelectedImageIndex(null);
  }, [equipment, open]);

  const images = Array.isArray(equipment.images)
    ? equipment.images.filter((image): image is string => Boolean(image))
    : [];
  const hasImages = images.length > 0;
  const activeImageIndex = hasImages ? Math.min(activePreviewIndex, images.length - 1) : 0;
  const activeImageUrl = hasImages ? images[activeImageIndex] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>รายละเอียดครุภัณฑ์</DialogTitle>
          <DialogDescription>
            ข้อมูลครุภัณฑ์ {equipment.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            {/* ข้อมูลหลัก */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลทั่วไป</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ชื่อครุภัณฑ์</label>
                    <p className="font-semibold">{equipment.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ประเภท</label>
                    <div><Badge variant="outline">{equipment.type}</Badge></div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ยี่ห้อ</label>
                    <p>{equipment.brand}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">รุ่น</label>
                    <p>{equipment.model}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
                    <p className="font-mono text-sm">{equipment.serialNumber}</p>
                  </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">เลขครุภัณฑ์</label>
                  <p className="font-mono text-sm font-semibold text-primary">{fullAssetNumber}</p>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">สถานะ</label>
                <div className="mt-1">{getStatusBadge(equipment.status)}</div>
              </div>

              {reasonText && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">เหตุผล</label>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground">{reasonText}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

            {/* ข้อมูลการใช้งาน/จัดเก็บ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลการใช้งาน/จัดเก็บ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {equipment.specs?.department && (
                    <div className="flex items-start space-x-2">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">หน่วยงานที่รับผิดชอบ</label>
                        <p>{equipment.specs.department}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">สถานที่ติดตั้ง/จัดเก็บ</label>
                      <p>{equipment.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">ผู้ใช้งาน</label>
                      <p>{equipment.user}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">วันที่ได้มา</label>
                      <p>{equipment.purchaseDate}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">หมดประกัน</label>
                      <p>{equipment.warrantyEnd}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ข้อมูลสเปค */}
            {(primarySpecs.length > 0 || additionalSpecs.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ข้อมูลเทคนิค</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {primarySpecs.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {primarySpecs.map(({ key, value }) => (
                        <div key={key} className="flex items-start space-x-2">
                          {getSpecIcon(key)}
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              {formatSpecLabel(key)}
                            </label>
                            <p>{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {additionalSpecs.length > 0 && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {additionalSpecs.map(({ key, value }) => (
                          <div key={key} className="flex items-start space-x-2">
                            {getSpecIcon(key)}
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">
                                {formatSpecLabel(key)}
                              </label>
                              <p>{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6 lg:sticky lg:top-20">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Image className="h-5 w-5 text-primary" />
                  <span>รูปภาพครุภัณฑ์</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasImages ? (
                  <>
                    <div
                      className="relative aspect-square overflow-hidden rounded-xl border bg-muted"
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedImageIndex(activeImageIndex)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          setSelectedImageIndex(activeImageIndex);
                        }
                      }}
                    >
                      {activeImageUrl && (
                        <img
                          src={activeImageUrl}
                          alt={`${equipment.name} - รูปที่ ${activeImageIndex + 1}`}
                          className="h-full w-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 flex items-end justify-end p-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="bg-black/60 text-white hover:bg-black/70"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedImageIndex(activeImageIndex);
                          }}
                        >
                          <ZoomIn className="mr-1 h-4 w-4" /> ดูแบบเต็ม
                        </Button>
                      </div>
                    </div>

                    {images.length > 1 && (
                      <div className="grid grid-cols-3 gap-3">
                        {images.map((imageUrl, index) => (
                          <button
                            key={`thumb-${index}`}
                            type="button"
                            onClick={() => setActivePreviewIndex(index)}
                            className={`relative aspect-square overflow-hidden rounded-lg border transition focus:outline-none ${
                              index === activeImageIndex
                                ? 'ring-2 ring-primary border-primary'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={imageUrl}
                              alt={`${equipment.name} - ตัวอย่าง ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    ยังไม่มีรูปภาพสำหรับครุภัณฑ์รายการนี้
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Image Modal */}
        {selectedImageIndex !== null && hasImages && (
          <Dialog open={selectedImageIndex !== null} onOpenChange={() => setSelectedImageIndex(null)}>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>รูปภาพครุภัณฑ์ - {equipment.name}</DialogTitle>
                <DialogDescription>
                  รูปที่ {selectedImageIndex + 1} จาก {images.length} รูป
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center p-4">
                <img
                  src={images[selectedImageIndex]}
                  alt={`${equipment.name} - รูปที่ ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                  disabled={selectedImageIndex === 0}
                >
                  รูปก่อนหน้า
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedImageIndex + 1} / {images.length}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setSelectedImageIndex(Math.min(images.length - 1, selectedImageIndex + 1))}
                  disabled={selectedImageIndex === images.length - 1}
                >
                  รูปถัดไป
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
