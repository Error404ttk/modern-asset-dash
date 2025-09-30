import { type ComponentType, type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Loader2, Printer, RefreshCcw, LayoutGrid, Layers3, Building2, CheckSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { normalizeAssetNumber } from "@/lib/asset-number";
import { cn } from "@/lib/utils";
import { DEFAULT_STICKER_WIDTH_MM, DEFAULT_STICKER_HEIGHT_MM, clampStickerWidth, clampStickerHeight } from "@/lib/sticker";
import { format, isValid, parseISO } from "date-fns";
import { th as thaiLocale } from "date-fns/locale";

type LayoutMode = "sheet" | "continuous";

interface StickerEquipment {
  id: string;
  assetNumber: string;
  name: string;
  type: string;
  department: string;
  price: number | null;
  purchaseDate: string;
}

type PrintMode = "all" | "selected" | "byType" | "byDepartment";

interface StickerGroup {
  title: string | null;
  items: StickerEquipment[];
}

const PRINT_OPTIONS: Array<{
  value: PrintMode;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    value: "all",
    label: "พิมพ์ทั้งหมด",
    description: "สร้างสติ๊กเกอร์สำหรับครุภัณฑ์ทุกชิ้น",
    icon: LayoutGrid,
  },
  {
    value: "selected",
    label: "พิมพ์เฉพาะที่เลือก",
    description: "เลือกครุภัณฑ์จากรายการเพื่อพิมพ์เฉพาะที่ต้องการ",
    icon: CheckSquare,
  },
  {
    value: "byType",
    label: "พิมพ์ทั้งหมดแยกประเภท",
    description: "จัดกลุ่มสติ๊กเกอร์แยกตามประเภทของครุภัณฑ์",
    icon: Layers3,
  },
  {
    value: "byDepartment",
    label: "พิมพ์ทั้งหมดแยกหน่วยงาน",
    description: "จัดกลุ่มสติ๊กเกอร์ตามหน่วยงานที่รับผิดชอบ",
    icon: Building2,
  },
];

const transformEquipment = (row: Tables<'equipment'>): StickerEquipment => {
  const assetNumberInfo = normalizeAssetNumber(row.asset_number, row.quantity);
  const rawSpecs = typeof row.specs === "object" && row.specs !== null && !Array.isArray(row.specs)
    ? row.specs as Record<string, unknown>
    : {};

  const department = typeof rawSpecs.department === "string"
    ? rawSpecs.department.trim()
    : "";

  const priceValue = (() => {
    const raw = rawSpecs.price;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string") {
      const numeric = parseFloat(raw.replace(/[^0-9.,-]/g, "").replace(/,/g, ""));
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
  })();

  return {
    id: row.id,
    assetNumber: assetNumberInfo.formatted,
    name: row.name,
    type: row.type || "ไม่ระบุประเภท",
    department: department || "ไม่ระบุหน่วยงาน",
    price: priceValue,
    purchaseDate: row.purchase_date || "",
  };
};

