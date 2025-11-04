import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Computer,
  Plus,
  Eye,
  Edit,
  QrCode,
  Calendar,
  CalendarClock,
  MapPin,
  Loader2,
  Trash2,
  Building2,
  ArrowLeftRight,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import QRCodeDialog from "@/components/equipment/QRCodeDialog";
import EquipmentViewDialog from "@/components/equipment/EquipmentViewDialog";
import EquipmentEditDialog from "@/components/equipment/EquipmentEditDialog";
import DeleteEquipmentDialog from "@/components/equipment/DeleteEquipmentDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type {
  Tables,
  Json,
  TablesUpdate,
  TablesInsert,
} from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { getWarrantyStatusInfo } from "@/lib/warranty";
import { cn } from "@/lib/utils";
import { normalizeAssetNumber } from "@/lib/asset-number";
import {
  IT_ROUND_FREQUENCIES,
  IT_ROUND_TASKS,
  calculateNextDueDate,
  createEmptyItRoundActivities,
  evaluateItRoundStatus,
  formatItRoundDateDisplay,
  formatItRoundDueSummary,
  formatItRoundFrequency,
  normalizeItRoundActivities,
  parseItRoundDate,
  type DerivedItRoundStatus,
  type ItRoundActivities,
} from "@/lib/it-round";
import { format as formatDate, parseISO, isValid } from "date-fns";
import { th as thaiLocale } from "date-fns/locale";

const XLSX_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm" as string;
const PDFMAKE_URL =
  "https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/build/pdfmake.min.js?module" as string;
const PDFMAKE_FONTS_URL =
  "https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/build/vfs_fonts.js?module" as string;

const loadXlsxModule = (() => {
  let promise: Promise<any> | null = null;
  return () => {
    if (!promise && typeof window !== "undefined") {
      promise = import(/* @vite-ignore */ XLSX_URL as string);
    }
    return (
      promise ??
      Promise.reject(new Error("XLSX is only available in the browser"))
    );
  };
})();

const loadPdfMakeModule = (() => {
  let promise: Promise<{ pdfMake: any }> | null = null;
  return async () => {
    if (!promise && typeof window !== "undefined") {
      promise = (async () => {
        const pdfMakeModule = await import(
          /* @vite-ignore */ PDFMAKE_URL as string
        );
        const fontsModule = await import(
          /* @vite-ignore */ PDFMAKE_FONTS_URL as string
        );
        const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule;
        const vfsCandidate =
          (fontsModule as any).pdfMake?.vfs ??
          (fontsModule as any).default?.vfs;
        if (vfsCandidate) {
          pdfMake.vfs = vfsCandidate;
        }
        return { pdfMake };
      })();
    }
    return (
      promise ??
      Promise.reject(new Error("pdfmake is only available in the browser"))
    );
  };
})();

type DbEquipment = Tables<"equipment">;
type BorrowTransaction = Tables<"borrow_transactions">;

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

type EquipmentItRoundStatus = DerivedItRoundStatus | "none";

interface EquipmentItRoundInfo {
  status: EquipmentItRoundStatus;
  nextDueDate: string | null;
  lastPerformedAt: string | null;
  frequencyMonths: number | null;
  daysUntilDue: number | null;
  activities: ItRoundActivities | null;
}

interface ItRoundLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: EquipmentItem | null;
  onLogged: () => void;
  defaultTechnician?: string;
}

interface EquipmentItem {
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
  specs: { [key: string]: string };
  vendorId: string | null;
  vendorName: string;
  vendorPhone: string;
  vendorAddress: string;
  itRound?: EquipmentItRoundInfo | null;
  borrowInfo?: BorrowSummary | null;
}

interface ExportRow {
  assetNumber: string;
  name: string;
  type: string;
  department: string;
  statusLabel: string;
  location: string;
  serialNumber: string;
  brand: string;
  model: string;
  priceValue: number | null;
  purchaseDateIso: string;
  purchaseDateDisplay: string;
}

// Normalize specs (Json) to a string map for UI safety
const normalizeSpecs = (specs: unknown): { [key: string]: string } => {
  const out: { [key: string]: string } = {};
  if (specs && typeof specs === "object" && !Array.isArray(specs)) {
    for (const [k, v] of Object.entries(specs as Record<string, unknown>)) {
      out[k] = v === null || v === undefined ? "" : String(v);
    }
  }
  if (out.reason && !out.notes) out.notes = out.reason;
  if (!out.reason && out.notes) out.reason = out.notes;
  return out;
};

const STATUS_VARIANTS: Record<string, { color: string; label: string }> = {
  available: {
    color: "bg-success text-success-foreground",
    label: "พร้อมใช้งาน",
  },
  borrowed: { color: "bg-primary text-primary-foreground", label: "ถูกยืม" },
  maintenance: {
    color: "bg-warning text-warning-foreground",
    label: "ซ่อมบำรุง",
  },
  damaged: {
    color: "bg-destructive text-destructive-foreground",
    label: "ชำรุด",
  },
  pending_disposal: {
    color: "bg-secondary text-secondary-foreground",
    label: "รอจำหน่าย",
  },
  disposed: { color: "bg-disposed text-disposed-foreground", label: "จำหน่าย" },
  lost: {
    color: "bg-destructive text-destructive-foreground",
    label: "สูญหาย",
  },
};

const IT_ROUND_STATUS_META: Record<EquipmentItRoundStatus, { label: string; className: string; variant: "default" | "outline" }> = {
  none: {
    label: "ยังไม่เคยบันทึก",
    className: "border-dashed border-muted-foreground/40 text-muted-foreground",
    variant: "outline",
  },
  overdue: {
    label: "เกินกำหนด",
    className: "bg-destructive text-destructive-foreground",
    variant: "default",
  },
  dueSoon: {
    label: "ใกล้ถึงรอบ",
    className: "bg-warning text-warning-foreground",
    variant: "default",
  },
  onTrack: {
    label: "เรียบร้อย",
    className: "bg-success text-success-foreground",
    variant: "default",
  },
};

const EXPORT_FORMAT_OPTIONS = [
  {
    value: "excel" as const,
    label: "Excel (.xlsx)",
    description: "ส่งออกเป็นไฟล์สเปรดชีตสำหรับจัดการหรือวิเคราะห์ต่อ",
    icon: FileSpreadsheet,
  },
  {
    value: "pdf" as const,
    label: "PDF (.pdf)",
    description: "ส่งออกเป็นไฟล์พร้อมพิมพ์หรือส่งต่อ",
    icon: FileText,
  },
];

