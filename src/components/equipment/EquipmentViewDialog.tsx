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
import {
  Calendar,
  MapPin,
  User,
  HardDrive,
  Cpu,
  Monitor,
  Zap,
  Image,
  ZoomIn,
  Building2,
  Coins,
  Receipt,
  Phone,
  Wallet,
  ClipboardList,
  Clock3,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, type ReactNode } from "react";
import { format as formatDate, parseISO, isValid } from "date-fns";
import { th as thaiLocale } from "date-fns/locale";
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

const EXCLUDED_ADDITIONAL_SPEC_KEYS = new Set([
  "department",
  "reason",
  "notes",
  "price",
  "budgetType",
  "acquisitionMethod",
]);

const BUDGET_TYPE_LABELS: Record<string, string> = {
  budget: "เงินงบประมาณ",
  "non-budget": "เงินนอกงบประมาณ",
  donation: "เงินบริจาค",
  other: "อื่น ๆ",
};

const ACQUISITION_METHOD_LABELS: Record<string, string> = {
  "price-agreement": "ตกลงราคา",
  "price-auction": "ประกวดราคา",
  "price-inquiry": "สอบราคา",
  "special-method": "วิธีพิเศษ",
  "donation-received": "รับบริจาค",
  "e-bidding": "e-bidding",
  "e-market": "e-market",
  selection: "คัดเลือก",
  specific: "เฉพาะเจาะจง",
};

const parsePriceValue = (raw: unknown): number | null => {
  if (raw == null) return null;
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? raw : "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const cleaned = value.replace(/[^0-9,.-]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const numeric = Number.parseFloat(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatCurrencyTHB = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

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
  vendorId?: string | null;
  vendorName?: string;
  vendorPhone?: string;
  vendorAddress?: string;
  borrowInfo?: BorrowSummary | null;
}

interface BorrowSummary {
  borrowerName: string | null;
  borrowerDepartment: string | null;
  borrowerContact: string | null;
  notes: string | null;
  borrowedAt: string | null;
  expectedReturnAt: string | null;
  returnedAt: string | null;
  status: string;
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
    .filter(([key]) => !PRIMARY_SPEC_ORDER.includes(key) && !EXCLUDED_ADDITIONAL_SPEC_KEYS.has(key))
    .map(([key, rawValue]) => {
      const value = rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
      return value ? { key, value } : null;
    })
    .filter((entry): entry is { key: string; value: string } => Boolean(entry));

  const priceValue = parsePriceValue(specs.price);
  const hasPrice = priceValue !== null;
  const formattedPrice = hasPrice && priceValue !== null ? formatCurrencyTHB(priceValue) : "";
  const budgetTypeRaw =
    typeof specs.budgetType === "string" ? specs.budgetType.trim() : "";
  const acquisitionMethodRaw =
    typeof specs.acquisitionMethod === "string" ? specs.acquisitionMethod.trim() : "";
  const budgetTypeLabel = budgetTypeRaw ? BUDGET_TYPE_LABELS[budgetTypeRaw] ?? budgetTypeRaw : "";
  const acquisitionMethodLabel = acquisitionMethodRaw
    ? ACQUISITION_METHOD_LABELS[acquisitionMethodRaw] ?? acquisitionMethodRaw
    : "";
  const hasBudgetType = Boolean(budgetTypeRaw);
  const hasAcquisitionMethod = Boolean(acquisitionMethodRaw);
  const hasProcurementInfo = hasPrice || hasBudgetType || hasAcquisitionMethod;

  const BORROW_STATUS_LABELS: Record<string, string> = {
    borrowed: "กำลังยืม",
    overdue: "เกินกำหนด",
    returned: "คืนแล้ว",
  };

  const parseDateValue = (value: string | null | undefined) => {
    if (!value) return null;
    const isoParsed = parseISO(value);
    if (isValid(isoParsed)) return isoParsed;
    const fallback = new Date(value);
    return isValid(fallback) ? fallback : null;
  };

  const formatDateTimeThai = (value: string | null | undefined) => {
    const parsed = parseDateValue(value);
    if (!parsed) return "-";
    return formatDate(parsed, "d MMM yyyy HH:mm", { locale: thaiLocale });
  };