const formatCurrencyTHB = (amount: number | null): string => {
  if (amount === null || Number.isNaN(amount)) {
    return "-";
  }
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatThaiDate = (value: string): string => {
  if (!value) {
    return "-";
  }
  const parsedIso = parseISO(value);
  const parsed = isValid(parsedIso) ? parsedIso : new Date(value);
  if (!isValid(parsed)) {
    return "-";
  }
  return format(parsed, "dd MMM yyyy", { locale: thaiLocale });
};

interface StickerPreviewProps {
  equipment: StickerEquipment;
  qrSrc?: string;
  widthMm: number;
  heightMm: number;
  className?: string;
  style?: CSSProperties;
}

const formatMillimeter = (value: number) => (Number.isFinite(value) && value % 1 !== 0 ? value.toFixed(1) : Math.round(value).toString());

function StickerPreview({
  equipment,
  qrSrc,
  widthMm,
  heightMm,
  className,
  style
}: StickerPreviewProps) {
  const baseWidth = DEFAULT_STICKER_WIDTH_MM;
  const baseHeight = DEFAULT_STICKER_HEIGHT_MM;
  const widthRatio = widthMm / baseWidth;
  const heightRatio = heightMm / baseHeight;
  const scaleRatio = Math.min(widthRatio, heightRatio);
  const paddingX = Math.max(3 * widthRatio, 1);
  const paddingY = Math.max(2 * heightRatio, 1);
  const gapBetween = Math.max(3 * widthRatio, 1.2);
  const qrSize = Math.max(21 * scaleRatio, 12);
  const nameMaxHeight = Math.max(12 * heightRatio, 8);
  const infoGap = Math.max(0.5 * heightRatio, 0.4);
  const sectionGap = Math.max(1 * heightRatio, 0.6);

  return (
    <div
      className={cn("flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition print:shadow-none", className)}
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding: `${paddingY}mm ${paddingX}mm`,
        ...style
      }}
    >
      <div className="flex h-full flex-1 items-center" style={{ gap: `${gapBetween}mm` }}>
        <div className="flex h-full items-center">
          {qrSrc ? (
            <img
              src={qrSrc}
              alt={`QR code สำหรับ ${equipment.assetNumber}`}
              className="rounded-md border border-slate-200 object-contain"
              style={{ width: `${qrSize}mm`, height: `${qrSize}mm` }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-md border border-dashed border-slate-300 text-[8px] text-muted-foreground"
              style={{ width: `${qrSize}mm`, height: `${qrSize}mm` }}
            >
              QR
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="flex flex-col" style={{ gap: `${Math.max(0.8 * heightRatio, 0.6)}mm` }}>
            <p className="truncate text-[10px] font-semibold leading-tight text-slate-900">
              {equipment.assetNumber}
            </p>
            <p
              className="overflow-hidden text-[9px] font-medium leading-tight text-slate-700"
              style={{ maxHeight: `${nameMaxHeight}mm` }}
            >
              {equipment.name}
            </p>
          </div>
          <div
            className="flex items-end justify-between text-[8px] font-medium leading-tight text-slate-600"
            style={{ marginTop: `${sectionGap}mm` }}
          >
            <div className="flex flex-col" style={{ gap: `${infoGap}mm` }}>
              <p>ราคา: {formatCurrencyTHB(equipment.price)}</p>
              <p>รับเข้า: {formatThaiDate(equipment.purchaseDate)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StickerPrint() {
  const { toast } = useToast();
  const { settings } = useOrganizationSettings();
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<StickerEquipment[]>([]);
  const [printMode, setPrintMode] = useState<PrintMode>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [qrCache, setQrCache] = useState<Record<string, string>>({});
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("sheet");
  const [labelGapMm, setLabelGapMm] = useState(2);

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformed = (data ?? []).map(transformEquipment);
      setEquipment(transformed);
      setSelectedIds((prev) => {
        const next = new Set<string>();
        transformed.forEach((item) => {
          if (prev.has(item.id)) {
            next.add(item.id);
          }
        });
        return next;
      });
    } catch (error) {
      console.error("ไม่สามารถโหลดข้อมูลครุภัณฑ์ได้", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลครุภัณฑ์ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const filteredEquipment = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return equipment;
    }
    return equipment.filter((item) => {
      const target = [
        item.assetNumber,
        item.name,
        item.type,
        item.department,
      ]
        .join(" ")
        .toLowerCase();
      return target.includes(term);
    });
  }, [equipment, searchTerm]);

  const stickerGroups: StickerGroup[] = useMemo(() => {
    if (loading) {
      return [];
    }

    const base = [...equipment];
    const sortedBase = base.sort((a, b) =>
      a.assetNumber.localeCompare(b.assetNumber, "th") || a.name.localeCompare(b.name, "th")
    );

    if (printMode === "selected") {
      const chosen = sortedBase.filter((item) => selectedIds.has(item.id));
      return chosen.length ? [{ title: null, items: chosen }] : [];
    }

    if (printMode === "byType") {
      const map = new Map<string, StickerEquipment[]>();
      sortedBase.forEach((item) => {
        const key = item.type || "ไม่ระบุประเภท";
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(item);
      });
      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0], "th"))
        .map(([title, items]) => ({ title: `ประเภท: ${title}`, items: items.sort((x, y) => x.assetNumber.localeCompare(y.assetNumber, "th")) }));
    }

    if (printMode === "byDepartment") {
      const map = new Map<string, StickerEquipment[]>();
      sortedBase.forEach((item) => {
        const key = item.department || "ไม่ระบุหน่วยงาน";
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(item);
      });
      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0], "th"))
        .map(([title, items]) => ({ title: `หน่วยงาน: ${title}`, items: items.sort((x, y) => x.assetNumber.localeCompare(y.assetNumber, "th")) }));
    }

    return sortedBase.length ? [{ title: null, items: sortedBase }] : [];
  }, [equipment, loading, printMode, selectedIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const itemsToRender = stickerGroups.flatMap((group) => group.items);
    const missing = itemsToRender.filter((item) => !qrCache[item.id]);
    if (missing.length === 0) {
      return;
    }

    let cancelled = false;

    const generate = async () => {
      try {
        const generated = await Promise.all(
          missing.map(async (item) => {
            const targetUrl = `${window.location.origin}/equipment/${item.id}`;
            const url = await QRCode.toDataURL(targetUrl, {
              width: 160,
              margin: 1,
              errorCorrectionLevel: "M",
            });
            return { id: item.id, url };
          })
        );

        if (!cancelled) {
          setQrCache((prev) => {
            const next = { ...prev };
            generated.forEach(({ id, url }) => {
              next[id] = url;
            });
            return next;
          });
        }
      } catch (error) {
        console.error("สร้าง QR Code ไม่สำเร็จ", error);
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [qrCache, stickerGroups]);

  const printableCount = useMemo(
    () => stickerGroups.reduce((acc, group) => acc + group.items.length, 0),
    [stickerGroups]
  );

  const selectionSummary = `${selectedIds.size} / ${equipment.length}`;

  const allFilteredSelected = filteredEquipment.length > 0 && filteredEquipment.every((item) => selectedIds.has(item.id));
  const someFilteredSelected = filteredEquipment.some((item) => selectedIds.has(item.id));

  const toggleAllFiltered = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredEquipment.forEach((item) => {
        if (checked) {
          next.add(item.id);
        } else {
          next.delete(item.id);
        }
      });
      return next;
    });
  };

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const stickerWidthMm = useMemo(() => {
    const rawWidth = Number((settings as Record<string, unknown> | null)?.['sticker_width_mm']);
    return clampStickerWidth(rawWidth);
  }, [settings]);

  const stickerHeightMm = useMemo(() => {
    const rawHeight = Number((settings as Record<string, unknown> | null)?.['sticker_height_mm']);
    return clampStickerHeight(rawHeight);
  }, [settings]);

  const sizeLabel = useMemo(() => `${formatMillimeter(stickerWidthMm)} x ${formatMillimeter(stickerHeightMm)} mm`, [stickerWidthMm, stickerHeightMm]);
  const isContinuous = layoutMode === "continuous";
  const gapValueMm = Number.isFinite(labelGapMm) ? Math.max(labelGapMm, 0) : 0;
  const printStepHeightMm = stickerHeightMm + gapValueMm;

  const continuousPrintStyles = useMemo(() => {
    if (!isContinuous) return "";
    return `@media print {
      @page {
        size: ${stickerWidthMm}mm ${printStepHeightMm}mm;
        margin: 0;
      }

      html, body {
        width: ${stickerWidthMm}mm;
        margin: 0;
        padding: 0;
      }

      .sticker-preview-card,
      .sticker-preview-content {
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
      }

      .sticker-preview-card {
        width: ${stickerWidthMm}mm !important;
      }

      .sticker-preview-content {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: flex-start !important;
        padding: 0 !important;
        gap: ${gapValueMm}mm !important;
      }

      .sticker-group-continuous {
        gap: ${gapValueMm}mm !important;
        padding: 0 !important;
        width: 100% !important;
        align-items: center !important;
      }

      .sticker-group-continuous .sticker-item {
        page-break-inside: avoid;
        margin: 0 !important;
        width: ${stickerWidthMm}mm !important;
        height: ${stickerHeightMm}mm !important;
      }
    }`;
  }, [gapValueMm, isContinuous, printStepHeightMm, stickerHeightMm, stickerWidthMm]);

  const handlePrint = () => {
    if (!printableCount) return;
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">พิมพ์สติ๊กเกอร์ครุภัณฑ์</h1>
          <p className="text-sm text-muted-foreground">
            แบบสติ๊กเกอร์ขนาด {sizeLabel} พร้อม QR Code เลขครุภัณฑ์ ชื่อครุภัณฑ์ ราคา และวันรับเข้า
          </p>
        </div>
        <Badge variant="secondary" className="w-fit self-start">
          ขนาดสติ๊กเกอร์ {sizeLabel}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <div className="space-y-6 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle>รูปแบบการพิมพ์</CardTitle>
              <CardDescription>
                เลือกวิธีจัดเรียงสติ๊กเกอร์ตามการใช้งานที่ต้องการ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={printMode} onValueChange={(value) => setPrintMode(value as PrintMode)} className="grid gap-3">
                {PRINT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Label
                      key={option.value}
                      htmlFor={`print-option-${option.value}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition",
                        printMode === option.value
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/60"
                      )}
                    >
                      <RadioGroupItem id={`print-option-${option.value}`} value={option.value} className="mt-1" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-slate-900">{option.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>

              <div className="mt-6 space-y-3">
                <div>
                  <Label className="text-sm font-medium text-foreground">โหมดเครื่องพิมพ์</Label>
                  <p className="text-xs text-muted-foreground">เลือกรูปแบบการพิมพ์ตามชนิดเครื่องพิมพ์ที่ใช้งาน</p>
                </div>
                <RadioGroup value={layoutMode} onValueChange={(value) => setLayoutMode(value as LayoutMode)} className="grid gap-3 sm:grid-cols-2">
                  <Label
                    htmlFor="layout-sheet"
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition",
                      !isContinuous ? "border-primary bg-primary/5" : "hover:border-primary/60"
                    )}
                  >
                    <RadioGroupItem id="layout-sheet" value="sheet" className="mt-1" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">กระดาษแผ่น (A4 / Letter)</p>
                      <p className="text-xs text-muted-foreground">จัดเรียงเป็นตาราง เหมาะกับเครื่องพิมพ์ทั่วไปหรือกระดาษสติ๊กเกอร์แบบแผ่น</p>
                    </div>
                  </Label>

                  <Label
                    htmlFor="layout-continuous"
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition",
                      isContinuous ? "border-primary bg-primary/5" : "hover:border-primary/60"
                    )}
                  >
                    <RadioGroupItem id="layout-continuous" value="continuous" className="mt-1" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">สติ๊กเกอร์ต่อเนื่อง / เครื่องพิมพ์ TSC</p>
                      <p className="text-xs text-muted-foreground">เรียงสติ๊กเกอร์เป็นคอลัมน์เดียว พร้อมปรับระยะสำหรับเครื่องพิมพ์ต่อเนื่อง เช่น TSC TTP-244 Plus</p>
                    </div>
                  </Label>
                </RadioGroup>

                {isContinuous && (
                  <div className="space-y-2">
                    <Label htmlFor="label-gap">ระยะห่างระหว่างสติ๊กเกอร์ (มิลลิเมตร)</Label>
                    <Input
                      id="label-gap"
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={labelGapMm}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setLabelGapMm(Number.isNaN(next) ? 0 : Math.max(next, 0));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      ปรับให้ตรงกับระยะช่องว่างของสติ๊กเกอร์บนม้วน (ค่าที่แนะนำสำหรับ TSC TTP-244 Plus คือ 2-3 มม.)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>รายการครุภัณฑ์</CardTitle>
              <CardDescription>
                ค้นหาและเลือกครุภัณฑ์ที่ต้องการพิมพ์สติ๊กเกอร์
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="ค้นหาจากเลขครุภัณฑ์ ชื่อครุภัณฑ์ ประเภท หรือหน่วยงาน"
                  />
                  <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                    รีเซ็ต
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>เลือกแล้ว {selectionSummary} รายการ</span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleAllFiltered(checked === true)}
                    />
                    <Label htmlFor="select-all" className="text-xs cursor-pointer">เลือกทั้งหมดที่แสดง</Label>
                  </div>
                </div>
              </div>
              <ScrollArea className="h-[360px] pr-3">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังโหลดข้อมูล...
                  </div>
                ) : filteredEquipment.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground text-center px-4">
                    ไม่พบครุภัณฑ์ที่ตรงกับคำค้น
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>เลขครุภัณฑ์ / ชื่อ</TableHead>
                        <TableHead className="hidden sm:table-cell">ประเภท</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">หน่วยงาน</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEquipment.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="py-2">
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={(checked) => toggleSelection(item.id, checked === true)}
                              aria-label={`เลือก ${item.assetNumber}`}
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="font-medium text-sm text-slate-900">{item.assetNumber}</div>
                            <div className="text-xs text-muted-foreground">{item.name}</div>
                          </TableCell>
                          <TableCell className="hidden py-2 text-xs text-muted-foreground sm:table-cell">
                            {item.type}
                          </TableCell>
                          <TableCell className="hidden py-2 text-right text-xs text-muted-foreground sm:table-cell">
                            {item.department}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set<string>())}
                  disabled={selectedIds.size === 0}
                >
                  ล้างการเลือก
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchEquipment}
                  disabled={loading}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  โหลดข้อมูลใหม่
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden sticker-preview-card">
          <CardHeader className="flex flex-col gap-4 border-b border-border bg-muted/40 print:hidden sm:flex-row sm:items-center sm:justify-between sm:gap-6 sticker-preview-header">
            <div>
              <CardTitle>ตัวอย่างสติ๊กเกอร์</CardTitle>
              <CardDescription>
                {printableCount > 0
                  ? `พร้อมพิมพ์ ${printableCount} รายการ`
                  : "เลือกครุภัณฑ์หรือเปลี่ยนรูปแบบการพิมพ์เพื่อดูตัวอย่าง"}
              </CardDescription>
              {isContinuous && (
                <p className="mt-1 text-xs text-muted-foreground">
                  แนะนำให้ตั้งค่าเครื่องพิมพ์เป็นโหมด Gap 2-3 มม. และปิดการย่อ/ขยายหน้ากระดาษเพื่อให้ความยาวของสติ๊กเกอร์ตรงกับของจริง
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchEquipment}
                disabled={loading}
                className="hidden sm:inline-flex"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                โหลดข้อมูลใหม่
              </Button>
              <Button size="sm" onClick={handlePrint} disabled={!printableCount}>
                <Printer className="mr-2 h-4 w-4" />
                พิมพ์สติ๊กเกอร์
              </Button>
            </div>
          </CardHeader>
          <CardContent className="bg-white sticker-preview-content">
            {loading ? (
              <div className="flex h-[320px] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                กำลังเตรียมข้อมูลสติ๊กเกอร์...
              </div>
            ) : printableCount === 0 ? (
              <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <p>ยังไม่มีสติ๊กเกอร์สำหรับพิมพ์</p>
                {printMode === "selected" ? (
                  <p>กรุณาเลือกครุภัณฑ์จากรายการด้านซ้าย</p>
                ) : (
                  <p>ตรวจสอบว่ามีข้อมูลครุภัณฑ์ในระบบหรือไม่</p>
                )}
              </div>
            ) : (
              <div className="space-y-8 print:space-y-4">
                {stickerGroups.map((group, index) => (
                  <div key={group.title ?? `group-${index}`} className="break-inside-avoid">
                    {group.title && (
                      <div className="mb-3 flex items-center gap-3 print:mb-2 print:hidden">
                        <span className="text-sm font-semibold uppercase tracking-wide text-primary">
                          {group.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {group.items.length} รายการ
                        </Badge>
                      </div>
                    )}
                    <div
                      className={cn(
                        isContinuous
                          ? "sticker-group-continuous flex flex-col"
                          : "grid grid-cols-1 gap-4 print:grid-cols-2 print:gap-3 sm:grid-cols-2 lg:grid-cols-3"
                      )}
                      style={isContinuous ? { gap: `${gapValueMm}mm` } : undefined}
                    >
                      {group.items.map((item) => (
                        <StickerPreview
                          key={item.id}
                          equipment={item}
                          qrSrc={qrCache[item.id]}
                          widthMm={stickerWidthMm}
                          heightMm={stickerHeightMm}
                          className="sticker-item"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {isContinuous && <style>{continuousPrintStyles}</style>}
    </div>
  );
}