const getStatusLabelText = (status: string) =>
  STATUS_VARIANTS[status]?.label ?? status;

const parsePriceValue = (raw: unknown): number | null => {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const numeric = parseFloat(raw.replace(/[^0-9.,-]/g, "").replace(/,/g, ""));
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
};

const createEmptyItRoundInfo = (): EquipmentItRoundInfo => ({
  status: "none",
  nextDueDate: null,
  lastPerformedAt: null,
  frequencyMonths: null,
  daysUntilDue: null,
  activities: null,
});

const formatItRoundFrequencySafe = (months: number | null | undefined) =>
  typeof months === "number"
    ? formatItRoundFrequency(months)
    : "ไม่ระบุความถี่";

const getDepartmentRaw = (item: EquipmentItem) =>
  typeof item.specs?.department === "string"
    ? item.specs.department.trim()
    : "";

const getDepartmentLabel = (item: EquipmentItem) => {
  const value = getDepartmentRaw(item);
  return value || "ไม่ระบุหน่วยงาน";
};

const getPurchaseDateInfo = (value: string) => {
  if (!value) {
    return { iso: "", display: "-", year: null as string | null };
  }
  const parsedIso = parseISO(value);
  const parsed = isValid(parsedIso) ? parsedIso : new Date(value);
  if (!isValid(parsed)) {
    return { iso: value, display: value, year: null };
  }
  return {
    iso: formatDate(parsed, "yyyy-MM-dd"),
    display: formatDate(parsed, "dd MMM yyyy", { locale: thaiLocale }),
    year: parsed.getFullYear().toString(),
  };
};

const slugifyForFile = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "all";

const buildBorrowSummary = (
  record: BorrowTransaction | undefined | null,
): BorrowSummary | null => {
  if (!record) return null;
  return {
    borrowerName: record.borrower_name ?? null,
    borrowerDepartment: record.department ?? null,
    borrowerContact: record.borrower_contact ?? null,
    notes: record.notes ?? null,
    borrowedAt: record.borrowed_at ?? null,
    expectedReturnAt: record.expected_return_at ?? null,
    returnedAt: record.returned_at ?? null,
    status: record.status,
  };
};

const transformEquipment = (
  dbEquipment: DbEquipment,
  borrowRecord?: BorrowTransaction | null,
  itRoundInfo?: EquipmentItRoundInfo | null,
): EquipmentItem => {
  const assetInfo = normalizeAssetNumber(
    dbEquipment.asset_number,
    dbEquipment.quantity,
  );

  return {
    id: dbEquipment.id,
    name: dbEquipment.name,
    type: dbEquipment.type,
    brand: dbEquipment.brand || "",
    model: dbEquipment.model || "",
    serialNumber: dbEquipment.serial_number || "",
    assetNumber: assetInfo.formatted,
    status: dbEquipment.status,
    location: dbEquipment.location || "",
    user: dbEquipment.assigned_to || "",
    purchaseDate: dbEquipment.purchase_date || "",
    warrantyEnd: dbEquipment.warranty_end || "",
    quantity: assetInfo.sequence,
    images: dbEquipment.images || [],
    specs: normalizeSpecs(dbEquipment.specs),
    vendorId: dbEquipment.vendor_id,
    vendorName: dbEquipment.vendor_name || "",
    vendorPhone: dbEquipment.vendor_phone || "",
    vendorAddress: dbEquipment.vendor_address || "",
    itRound: itRoundInfo ?? null,
    borrowInfo: buildBorrowSummary(borrowRecord),
  };
};