  const formatDateThai = (value: string | null | undefined) => {
    const parsed = parseDateValue(value);
    if (!parsed) return "-";
    return formatDate(parsed, "d MMM yyyy", { locale: thaiLocale });
  };

  const vendorName = equipment.vendorName?.trim() ?? "";
  const vendorPhone = equipment.vendorPhone?.trim() ?? "";
  const vendorAddress = equipment.vendorAddress?.trim() ?? "";
  const hasVendorInfo = Boolean(vendorName || vendorPhone || vendorAddress);
  const borrowInfo = equipment.borrowInfo ?? null;
  const statusLower = (equipment.status || "").toLowerCase();
  const isBorrowedStatus = statusLower === "borrowed" || statusLower === "overdue";
  const isBorrowHighlightVisible = isBorrowedStatus && Boolean(borrowInfo);
  const borrowedStatusLabel = borrowInfo
    ? BORROW_STATUS_LABELS[borrowInfo.status] ?? borrowInfo.status
    : "";
  const borrowedAtDisplay = formatDateTimeThai(borrowInfo?.borrowedAt);
  const expectedReturnDisplay = formatDateTimeThai(borrowInfo?.expectedReturnAt);
  const returnedAtDisplay = formatDateThai(borrowInfo?.returnedAt);
  const isReturned = Boolean(borrowInfo?.returnedAt);
  const now = new Date();
  const expectedReturnDate = parseDateValue(borrowInfo?.expectedReturnAt);
  const isOverdue =
    Boolean(borrowInfo) &&
    !isReturned &&
    (borrowInfo?.status === "overdue" ||
      (expectedReturnDate !== null && expectedReturnDate.getTime() < now.getTime()));
  const returnStatusText = isReturned
    ? `คืนแล้ว (${returnedAtDisplay})`
    : isOverdue
    ? "เกินกำหนดคืน"
    : "ยังไม่คืน";
  const returnStatusBadgeClass = isReturned
    ? "bg-emerald-100 text-emerald-800"
    : isOverdue
    ? "bg-destructive/20 text-destructive"
    : "bg-amber-100 text-amber-900";
  const quantity = equipment.quantity?.trim() || "";

  const generalInfoFields: Array<{ label: string; value: string | ReactNode; valueClassName?: string }> = [
    { label: "ชื่อครุภัณฑ์", value: equipment.name || "-" },
    {
      label: "ประเภท",
      value: <Badge variant="outline">{equipment.type || "-"}</Badge>,
    },
    { label: "ยี่ห้อ", value: equipment.brand || "-" },
    { label: "รุ่น", value: equipment.model || "-" },
    { label: "Serial Number", value: equipment.serialNumber || "-", valueClassName: "font-mono text-sm" },
    {
      label: "เลขครุภัณฑ์",
      value: fullAssetNumber || "-",
      valueClassName: "font-mono text-sm font-semibold text-primary",
    },
    { label: "จำนวน", value: quantity || "-" },
  ];

  const usageFields = [
    equipment.specs?.department
      ? {
          icon: <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />,
          label: "หน่วยงานที่รับผิดชอบ",
          value: equipment.specs.department,
        }
      : null,
    {
      icon: <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />,
      label: "สถานที่ติดตั้ง/จัดเก็บ",
      value: equipment.location || "-",
    },
    {
      icon: <User className="h-4 w-4 text-muted-foreground mt-0.5" />,
      label: "ผู้ใช้งาน",
      value: equipment.user || "-",
    },
    {
      icon: <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />,
      label: "วันที่ได้มา",
      value: equipment.purchaseDate || "-",
    },
    {
      icon: <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />,
      label: "หมดประกัน",
      value: equipment.warrantyEnd || "-",
    },
  ].filter(Boolean) as Array<{ icon: ReactNode; label: string; value: string }>;

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
                  {generalInfoFields.map(({ label, value, valueClassName }) => {
                    const isStringValue = typeof value === "string";
                    const displayValue = isStringValue ? (value ? value : "-") : value;
                    const paragraphClass = isStringValue
                      ? valueClassName ?? ""
                      : "mt-1";
                    return (
                      <div key={label}>
                        <label className="text-sm font-medium text-muted-foreground">{label}</label>
                        <p className={paragraphClass}>{displayValue}</p>
                      </div>
                    );
                  })}
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