export default function Equipment() {
  const [selectedEquipment, setSelectedEquipment] =
    useState<EquipmentItem | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itRoundDialogOpen, setItRoundDialogOpen] = useState(false);
  const [itRoundTarget, setItRoundTarget] = useState<EquipmentItem | null>(null);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [assetNumberFilter, setAssetNumberFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [exportScope, setExportScope] = useState<
    "all" | "filtered" | "type" | "department" | "year"
  >("all");
  const [exportFilterValue, setExportFilterValue] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  // Fetch equipment data from Supabase
  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const equipmentRows = data ?? [];
      const equipmentIds = equipmentRows.map((row) => row.id);

      let borrowMap = new Map<string, BorrowTransaction>();
      if (equipmentIds.length > 0) {
        const { data: borrowData, error: borrowError } = await supabase
          .from("borrow_transactions")
          .select("*")
          .in("equipment_id", equipmentIds)
          .in("status", ["borrowed", "overdue"])
          .order("borrowed_at", { ascending: false });

        if (borrowError) {
          console.error("Error loading borrow transactions:", borrowError);
        } else if (borrowData) {
          borrowMap = borrowData.reduce((map, record) => {
            if (!map.has(record.equipment_id)) {
              map.set(record.equipment_id, record);
            }
            return map;
          }, new Map<string, BorrowTransaction>());
        }
      }

      let itRoundMap = new Map<string, EquipmentItRoundInfo>();
      if (equipmentIds.length > 0) {
        const { data: itRoundData, error: itRoundError } = await supabase
          .from("equipment_it_rounds")
          .select("*")
          .in("equipment_id", equipmentIds)
          .order("performed_at", { ascending: false });

        if (itRoundError) {
          console.error("Error loading IT round data:", itRoundError);
        } else if (itRoundData) {
          for (const row of itRoundData as Tables<"equipment_it_rounds">[]) {
            if (itRoundMap.has(row.equipment_id)) continue;

            const nextDueDate = parseItRoundDate(row.next_due_at ?? null);
            const { status, daysUntilDue } = evaluateItRoundStatus(nextDueDate);

            itRoundMap.set(row.equipment_id, {
              status,
              nextDueDate: row.next_due_at ?? null,
              lastPerformedAt: row.performed_at ?? null,
              frequencyMonths: row.frequency_months ?? null,
              daysUntilDue,
              activities: normalizeItRoundActivities(row.activities),
            });
          }
        }
      }

      // Transform database data to component format
      const transformedData = equipmentRows.map((row) =>
        transformEquipment(
          row,
          borrowMap.get(row.id),
          itRoundMap.get(row.id) ?? null,
        ),
      );
      setEquipmentList(transformedData);
      setSelectedEquipment((prev) => {
        if (!prev) return prev;
        const refreshed = transformedData.find((item) => item.id === prev.id);
        return refreshed ?? prev;
      });
    } catch (error: unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลครุภัณฑ์ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load data on component mount
  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const handleQrCode = (item: EquipmentItem) => {
    console.log("QR Code button clicked for item:", item);
    setSelectedEquipment(item);
    setQrDialogOpen(true);
    console.log("QR Dialog should be opening...");
  };

  const handleView = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setViewDialogOpen(true);
  };

  const handleEdit = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setEditDialogOpen(true);
  };

  const handleDelete = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setDeleteDialogOpen(true);
  };

  const handleLogItRound = (item: EquipmentItem) => {
    setItRoundTarget(item);
    setItRoundDialogOpen(true);
  };

  const handleItRoundLogged = () => {
    setItRoundDialogOpen(false);
    setItRoundTarget(null);
    fetchEquipment();
  };

  const handleEquipmentDeleted = () => {
    fetchEquipment();
  };

  const handleBorrow = (item: EquipmentItem) => {
    if (item.status !== "available") {
      toast({
        title: "ไม่สามารถยืมครุภัณฑ์ได้",
        description:
          "สามารถยืมได้เฉพาะครุภัณฑ์ที่อยู่ในสถานะพร้อมใช้งานเท่านั้น",
        variant: "destructive",
      });
      return;
    }

    navigate("/borrow-return", { state: { equipmentId: item.id } });
  };

  // Accept the dialog's Equipment shape (structurally compatible with EquipmentItem)
  const normalizeOptional = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  };

  const handleSaveEdit = (updatedEquipment: EquipmentItem) => {
    (async () => {
      const previousEquipment =
        equipmentList.find((item) => item.id === updatedEquipment.id) ||
        selectedEquipment;
      const previousStatus = previousEquipment?.status?.trim().toLowerCase();

      try {
        const sanitizedName = updatedEquipment.name.trim();
        const sanitizedType = updatedEquipment.type.trim();
        const sanitizedAssetNumber = updatedEquipment.assetNumber.trim();
        const sanitizedStatusRaw = updatedEquipment.status.trim();
        const sanitizedStatus = sanitizedStatusRaw.toLowerCase();
        const sanitizedQuantity = parseInt(updatedEquipment.quantity, 10) || 1;

        if (
          !sanitizedName ||
          !sanitizedType ||
          !sanitizedAssetNumber ||
          !sanitizedStatus
        ) {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบอีกครั้ง",
            variant: "destructive",
          });
          return;
        }

        const brandNormalized = normalizeOptional(updatedEquipment.brand);
        const modelNormalized = normalizeOptional(updatedEquipment.model);
        const serialNormalized = normalizeOptional(
          updatedEquipment.serialNumber,
        );
        const locationNormalized = normalizeOptional(updatedEquipment.location);
        const assignedToNormalized = normalizeOptional(updatedEquipment.user);
        const purchaseDateNormalized = normalizeOptional(
          updatedEquipment.purchaseDate,
        );
        const warrantyEndNormalized = normalizeOptional(
          updatedEquipment.warrantyEnd,
        );
        const vendorIdNormalized =
          updatedEquipment.vendorId &&
          updatedEquipment.vendorId.trim().length > 0
            ? updatedEquipment.vendorId.trim()
            : null;
        const vendorNameNormalized = normalizeOptional(
          updatedEquipment.vendorName,
        );
        const vendorPhoneNormalized = normalizeOptional(
          updatedEquipment.vendorPhone,
        );
        const vendorAddressNormalized = normalizeOptional(
          updatedEquipment.vendorAddress,
        );

        const specsForDb: Record<string, unknown> = {
          ...(updatedEquipment.specs ?? {}),
        };

        if (typeof specsForDb.reason === "string" && !specsForDb.notes) {
          specsForDb.notes = specsForDb.reason;
        } else if (typeof specsForDb.notes === "string" && !specsForDb.reason) {
          specsForDb.reason = specsForDb.notes;
        }

        if (typeof specsForDb.price === "string") {
          const trimmedPrice = specsForDb.price.trim();
          if (!trimmedPrice) {
            delete specsForDb.price;
          } else {
            const numericPrice = Number.parseFloat(
              trimmedPrice.replace(/[^0-9,.-]/g, "").replace(/,/g, ""),
            );
            specsForDb.price = Number.isFinite(numericPrice)
              ? numericPrice
              : trimmedPrice;
          }
        }

        // Transform back to database format
        const dbUpdate: TablesUpdate<"equipment"> = {
          name: sanitizedName,
          type: sanitizedType,
          brand: brandNormalized,
          model: modelNormalized,
          serial_number: serialNormalized,
          asset_number: sanitizedAssetNumber,
          quantity: sanitizedQuantity,
          status: sanitizedStatus,
          location: locationNormalized,
          assigned_to: assignedToNormalized,
          purchase_date: purchaseDateNormalized,
          warranty_end: warrantyEndNormalized,
          images: updatedEquipment.images ?? [],
          vendor_id: vendorIdNormalized,
          vendor_name: vendorNameNormalized,
          vendor_phone: vendorPhoneNormalized,
          vendor_address: vendorAddressNormalized,
          specs: specsForDb as Json,
        };

        const { error } = await supabase
          .from("equipment")
          .update(dbUpdate)
          .eq("id", updatedEquipment.id);

        if (error) throw error;

        const departmentRaw =
          typeof updatedEquipment.specs?.department === "string"
            ? updatedEquipment.specs.department.trim()
            : "";
        const departmentForRecord =
          departmentRaw.length > 0 ? departmentRaw : null;
        const equipmentNotes =
          typeof updatedEquipment.specs?.notes === "string"
            ? updatedEquipment.specs.notes.trim()
            : "";

        const ensureBorrowTransaction = async () => {
          const { data: activeRecords, error: activeError } = await supabase
            .from("borrow_transactions")
            .select("id")
            .eq("equipment_id", updatedEquipment.id)
            .in("status", ["borrowed", "overdue"])
            .limit(1);

          if (activeError) throw activeError;
          if (activeRecords && activeRecords.length > 0) return;

          const borrowerName = assignedToNormalized ?? "";
          const borrowerDisplay = borrowerName || "ไม่ระบุผู้ยืม";
          const borrowerUserId = user?.id ?? profile?.user_id;

          if (!borrowerUserId) {
            throw new Error("ไม่พบข้อมูลผู้ใช้งานสำหรับบันทึกรายการยืม");
          }

          const autoNoteSegments = [
            'สร้างจากการอัพเดทสถานะที่หน้า "รายการครุภัณฑ์"',
            equipmentNotes ? `หมายเหตุครุภัณฑ์: ${equipmentNotes}` : null,
          ].filter(Boolean);

          const borrowPayload: TablesInsert<"borrow_transactions"> = {
            equipment_id: updatedEquipment.id,
            borrower_name: borrowerDisplay,
            borrower_contact: null,
            department: departmentForRecord,
            borrowed_at: new Date().toISOString(),
            expected_return_at: null,
            notes: autoNoteSegments.join("\n") || null,
            status: "borrowed",
            user_id: borrowerUserId,
          };

          const { error: borrowError } = await supabase
            .from("borrow_transactions")
            .insert([borrowPayload]);

          if (borrowError) throw borrowError;
        };

        const finalizeBorrowTransactions = async () => {
          const { data: activeRecords, error: activeError } = await supabase
            .from("borrow_transactions")
            .select("id")
            .eq("equipment_id", updatedEquipment.id)
            .in("status", ["borrowed", "overdue"]);

          if (activeError) throw activeError;
          if (!activeRecords || activeRecords.length === 0) return;

          const nowIso = new Date().toISOString();
          const returnCondition =
            sanitizedStatus === "damaged"
              ? "damaged"
              : sanitizedStatus === "lost"
                ? "lost"
                : "normal";

          const transactionUpdate: TablesUpdate<"borrow_transactions"> = {
            status: "returned",
            returned_at: nowIso,
            return_condition: returnCondition,
          };

          const { error: closeError } = await supabase
            .from("borrow_transactions")
            .update(transactionUpdate)
            .in(
              "id",
              activeRecords.map((record) => record.id),
            );

          if (closeError) throw closeError;
        };

        if (
          sanitizedStatus === "borrowed" &&
          previousStatus !== "borrowed" &&
          previousStatus !== "overdue"
        ) {
          await ensureBorrowTransaction();
        } else if (
          previousStatus &&
          (previousStatus === "borrowed" || previousStatus === "overdue") &&
          sanitizedStatus !== "borrowed"
        ) {
          await finalizeBorrowTransactions();
        }

        const updatedEquipmentForState: EquipmentItem = {
          ...updatedEquipment,
          name: sanitizedName,
          type: sanitizedType,
          brand: brandNormalized ?? "",
          model: modelNormalized ?? "",
          serialNumber: serialNormalized ?? "",
          assetNumber: sanitizedAssetNumber,
          quantity: sanitizedQuantity.toString(),
          status: sanitizedStatus,
          location: locationNormalized ?? "",
          user: assignedToNormalized ?? "",
          purchaseDate: purchaseDateNormalized ?? "",
          warrantyEnd: warrantyEndNormalized ?? "",
          borrowInfo: previousEquipment?.borrowInfo ?? null,
        };

        // Update local state
        setEquipmentList((prev) =>
          prev.map((item) =>
            item.id === updatedEquipment.id ? updatedEquipmentForState : item,
          ),
        );
        setSelectedEquipment((prev) =>
          prev && prev.id === updatedEquipment.id
            ? updatedEquipmentForState
            : prev,
        );

        toast({
          title: "สำเร็จ",
          description: "อัพเดทข้อมูลครุภัณฑ์เรียบร้อยแล้ว",
        });
      } catch (error: unknown) {
        console.error("Error updating equipment:", error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description:
            error instanceof Error && error.message
              ? `ไม่สามารถอัพเดทข้อมูลได้: ${error.message}`
              : "ไม่สามารถอัพเดทข้อมูลได้",
          variant: "destructive",
        });
      }
    })();
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_VARIANTS[status] ?? {
      color: "bg-muted text-muted-foreground",
      label: status,
    };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const typeOptions = useMemo(() => {
    const uniqueTypes = new Set<string>();
    equipmentList.forEach((item) => {
      const trimmed = item.type?.trim();
      if (trimmed) {
        uniqueTypes.add(trimmed);
      }
    });
    return Array.from(uniqueTypes).sort((a, b) => a.localeCompare(b, "th"));
  }, [equipmentList]);

  const filteredEquipment = useMemo(() => {
    const assetQuery = assetNumberFilter.trim().toLowerCase();
    const nameQuery = nameFilter.trim().toLowerCase();

    return equipmentList.filter((item) => {
      const assetMatches =
        assetQuery.length === 0 ||
        item.assetNumber.toLowerCase().includes(assetQuery);
      const nameMatches =
        nameQuery.length === 0 || item.name.toLowerCase().includes(nameQuery);
      const typeMatches = typeFilter === "all" || item.type === typeFilter;
      const departmentValue =
        typeof item.specs?.department === "string"
          ? item.specs.department.trim()
          : "";
      const departmentMatches =
        departmentFilter === "all" ||
        departmentValue === departmentFilter ||
        (departmentFilter === "__none__" && !departmentValue);
      return assetMatches && nameMatches && typeMatches && departmentMatches;
    });
  }, [
    equipmentList,
    assetNumberFilter,
    nameFilter,
    typeFilter,
    departmentFilter,
  ]);

  const departmentOptions = useMemo(() => {
    const departments = new Set<string>();
    equipmentList.forEach((item) => {
      const value =
        typeof item.specs?.department === "string"
          ? item.specs.department.trim()
          : "";
      if (value) {
        departments.add(value);
      }
    });
    return Array.from(departments).sort((a, b) => a.localeCompare(b, "th"));
  }, [equipmentList]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    equipmentList.forEach((item) => {
      const { year } = getPurchaseDateInfo(item.purchaseDate);
      if (year) {
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a, "th"));
  }, [equipmentList]);

  const collectExportRows = useCallback(() => {
    let source: EquipmentItem[] = [];
    let labelSuffix = "all";

    switch (exportScope) {
      case "all":
        source = equipmentList;
        labelSuffix = "all";
        break;
      case "filtered":
        source = filteredEquipment;
        labelSuffix = "filtered";
        break;
      case "type":
        if (!exportFilterValue) {
          return {
            rows: [] as ExportRow[],
            labelSuffix: "type",
            requiresValue: true,
          };
        }
        source = equipmentList.filter(
          (item) => item.type === exportFilterValue,
        );
        labelSuffix = `type-${slugifyForFile(exportFilterValue)}`;
        break;
      case "department":
        if (!exportFilterValue) {
          return {
            rows: [] as ExportRow[],
            labelSuffix: "department",
            requiresValue: true,
          };
        }
        source = equipmentList.filter((item) => {
          const raw = getDepartmentRaw(item);
          if (exportFilterValue === "__none__") {
            return raw.length === 0;
          }
          return raw === exportFilterValue;
        });
        labelSuffix = `department-${slugifyForFile(exportFilterValue === "__none__" ? "none" : exportFilterValue)}`;
        break;
      case "year":
        if (!exportFilterValue) {
          return {
            rows: [] as ExportRow[],
            labelSuffix: "year",
            requiresValue: true,
          };
        }
        source = equipmentList.filter(
          (item) =>
            getPurchaseDateInfo(item.purchaseDate).year === exportFilterValue,
        );
        labelSuffix = `year-${slugifyForFile(exportFilterValue)}`;
        break;
      default:
        source = equipmentList;
        labelSuffix = "all";
    }

    const rows: ExportRow[] = source.map((item) => {
      const priceValue = parsePriceValue(item.specs?.price);
      const dateInfo = getPurchaseDateInfo(item.purchaseDate);

      return {
        assetNumber: item.assetNumber,
        name: item.name,
        type: item.type || "",
        department: getDepartmentLabel(item),
        statusLabel: getStatusLabelText(item.status),
        location: item.location || "",
        serialNumber: item.serialNumber || "",
        brand: item.brand || "",
        model: item.model || "",
        priceValue,
        purchaseDateIso: dateInfo.iso,
        purchaseDateDisplay: dateInfo.display,
      };
    });

    return { rows, labelSuffix, requiresValue: false };
  }, [equipmentList, filteredEquipment, exportFilterValue, exportScope]);

  const handleExportData = useCallback(async () => {
    const { rows, labelSuffix, requiresValue } = collectExportRows();

    if (requiresValue) {
      toast({
        title: "กรุณาเลือกข้อมูล",
        description: "โปรดเลือกตัวเลือกให้ครบก่อนส่งออก",
        variant: "destructive",
      });
      return;
    }

    if (rows.length === 0) {
      toast({
        title: "ไม่พบข้อมูล",
        description: "ไม่มีข้อมูลตรงตามเงื่อนไขสำหรับการส่งออก",
      });
      return;
    }

    setIsExporting(true);
    try {
      const timestamp = formatDate(new Date(), "yyyyMMdd-HHmm");
      const baseFileName = `equipment-${labelSuffix}-${timestamp}`;

      if (exportFormat === "excel") {
        const XLSX = await loadXlsxModule();
        const worksheetData = rows.map((row) => ({
          เลขครุภัณฑ์: row.assetNumber,
          ชื่อครุภัณฑ์: row.name,
          ประเภท: row.type || "-",
          หน่วยงาน: row.department,
          สถานะ: row.statusLabel,
          สถานที่ตั้ง: row.location,
          ยี่ห้อ: row.brand,
          รุ่น: row.model,
          เลขซีเรียล: row.serialNumber,
          ราคา: row.priceValue ?? "",
          วันรับเข้า: row.purchaseDateIso,
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "ครุภัณฑ์");
        XLSX.writeFile(workbook, `${baseFileName}.xlsx`);
      } else {
        const { pdfMake } = await loadPdfMakeModule();

        const scopeDescription = (() => {
          switch (exportScope) {
            case "filtered":
              return "ข้อมูลตามตัวกรองปัจจุบัน";
            case "type":
              return `เฉพาะประเภท ${exportFilterValue}`;
            case "department":
              return exportFilterValue === "__none__"
                ? "เฉพาะหน่วยงานที่ไม่ระบุ"
                : `เฉพาะหน่วยงาน ${exportFilterValue}`;
            case "year":
              return `เฉพาะปี ${exportFilterValue}`;
            default:
              return "ข้อมูลทั้งหมด";
          }
        })();

        const tableBody = [
          [
            "เลขครุภัณฑ์",
            "ชื่อครุภัณฑ์",
            "ประเภท",
            "หน่วยงาน",
            "สถานะ",
            "วันรับเข้า",
            "ราคา (บาท)",
          ],
          ...rows.map((row) => [
            row.assetNumber,
            row.name,
            row.type || "-",
            row.department,
            row.statusLabel,
            row.purchaseDateDisplay,
            row.priceValue !== null
              ? Number(row.priceValue).toLocaleString("th-TH", {
                  minimumFractionDigits: 0,
                })
              : "-",
          ]),
        ];

        const docDefinition = {
          content: [
            { text: "รายงานข้อมูลครุภัณฑ์", style: "header" },
            {
              text: scopeDescription,
              style: "subheader",
              margin: [0, 0, 0, 8],
            },
            {
              text: `จำนวน ${rows.length.toLocaleString("th-TH")} รายการ`,
              style: "meta",
              margin: [0, 0, 0, 12],
            },
            {
              table: {
                headerRows: 1,
                widths: [80, "*", 70, 80, 60, 60, 60],
                body: tableBody,
              },
              layout: "lightHorizontalLines",
              fontSize: 9,
            },
          ],
          styles: {
            header: { fontSize: 16, bold: true },
            subheader: { fontSize: 11, color: "#555" },
            meta: { fontSize: 10, color: "#333" },
          },
          defaultStyle: { font: "Roboto" },
          pageOrientation: "landscape",
          pageMargins: [24, 24, 24, 32],
        };

        pdfMake.createPdf(docDefinition).download(`${baseFileName}.pdf`);
      }

      toast({
        title: "ส่งออกสำเร็จ",
        description: `บันทึกไฟล์ ${exportFormat === "excel" ? "Excel" : "PDF"} เรียบร้อยแล้ว`,
      });
      setExportDialogOpen(false);
    } catch (error) {
      console.error("Export failed", error);
      toast({
        title: "ส่งออกไม่สำเร็จ",
        description: "โปรดลองอีกครั้งหรือติดต่อผู้ดูแลระบบ",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [collectExportRows, exportFilterValue, exportFormat, exportScope, toast]);

  const exportPreview = useMemo(() => collectExportRows(), [collectExportRows]);
  const filteredStatusCounts = useMemo(() => {
    const counts = {
      total: filteredEquipment.length,
      available: 0,
      maintenance: 0,
      damaged: 0,
      borrowed: 0,
      pending_disposal: 0,
      disposed: 0,
      lost: 0,
      warrantyExpired: 0,
    };

    filteredEquipment.forEach((item) => {
      switch (item.status) {
        case "available":
          counts.available += 1;
          break;
        case "maintenance":
          counts.maintenance += 1;
          break;
        case "damaged":
          counts.damaged += 1;
          break;
        case "borrowed":
          counts.borrowed += 1;
          break;
        case "pending_disposal":
          counts.pending_disposal += 1;
          break;
        case "disposed":
          counts.disposed += 1;
          break;
        case "lost":
          counts.lost += 1;
          break;
        default:
          break;
      }

      const warrantyInfo = getWarrantyStatusInfo(item.warrantyEnd || null);
      if (warrantyInfo?.status === "expired") {
        counts.warrantyExpired += 1;
      }
    });

    return counts;
  }, [filteredEquipment]);

  const isFiltering = useMemo(() => {
    return (
      assetNumberFilter.trim().length > 0 ||
      nameFilter.trim().length > 0 ||
      typeFilter !== "all" ||
      departmentFilter !== "all"
    );
  }, [assetNumberFilter, nameFilter, typeFilter, departmentFilter]);

  // Pagination calculations
  const pageSize = 10;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredEquipment.length / pageSize),
  );
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedEquipment = filteredEquipment.slice(startIndex, endIndex);

  const exportRequiresValue =
    exportScope === "type" ||
    exportScope === "department" ||
    exportScope === "year";
  const exportCount = exportPreview.rows.length;
  const exportHasSelection =
    !exportRequiresValue || exportFilterValue.length > 0;

  // Reset to first page if data changes or current page exceeds total pages
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredEquipment.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            รายการครุภัณฑ์
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            จัดการและติดตามครุภัณฑ์คอมพิวเตอร์
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              setExportFormat("excel");
              setExportFilterValue("");
              setExportScope(isFiltering ? "filtered" : "all");
              setExportDialogOpen(true);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            ส่งออกข้อมูล
          </Button>
          <Link to="/scan" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <QrCode className="h-4 w-4 mr-2" /> สแกน QR
            </Button>
          </Link>
          <Link to="/equipment/add" className="w-full sm:w-auto">
            <Button className="bg-gradient-primary hover:opacity-90 shadow-soft w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มครุภัณฑ์ใหม่
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Computer className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {filteredStatusCounts.total}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isFiltering ? "รายการที่ตรงกับตัวกรอง" : "รายการทั้งหมด"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-success/10 rounded-lg flex items-center justify-center">
                <Computer className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-success">
                  {filteredStatusCounts.available}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  พร้อมใช้งาน
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-warning/10 rounded-lg flex items-center justify-center">
                <Computer className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-warning">
                  {filteredStatusCounts.maintenance}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ซ่อมบำรุง
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                <Computer className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-destructive">
                  {filteredStatusCounts.damaged}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ชำรุด
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {filteredStatusCounts.borrowed}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ถูกยืม
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-secondary">
                  {filteredStatusCounts.pending_disposal}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  รอจำหน่าย
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-disposed/10 rounded-lg flex items-center justify-center">
                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-disposed" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-disposed">
                  {filteredStatusCounts.disposed}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  จำหน่าย
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-destructive">
                  {filteredStatusCounts.lost}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  สูญหาย
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-warning/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-warning">
                  {filteredStatusCounts.warrantyExpired}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  หมดประกัน
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">ตัวกรองรายการ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="asset-filter">เลขครุภัณฑ์</Label>
              <Input
                id="asset-filter"
                placeholder="เช่น 7440-001-0001/1"
                value={assetNumberFilter}
                onChange={(event) => {
                  setAssetNumberFilter(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name-filter">ชื่อครุภัณฑ์</Label>
              <Input
                id="name-filter"
                placeholder="ค้นหาตามชื่อครุภัณฑ์"
                value={nameFilter}
                onChange={(event) => {
                  setNameFilter(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-filter">ประเภท</Label>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {typeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-filter">หน่วยงาน</Label>
              <Select
                value={departmentFilter}
                onValueChange={(value) => {
                  setDepartmentFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="department-filter">
                  <SelectValue placeholder="เลือกหน่วยงาน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="__none__">ไม่ระบุ</SelectItem>
                  {departmentOptions.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            รายการครุภัณฑ์ ({filteredEquipment.length} รายการ)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {" "}
              {/* Add min-width for better mobile scrolling */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">เลขครุภัณฑ์</TableHead>
                    <TableHead className="min-w-[180px]">
                      ชื่อครุภัณฑ์
                    </TableHead>
                    <TableHead className="min-w-[100px]">ประเภท</TableHead>
                    <TableHead className="min-w-[100px]">สถานะ</TableHead>
                    <TableHead className="min-w-[140px]">หน่วยงาน</TableHead>
                    <TableHead className="min-w-[120px]">สถานที่</TableHead>
                    <TableHead className="min-w-[120px]">ผู้ใช้งาน</TableHead>
                    <TableHead className="min-w-[160px]">รอบ IT ถัดไป</TableHead>
                    <TableHead className="min-w-[100px]">ประกัน</TableHead>
                    <TableHead className="text-right min-w-[140px]">
                      การดำเนินการ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>กำลังโหลดข้อมูล...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredEquipment.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {equipmentList.length === 0
                            ? "ไม่มีข้อมูลครุภัณฑ์"
                            : "ไม่พบข้อมูลที่ค้นหา"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedEquipment.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium min-w-0">
                          <div className="whitespace-nowrap">
                            {item.assetNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.brand} {item.model}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.type}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span
                              className="text-sm truncate max-w-[160px]"
                              title={item.specs?.department || "-"}
                            >
                              {item.specs?.department || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{item.location}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.user}</TableCell>
                        <TableCell>
                          {(() => {
                            const info = item.itRound ?? createEmptyItRoundInfo();
                            const statusMeta = IT_ROUND_STATUS_META[info.status];

                            if (info.status === "none") {
                              return (
                                <div className="flex flex-col gap-1">
                                  <Badge
                                    variant={statusMeta.variant}
                                    className={cn(statusMeta.className, "w-fit")}
                                  >
                                    {statusMeta.label}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    คลิก "IT Round" เพื่อบันทึกครั้งแรก
                                  </span>
                                </div>
                              );
                            }

                            const nextDueDate = parseItRoundDate(info.nextDueDate);

                            return (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {formatItRoundDateDisplay(info.nextDueDate)}
                                  </span>
                                  <Badge
                                    variant={statusMeta.variant}
                                    className={cn(statusMeta.className, "w-fit")}
                                  >
                                    {statusMeta.label}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>
                                    {formatItRoundDueSummary(
                                      info.daysUntilDue,
                                      nextDueDate,
                                    )}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="border-muted-foreground/40 text-muted-foreground"
                                  >
                                    {formatItRoundFrequencySafe(info.frequencyMonths)}
                                  </Badge>
                                  {info.lastPerformedAt && (
                                    <span>
                                      ทำล่าสุด {formatItRoundDateDisplay(info.lastPerformedAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {(() => {
                              const info = getWarrantyStatusInfo(
                                item.warrantyEnd,
                              );
                              if (!info) {
                                return (
                                  <span className="text-sm text-muted-foreground">
                                    -
                                  </span>
                                );
                              }

                              const detailText = info.detail
                                ? `(${info.detail})`
                                : "";
                              return (
                                <span
                                  className={cn(
                                    "text-sm font-medium",
                                    info.textClass,
                                  )}
                                >
                                  {info.label}
                                  {detailText ? ` ${detailText}` : ""}
                                </span>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-muted h-8 w-8 p-0"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleLogItRound(item);
                              }}
                              title="บันทึก IT Round"
                            >
                              {(() => {
                                const tone = item.itRound?.status ?? "none";
                                const iconClass =
                                  tone === "overdue"
                                    ? "text-destructive"
                                    : tone === "dueSoon"
                                      ? "text-warning"
                                      : "text-foreground";
                                return (
                                  <CalendarClock className={cn("h-4 w-4", iconClass)} />
                                );
                              })()}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-muted h-8 w-8 p-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBorrow(item);
                              }}
                              title="ยืมครุภัณฑ์"
                              disabled={item.status !== "available"}
                            >
                              <ArrowLeftRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-muted h-8 w-8 p-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("QR button clicked!", item);
                                handleQrCode(item);
                              }}
                              title="สร้าง QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-muted h-8 w-8 p-0"
                              onClick={() => handleView(item)}
                              title="ดูรายละเอียด"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-muted h-8 w-8 p-0"
                              onClick={() => handleEdit(item)}
                              title="แก้ไขข้อมูล"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            {/* Delete button - only for super admin */}
                            {profile?.role === "super_admin" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(item);
                                }}
                                title="ลบครุภัณฑ์"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                <p className="text-sm text-muted-foreground">
                  แสดง {filteredEquipment.length === 0 ? 0 : startIndex + 1} -{" "}
                  {Math.min(endIndex, filteredEquipment.length)} จาก{" "}
                  {filteredEquipment.length} รายการ
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          currentPage > 1 && setCurrentPage(currentPage - 1)
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={currentPage === i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          currentPage < totalPages &&
                          setCurrentPage(currentPage + 1)
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>{" "}
            {/* Close min-width div */}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          if (isExporting) return;
          setExportDialogOpen(open);
          if (!open) {
            setExportFilterValue("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>ส่งออกข้อมูลครุภัณฑ์</DialogTitle>
            <DialogDescription>
              เลือกรูปแบบไฟล์และขอบเขตข้อมูลที่ต้องการดาวน์โหลด
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-foreground">
                รูปแบบไฟล์
              </Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(value) =>
                  setExportFormat(value as "excel" | "pdf")
                }
                className="mt-3 grid gap-3 sm:grid-cols-2"
              >
                {EXPORT_FORMAT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = exportFormat === option.value;
                  return (
                    <Label
                      key={option.value}
                      htmlFor={`export-format-${option.value}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition",
                        active
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/60",
                      )}
                    >
                      <RadioGroupItem
                        id={`export-format-${option.value}`}
                        value={option.value}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">
                            {option.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">
                  ขอบเขตข้อมูล
                </Label>
                {exportScope === "filtered" && (
                  <span className="text-xs text-muted-foreground">
                    ใช้ตัวกรองที่หน้าจอปัจจุบัน
                  </span>
                )}
              </div>
              <Select
                value={exportScope}
                onValueChange={(value) => {
                  setExportScope(value as typeof exportScope);
                  setExportFilterValue("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกขอบเขตข้อมูล" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="filtered">ตามตัวกรองปัจจุบัน</SelectItem>
                  <SelectItem value="type">เลือกตามประเภท</SelectItem>
                  <SelectItem value="department">เลือกตามหน่วยงาน</SelectItem>
                  <SelectItem value="year">เลือกตามปีที่รับเข้า</SelectItem>
                </SelectContent>
              </Select>

              {exportRequiresValue && (
                <div className="space-y-2">
                  {exportScope === "type" &&
                    (typeOptions.length > 0 ? (
                      <Select
                        value={exportFilterValue}
                        onValueChange={setExportFilterValue}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภทครุภัณฑ์" />
                        </SelectTrigger>
                        <SelectContent>
                          {typeOptions.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        ยังไม่มีข้อมูลประเภทครุภัณฑ์ในระบบ
                      </p>
                    ))}

                  {exportScope === "department" &&
                    (departmentOptions.length > 0 ? (
                      <Select
                        value={exportFilterValue}
                        onValueChange={setExportFilterValue}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกหน่วยงาน" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            ไม่ระบุหน่วยงาน
                          </SelectItem>
                          {departmentOptions.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        ยังไม่มีการระบุหน่วยงานในข้อมูลครุภัณฑ์
                      </p>
                    ))}

                  {exportScope === "year" &&
                    (yearOptions.length > 0 ? (
                      <Select
                        value={exportFilterValue}
                        onValueChange={setExportFilterValue}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกปีที่รับเข้า" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        ยังไม่มีข้อมูลปีที่รับเข้าครุภัณฑ์
                      </p>
                    ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                จำนวนข้อมูลที่เลือก:
                <span className="ml-1 font-medium text-foreground">
                  {exportCount.toLocaleString("th-TH")}
                </span>
                รายการ
              </p>
              {!exportHasSelection && exportRequiresValue ? (
                <p className="mt-1 text-xs text-destructive">
                  กรุณาเลือก
                  {exportScope === "type"
                    ? "ประเภท"
                    : exportScope === "department"
                      ? "หน่วยงาน"
                      : "ปี"}
                  ก่อนส่งออก
                </p>
              ) : exportCount === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              disabled={isExporting}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleExportData}
              disabled={isExporting || !exportHasSelection || exportCount === 0}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังส่งออก...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  ส่งออก
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(() => {
        console.log(
          "Rendering dialogs. selectedEquipment:",
          !!selectedEquipment,
          "qrDialogOpen:",
          qrDialogOpen,
        );
        return null;
      })()}
      {selectedEquipment && (
        <>
          <QRCodeDialog
            open={qrDialogOpen}
            onOpenChange={(open) => {
              console.log("QR Dialog onOpenChange:", open);
              setQrDialogOpen(open);
            }}
            equipment={selectedEquipment}
          />
          <EquipmentViewDialog
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            equipment={selectedEquipment}
          />
          <EquipmentEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            equipment={selectedEquipment}
            onSave={handleSaveEdit}
          />
          <DeleteEquipmentDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            equipment={selectedEquipment}
            onDeleted={handleEquipmentDeleted}
          />
        </>
      )}
      <ItRoundLogDialog
        open={itRoundDialogOpen}
        onOpenChange={(open) => {
          setItRoundDialogOpen(open);
          if (!open) {
            setItRoundTarget(null);
          }
        }}
        equipment={itRoundTarget}
        onLogged={handleItRoundLogged}
        defaultTechnician={profile?.full_name ?? ""}
      />
    </div>
  );
}

function ItRoundLogDialog({
  open,
  onOpenChange,
  equipment,
  onLogged,
  defaultTechnician,
}: ItRoundLogDialogProps) {
  const { toast } = useToast();
  const [frequency, setFrequency] = useState<number>(3);
  const [performedAt, setPerformedAt] = useState<string>(
    formatDate(new Date(), "yyyy-MM-dd"),
  );
  const [activities, setActivities] = useState<ItRoundActivities>(
    createEmptyItRoundActivities(),
  );
  const [technician, setTechnician] = useState<string>(defaultTechnician ?? "");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPerformedAt(formatDate(new Date(), "yyyy-MM-dd"));
    setFrequency(
      equipment?.itRound?.frequencyMonths && equipment.itRound.frequencyMonths > 0
        ? equipment.itRound.frequencyMonths
        : 3,
    );
    setActivities(() => {
      if (equipment?.itRound?.activities) {
        return { ...equipment.itRound.activities };
      }
      return createEmptyItRoundActivities();
    });
    setTechnician(equipment?.user?.trim() || defaultTechnician || "");
    setNotes("");
  }, [open, equipment, defaultTechnician]);

  const nextDueDate = useMemo(() => {
    if (!performedAt || Number.isNaN(frequency)) return null;
    const parsed = parseISO(performedAt);
    if (!isValid(parsed)) return null;
    return calculateNextDueDate(parsed, frequency);
  }, [performedAt, frequency]);

  const nextDueInfo = useMemo(() => {
    if (!nextDueDate) return null;
    return evaluateItRoundStatus(nextDueDate);
  }, [nextDueDate]);

  const nextDueDisplay = nextDueDate
    ? formatDate(nextDueDate, "dd MMM yyyy", { locale: thaiLocale })
    : "-";

  const nextDueSummary = nextDueDate
    ? formatItRoundDueSummary(nextDueInfo?.daysUntilDue ?? null, nextDueDate)
    : "-";

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!equipment) {
        toast({
          title: "ไม่พบข้อมูลครุภัณฑ์",
          description: "กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
        return;
      }

      const performedDate = parseISO(performedAt);
      if (!isValid(performedDate)) {
        toast({
          title: "วันที่ไม่ถูกต้อง",
          description: "กรุณาระบุวันที่ดำเนินการ",
          variant: "destructive",
        });
        return;
      }

      const nextDue = calculateNextDueDate(performedDate, frequency);
      const payload: TablesInsert<"equipment_it_rounds"> = {
        equipment_id: equipment.id,
        frequency_months: frequency,
        performed_at: formatDate(performedDate, "yyyy-MM-dd"),
        next_due_at: formatDate(nextDue, "yyyy-MM-dd"),
        technician: technician.trim() || null,
        activities,
        notes: notes.trim() || null,
        status: "completed",
      };

      try {
        setSaving(true);
        const { error } = await supabase
          .from("equipment_it_rounds")
          .insert(payload);

        if (error) throw error;

        toast({
          title: "บันทึก IT Round สำเร็จ",
          description: `${equipment.name} ได้รับการบันทึกรอบเรียบร้อย`,
        });
        onLogged();
      } catch (error: unknown) {
        console.error("Failed to log IT round", error);
        toast({
          title: "บันทึกไม่สำเร็จ",
          description: "กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [activities, equipment, frequency, notes, performedAt, technician, toast, onLogged],
  );

  const disabled = !equipment || saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>บันทึก IT Round</DialogTitle>
          <DialogDescription>
            บันทึกรอบการตรวจเช็คสำหรับ
            {" "}
            <span className="font-medium text-foreground">
              {equipment?.name ?? "ไม่ระบุครุภัณฑ์"}
            </span>
            {equipment?.assetNumber ? ` (${equipment.assetNumber})` : ""}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="performed-date">วันที่ดำเนินการ</Label>
              <Input
                id="performed-date"
                type="date"
                value={performedAt}
                onChange={(event) => setPerformedAt(event.target.value)}
                required
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>ความถี่ของรอบ</Label>
              <RadioGroup
                value={String(frequency)}
                onValueChange={(value) => setFrequency(Number(value))}
                className="grid grid-cols-2 gap-2"
              >
                {IT_ROUND_FREQUENCIES.map((months) => (
                  <Label
                    key={months}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border border-muted p-2 text-sm",
                      frequency === months && "border-primary bg-primary/5 text-primary",
                    )}
                  >
                    <RadioGroupItem value={String(months)} disabled={saving} />
                    {formatItRoundFrequency(months)}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="technician">ผู้ดำเนินการ</Label>
              <Input
                id="technician"
                value={technician}
                onChange={(event) => setTechnician(event.target.value)}
                placeholder="เช่น นายสมชาย ใจดี"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>กำหนดรอบถัดไป</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <div className="font-medium text-foreground">{nextDueDisplay}</div>
                <div className="text-xs text-muted-foreground">{nextDueSummary}</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>กิจกรรมที่ดำเนินการ</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {IT_ROUND_TASKS.map((task) => (
                <Label
                  key={task.key}
                  className={cn(
                    "flex items-start gap-3 rounded-md border border-muted bg-muted/30 p-3 text-sm",
                    activities[task.key] && "border-primary bg-primary/10 text-primary",
                  )}
                >
                  <Checkbox
                    checked={activities[task.key]}
                    onCheckedChange={(checked) =>
                      setActivities((prev) => ({
                        ...prev,
                        [task.key]: Boolean(checked),
                      }))
                    }
                    className="mt-0.5"
                    disabled={saving}
                  />
                  <span>{task.label}</span>
                </Label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="บันทึกผลการตรวจเช็คหรือรายการที่ต้องติดตาม"
              rows={3}
              disabled={saving}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={disabled}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึก IT Round"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