            {isBorrowHighlightVisible ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-900">
                    <User className="h-4 w-4" />
                    <span className="font-semibold">ข้อมูลการยืมปัจจุบัน</span>
                  </div>
                  <Badge className="bg-amber-200 text-amber-900">
                    {borrowedStatusLabel}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">ผู้ยืม</p>
                      <p>{borrowInfo?.borrowerName || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">หน่วยงานที่ยืม</p>
                      <p>{borrowInfo?.borrowerDepartment || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">ยืมไปใช้ที่</p>
                      <p>{equipment.location || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">วันที่ยืม</p>
                      <p>{borrowedAtDisplay}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">กำหนดคืน</p>
                      <p>{expectedReturnDisplay}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 md:col-span-2">
                    <ClipboardList className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">เหตุผลการยืม</p>
                      <p className="whitespace-pre-line">{borrowInfo?.notes || "-"}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${returnStatusBadgeClass}`}
                  >
                    {isOverdue ? (
                      <CircleAlert className="h-3.5 w-3.5" />
                    ) : (
                      <CircleCheck className="h-3.5 w-3.5" />
                    )}
                    {returnStatusText}
                  </span>
                  {borrowInfo?.borrowerContact ? (
                    <span className="text-sm text-muted-foreground">
                      ติดต่อ: {borrowInfo.borrowerContact}
                    </span>
                  ) : null}
                  {isReturned && borrowInfo?.returnedAt ? (
                    <span className="text-sm text-muted-foreground">
                      คืนเมื่อ: {returnedAtDisplay}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : isBorrowedStatus ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="text-sm text-amber-900">
                  ไม่พบข้อมูลการยืมล่าสุด โปรดตรวจสอบประวัติการยืมคืน
                </p>
              </div>
            ) : null}

          {/* ข้อมูลการใช้งาน/จัดเก็บ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลการใช้งาน/จัดเก็บ</CardTitle>
            </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {usageFields.length > 0 ? (
                    usageFields.map(({ icon, label, value }) => (
                      <div key={label} className="flex items-start space-x-2">
                        {icon}
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">{label}</label>
                          <p>{value}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการใช้งาน/จัดเก็บ</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลการจัดซื้อจัดจ้าง</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasProcurementInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-start space-x-2">
                      <Coins className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          ราคาที่จัดซื้อ
                        </label>
                        <p>{hasPrice ? formattedPrice : "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Receipt className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          วิธีการได้มา
                        </label>
                        <p>{hasAcquisitionMethod ? acquisitionMethodLabel : "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Wallet className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          ประเภทของเงิน
                        </label>
                        <p>{hasBudgetType ? budgetTypeLabel : "-"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการจัดซื้อจัดจ้าง</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลผู้ขาย/ผู้รับจ้าง</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasVendorInfo ? (
                  <>
                    {vendorName && (
                      <div className="flex items-start space-x-2">
                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">ชื่อผู้ขาย</label>
                          <p>{vendorName}</p>
                        </div>
                      </div>
                    )}
                    {vendorPhone && (
                      <div className="flex items-start space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">โทรศัพท์</label>
                          <p>{vendorPhone}</p>
                        </div>
                      </div>
                    )}
                    {vendorAddress && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">ที่อยู่</label>
                          <p className="whitespace-pre-line">{vendorAddress}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลผู้ขาย/ผู้รับจ้าง</p>
                )}
              </CardContent>
            </Card>

            {/* ข้อมูลสเปค */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลเทคนิค</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {primarySpecs.length > 0 ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลเทคนิคหลัก</p>
                )}

                {additionalSpecs.length > 0 ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {primarySpecs.length > 0
                      ? "ไม่มีข้อมูลเทคนิคเพิ่มเติม"
                      : "ยังไม่มีข้อมูลเทคนิคเพิ่มเติม"}
                  </p>
                )}
              </CardContent>
            </Card>
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
