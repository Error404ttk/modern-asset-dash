import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import {
  Plus,
  Building2,
  Package,
  Store,
  FileText,
  FilePlus,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Loader2,
  History,
  Lock,
  Wrench,
  ShoppingBag,
  Check,
  ChevronsUpDown,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const inkDb = supabase as SupabaseClient<any>;

type InkType = "ink" | "toner" | "drum" | "ribbon" | "mouse" | "keyboard";

type Brand = {
  id: string;
  name: string;
  description?: string | null;
};

type Supplier = {
  id: string;
  name: string;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Product = {
  id: string;
  brandId: string;
  brandName: string;
  modelId: string;
  modelCode: string;
  description: string | null;
  inkType: InkType;
  sku: string;
  unit: string;
  stockQuantity: number;
  reorderPoint: number;
  notes: string | null;
};

type ReceiptItem = {
  id?: string;
  productId: string;
  brandId?: string;
  brandName?: string;
  modelCode?: string;
  modelId?: string;
  description?: string | null;
  inkType?: InkType;
  sku?: string;
  quantity: number | null;
  unitPrice: number | null;
  unit: string;
};

type AttachmentMeta = {
  id?: string;
  name: string;
  size: number;
  type: string;
  storagePath?: string;
  storageBucket?: string;
  uploadedAt?: string;
  previewUrl?: string;
  file?: File;
};

type Receipt = {
  id: string;
  documentNo: string;
  supplierId: string;
  supplierName: string;
  receivedAt: string;
  totalAmount: number;
  note?: string | null;
  items: ReceiptItem[];
  attachments: AttachmentMeta[];
};

type ProductFormState = {
  brandId: string;
  inkType: InkType;
  modelCode: string;
  description: string;
  sku: string;
  unit: string;
  stockQuantity: number;
  reorderPoint: number;
};

type SupplierFormState = {
  name: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
};

type DeleteDialogDetails = {
  title: string;
  description: string;
  confirmLabel: string;
};

type SensitiveActionType = "edit" | "delete" | "history";

type EntityType = "receipt" | "maintenance" | "replacement";

type MaintenanceStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "not_worth_repair"
  | "disposed"
  | "pending_disposal";
type ReplacementStatus = "planned" | "ordered" | "received";

type AuditEntry = {
  id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changedByName?: string | null;
  changedAt: string;
  reason: string | null;
};

type ReceiptDraft = {
  documentNo: string;
  supplierId: string;
  receivedAt: string;
  note: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    unit: string;
  }>;
  totalAmount: number;
};

type MaintenanceRecord = {
  id: string;
  documentNo: string;
  equipmentId: string;
  equipmentName: string;
  equipmentAssetNumber?: string | null;
  equipmentType?: string | null;
  equipmentLocation?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  department?: string | null;
  technician?: string | null;
  issueSummary?: string | null;
  workDone?: string | null;
  partsReplaced: string[];
  sentAt?: string | null;
  returnedAt?: string | null;
  warrantyUntil?: string | null;
  cost: number;
  notes?: string | null;
  status: MaintenanceStatus;
  attachments: AttachmentMeta[];
};

type ReplacementRecord = {
  id: string;
  documentNo: string;
  equipmentId?: string | null;
  equipmentName?: string | null;
  equipmentAssetNumber?: string | null;
  equipmentLocation?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  department?: string | null;
  requestedBy?: string | null;
  approvedBy?: string | null;
  justification?: string | null;
  orderDate?: string | null;
  receivedDate?: string | null;
  warrantyUntil?: string | null;
  cost: number;
  status: ReplacementStatus;
  notes?: string | null;
  attachments: AttachmentMeta[];
};

type MaintenanceFormState = {
  documentNo: string;
  equipmentId: string;
  supplierId: string;
  departmentId: string;
  departmentName: string;
  technician: string;
  issueSummary: string;
  workDone: string;
  partsReplaced: string;
  sentAt: string;
  returnedAt: string;
  warrantyUntil: string;
  cost: string;
  notes: string;
  status: MaintenanceStatus;
  attachments: AttachmentMeta[];
};

type ReplacementFormState = {
  documentNo: string;
  equipmentId: string;
  supplierId: string;
  departmentId: string;
  departmentName: string;
  requestedBy: string;
  approvedBy: string;
  justification: string;
  orderDate: string;
  receivedDate: string;
  warrantyUntil: string;
  cost: string;
  status: ReplacementStatus;
  notes: string;
  attachments: AttachmentMeta[];
};

type EquipmentSummary = {
  id: string;
  name: string;
  type?: string | null;
  brand?: string | null;
  model?: string | null;
  location?: string | null;
  assetNumber?: string | null;
};

type DepartmentOption = {
  id: string;
  name: string;
  code: string;
  active: boolean;
};

const getEquipmentMeta = (equipment: EquipmentSummary): string =>
  [equipment.assetNumber, equipment.model, equipment.location].filter(Boolean).join(" • ");

const getEquipmentDisplayLabel = (equipment: EquipmentSummary): string => {
  const meta = getEquipmentMeta(equipment);
  return meta ? `${equipment.name} • ${meta}` : equipment.name;
};

const getEquipmentSearchValue = (equipment: EquipmentSummary): string =>
  [equipment.name, equipment.assetNumber, equipment.model, equipment.brand, equipment.location]
    .filter(Boolean)
    .join(" ");

const getDepartmentDisplayLabel = (department: DepartmentOption): string =>
  department.code ? `${department.name} (${department.code})` : department.name;

const getDepartmentSearchValue = (department: DepartmentOption): string =>
  [department.name, department.code].filter(Boolean).join(" ");

const getAttachmentCacheKey = (attachment: AttachmentMeta): string =>
  attachment.storagePath ?? `${attachment.name}-${attachment.size}`;

const isImageAttachment = (attachment: AttachmentMeta): boolean =>
  (attachment.type ?? "").toLowerCase().startsWith("image/");

const MAX_IMAGE_ATTACHMENTS = 3;
const PREFETCH_RECORD_LIMIT = 8;
const PREFETCH_PREVIEW_PER_RECORD = 2;
const MAX_ATTACHMENT_CACHE_ENTRIES = 60;
const DEFAULT_FETCH_LIMIT = 120;
const ATTACHMENT_FETCH_LIMIT = 6;
const IMAGE_COMPRESSION_THRESHOLD = 350 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const TARGET_IMAGE_QUALITY = 0.82;

const renameFileExtension = (name: string, newExtension: string): string => {
  const sanitizedExtension = newExtension.startsWith(".") ? newExtension : `.${newExtension}`;
  const lastDotIndex = name.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return `${name}${sanitizedExtension}`;
  }
  return `${name.slice(0, lastDotIndex)}${sanitizedExtension}`;
};

const loadImageElement = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = (event) => {
      URL.revokeObjectURL(objectUrl);
      reject(event);
    };
    image.src = objectUrl;
  });

const shouldCompressImageFile = (file: File): boolean => {
  if (!isImageFile(file)) return false;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return false;
  return file.size >= IMAGE_COMPRESSION_THRESHOLD;
};

const compressImageFile = async (file: File): Promise<File> => {
  if (!shouldCompressImageFile(file)) {
    return file;
  }

  try {
    let imageWidth = 0;
    let imageHeight = 0;
    let bitmap: ImageBitmap | null = null;
    let imageElement: HTMLImageElement | null = null;

    if ("createImageBitmap" in window) {
      try {
        bitmap = await createImageBitmap(file);
        imageWidth = bitmap.width;
        imageHeight = bitmap.height;
      } catch {
        bitmap = null;
      }
    }

    if (!bitmap) {
      imageElement = await loadImageElement(file);
      imageWidth = imageElement.naturalWidth || imageElement.width;
      imageHeight = imageElement.naturalHeight || imageElement.height;
    }

    if (!imageWidth || !imageHeight) {
      if (bitmap) bitmap.close();
      return file;
    }

    const largestSide = Math.max(imageWidth, imageHeight);
    const scale = largestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / largestSide : 1;
    const targetWidth = Math.max(1, Math.round(imageWidth * scale));
    const targetHeight = Math.max(1, Math.round(imageHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      if (bitmap) bitmap.close();
      return file;
    }

    if (bitmap) {
      context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      bitmap.close();
    } else if (imageElement) {
      context.drawImage(imageElement, 0, 0, targetWidth, targetHeight);
    }

    const targetType = "image/webp";
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((result) => resolve(result), targetType, TARGET_IMAGE_QUALITY),
    );

    if (!blob) {
      return file;
    }

    if (blob.size >= file.size * 0.95) {
      return file;
    }

    const compressedFile = new File([blob], renameFileExtension(file.name, ".webp"), {
      type: targetType,
      lastModified: Date.now(),
    });

    return compressedFile;
  } catch (error) {
    console.warn("compressImageFile failed", error);
    return file;
  }
};

const isImageFile = (file: File): boolean => {
  const mimeType = (file.type ?? "").toLowerCase();
  if (mimeType.startsWith("image/")) {
    return true;
  }
  return /\.(jpe?g|png|gif|bmp|webp|heic|heif)$/i.test(file.name);
};

const normalizeStoragePath = (rawPath: string | null | undefined, bucket: string): string | undefined => {
  if (!rawPath) return undefined;
  const value = rawPath.trim();
  if (!value) return undefined;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      const bucketIndex = parts.findIndex((part) => part === bucket);
      if (bucketIndex !== -1 && bucketIndex + 1 < parts.length) {
        return parts.slice(bucketIndex + 1).join("/");
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  if (value.startsWith(`${bucket}/`)) {
    return value.slice(bucket.length + 1);
  }

  return value;
};

type MaintenanceDraft = {
  documentNo: string;
  equipmentId: string;
  supplierId: string | null;
  departmentId: string | null;
  department: string | null;
  technician: string | null;
  issueSummary: string | null;
  workDone: string | null;
  partsReplaced: string[];
  sentAt: string | null;
  returnedAt: string | null;
  warrantyUntil: string | null;
  cost: number;
  notes: string | null;
  status: MaintenanceStatus;
};

type ReplacementDraft = {
  documentNo: string;
  equipmentId: string | null;
  supplierId: string | null;
  departmentId: string | null;
  department: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  justification: string | null;
  orderDate: string | null;
  receivedDate: string | null;
  warrantyUntil: string | null;
  cost: number;
  status: ReplacementStatus;
  notes: string | null;
};

const INK_TYPE_LABELS: Record<InkType, string> = {
  ink: "Ink",
  toner: "Toner",
  drum: "Drum",
  ribbon: "ผ้าหมึก",
  mouse: "Mouse",
  keyboard: "Keyboard",
};

const RECEIPT_STORAGE_BUCKET = "ink-receipts";
const MAINTENANCE_STORAGE_BUCKET = "maintenance-docs";
const REPLACEMENT_STORAGE_BUCKET = "replacement-docs";
const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  planned: "วางแผน",
  in_progress: "ระหว่างซ่อม",
  completed: "เสร็จสิ้น",
  not_worth_repair: "ไม่คุ้มค่าซ่อม",
  disposed: "จำหน่าย",
  pending_disposal: "รอจำหน่าย",
};

const MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  "planned",
  "in_progress",
  "completed",
  "not_worth_repair",
  "disposed",
  "pending_disposal",
];

const MAINTENANCE_STATUS_CARD_STYLES: Record<MaintenanceStatus, string> = {
  planned: "border-slate-200 bg-slate-50/80",
  in_progress: "border-blue-200 bg-blue-50/80",
  completed: "border-emerald-200 bg-emerald-50/80",
  not_worth_repair: "border-orange-200 bg-orange-50/80",
  disposed: "border-red-200 bg-red-50/80",
  pending_disposal: "border-amber-200 bg-amber-50/80",
};

const MAINTENANCE_STATUS_TEXT_CLASSES: Record<MaintenanceStatus, string> = {
  planned: "text-slate-600",
  in_progress: "text-blue-600",
  completed: "text-emerald-600",
  not_worth_repair: "text-orange-600",
  disposed: "text-red-600",
  pending_disposal: "text-amber-600",
};

const REPLACEMENT_STATUS_LABELS: Record<ReplacementStatus, string> = {
  planned: "วางแผน",
  ordered: "สั่งซื้อแล้ว",
  received: "รับสินค้าแล้ว",
};

const OPTIONAL_SELECT_VALUE = "__none__";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const withMessage = error as { message?: unknown };
    if (typeof withMessage.message === "string") {
      return withMessage.message;
    }
  }

  return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
};

const PIE_COLORS = ["#2563eb", "#fb923c", "#10b981", "#a855f7", "#f97316", "#22d3ee"];

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(value);

const getLineTotal = (item: ReceiptItem) =>
  (item.quantity ?? 0) * (item.unitPrice ?? 0);

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (size >= 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }

  return `${size} B`;
};

const DEFAULT_PRODUCT_FORM: ProductFormState = {
  brandId: "",
  inkType: "ink",
  modelCode: "",
  description: "",
  sku: "",
  unit: "ชิ้น",
  stockQuantity: 0,
  reorderPoint: 0,
};

const DEFAULT_SUPPLIER_FORM: SupplierFormState = {
  name: "",
  taxId: "",
  address: "",
  phone: "",
  email: "",
};

const DEFAULT_MAINTENANCE_FORM: MaintenanceFormState = {
  documentNo: "",
  equipmentId: "",
  supplierId: "",
  departmentId: "",
  departmentName: "",
  technician: "",
  issueSummary: "",
  workDone: "",
  partsReplaced: "",
  sentAt: new Date().toISOString().split("T")[0],
  returnedAt: "",
  warrantyUntil: "",
  cost: "",
  notes: "",
  status: "in_progress",
  attachments: [],
};

const DEFAULT_REPLACEMENT_FORM: ReplacementFormState = {
  documentNo: "",
  equipmentId: "",
  supplierId: "",
  departmentId: "",
  departmentName: "",
  requestedBy: "",
  approvedBy: "",
  justification: "",
  orderDate: new Date().toISOString().split("T")[0],
  receivedDate: "",
  warrantyUntil: "",
  cost: "",
  status: "ordered",
  notes: "",
  attachments: [],
};

const releaseAttachmentPreview = (attachment: AttachmentMeta) => {
  if (attachment.previewUrl) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
};

const releaseAttachmentCollection = (attachments: AttachmentMeta[]) => {
  attachments.forEach(releaseAttachmentPreview);
};

const StockInkToner = () => {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [equipments, setEquipments] = useState<EquipmentSummary[]>([]);
const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
const [replacementRecords, setReplacementRecords] = useState<ReplacementRecord[]>([]);
const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const [productDialogMode, setProductDialogMode] = useState<"create" | "edit">("create");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductModelId, setEditingProductModelId] = useState<string | null>(null);
  const [supplierDialogMode, setSupplierDialogMode] = useState<"create" | "edit">("create");
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [brandDialogMode, setBrandDialogMode] = useState<"create" | "edit">("create");
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "product" | "supplier" | "brand";
    id: string;
  } | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [filterInkType, setFilterInkType] = useState<InkType | "all">("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  const [isBrandDialogOpen, setBrandDialogOpen] = useState(false);
  const [brandName, setBrandName] = useState("");

  const [isSupplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>({ ...DEFAULT_SUPPLIER_FORM });

  const [isProductDialogOpen, setProductDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>({ ...DEFAULT_PRODUCT_FORM });

  const [isReceiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptDialogMode, setReceiptDialogMode] = useState<"create" | "edit">("create");
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [editingReceiptOriginal, setEditingReceiptOriginal] = useState<Receipt | null>(null);
  const [receiptChangeReason, setReceiptChangeReason] = useState("");
  const [receiptForm, setReceiptForm] = useState({
    documentNo: "",
    supplierId: "",
    receivedAt: new Date().toISOString().split("T")[0],
    note: "",
    items: [
      {
        id: generateId("item"),
        productId: "",
        quantity: null,
        unitPrice: null,
        unit: "ชิ้น",
      },
    ] as Array<ReceiptItem & { id: string }>,
    attachments: [] as AttachmentMeta[],
  });
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [sensitiveActionType, setSensitiveActionType] = useState<SensitiveActionType | null>(null);
  const [sensitiveEntityType, setSensitiveEntityType] = useState<EntityType | null>(null);
  const [sensitiveEntityId, setSensitiveEntityId] = useState<string | null>(null);
  const [sensitiveDialogOpen, setSensitiveDialogOpen] = useState(false);
  const [sensitivePassword, setSensitivePassword] = useState("");
  const [sensitiveReason, setSensitiveReason] = useState("");
  const [sensitiveLoading, setSensitiveLoading] = useState(false);
  const [auditHistoryEntries, setAuditHistoryEntries] = useState<AuditEntry[]>([]);
  const [isHistoryDialogOpen, setHistoryDialogOpen] = useState(false);
  const [isHistoryLoading, setHistoryLoading] = useState(false);
  const [historyContext, setHistoryContext] = useState<{ type: EntityType; recordId: string; title: string } | null>(
    null,
  );
  const [isMaintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormState>({ ...DEFAULT_MAINTENANCE_FORM });
  const [isSubmittingMaintenance, setSubmittingMaintenance] = useState(false);
  const [maintenanceDialogMode, setMaintenanceDialogMode] = useState<"create" | "edit">("create");
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<string | null>(null);
  const [editingMaintenanceOriginal, setEditingMaintenanceOriginal] = useState<MaintenanceRecord | null>(null);
  const [maintenanceChangeReason, setMaintenanceChangeReason] = useState("");
  const [isReplacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [replacementForm, setReplacementForm] = useState<ReplacementFormState>({ ...DEFAULT_REPLACEMENT_FORM });
  const [isSubmittingReplacement, setSubmittingReplacement] = useState(false);
  const [replacementDialogMode, setReplacementDialogMode] = useState<"create" | "edit">("create");
  const [editingReplacementId, setEditingReplacementId] = useState<string | null>(null);
  const [editingReplacementOriginal, setEditingReplacementOriginal] = useState<ReplacementRecord | null>(null);
  const [replacementChangeReason, setReplacementChangeReason] = useState("");
  const [isMaintenanceDocumentDialogOpen, setMaintenanceDocumentDialogOpen] = useState(false);
  const [maintenanceDocumentTarget, setMaintenanceDocumentTarget] = useState<MaintenanceRecord | null>(null);
  const [maintenanceDocumentFile, setMaintenanceDocumentFile] = useState<AttachmentMeta | null>(null);
  const [maintenanceDocumentImages, setMaintenanceDocumentImages] = useState<AttachmentMeta[]>([]);
  const [isUploadingMaintenanceDocument, setUploadingMaintenanceDocument] = useState(false);
  const [isReplacementDocumentDialogOpen, setReplacementDocumentDialogOpen] = useState(false);
  const [replacementDocumentTarget, setReplacementDocumentTarget] = useState<ReplacementRecord | null>(null);
  const [replacementDocumentFile, setReplacementDocumentFile] = useState<AttachmentMeta | null>(null);
  const [replacementDocumentImages, setReplacementDocumentImages] = useState<AttachmentMeta[]>([]);
  const [isUploadingReplacementDocument, setUploadingReplacementDocument] = useState(false);
  const [isMaintenanceEquipmentOpen, setMaintenanceEquipmentOpen] = useState(false);
  const [isMaintenanceDepartmentOpen, setMaintenanceDepartmentOpen] = useState(false);
  const [isReplacementEquipmentOpen, setReplacementEquipmentOpen] = useState(false);
  const [isReplacementDepartmentOpen, setReplacementDepartmentOpen] = useState(false);
  const [attachmentPreviewCache, setAttachmentPreviewCache] = useState<Record<string, string>>({});
  const attachmentPreviewCacheRef = useRef(attachmentPreviewCache);
  useEffect(() => {
    attachmentPreviewCacheRef.current = attachmentPreviewCache;
  }, [attachmentPreviewCache]);

  const attachmentCacheOrderRef = useRef<string[]>([]);

  const storeAttachmentPreview = useCallback((key: string, signedUrl: string) => {
    setAttachmentPreviewCache((prev) => {
      if (prev[key] === signedUrl) {
        return prev;
      }

      const next = { ...prev, [key]: signedUrl };
      const order = attachmentCacheOrderRef.current.filter((entry) => entry !== key);
      order.push(key);
      attachmentCacheOrderRef.current = order;

      while (attachmentCacheOrderRef.current.length > MAX_ATTACHMENT_CACHE_ENTRIES) {
        const removedKey = attachmentCacheOrderRef.current.shift();
        if (removedKey) {
          delete next[removedKey];
        }
      }

      return next;
    });
  }, []);

  const prefetchAttachmentPreviews = useCallback(
    async (attachments: AttachmentMeta[]) => {
      if (!attachments.length) return;

      const uniqueTargets: AttachmentMeta[] = [];
      const seenKeys = new Set<string>();

      for (const attachment of attachments) {
        if (!isImageAttachment(attachment)) continue;
        const bucket = attachment.storageBucket ?? RECEIPT_STORAGE_BUCKET;
        const path = normalizeStoragePath(attachment.storagePath, bucket);
        if (!path) continue;

        const key = getAttachmentCacheKey(attachment);
        if (attachmentPreviewCacheRef.current[key] || seenKeys.has(key)) continue;

        seenKeys.add(key);
        uniqueTargets.push(attachment);
      }

      await Promise.all(
        uniqueTargets.map(async (attachment) => {
          try {
            const bucket = attachment.storageBucket ?? RECEIPT_STORAGE_BUCKET;
            const path = normalizeStoragePath(attachment.storagePath, bucket);
            if (!path) return;

            const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 1800);
            if (!error && data?.signedUrl) {
              const key = getAttachmentCacheKey(attachment);
              storeAttachmentPreview(key, data.signedUrl);
            }
          } catch {
            // Ignore prefetch errors; user can still fetch on demand.
          }
        }),
      );
    },
    [storeAttachmentPreview, supabase],
  );

  const [isAttachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{
    attachment: AttachmentMeta;
    receiptTitle: string;
  } | null>(null);
const [attachmentDeleteTarget, setAttachmentDeleteTarget] = useState<{
  entityType: EntityType;
  recordId: string;
  recordTitle: string;
  attachment: AttachmentMeta;
} | null>(null);
const [isDeletingAttachment, setDeletingAttachment] = useState(false);
const [attachmentViewer, setAttachmentViewer] = useState<{
  entityType: EntityType;
  recordId: string;
  recordTitle: string;
  attachments: AttachmentMeta[];
} | null>(null);
const [viewerAttachments, setViewerAttachments] = useState<AttachmentMeta[]>([]);
const [isAttachmentViewerLoading, setAttachmentViewerLoading] = useState(false);
const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
const [maintenanceSearchTerm, setMaintenanceSearchTerm] = useState("");
const [replacementSearchTerm, setReplacementSearchTerm] = useState("");
const [updatingMaintenanceStatusId, setUpdatingMaintenanceStatusId] = useState<string | null>(null);

  const resetProductForm = useCallback(() => {
    setProductForm({ ...DEFAULT_PRODUCT_FORM });
    setProductDialogMode("create");
    setEditingProductId(null);
    setEditingProductModelId(null);
  }, []);

  const resetSupplierForm = useCallback(() => {
    setSupplierForm({ ...DEFAULT_SUPPLIER_FORM });
    setSupplierDialogMode("create");
    setEditingSupplierId(null);
  }, []);

  const resetBrandForm = useCallback(() => {
    setBrandName("");
    setBrandDialogMode("create");
    setEditingBrandId(null);
  }, []);

  const resetReceiptFormState = useCallback(() => {
    setReceiptForm({
      documentNo: "",
      supplierId: "",
      receivedAt: new Date().toISOString().split("T")[0],
      note: "",
      items: [
        {
          id: generateId("item"),
          productId: "",
          quantity: null,
          unitPrice: null,
          unit: "ชิ้น",
        },
      ],
      attachments: [],
    });
    setReceiptDialogMode("create");
    setEditingReceiptId(null);
    setEditingReceiptOriginal(null);
    setReceiptChangeReason("");
  }, []);

  const resetMaintenanceForm = useCallback(() => {
    setMaintenanceForm((prev) => {
      if (prev.attachments.length > 0) {
        releaseAttachmentCollection(prev.attachments);
      }
      return { ...DEFAULT_MAINTENANCE_FORM };
    });
    setMaintenanceDialogMode("create");
    setEditingMaintenanceId(null);
    setEditingMaintenanceOriginal(null);
    setMaintenanceChangeReason("");
  }, []);

  const resetReplacementForm = useCallback(() => {
    setReplacementForm((prev) => {
      if (prev.attachments.length > 0) {
        releaseAttachmentCollection(prev.attachments);
      }
      return { ...DEFAULT_REPLACEMENT_FORM };
    });
    setReplacementDialogMode("create");
    setEditingReplacementId(null);
    setEditingReplacementOriginal(null);
    setReplacementChangeReason("");
  }, []);

  const verifySensitivePassword = useCallback(
    async (password: string) => {
      if (!user?.email) {
        throw new Error("ไม่พบข้อมูลอีเมลของผู้ใช้งานปัจจุบัน");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }
    },
    [user],
  );

  const adjustInventoryForItems = useCallback(
    async (items: Array<{ inventory_id: string; quantity: number }>, direction: 1 | -1) => {
      for (const item of items) {
        const { data: inventoryRow, error: inventoryError } = await inkDb
          .from("ink_inventory")
          .select("stock_quantity")
          .eq("id", item.inventory_id)
          .single();
        if (inventoryError) throw inventoryError;

        const currentStock = Number(inventoryRow?.stock_quantity ?? 0);
        const newStock = currentStock + direction * Number(item.quantity ?? 0);

        const { error: updateError } = await inkDb
          .from("ink_inventory")
          .update({ stock_quantity: newStock })
          .eq("id", item.inventory_id);
        if (updateError) throw updateError;
      }
    },
    [],
  );

  const convertReceiptToDraft = useCallback(
    (receipt: Receipt): ReceiptDraft => ({
      documentNo: receipt.documentNo,
      supplierId: receipt.supplierId,
      receivedAt: receipt.receivedAt,
      note: receipt.note ?? "",
      items: receipt.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
        unit: item.unit ?? "ชิ้น",
      })),
      totalAmount: receipt.items.reduce((sum, item) => sum + getLineTotal(item), 0),
    }),
    [],
  );

  const convertMaintenanceToDraft = useCallback(
    (record: MaintenanceRecord): MaintenanceDraft => ({
      documentNo: record.documentNo,
      equipmentId: record.equipmentId,
      supplierId: record.supplierId ?? null,
      departmentId: record.departmentId ?? null,
      department: record.departmentName ?? record.department ?? null,
      technician: record.technician ?? null,
      issueSummary: record.issueSummary ?? null,
      workDone: record.workDone ?? null,
      partsReplaced: [...record.partsReplaced],
      sentAt: record.sentAt ?? null,
      returnedAt: record.returnedAt ?? null,
      warrantyUntil: record.warrantyUntil ?? null,
      cost: Number(record.cost ?? 0),
      notes: record.notes ?? null,
      status: record.status,
    }),
    [],
  );

  const convertReplacementToDraft = useCallback(
    (record: ReplacementRecord): ReplacementDraft => ({
      documentNo: record.documentNo,
      equipmentId: record.equipmentId ?? null,
      supplierId: record.supplierId ?? null,
      departmentId: record.departmentId ?? null,
      department: record.departmentName ?? record.department ?? null,
      requestedBy: record.requestedBy ?? null,
      approvedBy: record.approvedBy ?? null,
      justification: record.justification ?? null,
      orderDate: record.orderDate ?? null,
      receivedDate: record.receivedDate ?? null,
      warrantyUntil: record.warrantyUntil ?? null,
      cost: Number(record.cost ?? 0),
      status: record.status,
      notes: record.notes ?? null,
    }),
    [],
  );

  const convertReceiptToFormState = useCallback((receipt: Receipt) => {
    return {
      documentNo: receipt.documentNo,
      supplierId: receipt.supplierId,
      receivedAt: receipt.receivedAt ? receipt.receivedAt.slice(0, 10) : new Date().toISOString().split("T")[0],
      note: receipt.note ?? "",
      items: receipt.items.map((item) => ({
        id: generateId("item"),
        productId: item.productId,
        quantity: item.quantity ?? 0,
        unitPrice: item.unitPrice ?? 0,
        unit: item.unit ?? "ชิ้น",
      })),
      attachments: [] as AttachmentMeta[],
    };
  }, []);

  const convertMaintenanceToFormState = useCallback((record: MaintenanceRecord) => {
    return {
      documentNo: record.documentNo,
      equipmentId: record.equipmentId,
      supplierId: record.supplierId ?? "",
      departmentId: record.departmentId ?? "",
      departmentName: record.departmentName ?? record.department ?? "",
      technician: record.technician ?? "",
      issueSummary: record.issueSummary ?? "",
      workDone: record.workDone ?? "",
      partsReplaced: record.partsReplaced.join("\n"),
      sentAt: record.sentAt ? record.sentAt.slice(0, 10) : new Date().toISOString().split("T")[0],
      returnedAt: record.returnedAt ? record.returnedAt.slice(0, 10) : "",
      warrantyUntil: record.warrantyUntil ? record.warrantyUntil.slice(0, 10) : "",
      cost: record.cost ? record.cost.toString() : "",
      notes: record.notes ?? "",
      status: record.status,
      attachments: [],
    } satisfies MaintenanceFormState;
  }, []);

  const convertReplacementToFormState = useCallback((record: ReplacementRecord) => {
    return {
      documentNo: record.documentNo,
      equipmentId: record.equipmentId ?? "",
      supplierId: record.supplierId ?? "",
      departmentId: record.departmentId ?? "",
      departmentName: record.departmentName ?? record.department ?? "",
      requestedBy: record.requestedBy ?? "",
      approvedBy: record.approvedBy ?? "",
      justification: record.justification ?? "",
      orderDate: record.orderDate ? record.orderDate.slice(0, 10) : new Date().toISOString().split("T")[0],
      receivedDate: record.receivedDate ? record.receivedDate.slice(0, 10) : "",
      warrantyUntil: record.warrantyUntil ? record.warrantyUntil.slice(0, 10) : "",
      cost: record.cost ? record.cost.toString() : "",
      status: record.status,
      notes: record.notes ?? "",
      attachments: [],
    } satisfies ReplacementFormState;
  }, []);

  const normalizeItemsForHistory = useCallback((items: ReceiptDraft["items"]) => {
    return items
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
        unit: item.unit,
      }))
      .sort((a, b) => a.productId.localeCompare(b.productId));
  }, []);

  const serializeReceiptDraft = useCallback(
    (draft: ReceiptDraft) =>
      JSON.stringify({
        documentNo: draft.documentNo,
        supplierId: draft.supplierId,
        receivedAt: draft.receivedAt,
        note: draft.note,
        totalAmount: draft.totalAmount,
        items: normalizeItemsForHistory(draft.items),
      }),
    [normalizeItemsForHistory],
  );

  const computeReceiptChanges = useCallback(
    (before: Receipt | null, after: ReceiptDraft | null) => {
      if (!before && !after) {
        return [];
      }

      if (!before && after) {
        return [
          {
            field: "entire_receipt",
            oldValue: null,
            newValue: serializeReceiptDraft(after),
          },
        ];
      }

      if (before && !after) {
        const beforeDraft = convertReceiptToDraft(before);
        return [
          {
            field: "entire_receipt",
            oldValue: serializeReceiptDraft(beforeDraft),
            newValue: null,
          },
        ];
      }

      if (!before || !after) {
        return [];
      }

      const beforeDraft = convertReceiptToDraft(before);
      const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

      if (beforeDraft.documentNo !== after.documentNo) {
        changes.push({
          field: "document_no",
          oldValue: beforeDraft.documentNo,
          newValue: after.documentNo,
        });
      }

      if (beforeDraft.supplierId !== after.supplierId) {
        changes.push({
          field: "supplier_id",
          oldValue: beforeDraft.supplierId,
          newValue: after.supplierId,
        });
      }

      if (beforeDraft.receivedAt !== after.receivedAt) {
        changes.push({
          field: "received_at",
          oldValue: beforeDraft.receivedAt,
          newValue: after.receivedAt,
        });
      }

      if ((beforeDraft.note ?? "") !== (after.note ?? "")) {
        changes.push({
          field: "note",
          oldValue: beforeDraft.note ?? "",
          newValue: after.note ?? "",
        });
      }

      if (beforeDraft.totalAmount !== after.totalAmount) {
        changes.push({
          field: "total_amount",
          oldValue: beforeDraft.totalAmount.toString(),
          newValue: after.totalAmount.toString(),
        });
      }

      const beforeItemsSnapshot = JSON.stringify(normalizeItemsForHistory(beforeDraft.items));
      const afterItemsSnapshot = JSON.stringify(normalizeItemsForHistory(after.items));

      if (beforeItemsSnapshot !== afterItemsSnapshot) {
        changes.push({
          field: "items",
          oldValue: beforeItemsSnapshot,
          newValue: afterItemsSnapshot,
        });
      }

      return changes;
    },
    [convertReceiptToDraft, normalizeItemsForHistory, serializeReceiptDraft],
  );

  const computeMaintenanceChanges = useCallback(
    (before: MaintenanceRecord | null, after: MaintenanceDraft | null) => {
      if (!before && !after) {
        return [];
      }

      if (!before && after) {
        return [
          {
            field: "entire_record",
            oldValue: null,
            newValue: JSON.stringify(after),
          },
        ];
      }

      if (before && !after) {
        return [
          {
            field: "entire_record",
            oldValue: JSON.stringify(convertMaintenanceToDraft(before)),
            newValue: null,
          },
        ];
      }

      if (!before || !after) {
        return [];
      }

      const beforeDraft = convertMaintenanceToDraft(before);
      const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

      const fields: Array<keyof MaintenanceDraft> = [
        "documentNo",
        "equipmentId",
        "supplierId",
        "departmentId",
        "department",
        "technician",
        "issueSummary",
        "workDone",
        "sentAt",
        "returnedAt",
        "warrantyUntil",
        "notes",
        "status",
      ];

      fields.forEach((field) => {
        const beforeValue = beforeDraft[field];
        const afterValue = after[field];
        if ((beforeValue ?? "") !== (afterValue ?? "")) {
          changes.push({
            field,
            oldValue: beforeValue == null ? null : String(beforeValue),
            newValue: afterValue == null ? null : String(afterValue),
          });
        }
      });

      if (beforeDraft.cost !== after.cost) {
        changes.push({
          field: "cost",
          oldValue: beforeDraft.cost.toString(),
          newValue: after.cost.toString(),
        });
      }

      const beforeParts = JSON.stringify(beforeDraft.partsReplaced.sort());
      const afterParts = JSON.stringify([...after.partsReplaced].sort());
      if (beforeParts !== afterParts) {
        changes.push({
          field: "parts_replaced",
          oldValue: beforeParts,
          newValue: afterParts,
        });
      }

      return changes;
    },
    [convertMaintenanceToDraft],
  );

  const computeReplacementChanges = useCallback(
    (before: ReplacementRecord | null, after: ReplacementDraft | null) => {
      if (!before && !after) {
        return [];
      }

      if (!before && after) {
        return [
          {
            field: "entire_record",
            oldValue: null,
            newValue: JSON.stringify(after),
          },
        ];
      }

      if (before && !after) {
        return [
          {
            field: "entire_record",
            oldValue: JSON.stringify(convertReplacementToDraft(before)),
            newValue: null,
          },
        ];
      }

      if (!before || !after) {
        return [];
      }

      const beforeDraft = convertReplacementToDraft(before);
      const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

      const fields: Array<keyof ReplacementDraft> = [
        "documentNo",
        "equipmentId",
        "supplierId",
        "departmentId",
        "department",
        "requestedBy",
        "approvedBy",
        "justification",
        "orderDate",
        "receivedDate",
        "warrantyUntil",
        "notes",
        "status",
      ];

      fields.forEach((field) => {
        const beforeValue = beforeDraft[field];
        const afterValue = after[field];
        if ((beforeValue ?? "") !== (afterValue ?? "")) {
          changes.push({
            field,
            oldValue: beforeValue == null ? null : String(beforeValue),
            newValue: afterValue == null ? null : String(afterValue),
          });
        }
      });

      if (beforeDraft.cost !== after.cost) {
        changes.push({
          field: "cost",
          oldValue: beforeDraft.cost.toString(),
          newValue: after.cost.toString(),
        });
      }

      return changes;
    },
    [convertReplacementToDraft],
  );

  const brandById = useMemo(() => new Map(brands.map((item) => [item.id, item])), [brands]);
  const supplierById = useMemo(() => new Map(suppliers.map((item) => [item.id, item])), [suppliers]);
  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);
  const departmentById = useMemo(() => new Map(departments.map((item) => [item.id, item])), [departments]);
  const activeDepartments = useMemo(
    () => departments.filter((department) => department.active !== false),
    [departments],
  );
  const equipmentById = useMemo(() => new Map(equipments.map((item) => [item.id, item])), [equipments]);

  const ensureAttachmentPreview = useCallback(
    async (attachment: AttachmentMeta): Promise<string | null> => {
      if (attachment.previewUrl) {
        return attachment.previewUrl;
      }

      const key = getAttachmentCacheKey(attachment);
      const cached = attachmentPreviewCacheRef.current[key];
      if (cached) {
        return cached;
      }

      const bucket = attachment.storageBucket ?? RECEIPT_STORAGE_BUCKET;
      const storagePath = normalizeStoragePath(attachment.storagePath, bucket);
      if (!storagePath) {
        return null;
      }

      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 1800);
      if (error) throw error;

      const signedUrl = data?.signedUrl ?? null;
      if (signedUrl) {
        storeAttachmentPreview(key, signedUrl);
      }
      return signedUrl;
    },
    [storeAttachmentPreview, supabase],
  );


  const selectedMaintenanceEquipment = useMemo(
    () => equipments.find((equipment) => equipment.id === maintenanceForm.equipmentId) ?? null,
    [equipments, maintenanceForm.equipmentId],
  );

  const selectedMaintenanceDepartment = useMemo(
    () => (maintenanceForm.departmentId ? departmentById.get(maintenanceForm.departmentId) ?? null : null),
    [departmentById, maintenanceForm.departmentId],
  );

  const selectedReplacementEquipment = useMemo(
    () => equipments.find((equipment) => equipment.id === replacementForm.equipmentId) ?? null,
    [equipments, replacementForm.equipmentId],
  );

  const selectedReplacementDepartment = useMemo(
    () => (replacementForm.departmentId ? departmentById.get(replacementForm.departmentId) ?? null : null),
    [departmentById, replacementForm.departmentId],
  );

  const getAuditFieldLabel = useCallback(
    (entityType: EntityType, fieldName: string | null) => {
      const fallback = fieldName ?? "ไม่ระบุฟิลด์";
      if (!fieldName) {
        return fallback;
      }

      if (entityType === "receipt") {
        switch (fieldName) {
          case "document_no":
            return "เลขที่เอกสาร";
          case "supplier_id":
            return "ผู้ขาย";
          case "received_at":
            return "วันที่ลงรับ";
          case "note":
            return "หมายเหตุ";
          case "total_amount":
            return "ยอดรวม";
          case "items":
            return "รายละเอียดสินค้า";
          case "entire_receipt":
            return "ข้อมูลใบลงรับทั้งหมด";
          default:
            return fallback;
        }
      }

      if (entityType === "maintenance") {
        switch (fieldName) {
          case "documentNo":
            return "เลขที่เอกสาร";
          case "equipmentId":
            return "ครุภัณฑ์";
          case "supplierId":
            return "ผู้ให้บริการ";
          case "department":
            return "แผนก";
          case "technician":
            return "ช่าง/ผู้ประสาน";
          case "issueSummary":
            return "อาการที่พบ";
          case "workDone":
            return "งานที่ดำเนินการ";
          case "parts_replaced":
            return "อะไหล่ที่เปลี่ยน";
          case "sentAt":
            return "ส่งซ่อม";
          case "returnedAt":
            return "รับคืน";
          case "warrantyUntil":
            return "ประกันถึง";
          case "cost":
            return "ค่าใช้จ่าย";
          case "notes":
            return "หมายเหตุ";
          case "status":
            return "สถานะ";
          case "entire_record":
            return "ข้อมูลการซ่อมทั้งหมด";
          default:
            return fallback;
        }
      }

      // replacement
      switch (fieldName) {
        case "documentNo":
          return "เลขที่เอกสาร";
        case "equipmentId":
          return "ครุภัณฑ์";
        case "supplierId":
          return "ผู้ขาย";
        case "department":
          return "แผนก";
        case "requestedBy":
          return "ผู้ร้องขอ";
        case "approvedBy":
          return "ผู้อนุมัติ";
        case "justification":
          return "เหตุผล";
        case "orderDate":
          return "วันที่สั่งซื้อ";
        case "receivedDate":
          return "วันที่รับสินค้า";
        case "warrantyUntil":
          return "ประกันถึง";
        case "cost":
          return "งบประมาณ";
        case "notes":
          return "หมายเหตุ";
        case "status":
          return "สถานะ";
        case "entire_record":
          return "ข้อมูลการซื้อทั้งหมด";
        default:
          return fallback;
      }
    },
    [],
  );

  const formatHistoryValue = useCallback(
    (entityType: EntityType, fieldName: string | null, value: string | null) => {
      if (!value) {
        return "-";
      }

      if (entityType === "receipt" && fieldName === "total_amount") {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? formatCurrency(numeric) : value;
      }

      if (fieldName === "received_at" || fieldName === "sentAt" || fieldName === "returnedAt" || fieldName === "orderDate" || fieldName === "receivedDate" || fieldName === "warrantyUntil") {
        const dateValue = new Date(value);
        return Number.isNaN(dateValue.valueOf())
          ? value
          : dateValue.toLocaleString("th-TH", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
      }

      if (entityType === "receipt" && fieldName === "items") {
        try {
          const parsed = JSON.parse(value) as Array<{
            productId: string;
            quantity: number;
            unitPrice: number;
            unit: string;
          }>;

          if (Array.isArray(parsed)) {
            return parsed
              .map(
                (item) =>
                  `สินค้า ${item.productId} • ${item.quantity} ${item.unit} • ${formatCurrency(
                    item.unitPrice,
                  )}`,
              )
              .join("\n");
          }
        } catch (error) {
          console.error("ไม่สามารถแปลงค่าประวัติ items ได้", error);
        }
        return value;
      }

      if (fieldName === "entire_record" || fieldName === "entire_receipt") {
        try {
          const parsed = JSON.parse(value);
          return JSON.stringify(parsed, null, 2);
        } catch (error) {
          console.error("ไม่สามารถแปลงค่าประวัติ entire_receipt ได้", error);
          return value;
        }
      }

      if (fieldName === "parts_replaced") {
        try {
          const parsed = JSON.parse(value) as string[];
          if (Array.isArray(parsed)) {
            return parsed.join("\n");
          }
        } catch (error) {
          console.error("ไม่สามารถแปลงค่าประวัติ parts_replaced ได้", error);
        }
        return value;
      }

      if (fieldName === "cost" || fieldName === "total_amount") {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? formatCurrency(numeric) : value;
      }

      if (entityType === "maintenance" && fieldName === "status") {
        return MAINTENANCE_STATUS_LABELS[value as MaintenanceStatus] ?? value;
      }

      if (entityType === "replacement" && fieldName === "status") {
        return REPLACEMENT_STATUS_LABELS[value as ReplacementStatus] ?? value;
      }

      if (fieldName === "supplierId") {
        const supplier = supplierById.get(value);
        return supplier ? supplier.name : value;
      }

      if (fieldName === "equipmentId") {
        const equipment = equipmentById.get(value);
        if (equipment) {
          const asset = equipment.assetNumber ? ` • ${equipment.assetNumber}` : "";
          const model = equipment.model ? ` • ${equipment.model}` : "";
          const location = equipment.location ? ` (${equipment.location})` : "";
          return `${equipment.name}${asset}${model}${location}`;
        }
        return value;
      }

      return value;
    },
    [equipmentById, supplierById],
  );

  const logReceiptChanges = useCallback(
    async ({
      receiptId,
      action,
      reason,
      before,
      after,
    }: {
      receiptId: string;
      action: "INSERT" | "UPDATE" | "DELETE";
      reason: string;
      before: Receipt | null;
      after: ReceiptDraft | null;
    }) => {
      const changeSet = computeReceiptChanges(before, after);

      const payloadSource =
        changeSet.length > 0
          ? changeSet
          : [
              {
                field: "entire_receipt",
                oldValue: before ? serializeReceiptDraft(convertReceiptToDraft(before)) : null,
                newValue: after ? serializeReceiptDraft(after) : null,
              },
            ];

      const payload = payloadSource.map((change) => ({
        table_name: "ink_receipts",
        record_id: receiptId,
        action,
        field_name: change.field,
        old_value: change.oldValue,
        new_value: change.newValue,
        changed_by: user?.id ?? null,
        reason: reason.trim() || null,
      }));

      if (payload.length === 0) {
        return;
      }

      const { error } = await inkDb.from("audit_logs").insert(payload);
      if (error) {
        throw error;
      }
    },
    [computeReceiptChanges, convertReceiptToDraft, serializeReceiptDraft, user],
  );

  const logMaintenanceChanges = useCallback(
    async ({
      maintenanceId,
      action,
      reason,
      before,
      after,
    }: {
      maintenanceId: string;
      action: "INSERT" | "UPDATE" | "DELETE";
      reason: string;
      before: MaintenanceRecord | null;
      after: MaintenanceDraft | null;
    }) => {
      const changeSet = computeMaintenanceChanges(before, after);
      const payload = (changeSet.length > 0 ? changeSet : [
        {
          field: "entire_record",
          oldValue: before ? JSON.stringify(convertMaintenanceToDraft(before)) : null,
          newValue: after ? JSON.stringify(after) : null,
        },
      ]).map((change) => ({
        table_name: "equipment_maintenance",
        record_id: maintenanceId,
        action,
        field_name: change.field,
        old_value: change.oldValue,
        new_value: change.newValue,
        changed_by: user?.id ?? null,
        reason: reason.trim() || null,
      }));

      if (payload.length === 0) {
        return;
      }

      const { error } = await inkDb.from("audit_logs").insert(payload);
      if (error) {
        throw error;
      }
    },
    [computeMaintenanceChanges, convertMaintenanceToDraft, user],
  );

  const logReplacementChanges = useCallback(
    async ({
      replacementId,
      action,
      reason,
      before,
      after,
    }: {
      replacementId: string;
      action: "INSERT" | "UPDATE" | "DELETE";
      reason: string;
      before: ReplacementRecord | null;
      after: ReplacementDraft | null;
    }) => {
      const changeSet = computeReplacementChanges(before, after);
      const payload = (changeSet.length > 0 ? changeSet : [
        {
          field: "entire_record",
          oldValue: before ? JSON.stringify(convertReplacementToDraft(before)) : null,
          newValue: after ? JSON.stringify(after) : null,
        },
      ]).map((change) => ({
        table_name: "equipment_replacements",
        record_id: replacementId,
        action,
        field_name: change.field,
        old_value: change.oldValue,
        new_value: change.newValue,
        changed_by: user?.id ?? null,
        reason: reason.trim() || null,
      }));

      if (payload.length === 0) {
        return;
      }

      const { error } = await inkDb.from("audit_logs").insert(payload);
      if (error) {
        throw error;
      }
    },
    [computeReplacementChanges, convertReplacementToDraft, user],
  );

  const fetchAuditHistory = useCallback(
    async (tableName: string, recordId: string) => {
      try {
        setHistoryLoading(true);
        const { data, error } = await inkDb
          .from("audit_logs")
          .select("id, action, field_name, old_value, new_value, changed_by, changed_at, reason")
          .eq("table_name", tableName)
          .eq("record_id", recordId)
          .order("changed_at", { ascending: false });
        if (error) throw error;

        const entries = (data ?? []).map((row) => ({
          id: row.id,
          action: row.action as AuditEntry["action"],
          fieldName: row.field_name,
          oldValue: row.old_value,
          newValue: row.new_value,
          changedBy: row.changed_by,
          changedAt: row.changed_at,
          reason: row.reason,
        }));

        const userIds = Array.from(new Set(entries.map((entry) => entry.changedBy).filter(Boolean))) as string[];

        let userMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profilesData, error: profileError } = await inkDb
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", userIds);
          if (profileError) throw profileError;

          userMap = new Map(
            (profilesData ?? []).map((profile) => [
              profile.user_id,
              profile.full_name || profile.email || profile.user_id,
            ]),
          );
        }

        setAuditHistoryEntries(
          entries.map((entry) => ({
            ...entry,
            changedByName: entry.changedBy ? userMap.get(entry.changedBy) ?? entry.changedBy : "ไม่ทราบผู้ใช้",
          })),
        );
      } catch (error) {
        setAuditHistoryEntries([]);
        throw error;
      } finally {
        setHistoryLoading(false);
      }
    },
    [],
  );

  const fetchBrands = useCallback(async () => {
    try {
      const { data, error } = await inkDb
        .from("ink_brands")
        .select("id, name, description")
        .order("name", { ascending: true });
      if (error) throw error;
      setBrands((data ?? []).map((item) => ({ id: item.id, name: item.name, description: item.description })));
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดยี่ห้อสินค้าได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const { data, error } = await inkDb
        .from("ink_suppliers")
        .select("id, name, tax_id, address, phone, email")
        .order("name", { ascending: true });
      if (error) throw error;
      setSuppliers(
        (data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          taxId: item.tax_id,
          address: item.address,
          phone: item.phone,
          email: item.email,
        })),
      );
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดข้อมูลผู้ขายได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, code, active")
        .order("name", { ascending: true });
      if (error) throw error;
      setDepartments(
        (data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          active: item.active ?? true,
        })),
      );
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดข้อมูลหน่วยงานได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await inkDb
        .from("ink_inventory")
        .select(
          `
            id,
            sku,
            unit,
            stock_quantity,
            reorder_point,
            notes,
            model:ink_models (
              id,
              code,
              description,
              material_type,
              brand:ink_brands (
                id,
                name
              )
            )
          `,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const mapped: Product[] = rows.map((row: any) => ({
        id: row.id,
        sku: row.sku ?? "",
        unit: row.unit ?? "ชิ้น",
        stockQuantity: Number(row.stock_quantity ?? 0),
        reorderPoint: Number(row.reorder_point ?? 0),
        notes: row.notes ?? null,
        modelId: row.model?.id ?? "",
        modelCode: row.model?.code ?? "",
        description: row.model?.description ?? null,
        inkType: (row.model?.material_type ?? "ink") as InkType,
        brandId: row.model?.brand?.id ?? "",
        brandName: row.model?.brand?.name ?? "-",
      }));

      setProducts(mapped);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดข้อมูลสินค้าได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  }, []);

  const fetchReceipts = useCallback(async () => {
    try {
      const { data, error } = await inkDb
        .from("ink_receipts")
        .select(
          `
            id,
            document_no,
            supplier_id,
            received_at,
            total_amount,
            note,
            supplier:ink_suppliers (
              id,
              name
            ),
            items:ink_receipt_items (
              id,
              inventory_id,
              quantity,
              unit,
              unit_price,
              line_total,
              inventory:ink_inventory (
                id,
                sku,
                unit,
                model:ink_models (
                  id,
                  code,
                  description,
                  material_type,
                  brand:ink_brands (
                    id,
                    name
                  )
                )
              )
            ),
            attachments:ink_attachments (
              id,
              file_name,
              file_type,
              file_size,
              storage_path,
              uploaded_at
            )
          `,
        )
        .order("received_at", { ascending: false })
        .limit(DEFAULT_FETCH_LIMIT)
        .limit(ATTACHMENT_FETCH_LIMIT, { foreignTable: "ink_attachments" });
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const mapped: Receipt[] = rows.map((receipt: any) => ({
        id: receipt.id,
        documentNo: receipt.document_no,
        supplierId: receipt.supplier_id,
        supplierName: receipt.supplier?.name ?? "-",
        receivedAt: receipt.received_at,
        totalAmount: Number(receipt.total_amount ?? 0),
        note: receipt.note ?? null,
        items: (receipt.items ?? []).map((item: any) => ({
          id: item.id,
          productId: item.inventory_id,
          quantity: Number(item.quantity ?? 0),
          unitPrice: Number(item.unit_price ?? 0),
          unit: item.unit ?? "ชิ้น",
          brandId: item.inventory?.model?.brand?.id ?? undefined,
          brandName: item.inventory?.model?.brand?.name ?? "-",
          modelId: item.inventory?.model?.id ?? undefined,
          modelCode: item.inventory?.model?.code ?? "-",
          description: item.inventory?.model?.description ?? null,
          inkType: (item.inventory?.model?.material_type ?? "ink") as InkType,
          sku: item.inventory?.sku ?? "",
        })),
      attachments: (receipt.attachments ?? []).map((attachment: any) => ({
        id: attachment.id,
        name: attachment.file_name,
        type: attachment.file_type ?? "",
        size: Number(attachment.file_size ?? 0),
        storagePath: normalizeStoragePath(attachment.storage_path, RECEIPT_STORAGE_BUCKET),
        storageBucket: RECEIPT_STORAGE_BUCKET,
        uploadedAt: attachment.uploaded_at ?? undefined,
      })),
      }));

      setReceipts(mapped);
      startTransition(() => {
        prefetchAttachmentPreviews(
          mapped
            .slice(0, PREFETCH_RECORD_LIMIT)
            .flatMap((receipt) => receipt.attachments.slice(0, PREFETCH_PREVIEW_PER_RECORD)),
        );
      });
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดใบลงรับสินค้าได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  }, [prefetchAttachmentPreviews, toast]);

  const fetchEquipments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, type, brand, model, location, asset_number")
        .order("name", { ascending: true });
      if (error) throw error;
      setEquipments(
        (data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          brand: item.brand,
          model: item.model,
          location: item.location,
          assetNumber: item.asset_number,
        })),
      );
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดข้อมูลครุภัณฑ์ได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  }, []);

  const fetchMaintenanceRecords = useCallback(async () => {
    try {
      const { data, error } = await inkDb
        .from("equipment_maintenance")
        .select(
          `
            id,
            document_no,
            equipment_id,
            supplier_id,
            department,
            department_id,
            technician,
            issue_summary,
            work_done,
            parts_replaced,
            sent_at,
            returned_at,
            warranty_until,
            cost,
            notes,
            status,
            created_at,
            equipment:equipment (
              id,
              name,
              type,
              brand,
              model,
              location,
              asset_number
            ),
            supplier:ink_suppliers (
              id,
              name
            ),
            attachments:equipment_maintenance_attachments (
              id,
              file_name,
              file_type,
              file_size,
              storage_path,
              uploaded_at
            ),
            department_info:departments!equipment_maintenance_department_id_fkey (
              id,
              name,
              code
            )
          `,
        )
        .order("sent_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(DEFAULT_FETCH_LIMIT)
        .limit(ATTACHMENT_FETCH_LIMIT, { foreignTable: "equipment_maintenance_attachments" });
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const mapped: MaintenanceRecord[] = rows.map((row) => ({
        id: row.id,
        documentNo: row.document_no,
        equipmentId: row.equipment_id,
        equipmentName: row.equipment?.name ?? "ไม่ทราบครุภัณฑ์",
        equipmentAssetNumber: row.equipment?.asset_number ?? null,
        equipmentType: row.equipment?.type ?? null,
        equipmentLocation: row.equipment?.location ?? null,
        supplierId: row.supplier_id ?? null,
        supplierName: row.supplier?.name ?? null,
        departmentId: row.department_id ?? null,
        departmentName: row.department_info?.name ?? null,
        department: row.department ?? null,
        technician: row.technician ?? null,
        issueSummary: row.issue_summary ?? null,
        workDone: row.work_done ?? null,
        partsReplaced: Array.isArray(row.parts_replaced) ? row.parts_replaced.filter(Boolean) : [],
        sentAt: row.sent_at ?? null,
        returnedAt: row.returned_at ?? null,
        warrantyUntil: row.warranty_until ?? null,
        cost: Number(row.cost ?? 0),
        notes: row.notes ?? null,
        status: (row.status ?? "in_progress") as MaintenanceStatus,
        attachments: (row.attachments ?? []).map((attachment: any) => ({
          id: attachment.id,
          name: attachment.file_name,
          type: attachment.file_type ?? "",
          size: Number(attachment.file_size ?? 0),
          storagePath: normalizeStoragePath(attachment.storage_path, MAINTENANCE_STORAGE_BUCKET),
          storageBucket: MAINTENANCE_STORAGE_BUCKET,
          uploadedAt: attachment.uploaded_at ?? undefined,
        })),
      }));

      setMaintenanceRecords(mapped);
      startTransition(() => {
        prefetchAttachmentPreviews(
          mapped
            .slice(0, PREFETCH_RECORD_LIMIT)
            .flatMap((record) => record.attachments.slice(0, PREFETCH_PREVIEW_PER_RECORD)),
        );
      });
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดข้อมูลการซ่อมบำรุงได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  }, [prefetchAttachmentPreviews, toast]);

  const fetchReplacementRecords = useCallback(async () => {
    try {
      const { data, error } = await inkDb
        .from("equipment_replacements")
        .select(
          `
            id,
            document_no,
            equipment_id,
            supplier_id,
            department,
            department_id,
            requested_by,
            approved_by,
            justification,
            order_date,
            received_date,
            warranty_until,
            cost,
            status,
            notes,
            created_at,
            equipment:equipment (
              id,
              name,
              type,
              brand,
              model,
              location,
              asset_number
            ),
            supplier:ink_suppliers (
              id,
              name
            ),
            attachments:equipment_replacement_attachments (
              id,
              file_name,
              file_type,
              file_size,
              storage_path,
              uploaded_at
            ),
            department_info:departments!equipment_replacements_department_id_fkey (
              id,
              name,
              code
            )
          `,
        )
        .order("order_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(DEFAULT_FETCH_LIMIT)
        .limit(ATTACHMENT_FETCH_LIMIT, { foreignTable: "equipment_replacement_attachments" });
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const mapped: ReplacementRecord[] = rows.map((row) => ({
        id: row.id,
        documentNo: row.document_no,
        equipmentId: row.equipment_id ?? null,
        equipmentName: row.equipment?.name ?? null,
        equipmentAssetNumber: row.equipment?.asset_number ?? null,
        equipmentLocation: row.equipment?.location ?? null,
        supplierId: row.supplier_id ?? null,
        supplierName: row.supplier?.name ?? null,
        departmentId: row.department_id ?? null,
        departmentName: row.department_info?.name ?? null,
        department: row.department ?? null,
        requestedBy: row.requested_by ?? null,
        approvedBy: row.approved_by ?? null,
        justification: row.justification ?? null,
        orderDate: row.order_date ?? null,
        receivedDate: row.received_date ?? null,
        warrantyUntil: row.warranty_until ?? null,
        cost: Number(row.cost ?? 0),
        status: (row.status ?? "ordered") as ReplacementStatus,
        notes: row.notes ?? null,
        attachments: (row.attachments ?? []).map((attachment: any) => ({
          id: attachment.id,
          name: attachment.file_name,
          type: attachment.file_type ?? "",
          size: Number(attachment.file_size ?? 0),
          storagePath: normalizeStoragePath(attachment.storage_path, REPLACEMENT_STORAGE_BUCKET),
          storageBucket: REPLACEMENT_STORAGE_BUCKET,
          uploadedAt: attachment.uploaded_at ?? undefined,
        })),
      }));

      setReplacementRecords(mapped);
      startTransition(() => {
        prefetchAttachmentPreviews(
          mapped
            .slice(0, PREFETCH_RECORD_LIMIT)
            .flatMap((record) => record.attachments.slice(0, PREFETCH_PREVIEW_PER_RECORD)),
        );
      });
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดข้อมูลซื้อใหม่/ทดแทนได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  }, [prefetchAttachmentPreviews, toast]);

  const uploadReceiptAttachments = useCallback(
    async (receiptId: string, attachments: AttachmentMeta[]) => {
      const uploadedAttachments: AttachmentMeta[] = [];

      for (const attachment of attachments) {
        if (!attachment.file) {
          continue;
        }

        const sanitizedName = attachment.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const objectKey = `${receiptId}/${crypto.randomUUID()}-${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from(RECEIPT_STORAGE_BUCKET)
          .upload(objectKey, attachment.file, {
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) {
          throw uploadError;
        }

        const { error: insertError } = await inkDb.from("ink_attachments").insert({
          receipt_id: receiptId,
          file_name: attachment.name,
          file_type: attachment.type,
          file_size: attachment.size,
          storage_path: objectKey,
        });
        if (insertError) {
          throw insertError;
        }

        uploadedAttachments.push({
          ...attachment,
          storagePath: objectKey,
          storageBucket: RECEIPT_STORAGE_BUCKET,
        });
      }

      if (uploadedAttachments.length > 0) {
        startTransition(() => {
          prefetchAttachmentPreviews(uploadedAttachments);
        });
      }
    },
    [prefetchAttachmentPreviews],
  );

  const uploadMaintenanceAttachments = useCallback(
    async (maintenanceId: string, attachments: AttachmentMeta[]) => {
      const uploadedAttachments: AttachmentMeta[] = [];

      for (const attachment of attachments) {
        if (!attachment.file) continue;

        const sanitizedName = attachment.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const objectKey = `${maintenanceId}/${crypto.randomUUID()}-${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from(MAINTENANCE_STORAGE_BUCKET)
          .upload(objectKey, attachment.file, {
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) throw uploadError;

        const { error: insertError } = await inkDb.from("equipment_maintenance_attachments").insert({
          maintenance_id: maintenanceId,
          file_name: attachment.name,
          file_type: attachment.type,
          file_size: attachment.size,
          storage_path: objectKey,
        });
        if (insertError) throw insertError;

        uploadedAttachments.push({
          ...attachment,
          storagePath: objectKey,
          storageBucket: MAINTENANCE_STORAGE_BUCKET,
        });
      }

      if (uploadedAttachments.length > 0) {
        startTransition(() => {
          prefetchAttachmentPreviews(uploadedAttachments);
        });
      }
    },
    [prefetchAttachmentPreviews],
  );

  const uploadReplacementAttachments = useCallback(
    async (replacementId: string, attachments: AttachmentMeta[]) => {
      const uploadedAttachments: AttachmentMeta[] = [];

      for (const attachment of attachments) {
        if (!attachment.file) continue;

        const sanitizedName = attachment.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const objectKey = `${replacementId}/${crypto.randomUUID()}-${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from(REPLACEMENT_STORAGE_BUCKET)
          .upload(objectKey, attachment.file, {
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) throw uploadError;

        const { error: insertError } = await inkDb.from("equipment_replacement_attachments").insert({
          replacement_id: replacementId,
          file_name: attachment.name,
          file_type: attachment.type,
          file_size: attachment.size,
          storage_path: objectKey,
        });
        if (insertError) throw insertError;

        uploadedAttachments.push({
          ...attachment,
          storagePath: objectKey,
          storageBucket: REPLACEMENT_STORAGE_BUCKET,
        });
      }

      if (uploadedAttachments.length > 0) {
        startTransition(() => {
          prefetchAttachmentPreviews(uploadedAttachments);
        });
      }
    },
    [prefetchAttachmentPreviews],
  );

  const handleDeleteReceipt = useCallback(
    async (receipt: Receipt, reason: string) => {
      try {
        const adjustments = receipt.items.map((item) => ({
          inventory_id: item.productId,
          quantity: Number(item.quantity ?? 0),
        }));

        if (adjustments.length > 0) {
          await adjustInventoryForItems(adjustments, -1);
        }

        const { error: deleteItemsError } = await inkDb
          .from("ink_receipt_items")
          .delete()
          .eq("receipt_id", receipt.id);
        if (deleteItemsError) throw deleteItemsError;

        const { error: deleteReceiptError } = await inkDb.from("ink_receipts").delete().eq("id", receipt.id);
        if (deleteReceiptError) throw deleteReceiptError;

        await logReceiptChanges({
          receiptId: receipt.id,
          action: "DELETE",
          reason,
          before: receipt,
          after: null,
        });

        toast({
          title: "ลบใบลงรับสำเร็จ",
          description: `ลบเอกสาร ${receipt.documentNo} และปรับปรุงสต็อกเรียบร้อยแล้ว`,
        });

        setSelectedReceiptId((current) => (current === receipt.id ? null : current));
        await Promise.all([fetchReceipts(), fetchProducts()]);
      } catch (error) {
        const message = getErrorMessage(error);
        toast({
          title: "ไม่สามารถลบใบลงรับได้",
          description: message,
          variant: "destructive",
        });
      }
    },
    [adjustInventoryForItems, fetchProducts, fetchReceipts, logReceiptChanges],
  );

  const handleDeleteMaintenance = useCallback(
    async (record: MaintenanceRecord, reason: string) => {
      try {
        const { error } = await inkDb.from("equipment_maintenance").delete().eq("id", record.id);
        if (error) throw error;

        await logMaintenanceChanges({
          maintenanceId: record.id,
          action: "DELETE",
          reason,
          before: record,
          after: null,
        });

        toast({
          title: "ลบข้อมูลการซ่อมสำเร็จ",
          description: `ลบเอกสาร ${record.documentNo} เรียบร้อยแล้ว`,
        });

        await Promise.all([fetchMaintenanceRecords(), fetchEquipments()]);
      } catch (error) {
        toast({
          title: "ลบข้อมูลการซ่อมไม่สำเร็จ",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    },
    [fetchEquipments, fetchMaintenanceRecords, logMaintenanceChanges],
  );

  const handleDeleteReplacement = useCallback(
    async (record: ReplacementRecord, reason: string) => {
      try {
        const { error } = await inkDb.from("equipment_replacements").delete().eq("id", record.id);
        if (error) throw error;

        await logReplacementChanges({
          replacementId: record.id,
          action: "DELETE",
          reason,
          before: record,
          after: null,
        });

        toast({
          title: "ลบข้อมูลซื้อใหม่/ทดแทนสำเร็จ",
          description: `ลบเอกสาร ${record.documentNo} เรียบร้อยแล้ว`,
        });

        await Promise.all([fetchReplacementRecords(), fetchEquipments()]);
      } catch (error) {
        toast({
          title: "ลบข้อมูลซื้อใหม่/ทดแทนไม่สำเร็จ",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    },
    [fetchEquipments, fetchReplacementRecords, logReplacementChanges],
  );

  useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      setIsLoadingData(true);
      try {
        await Promise.all([fetchBrands(), fetchSuppliers(), fetchDepartments()]);
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }

      startTransition(() => {
        Promise.allSettled([
          fetchProducts(),
          fetchReceipts(),
          fetchEquipments(),
          fetchMaintenanceRecords(),
          fetchReplacementRecords(),
        ]);
      });
    };

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, [
    fetchBrands,
    fetchSuppliers,
    fetchDepartments,
    fetchProducts,
    fetchReceipts,
    fetchEquipments,
    fetchMaintenanceRecords,
    fetchReplacementRecords,
  ]);

  const brandUsage = useMemo(() => {
    const usage = new Map<string, number>();
    products.forEach((product) => {
      usage.set(product.brandId, (usage.get(product.brandId) ?? 0) + 1);
    });
    return usage;
  }, [products]);

  const filteredMaintenanceRecords = useMemo(() => {
    const keyword = maintenanceSearchTerm.trim().toLowerCase();
    if (!keyword) return maintenanceRecords;
    return maintenanceRecords.filter((record) => {
      const document = record.documentNo?.toLowerCase() ?? "";
      const dept = (record.departmentName ?? record.department ?? "").toLowerCase();
      return document.includes(keyword) || dept.includes(keyword);
    });
  }, [maintenanceRecords, maintenanceSearchTerm]);

  const filteredReplacementRecords = useMemo(() => {
    const keyword = replacementSearchTerm.trim().toLowerCase();
    if (!keyword) return replacementRecords;
    return replacementRecords.filter((record) => {
      const document = record.documentNo?.toLowerCase() ?? "";
      const dept = (record.departmentName ?? record.department ?? "").toLowerCase();
      return document.includes(keyword) || dept.includes(keyword);
    });
  }, [replacementRecords, replacementSearchTerm]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      if (filterSupplier !== "all" && receipt.supplierId !== filterSupplier) {
        return false;
      }

      if (filterYear !== "all" && !receipt.receivedAt.startsWith(filterYear)) {
        return false;
      }

      if (filterBrand === "all" && filterInkType === "all") {
        return true;
      }

      return receipt.items.some((item) => {
        const product = productById.get(item.productId);
        const brandId = product?.brandId ?? item.brandId ?? null;
        const inkType = product?.inkType ?? item.inkType ?? null;
        if (filterBrand !== "all" && brandId !== filterBrand) {
          return false;
        }
        if (filterInkType !== "all" && inkType !== filterInkType) {
          return false;
        }
        return true;
      });
    });
  }, [receipts, filterSupplier, filterYear, filterBrand, filterInkType, productById]);

  useEffect(() => {
    if (filteredReceipts.length === 0) {
      setSelectedReceiptId(null);
      return;
    }

    setSelectedReceiptId((current) => {
      if (current && filteredReceipts.some((receipt) => receipt.id === current)) {
        return current;
      }
      return filteredReceipts[0].id;
    });
  }, [filteredReceipts]);

  useEffect(() => {
    if (!isMaintenanceDialogOpen) {
      setMaintenanceEquipmentOpen(false);
      setMaintenanceDepartmentOpen(false);
    }
  }, [isMaintenanceDialogOpen]);

  useEffect(() => {
    if (!isReplacementDialogOpen) {
      setReplacementEquipmentOpen(false);
      setReplacementDepartmentOpen(false);
    }
  }, [isReplacementDialogOpen]);

  const groupedReceipts = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        label: string;
        receipts: Receipt[];
      }
    >();

    filteredReceipts.forEach((receipt) => {
      const monthKey = receipt.receivedAt ? receipt.receivedAt.slice(0, 7) : "unknown";
      const baseDate = new Date(`${monthKey}-01T00:00:00`);
      const label = Number.isNaN(baseDate.valueOf())
        ? "ไม่ทราบเดือน"
        : baseDate.toLocaleDateString("th-TH", { year: "numeric", month: "long" });

      const existing = groups.get(monthKey);
      if (existing) {
        existing.receipts.push(receipt);
      } else {
        groups.set(monthKey, {
          key: monthKey,
          label,
          receipts: [receipt],
        });
      }
    });

    const result = Array.from(groups.values());
    result.sort((a, b) => (a.key > b.key ? -1 : 1));
    result.forEach((group) => {
      group.receipts.sort((a, b) => (a.receivedAt > b.receivedAt ? -1 : 1));
    });

    return result;
  }, [filteredReceipts]);

  const selectedReceipt = useMemo(
    () => filteredReceipts.find((receipt) => receipt.id === selectedReceiptId) ?? null,
    [filteredReceipts, selectedReceiptId],
  );

  const brandTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const receipt of filteredReceipts) {
      for (const item of receipt.items) {
        const product = productById.get(item.productId);
        const brandId = product?.brandId ?? item.brandId;
        if (!brandId) continue;
        const current = totals.get(brandId) ?? 0;
        totals.set(brandId, current + getLineTotal(item));
      }
    }

    const data = Array.from(totals.entries()).map(([brandId, value]) => ({
      brandId,
      name: brandById.get(brandId)?.name ?? "ไม่ทราบยี่ห้อ",
      value,
    }));

    return data.length ? data : brands.map((brand) => ({ brandId: brand.id, name: brand.name, value: 0 }));
  }, [filteredReceipts, productById, brandById, brands]);

  const supplierTotals = useMemo(() => {
    const totals = new Map<string, { value: number; quantity: number }>();

    for (const receipt of filteredReceipts) {
      let receiptTotal = 0;
      let quantityTotal = 0;

      for (const item of receipt.items) {
        receiptTotal += getLineTotal(item);
      quantityTotal += item.quantity ?? 0;
      }

      const current = totals.get(receipt.supplierId) ?? { value: 0, quantity: 0 };
      totals.set(receipt.supplierId, {
        value: current.value + receiptTotal,
        quantity: current.quantity + quantityTotal,
      });
    }

    return Array.from(totals.entries()).map(([supplierId, detail]) => ({
      supplierId,
      supplier: supplierById.get(supplierId)?.name ?? "ไม่ทราบผู้ขาย",
      value: detail.value,
      quantity: detail.quantity,
    }));
  }, [filteredReceipts, supplierById]);

  const trendData = useMemo(() => {
    const timeline = new Map<string, number>();

    for (const receipt of filteredReceipts) {
      const monthKey = receipt.receivedAt.slice(0, 7);
      let monthTotal = timeline.get(monthKey) ?? 0;

      for (const item of receipt.items) {
        monthTotal += getLineTotal(item);
      }

      timeline.set(monthKey, monthTotal);
    }

    const sorted = Array.from(timeline.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, value]) => ({ month, value }));

    return sorted.length ? sorted : [{ month: "ยังไม่มีข้อมูล", value: 0 }];
  }, [filteredReceipts]);

  const maintenanceStatusSummary = useMemo(() => {
    const summary = new Map<MaintenanceStatus, number>();
    MAINTENANCE_STATUSES.forEach((status) => summary.set(status, 0));

    maintenanceRecords.forEach((record) => {
      const status = record.status as MaintenanceStatus;
      summary.set(status, (summary.get(status) ?? 0) + 1);
    });

    return MAINTENANCE_STATUSES.map((status) => ({
      status,
      count: summary.get(status) ?? 0,
    }));
  }, [maintenanceRecords]);

  const maintenanceSupplierTotals = useMemo(() => {
    const totals = new Map<string, number>();
    maintenanceRecords.forEach((record) => {
      const supplier = record.supplierName ?? "ไม่ระบุผู้ให้บริการ";
      totals.set(supplier, (totals.get(supplier) ?? 0) + record.cost);
    });
    return Array.from(totals.entries()).map(([supplier, value]) => ({
      supplier,
      value,
    }));
  }, [maintenanceRecords]);

  const maintenanceDepartmentSummary = useMemo(() => {
    const summary = new Map<string, { count: number; cost: number }>();
    maintenanceRecords.forEach((record) => {
      const departmentName = record.departmentName ?? record.department ?? "ไม่ระบุ";
      const current = summary.get(departmentName) ?? { count: 0, cost: 0 };
      current.count += 1;
      current.cost += record.cost;
      summary.set(departmentName, current);
    });
    return Array.from(summary.entries())
      .map(([department, value]) => ({ department, count: value.count, totalCost: value.cost }))
      .sort((a, b) => b.count - a.count || b.totalCost - a.totalCost);
  }, [maintenanceRecords]);

  const maintenanceTrendData = useMemo(() => {
    const timeline = new Map<string, number>();
    maintenanceRecords.forEach((record) => {
      const key =
        record.sentAt && record.sentAt.length >= 7 ? record.sentAt.slice(0, 7) : "ไม่ระบุเดือน";
      timeline.set(key, (timeline.get(key) ?? 0) + record.cost);
    });
    return Array.from(timeline.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, value]) => ({ month, value }));
  }, [maintenanceRecords]);

  const maintenanceTotalCost = useMemo(
    () => maintenanceRecords.reduce((sum, record) => sum + record.cost, 0),
    [maintenanceRecords],
  );

  const replacementStatusSummary = useMemo(() => {
    const summary = new Map<ReplacementStatus, number>([
      ["planned", 0],
      ["ordered", 0],
      ["received", 0],
    ]);

    replacementRecords.forEach((record) => {
      summary.set(record.status, (summary.get(record.status) ?? 0) + 1);
    });

    return Array.from(summary.entries()).map(([status, count]) => ({
      status,
      count,
    }));
  }, [replacementRecords]);

  const replacementSupplierTotals = useMemo(() => {
    const totals = new Map<string, number>();
    replacementRecords.forEach((record) => {
      const supplier = record.supplierName ?? "ไม่ระบุผู้ขาย";
      totals.set(supplier, (totals.get(supplier) ?? 0) + record.cost);
    });
    return Array.from(totals.entries()).map(([supplier, value]) => ({
      supplier,
      value,
    }));
  }, [replacementRecords]);

  const replacementDepartmentSummary = useMemo(() => {
    const summary = new Map<string, { count: number; cost: number }>();
    replacementRecords.forEach((record) => {
      const departmentName = record.departmentName ?? record.department ?? "ไม่ระบุ";
      const current = summary.get(departmentName) ?? { count: 0, cost: 0 };
      current.count += 1;
      current.cost += record.cost;
      summary.set(departmentName, current);
    });
    return Array.from(summary.entries())
      .map(([department, value]) => ({ department, count: value.count, totalCost: value.cost }))
      .sort((a, b) => b.count - a.count || b.totalCost - a.totalCost);
  }, [replacementRecords]);

  const replacementTrendData = useMemo(() => {
    const timeline = new Map<string, number>();
    replacementRecords.forEach((record) => {
      const key =
        record.orderDate && record.orderDate.length >= 7 ? record.orderDate.slice(0, 7) : "ไม่ระบุเดือน";
      timeline.set(key, (timeline.get(key) ?? 0) + record.cost);
    });
    return Array.from(timeline.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, value]) => ({ month, value }));
  }, [replacementRecords]);

  const replacementTotalCost = useMemo(
    () => replacementRecords.reduce((sum, record) => sum + record.cost, 0),
    [replacementRecords],
  );

  const maintenancePlannedCount = maintenanceStatusSummary.find((item) => item.status === "planned")?.count ?? 0;
  const maintenanceInProgressCount =
    maintenanceStatusSummary.find((item) => item.status === "in_progress")?.count ?? 0;
  const maintenanceCompletedCount =
    maintenanceStatusSummary.find((item) => item.status === "completed")?.count ?? 0;
  const maintenanceNotWorthRepairCount =
    maintenanceStatusSummary.find((item) => item.status === "not_worth_repair")?.count ?? 0;
  const maintenanceDisposedCount = maintenanceStatusSummary.find((item) => item.status === "disposed")?.count ?? 0;
  const maintenancePendingDisposalCount =
    maintenanceStatusSummary.find((item) => item.status === "pending_disposal")?.count ?? 0;

  const replacementPlannedCount = replacementStatusSummary.find((item) => item.status === "planned")?.count ?? 0;
  const replacementOrderedCount = replacementStatusSummary.find((item) => item.status === "ordered")?.count ?? 0;
  const replacementReceivedCount = replacementStatusSummary.find((item) => item.status === "received")?.count ?? 0;

  const getMaintenanceStatusVariant = (status: MaintenanceStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "pending_disposal":
        return "secondary";
      case "not_worth_repair":
      case "disposed":
        return "destructive";
      case "planned":
      default:
        return "outline";
    }
  };

  const getReplacementStatusVariant = (status: ReplacementStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "received":
        return "default";
      case "ordered":
        return "secondary";
      case "planned":
      default:
        return "outline";
    }
  };

  const productSummary = useMemo(() => {
    return products.map((product) => {
      const outstanding = product.stockQuantity <= product.reorderPoint;
      const brandName = brandById.get(product.brandId)?.name ?? "ไม่ทราบยี่ห้อ";

      return {
        ...product,
        brandName,
        outstanding,
      };
    });
  }, [products, brandById]);

  const deleteDialogDetails = useMemo<DeleteDialogDetails | null>(() => {
    if (!deleteTarget) {
      return null;
    }

    if (deleteTarget.type === "product") {
      const product = productById.get(deleteTarget.id);
      const receiptCount = receipts.filter((receipt) =>
        receipt.items.some((item) => item.productId === deleteTarget.id),
      ).length;

      return {
        title: product ? `ลบสินค้า ${product.modelCode}` : "ลบสินค้า",
        description:
          receiptCount > 0
            ? `การลบจะนำสินค้านี้ออกจากใบลงรับจำนวน ${receiptCount} รายการด้วย คุณต้องการดำเนินการต่อหรือไม่?`
            : "การลบจะนำสินค้านี้ออกจากระบบ คุณต้องการดำเนินการต่อหรือไม่?",
        confirmLabel: "ลบสินค้า",
      } satisfies DeleteDialogDetails;
    }

    if (deleteTarget.type === "supplier") {
      const supplier = supplierById.get(deleteTarget.id);
      const receiptCount = receipts.filter((receipt) => receipt.supplierId === deleteTarget.id).length;
      return {
        title: supplier ? `ลบผู้ขาย ${supplier.name}` : "ลบผู้ขาย",
        description:
          receiptCount > 0
            ? `การลบจะลบใบลงรับที่เกี่ยวข้องจำนวน ${receiptCount} ใบออกจากระบบด้วย ต้องการดำเนินการต่อหรือไม่?`
            : "การลบจะนำผู้ขายนี้ออกจากระบบ คุณต้องการดำเนินการต่อหรือไม่?",
        confirmLabel: "ลบผู้ขาย",
      } satisfies DeleteDialogDetails;
    }

    const brand = brandById.get(deleteTarget.id);
    const relatedProducts = products.filter((product) => product.brandId === deleteTarget.id);
    const relatedProductIds = relatedProducts.map((product) => product.id);
    const receiptCount = receipts.filter((receipt) =>
      receipt.items.some((item) => relatedProductIds.includes(item.productId)),
    ).length;

    return {
      title: brand ? `ลบยี่ห้อ ${brand.name}` : "ลบยี่ห้อ",
      description:
        relatedProducts.length > 0 || receiptCount > 0
          ? `การลบยี่ห้อนี้จะนำสินค้าที่เกี่ยวข้องจำนวน ${relatedProducts.length} รายการ และลบออกจากใบลงรับ ${receiptCount} รายการด้วย คุณต้องการดำเนินการต่อหรือไม่?`
          : "การลบจะนำยี่ห้อนี้ออกจากระบบ คุณต้องการดำเนินการต่อหรือไม่?",
      confirmLabel: "ลบยี่ห้อ",
    } satisfies DeleteDialogDetails;
  }, [deleteTarget, productById, supplierById, brandById, products, receipts]);

  const totalInventoryValue = useMemo(() => {
    let sum = 0;
    for (const product of products) {
      const recentPrice =
        receipts
          .flatMap((receipt) => receipt.items.filter((item) => item.productId === product.id))
          .map((item) => item.unitPrice)
          .pop() ?? 0;

      sum += product.stockQuantity * recentPrice;
    }
    return sum;
  }, [products, receipts]);

  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    receipts.forEach((receipt) => {
      if (receipt.receivedAt) {
        years.add(receipt.receivedAt.slice(0, 4));
      }
    });
    return Array.from(years).sort();
  }, [receipts]);

  const handleSubmitBrand = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = brandName.trim();
    if (!trimmed) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาระบุชื่อยี่ห้อสินค้า",
        variant: "destructive",
      });
      return;
    }

    if (
      brands.some(
        (brand) => brand.name.toLowerCase() === trimmed.toLowerCase() && brand.id !== editingBrandId,
      )
    ) {
      toast({
        title: "ข้อมูลซ้ำ",
        description: "มียี่ห้อนี้ในระบบแล้ว",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "ต้องเข้าสู่ระบบ",
        description: "กรุณาเข้าสู่ระบบก่อนบันทึกยี่ห้อ",
        variant: "destructive",
      });
      return;
    }

    try {
      if (brandDialogMode === "edit" && editingBrandId) {
        const { error } = await inkDb
          .from("ink_brands")
          .update({ name: trimmed })
          .eq("id", editingBrandId);
        if (error) throw error;
        toast({
          title: "แก้ไขสำเร็จ",
          description: `อัปเดตยี่ห้อ ${trimmed} เรียบร้อยแล้ว`,
        });
      } else {
        const { error } = await inkDb.from("ink_brands").insert({ name: trimmed });
        if (error) throw error;
        toast({
          title: "บันทึกสำเร็จ",
          description: `เพิ่มยี่ห้อ ${trimmed} เรียบร้อยแล้ว`,
        });
      }

      await Promise.all([fetchBrands(), fetchProducts(), fetchReceipts()]);
      setBrandDialogOpen(false);
      resetBrandForm();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `บันทึกยี่ห้อไม่สำเร็จ: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  };

  const handleSubmitSupplier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = supplierForm.name.trim();
    if (!trimmedName) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาระบุชื่อผู้ขาย",
        variant: "destructive",
      });
      return;
    }

    const payload: Supplier = {
      id: editingSupplierId ?? generateId("supplier"),
      name: trimmedName,
      taxId: supplierForm.taxId.trim() || undefined,
      address: supplierForm.address.trim() || undefined,
      phone: supplierForm.phone.trim() || undefined,
      email: supplierForm.email.trim() || undefined,
    };

    try {
      if (supplierDialogMode === "edit" && editingSupplierId) {
        const { error } = await inkDb
          .from("ink_suppliers")
          .update({
            name: trimmedName,
            tax_id: payload.taxId ?? null,
            address: payload.address ?? null,
            phone: payload.phone ?? null,
            email: payload.email ?? null,
          })
          .eq("id", editingSupplierId);
        if (error) throw error;
        toast({
          title: "แก้ไขสำเร็จ",
          description: `อัปเดตข้อมูลผู้ขาย ${trimmedName} เรียบร้อยแล้ว`,
        });
      } else {
        const { error } = await inkDb.from("ink_suppliers").insert({
          name: trimmedName,
          tax_id: payload.taxId ?? null,
          address: payload.address ?? null,
          phone: payload.phone ?? null,
          email: payload.email ?? null,
        });
        if (error) throw error;
        toast({
          title: "บันทึกสำเร็จ",
          description: `เพิ่มผู้ขาย ${trimmedName} เรียบร้อยแล้ว`,
        });
      }

      await Promise.all([fetchSuppliers(), fetchReceipts()]);
      setSupplierDialogOpen(false);
      resetSupplierForm();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `บันทึกข้อมูลผู้ขายไม่สำเร็จ: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  };

  const handleSubmitProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const brandId = productForm.brandId;
    const modelCode = productForm.modelCode.trim();
    const skuValue = productForm.sku.trim();
    const descriptionValue = productForm.description.trim();
    const unitValue = productForm.unit.trim() || "ชิ้น";
    const stockQuantityValue = Number(productForm.stockQuantity) || 0;
    const reorderPointValue = Number(productForm.reorderPoint) || 0;

    if (!brandId || !modelCode || !skuValue) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาระบุยี่ห้อ รุ่น และรหัสสินค้า",
        variant: "destructive",
      });
      return;
    }

    try {
      if (productDialogMode === "edit" && editingProductId) {
        let targetModelId = editingProductModelId;
        if (!targetModelId) {
          const { data: existingInventory, error: inventoryError } = await inkDb
            .from("ink_inventory")
            .select("model_id")
            .eq("id", editingProductId)
            .single();
          if (inventoryError) throw inventoryError;
          targetModelId = existingInventory?.model_id ?? null;
        }

        if (!targetModelId) {
          throw new Error("ไม่พบข้อมูลรุ่นสินค้าสำหรับรายการนี้");
        }

        const { error: updateModelError } = await inkDb
          .from("ink_models")
          .update({
            brand_id: brandId,
            code: modelCode,
            material_type: productForm.inkType,
            description: descriptionValue || null,
          })
          .eq("id", targetModelId);
        if (updateModelError) throw updateModelError;

        const { error: updateInventoryError } = await inkDb
          .from("ink_inventory")
          .update({
            sku: skuValue,
            unit: unitValue,
            stock_quantity: stockQuantityValue,
            reorder_point: reorderPointValue,
            notes: descriptionValue || null,
          })
          .eq("id", editingProductId);
        if (updateInventoryError) throw updateInventoryError;

        toast({
          title: "แก้ไขสำเร็จ",
          description: `อัปเดตข้อมูล ${modelCode} เรียบร้อยแล้ว`,
        });
      } else {
        let modelId: string | null = null;
        const { data: existingModel, error: existingModelError } = await inkDb
          .from("ink_models")
          .select("id")
          .eq("brand_id", brandId)
          .eq("code", modelCode)
          .maybeSingle();
        if (existingModelError) throw existingModelError;

        if (existingModel) {
          modelId = existingModel.id;
        } else {
          const { data: newModel, error: insertModelError } = await inkDb
            .from("ink_models")
            .insert({
              brand_id: brandId,
              code: modelCode,
              material_type: productForm.inkType,
              description: descriptionValue || null,
            })
            .select("id")
            .single();
          if (insertModelError) throw insertModelError;
          modelId = newModel.id;
        }

        const { error: insertInventoryError } = await inkDb.from("ink_inventory").insert({
          model_id: modelId,
          sku: skuValue,
          unit: unitValue,
          stock_quantity: stockQuantityValue,
          reorder_point: reorderPointValue,
          notes: descriptionValue || null,
        });
        if (insertInventoryError) throw insertInventoryError;

        toast({
          title: "บันทึกสำเร็จ",
          description: "เพิ่มข้อมูลเรียบร้อยแล้ว",
        });
      }

      await Promise.all([fetchProducts(), fetchBrands(), fetchReceipts()]);
      setProductDialogOpen(false);
      resetProductForm();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `บันทึกข้อมูลสินค้าไม่สำเร็จ: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  };

  const handleReceiptItemChange = (
    itemId: string,
    field: keyof ReceiptItem,
    value: string | number,
  ) => {
    setReceiptForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item;

        if (field === "quantity" || field === "unitPrice") {
          let parsed: number | null;
          if (typeof value === "number") {
            parsed = Number.isFinite(value) ? value : null;
          } else {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
              parsed = null;
            } else {
              const num = Number(trimmed);
              parsed = Number.isFinite(num) ? num : null;
            }
          }
          if (parsed !== null && parsed < 0) {
            parsed = 0;
          }
          return {
            ...item,
            [field]: parsed,
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    }));
  };

  const handleAddReceiptItemRow = () => {
    setReceiptForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: generateId("item"),
          productId: "",
          quantity: null,
          unitPrice: null,
          unit: "ชิ้น",
        },
      ],
    }));
  };

  const handleRemoveReceiptItemRow = (id: string) => {
    setReceiptForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.id !== id) : prev.items,
    }));
  };

  const handleReceiptAttachments = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    try {
      const attachments = await transformFilesToAttachmentMeta(files);
      setReceiptForm((prev) => {
        if (prev.attachments.length > 0) {
          releaseAttachmentCollection(prev.attachments);
        }

        return {
          ...prev,
          attachments,
        };
      });
    } catch (error) {
      toast({
        title: "ประมวลผลไฟล์ไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleMaintenanceAttachments = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    const imageFiles = selectedFiles.filter(isImageFile);
    const limitedFiles = imageFiles.slice(0, MAX_IMAGE_ATTACHMENTS);

    if (selectedFiles.length > 0 && imageFiles.length === 0) {
      toast({
        title: "ไม่สามารถแนบไฟล์ได้",
        description: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น",
        variant: "destructive",
      });
    } else {
      if (imageFiles.length < selectedFiles.length) {
        toast({
          title: "ไฟล์บางรายการไม่ได้ถูกแนบ",
          description: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น",
          variant: "destructive",
        });
      }

      if (imageFiles.length > MAX_IMAGE_ATTACHMENTS) {
        toast({
          title: `แนบรูปภาพได้สูงสุด ${MAX_IMAGE_ATTACHMENTS} ไฟล์`,
          description: `ระบบจะเก็บเฉพาะ ${MAX_IMAGE_ATTACHMENTS} รูปภาพแรก`,
        });
      }
    }

    try {
      const attachments = await transformFilesToAttachmentMeta(limitedFiles);
      setMaintenanceForm((prev) => {
        if (prev.attachments.length > 0) {
          releaseAttachmentCollection(prev.attachments);
        }

        return {
          ...prev,
          attachments,
        };
      });
    } catch (error) {
      toast({
        title: "ประมวลผลไฟล์ไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleReplacementAttachments = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    const imageFiles = selectedFiles.filter(isImageFile);
    const limitedFiles = imageFiles.slice(0, MAX_IMAGE_ATTACHMENTS);

    if (selectedFiles.length > 0 && imageFiles.length === 0) {
      toast({
        title: "ไม่สามารถแนบไฟล์ได้",
        description: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น",
        variant: "destructive",
      });
    } else {
      if (imageFiles.length < selectedFiles.length) {
        toast({
          title: "ไฟล์บางรายการไม่ได้ถูกแนบ",
          description: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น",
          variant: "destructive",
        });
      }

      if (imageFiles.length > MAX_IMAGE_ATTACHMENTS) {
        toast({
          title: `แนบรูปภาพได้สูงสุด ${MAX_IMAGE_ATTACHMENTS} ไฟล์`,
          description: `ระบบจะเก็บเฉพาะ ${MAX_IMAGE_ATTACHMENTS} รูปภาพแรก`,
        });
      }
    }

    try {
      const attachments = await transformFilesToAttachmentMeta(limitedFiles);
      setReplacementForm((prev) => {
        if (prev.attachments.length > 0) {
          releaseAttachmentCollection(prev.attachments);
        }

        return {
          ...prev,
          attachments,
        };
      });
    } catch (error) {
      toast({
        title: "ประมวลผลไฟล์ไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setProductDialogMode("edit");
    setEditingProductId(product.id);
    setEditingProductModelId(product.modelId);
    setProductForm({
      brandId: product.brandId,
      inkType: product.inkType,
      modelCode: product.modelCode,
      description: product.description ?? "",
      sku: product.sku,
      unit: product.unit,
      stockQuantity: product.stockQuantity,
      reorderPoint: product.reorderPoint,
    });
    setProductDialogOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSupplierDialogMode("edit");
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      name: supplier.name,
      taxId: supplier.taxId ?? "",
      address: supplier.address ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
    });
    setSupplierDialogOpen(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setBrandDialogMode("edit");
    setEditingBrandId(brand.id);
    setBrandName(brand.name);
    setBrandDialogOpen(true);
  };

  const openDeleteDialog = (type: "product" | "supplier" | "brand", id: string) => {
    setDeleteTarget({ type, id });
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) {
      return;
    }

    const { type, id } = deleteTarget;

    if (type === "product") {
      try {
      const { error } = await inkDb.from("ink_inventory").delete().eq("id", id);
        if (error) {
          if (error.code === "23503") {
            toast({
              title: "ไม่สามารถลบได้",
              description: "ไม่สามารถลบสินค้าที่ถูกใช้งานในใบลงรับได้",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "ลบสำเร็จ",
            description: "นำสินค้าออกจากระบบแล้ว",
          });
          await Promise.all([fetchProducts(), fetchReceipts()]);
        }
      } catch (error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: `ลบข้อมูลสินค้าไม่สำเร็จ: ${getErrorMessage(error)}`,
          variant: "destructive",
        });
      }
      handleCloseDeleteDialog();
      return;
    }

    if (type === "supplier") {
      try {
      const { error } = await inkDb.from("ink_suppliers").delete().eq("id", id);
        if (error) {
          if (error.code === "23503") {
            toast({
              title: "ไม่สามารถลบได้",
              description: "ผู้ขายนี้ยังถูกใช้งานอยู่ในใบลงรับ",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "ลบสำเร็จ",
            description: "นำผู้ขายออกจากระบบแล้ว",
          });
          if (filterSupplier === id) {
            setFilterSupplier("all");
          }
          await Promise.all([fetchSuppliers(), fetchReceipts()]);
        }
      } catch (error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: `ลบข้อมูลผู้ขายไม่สำเร็จ: ${getErrorMessage(error)}`,
          variant: "destructive",
        });
      }
      handleCloseDeleteDialog();
      return;
    }

    try {
      const { error } = await inkDb.from("ink_brands").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") {
          toast({
            title: "ไม่สามารถลบได้",
            description: "ยังมีสินค้าที่ใช้ยี่ห้อนี้อยู่",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "ลบสำเร็จ",
          description: "นำยี่ห้อออกจากระบบแล้ว",
        });
        if (filterBrand === id) {
          setFilterBrand("all");
        }
        await Promise.all([fetchBrands(), fetchProducts(), fetchReceipts()]);
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ลบยี่ห้อไม่สำเร็จ: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
    handleCloseDeleteDialog();
  };

  const handleOpenCreateReceiptDialog = () => {
    releaseAttachmentCollection(receiptForm.attachments);
    resetReceiptFormState();
    setReceiptDialogMode("create");
    setReceiptDialogOpen(true);
  };

  const handleOpenAttachmentInNewTab = useCallback((url: string | undefined) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleUpdateMaintenanceStatus = useCallback(
    async (record: MaintenanceRecord, newStatus: MaintenanceStatus) => {
      if (newStatus === record.status) {
        toast({
          title: "สถานะเดิมอยู่แล้ว",
          description: `เอกสาร ${record.documentNo} อยู่ในสถานะ ${MAINTENANCE_STATUS_LABELS[newStatus]} อยู่แล้ว`,
        });
        return;
      }

      try {
        setUpdatingMaintenanceStatusId(record.id);
        const { error } = await inkDb
          .from("equipment_maintenance")
          .update({ status: newStatus })
          .eq("id", record.id);
        if (error) throw error;

        const updatedDraft = convertMaintenanceToDraft({ ...record, status: newStatus });
        await logMaintenanceChanges({
          maintenanceId: record.id,
          action: "UPDATE",
          reason: `อัปเดตสถานะผ่านหน้าแดชบอร์ด`,
          before: record,
          after: updatedDraft,
        });

        toast({
          title: "อัปเดตสถานะแล้ว",
          description: `เอกสาร ${record.documentNo} เปลี่ยนเป็นสถานะ ${MAINTENANCE_STATUS_LABELS[newStatus]}`,
        });

        await fetchMaintenanceRecords();
      } catch (error) {
        toast({
          title: "อัปเดตสถานะไม่สำเร็จ",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        setUpdatingMaintenanceStatusId(null);
      }
    },
    [convertMaintenanceToDraft, fetchMaintenanceRecords, logMaintenanceChanges, toast],
  );

  const transformFilesToAttachmentMeta = useCallback(async (files: File[]) => {
    const attachments = await Promise.all(
      files.map(async (originalFile) => {
        let processedFile = originalFile;
        if (isImageFile(originalFile)) {
          processedFile = await compressImageFile(originalFile);
        }
        return {
          name: processedFile.name,
          size: processedFile.size,
          type: processedFile.type,
          file: processedFile,
          previewUrl: URL.createObjectURL(processedFile),
        };
      }),
    );

    return attachments;
  }, []);

  const closeSensitiveDialog = useCallback(() => {
    setSensitiveDialogOpen(false);
    setSensitivePassword("");
    setSensitiveReason("");
    setSensitiveActionType(null);
    setSensitiveEntityType(null);
    setSensitiveEntityId(null);
  }, []);

  const imageViewerAttachments = useMemo(
    () => viewerAttachments.filter((attachment) => isImageAttachment(attachment)),
    [viewerAttachments],
  );
  const documentViewerAttachments = useMemo(
    () => viewerAttachments.filter((attachment) => !isImageAttachment(attachment)),
    [viewerAttachments],
  );

  const openSensitiveAction = useCallback(
    (entityType: EntityType, type: SensitiveActionType, id: string) => {
      setSensitiveActionType(type);
      setSensitiveEntityType(entityType);
      setSensitiveEntityId(id);
      setSensitivePassword("");
      setSensitiveReason("");
      setSensitiveDialogOpen(true);
    },
    [],
  );

  const resetMaintenanceDocumentSelection = useCallback(() => {
    setMaintenanceDocumentFile((prev) => {
      if (prev) {
        releaseAttachmentPreview(prev);
      }
      return null;
    });
    setMaintenanceDocumentImages((prev) => {
      if (prev.length > 0) {
        releaseAttachmentCollection(prev);
      }
      return [];
    });
  }, []);

  const openMaintenanceDocumentDialog = useCallback(
    (record: MaintenanceRecord) => {
      resetMaintenanceDocumentSelection();
      setMaintenanceDocumentTarget(record);
      setUploadingMaintenanceDocument(false);
      setMaintenanceDocumentDialogOpen(true);
    },
    [resetMaintenanceDocumentSelection],
  );

  const closeMaintenanceDocumentDialog = useCallback(() => {
    setMaintenanceDocumentDialogOpen(false);
    setMaintenanceDocumentTarget(null);
    setUploadingMaintenanceDocument(false);
    resetMaintenanceDocumentSelection();
  }, [resetMaintenanceDocumentSelection]);

  const resetReplacementDocumentSelection = useCallback(() => {
    setReplacementDocumentFile((prev) => {
      if (prev) {
        releaseAttachmentPreview(prev);
      }
      return null;
    });
    setReplacementDocumentImages((prev) => {
      if (prev.length > 0) {
        releaseAttachmentCollection(prev);
      }
      return [];
    });
  }, []);

  const openReplacementDocumentDialog = useCallback(
    (record: ReplacementRecord) => {
      resetReplacementDocumentSelection();
      setReplacementDocumentTarget(record);
      setUploadingReplacementDocument(false);
      setReplacementDocumentDialogOpen(true);
    },
    [resetReplacementDocumentSelection],
  );

  const closeReplacementDocumentDialog = useCallback(() => {
    setReplacementDocumentDialogOpen(false);
    setReplacementDocumentTarget(null);
    setUploadingReplacementDocument(false);
    resetReplacementDocumentSelection();
  }, [resetReplacementDocumentSelection]);

  const handleMaintenanceDocumentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setMaintenanceDocumentFile((prev) => {
      if (prev) {
        releaseAttachmentPreview(prev);
      }
      return null;
    });

    if (!file) {
      event.target.value = "";
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
    if (!isPdf) {
      toast({
        title: "รูปแบบไฟล์ไม่ถูกต้อง",
        description: "รองรับเฉพาะไฟล์ PDF สำหรับเอกสาร",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setMaintenanceDocumentFile({
      name: file.name,
      size: file.size,
      type: file.type || "application/pdf",
      file,
      previewUrl: URL.createObjectURL(file),
    });
    event.target.value = "";
  };

  const handleMaintenanceDocumentImagesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    setMaintenanceDocumentImages((prev) => {
      if (prev.length > 0) {
        releaseAttachmentCollection(prev);
      }
      return [];
    });

    if (selectedFiles.length === 0) {
      return;
    }

    const imageFiles = selectedFiles.filter(isImageFile);
    if (selectedFiles.length > 0 && imageFiles.length === 0) {
      toast({
        title: "ไม่สามารถแนบไฟล์ได้",
        description: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น",
        variant: "destructive",
      });
      return;
    }

    if (imageFiles.length < selectedFiles.length) {
      toast({
        title: "ไฟล์บางรายการไม่ได้ถูกแนบ",
        description: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น",
        variant: "destructive",
      });
    }

    if (imageFiles.length > MAX_IMAGE_ATTACHMENTS) {
      toast({
        title: `แนบรูปภาพได้สูงสุด ${MAX_IMAGE_ATTACHMENTS} ไฟล์`,
        description: `ระบบจะเก็บเฉพาะ ${MAX_IMAGE_ATTACHMENTS} รูปภาพแรก`,
      });
    }

    const limitedFiles = imageFiles.slice(0, MAX_IMAGE_ATTACHMENTS);
    try {
      const attachments = await transformFilesToAttachmentMeta(limitedFiles);
      setMaintenanceDocumentImages(attachments);
    } catch (error) {
      toast({
        title: "ประมวลผลรูปภาพไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleSubmitMaintenanceDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!maintenanceDocumentTarget) {
      toast({
        title: "ไม่พบเอกสารซ่อม",
        description: "กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
      return;
    }

    const attachmentsToUpload: AttachmentMeta[] = [
      ...(maintenanceDocumentFile ? [maintenanceDocumentFile] : []),
      ...maintenanceDocumentImages,
    ];

    if (attachmentsToUpload.length === 0) {
      toast({
        title: "ยังไม่ได้เลือกไฟล์",
        description: "กรุณาเลือกไฟล์เอกสาร PDF หรือรูปภาพอย่างน้อย 1 ไฟล์",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingMaintenanceDocument(true);
      await uploadMaintenanceAttachments(maintenanceDocumentTarget.id, attachmentsToUpload);
      toast({
        title: "เพิ่มเอกสารสำเร็จ",
        description: `แนบไฟล์ให้เอกสาร ${maintenanceDocumentTarget.documentNo} เรียบร้อยแล้ว`,
      });
      await fetchMaintenanceRecords();
      closeMaintenanceDocumentDialog();
    } catch (error) {
      toast({
        title: "เพิ่มเอกสารไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setUploadingMaintenanceDocument(false);
    }
  };

  const handleReplacementDocumentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setReplacementDocumentFile((prev) => {
      if (prev) {
        releaseAttachmentPreview(prev);
      }
      return null;
    });

    if (!file) {
      event.target.value = "";
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
    if (!isPdf) {
      toast({
        title: "รูปแบบไฟล์ไม่ถูกต้อง",
        description: "รองรับเฉพาะไฟล์ PDF สำหรับเอกสาร",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setReplacementDocumentFile({
      name: file.name,
      size: file.size,
      type: file.type || "application/pdf",
      file,
      previewUrl: URL.createObjectURL(file),
    });
    event.target.value = "";
  };

  const handleReplacementDocumentImagesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    setReplacementDocumentImages((prev) => {
      if (prev.length > 0) {
        releaseAttachmentCollection(prev);
      }
      return [];
    });

    if (selectedFiles.length === 0) {
      return;
    }

    const imageFiles = selectedFiles.filter(isImageFile);
    if (selectedFiles.length > 0 && imageFiles.length === 0) {
      toast({
        title: "ไม่สามารถแนบไฟล์ได้",
        description: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น",
        variant: "destructive",
      });
      return;
    }

    if (imageFiles.length < selectedFiles.length) {
      toast({
        title: "ไฟล์บางรายการไม่ได้ถูกแนบ",
        description: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น",
        variant: "destructive",
      });
    }

    if (imageFiles.length > MAX_IMAGE_ATTACHMENTS) {
      toast({
        title: `แนบรูปภาพได้สูงสุด ${MAX_IMAGE_ATTACHMENTS} ไฟล์`,
        description: `ระบบจะเก็บเฉพาะ ${MAX_IMAGE_ATTACHMENTS} รูปภาพแรก`,
      });
    }

    const limitedFiles = imageFiles.slice(0, MAX_IMAGE_ATTACHMENTS);
    try {
      const attachments = await transformFilesToAttachmentMeta(limitedFiles);
      setReplacementDocumentImages(attachments);
    } catch (error) {
      toast({
        title: "ประมวลผลรูปภาพไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleSubmitReplacementDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!replacementDocumentTarget) {
      toast({
        title: "ไม่พบเอกสารซื้อใหม่/ทดแทน",
        description: "กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
      return;
    }

    const attachmentsToUpload: AttachmentMeta[] = [
      ...(replacementDocumentFile ? [replacementDocumentFile] : []),
      ...replacementDocumentImages,
    ];

    if (attachmentsToUpload.length === 0) {
      toast({
        title: "ยังไม่ได้เลือกไฟล์",
        description: "กรุณาเลือกไฟล์เอกสาร PDF หรือรูปภาพอย่างน้อย 1 ไฟล์",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingReplacementDocument(true);
      await uploadReplacementAttachments(replacementDocumentTarget.id, attachmentsToUpload);
      toast({
        title: "เพิ่มเอกสารสำเร็จ",
        description: `แนบไฟล์ให้เอกสาร ${replacementDocumentTarget.documentNo} เรียบร้อยแล้ว`,
      });
      await fetchReplacementRecords();
      closeReplacementDocumentDialog();
    } catch (error) {
      toast({
        title: "เพิ่มเอกสารไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setUploadingReplacementDocument(false);
    }
  };

  const handleSensitiveActionSubmit = useCallback(async () => {
    if (!sensitiveActionType || !sensitiveEntityId || !sensitiveEntityType) {
      return;
    }

    const requiresReason = sensitiveActionType !== "history";
    const reasonValue = sensitiveReason.trim();

    if (requiresReason && !reasonValue) {
      toast({
        title: "ต้องระบุเหตุผล",
        description: "กรุณาระบุเหตุผลประกอบการดำเนินการ",
        variant: "destructive",
      });
      return;
    }

    try {
      setSensitiveLoading(true);
    const requiresPassword = sensitiveActionType === "delete";
      if (requiresPassword) {
        if (!sensitivePassword.trim()) {
          toast({
            title: "ต้องยืนยันรหัสผ่าน",
            description: "กรุณากรอกรหัสผ่านเพื่อยืนยันสิทธิ์",
            variant: "destructive",
          });
          setSensitiveLoading(false);
          return;
        }
        await verifySensitivePassword(sensitivePassword);
      }

      if (sensitiveEntityType === "receipt") {
        const target = receipts.find((item) => item.id === sensitiveEntityId);
        if (!target) {
          toast({
            title: "ไม่พบใบลงรับ",
            description: "ไม่พบข้อมูลใบลงรับที่ต้องการดำเนินการ",
            variant: "destructive",
          });
          closeSensitiveDialog();
          return;
        }

        if (sensitiveActionType === "edit") {
          setEditingReceiptOriginal(target);
          setReceiptForm(convertReceiptToFormState(target));
          setReceiptDialogMode("edit");
          setEditingReceiptId(target.id);
          setReceiptChangeReason(reasonValue);
          closeSensitiveDialog();
          setReceiptDialogOpen(true);
          return;
        }

        if (sensitiveActionType === "delete") {
          closeSensitiveDialog();
          await handleDeleteReceipt(target, reasonValue);
          return;
        }

        if (sensitiveActionType === "history") {
          closeSensitiveDialog();
          try {
            await fetchAuditHistory("ink_receipts", target.id);
            setHistoryContext({
              type: "receipt",
              recordId: target.id,
              title: "ใบลงรับ " + target.documentNo,
            });
            setHistoryDialogOpen(true);
          } catch (error) {
            toast({
              title: "ไม่สามารถโหลดประวัติได้",
              description: getErrorMessage(error),
              variant: "destructive",
            });
          }
          return;
        }
      }

      if (sensitiveEntityType === "maintenance") {
        const target = maintenanceRecords.find((item) => item.id === sensitiveEntityId);
        if (!target) {
          toast({
            title: "ไม่พบข้อมูลการซ่อมบำรุง",
            description: "ไม่พบการซ่อมที่ต้องการดำเนินการ",
            variant: "destructive",
          });
          closeSensitiveDialog();
          return;
        }

        if (sensitiveActionType === "edit") {
          setEditingMaintenanceOriginal(target);
          setEditingMaintenanceId(target.id);
          setMaintenanceForm(convertMaintenanceToFormState(target));
          setMaintenanceDialogMode("edit");
          setMaintenanceChangeReason(reasonValue);
          closeSensitiveDialog();
          setMaintenanceDialogOpen(true);
          return;
        }

        if (sensitiveActionType === "delete") {
          closeSensitiveDialog();
          await handleDeleteMaintenance(target, reasonValue);
          return;
        }

        if (sensitiveActionType === "history") {
          closeSensitiveDialog();
          try {
            await fetchAuditHistory("equipment_maintenance", target.id);
            setHistoryContext({
              type: "maintenance",
              recordId: target.id,
              title: "การซ่อม " + target.documentNo,
            });
            setHistoryDialogOpen(true);
          } catch (error) {
            toast({
              title: "ไม่สามารถโหลดประวัติได้",
              description: getErrorMessage(error),
              variant: "destructive",
            });
          }
          return;
        }
      }

      if (sensitiveEntityType === "replacement") {
        const target = replacementRecords.find((item) => item.id === sensitiveEntityId);
        if (!target) {
          toast({
            title: "ไม่พบข้อมูลซื้อใหม่/ทดแทน",
            description: "ไม่พบข้อมูลที่ต้องการดำเนินการ",
            variant: "destructive",
          });
          closeSensitiveDialog();
          return;
        }

        if (sensitiveActionType === "edit") {
          setEditingReplacementOriginal(target);
          setEditingReplacementId(target.id);
          setReplacementForm(convertReplacementToFormState(target));
          setReplacementDialogMode("edit");
          setReplacementChangeReason(reasonValue);
          closeSensitiveDialog();
          setReplacementDialogOpen(true);
          return;
        }

        if (sensitiveActionType === "delete") {
          closeSensitiveDialog();
          await handleDeleteReplacement(target, reasonValue);
          return;
        }

        if (sensitiveActionType === "history") {
          closeSensitiveDialog();
          try {
            await fetchAuditHistory("equipment_replacements", target.id);
            setHistoryContext({
              type: "replacement",
              recordId: target.id,
              title: "ซื้อใหม่ " + target.documentNo,
            });
            setHistoryDialogOpen(true);
          } catch (error) {
            toast({
              title: "ไม่สามารถโหลดประวัติได้",
              description: getErrorMessage(error),
              variant: "destructive",
            });
          }
          return;
        }
      }

      toast({
        title: "ไม่สามารถดำเนินการได้",
        description: "ไม่พบประเภทข้อมูลที่รองรับ",
        variant: "destructive",
      });
      closeSensitiveDialog();
    } catch (error) {
      toast({
        title: "การยืนยันไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSensitiveLoading(false);
    }
  }, [
    closeSensitiveDialog,
    convertMaintenanceToFormState,
    convertReceiptToFormState,
    convertReplacementToFormState,
    fetchAuditHistory,
    handleDeleteMaintenance,
    handleDeleteReceipt,
    handleDeleteReplacement,
    maintenanceRecords,
    replacementRecords,
    receipts,
    sensitiveActionType,
    sensitiveEntityId,
    sensitiveEntityType,
    sensitivePassword,
    sensitiveReason,
    verifySensitivePassword,
  ]);

  const handleAddReceipt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const documentNo = receiptForm.documentNo.trim();
    if (!documentNo) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาระบุเลขที่เอกสาร",
        variant: "destructive",
      });
      return;
    }

    if (!receiptForm.supplierId) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกผู้ขาย",
        variant: "destructive",
      });
      return;
    }

    const hasValidItem = receiptForm.items.some(
      (item) =>
        item.productId &&
        (item.quantity ?? 0) > 0 &&
        (item.unitPrice ?? 0) > 0,
    );
    if (!hasValidItem) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาระบุรายการสินค้าอย่างน้อย 1 รายการ",
        variant: "destructive",
      });
      return;
    }

    const items = receiptForm.items
      .filter(
        (item) =>
          item.productId &&
          (item.quantity ?? 0) > 0 &&
          (item.unitPrice ?? 0) > 0,
      )
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity ?? 0,
        unitPrice: item.unitPrice ?? 0,
        unit: item.unit || "ชิ้น",
      }));

    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    try {
      const { data: existingReceipt, error: checkError } = await inkDb
        .from("ink_receipts")
        .select("id")
        .eq("document_no", documentNo)
        .maybeSingle();
      if (checkError) throw checkError;
      if (existingReceipt) {
        toast({
          title: "เลขที่เอกสารซ้ำ",
          description: "กรุณาระบุเลขที่เอกสารใหม่ที่ไม่ซ้ำ",
          variant: "destructive",
        });
        return;
      }

      const { data: insertedReceipt, error: insertReceiptError } = await inkDb
        .from("ink_receipts")
        .insert({
          document_no: documentNo,
          supplier_id: receiptForm.supplierId,
          received_at: receiptForm.receivedAt,
          total_amount: totalAmount,
          note: receiptForm.note.trim() || null,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (insertReceiptError) throw insertReceiptError;

      const receiptId = insertedReceipt.id;

      const itemPayload = items.map((item) => ({
        receipt_id: receiptId,
        inventory_id: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        line_total: item.quantity * item.unitPrice,
      }));

      const { error: insertItemsError } = await inkDb
        .from("ink_receipt_items")
        .insert(itemPayload);
      if (insertItemsError) throw insertItemsError;

      if (itemPayload.length > 0) {
        await adjustInventoryForItems(
          itemPayload.map((item) => ({
            inventory_id: item.inventory_id,
            quantity: item.quantity,
          })),
          1,
        );
      }

      const receiptDraft: ReceiptDraft = {
        documentNo,
        supplierId: receiptForm.supplierId,
        receivedAt: receiptForm.receivedAt,
        note: receiptForm.note.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit,
        })),
        totalAmount,
      };

      if (receiptForm.attachments.length > 0) {
        await uploadReceiptAttachments(receiptId, receiptForm.attachments);
      }

      await logReceiptChanges({
        receiptId,
        action: "INSERT",
        reason: receiptForm.note.trim() || "บันทึกใบลงรับใหม่",
        before: null,
        after: receiptDraft,
      });

      releaseAttachmentCollection(receiptForm.attachments);
      resetReceiptFormState();
      setReceiptDialogOpen(false);
      toast({
        title: "บันทึกสำเร็จ",
        description: "เพิ่มใบลงรับเรียบร้อยแล้ว",
      });
      await Promise.all([fetchReceipts(), fetchProducts()]);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `บันทึกใบลงรับไม่สำเร็จ: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  };

  const handleSubmitMaintenance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const documentNo = maintenanceForm.documentNo.trim();
    if (!documentNo) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาระบุเลขที่เอกสารซ่อมบำรุง",
        variant: "destructive",
      });
      return;
    }

    if (!maintenanceForm.equipmentId) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกครุภัณฑ์ที่ส่งซ่อม",
        variant: "destructive",
      });
      return;
    }

    const costValue = Number(maintenanceForm.cost || 0);
    if (!Number.isFinite(costValue) || costValue < 0) {
      toast({
        title: "ข้อมูลไม่ถูกต้อง",
        description: "กรุณาระบุค่าใช้จ่ายเป็นตัวเลขที่ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    const partsReplaced = maintenanceForm.partsReplaced
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter(Boolean);

    const selectedDepartmentRecord = maintenanceForm.departmentId
      ? departmentById.get(maintenanceForm.departmentId) ?? null
      : null;
    const departmentId = maintenanceForm.departmentId ? maintenanceForm.departmentId : null;
    const departmentName = selectedDepartmentRecord?.name ?? (maintenanceForm.departmentName.trim() || null);

    if (maintenanceDialogMode === "edit" && !maintenanceChangeReason.trim()) {
      toast({
        title: "ต้องระบุเหตุผล",
        description: "กรุณาระบุเหตุผลในการแก้ไขข้อมูลซ่อมบำรุง",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingMaintenance(true);

      if (maintenanceDialogMode === "edit") {
        if (!editingMaintenanceId || !editingMaintenanceOriginal) {
          throw new Error("ไม่พบข้อมูลการซ่อมบำรุงที่ต้องการแก้ไข");
        }

        if (documentNo !== editingMaintenanceOriginal.documentNo) {
          const { data: duplicate, error: duplicateError } = await inkDb
            .from("equipment_maintenance")
            .select("id")
            .eq("document_no", documentNo)
            .neq("id", editingMaintenanceId)
            .maybeSingle();
          if (duplicateError) throw duplicateError;
          if (duplicate) {
            toast({
              title: "เลขที่เอกสารซ้ำ",
              description: "มีเลขที่เอกสารนี้อยู่แล้วในระบบ",
              variant: "destructive",
            });
            setSubmittingMaintenance(false);
            return;
          }
        }

        const { error: updateError } = await inkDb
          .from("equipment_maintenance")
          .update({
            document_no: documentNo,
            equipment_id: maintenanceForm.equipmentId,
            supplier_id: maintenanceForm.supplierId || null,
            department: departmentName,
            department_id: departmentId,
            technician: maintenanceForm.technician.trim() || null,
            issue_summary: maintenanceForm.issueSummary.trim() || null,
            work_done: maintenanceForm.workDone.trim() || null,
            parts_replaced: partsReplaced,
            sent_at: maintenanceForm.sentAt || null,
            returned_at: maintenanceForm.returnedAt || null,
            warranty_until: maintenanceForm.warrantyUntil || null,
            cost: costValue,
            notes: maintenanceForm.notes.trim() || null,
            status: maintenanceForm.status,
          })
          .eq("id", editingMaintenanceId);
        if (updateError) throw updateError;

        if (maintenanceForm.attachments.length > 0) {
          await uploadMaintenanceAttachments(editingMaintenanceId, maintenanceForm.attachments);
        }

        const draft: MaintenanceDraft = {
          documentNo,
          equipmentId: maintenanceForm.equipmentId,
          supplierId: maintenanceForm.supplierId || null,
          departmentId,
          department: departmentName,
          technician: maintenanceForm.technician.trim() || null,
          issueSummary: maintenanceForm.issueSummary.trim() || null,
          workDone: maintenanceForm.workDone.trim() || null,
          partsReplaced,
          sentAt: maintenanceForm.sentAt || null,
          returnedAt: maintenanceForm.returnedAt || null,
          warrantyUntil: maintenanceForm.warrantyUntil || null,
          cost: costValue,
          notes: maintenanceForm.notes.trim() || null,
          status: maintenanceForm.status,
        };

        await logMaintenanceChanges({
          maintenanceId: editingMaintenanceId,
          action: "UPDATE",
          reason: maintenanceChangeReason.trim(),
          before: editingMaintenanceOriginal,
          after: draft,
        });

        releaseAttachmentCollection(maintenanceForm.attachments);
        resetMaintenanceForm();
        setMaintenanceDialogOpen(false);
        toast({
          title: "อัปเดตข้อมูลการซ่อมสำเร็จ",
          description: `แก้ไขเอกสาร ${documentNo} เรียบร้อยแล้ว`,
        });
      } else {
        const { data: existing, error: existingError } = await inkDb
          .from("equipment_maintenance")
          .select("id")
          .eq("document_no", documentNo)
          .maybeSingle();
        if (existingError) throw existingError;
        if (existing) {
          toast({
            title: "เลขที่เอกสารซ้ำ",
            description: "มีเลขที่เอกสารนี้อยู่ในระบบแล้ว กรุณาใช้เลขอื่น",
            variant: "destructive",
          });
          setSubmittingMaintenance(false);
          return;
        }

        const { data: inserted, error: insertError } = await inkDb
          .from("equipment_maintenance")
          .insert({
            document_no: documentNo,
            equipment_id: maintenanceForm.equipmentId,
            supplier_id: maintenanceForm.supplierId || null,
            department: departmentName,
            department_id: departmentId,
            technician: maintenanceForm.technician.trim() || null,
            issue_summary: maintenanceForm.issueSummary.trim() || null,
            work_done: maintenanceForm.workDone.trim() || null,
            parts_replaced: partsReplaced,
            sent_at: maintenanceForm.sentAt || null,
            returned_at: maintenanceForm.returnedAt || null,
            warranty_until: maintenanceForm.warrantyUntil || null,
            cost: costValue,
            notes: maintenanceForm.notes.trim() || null,
            status: maintenanceForm.status,
            created_by: user?.id ?? null,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;

        const maintenanceId = inserted.id;

        if (maintenanceForm.attachments.length > 0) {
          await uploadMaintenanceAttachments(maintenanceId, maintenanceForm.attachments);
        }

        const draft: MaintenanceDraft = {
          documentNo,
          equipmentId: maintenanceForm.equipmentId,
          supplierId: maintenanceForm.supplierId || null,
          departmentId,
          department: departmentName,
          technician: maintenanceForm.technician.trim() || null,
          issueSummary: maintenanceForm.issueSummary.trim() || null,
          workDone: maintenanceForm.workDone.trim() || null,
          partsReplaced,
          sentAt: maintenanceForm.sentAt || null,
          returnedAt: maintenanceForm.returnedAt || null,
          warrantyUntil: maintenanceForm.warrantyUntil || null,
          cost: costValue,
          notes: maintenanceForm.notes.trim() || null,
          status: maintenanceForm.status,
        };

        await logMaintenanceChanges({
          maintenanceId,
          action: "INSERT",
          reason: maintenanceForm.notes.trim() || "สร้างข้อมูลการซ่อม",
          before: null,
          after: draft,
        });

        releaseAttachmentCollection(maintenanceForm.attachments);
        resetMaintenanceForm();
        setMaintenanceDialogOpen(false);
        toast({
          title: "บันทึกการซ่อมบำรุงสำเร็จ",
          description: `เพิ่มเอกสารการซ่อม ${documentNo} เรียบร้อยแล้ว`,
        });
      }

      await Promise.all([fetchMaintenanceRecords(), fetchEquipments()]);
    } catch (error) {
      toast({
        title: "บันทึกการซ่อมบำรุงไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmittingMaintenance(false);
    }
  };

  const handleSubmitReplacement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const documentNo = replacementForm.documentNo.trim();
    if (!documentNo) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาระบุเลขที่เอกสารซื้อใหม่/ทดแทน",
        variant: "destructive",
      });
      return;
    }

    if (!replacementForm.equipmentId) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกครุภัณฑ์ที่เกี่ยวข้อง",
        variant: "destructive",
      });
      return;
    }

    const costValue = Number(replacementForm.cost || 0);
    if (!Number.isFinite(costValue) || costValue < 0) {
      toast({
        title: "ข้อมูลไม่ถูกต้อง",
        description: "กรุณาระบุงบประมาณ/ราคาเป็นตัวเลขที่ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    const selectedReplacementDepartmentRecord = replacementForm.departmentId
      ? departmentById.get(replacementForm.departmentId) ?? null
      : null;
    const replacementDepartmentId = replacementForm.departmentId ? replacementForm.departmentId : null;
    const replacementDepartmentName =
      selectedReplacementDepartmentRecord?.name ?? (replacementForm.departmentName.trim() || null);

    if (replacementDialogMode === "edit" && !replacementChangeReason.trim()) {
      toast({
        title: "ต้องระบุเหตุผล",
        description: "กรุณาระบุเหตุผลในการแก้ไขข้อมูลซื้อใหม่/ทดแทน",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingReplacement(true);

      if (replacementDialogMode === "edit") {
        if (!editingReplacementId || !editingReplacementOriginal) {
          throw new Error("ไม่พบข้อมูลการซื้อใหม่/ทดแทนที่ต้องการแก้ไข");
        }

        if (documentNo !== editingReplacementOriginal.documentNo) {
          const { data: duplicate, error: duplicateError } = await inkDb
            .from("equipment_replacements")
            .select("id")
            .eq("document_no", documentNo)
            .neq("id", editingReplacementId)
            .maybeSingle();
          if (duplicateError) throw duplicateError;
          if (duplicate) {
            toast({
              title: "เลขที่เอกสารซ้ำ",
              description: "มีเลขที่เอกสารนี้อยู่แล้วในระบบ",
              variant: "destructive",
            });
            setSubmittingReplacement(false);
            return;
          }
        }

        const { error: updateError } = await inkDb
          .from("equipment_replacements")
          .update({
            document_no: documentNo,
            equipment_id: replacementForm.equipmentId || null,
            supplier_id: replacementForm.supplierId || null,
            department: replacementDepartmentName,
            department_id: replacementDepartmentId,
            requested_by: replacementForm.requestedBy.trim() || null,
            approved_by: replacementForm.approvedBy.trim() || null,
            justification: replacementForm.justification.trim() || null,
            order_date: replacementForm.orderDate || null,
            received_date: replacementForm.receivedDate || null,
            warranty_until: replacementForm.warrantyUntil || null,
            cost: costValue,
            status: replacementForm.status,
            notes: replacementForm.notes.trim() || null,
          })
          .eq("id", editingReplacementId);
        if (updateError) throw updateError;

        if (replacementForm.attachments.length > 0) {
          await uploadReplacementAttachments(editingReplacementId, replacementForm.attachments);
        }

        const draft: ReplacementDraft = {
          documentNo,
          equipmentId: replacementForm.equipmentId || null,
          supplierId: replacementForm.supplierId || null,
          departmentId: replacementDepartmentId,
          department: replacementDepartmentName,
          requestedBy: replacementForm.requestedBy.trim() || null,
          approvedBy: replacementForm.approvedBy.trim() || null,
          justification: replacementForm.justification.trim() || null,
          orderDate: replacementForm.orderDate || null,
          receivedDate: replacementForm.receivedDate || null,
          warrantyUntil: replacementForm.warrantyUntil || null,
          cost: costValue,
          status: replacementForm.status,
          notes: replacementForm.notes.trim() || null,
        };

        await logReplacementChanges({
          replacementId: editingReplacementId,
          action: "UPDATE",
          reason: replacementChangeReason.trim(),
          before: editingReplacementOriginal,
          after: draft,
        });

        releaseAttachmentCollection(replacementForm.attachments);
        resetReplacementForm();
        setReplacementDialogOpen(false);
        toast({
          title: "อัปเดตข้อมูลซื้อใหม่/ทดแทนสำเร็จ",
          description: `แก้ไขเอกสาร ${documentNo} เรียบร้อยแล้ว`,
        });
      } else {
        const { data: existing, error: existingError } = await inkDb
          .from("equipment_replacements")
          .select("id")
          .eq("document_no", documentNo)
          .maybeSingle();
        if (existingError) throw existingError;
        if (existing) {
          toast({
            title: "เลขที่เอกสารซ้ำ",
            description: "มีเลขที่เอกสารนี้อยู่แล้วในระบบ",
            variant: "destructive",
          });
          setSubmittingReplacement(false);
          return;
        }

        const { data: inserted, error: insertError } = await inkDb
          .from("equipment_replacements")
          .insert({
            document_no: documentNo,
            equipment_id: replacementForm.equipmentId || null,
            supplier_id: replacementForm.supplierId || null,
            department: replacementDepartmentName,
            department_id: replacementDepartmentId,
            requested_by: replacementForm.requestedBy.trim() || null,
            approved_by: replacementForm.approvedBy.trim() || null,
            justification: replacementForm.justification.trim() || null,
            order_date: replacementForm.orderDate || null,
            received_date: replacementForm.receivedDate || null,
            warranty_until: replacementForm.warrantyUntil || null,
            cost: costValue,
            status: replacementForm.status,
            notes: replacementForm.notes.trim() || null,
            created_by: user?.id ?? null,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;

        const replacementId = inserted.id;
        if (replacementForm.attachments.length > 0) {
          await uploadReplacementAttachments(replacementId, replacementForm.attachments);
        }

        const draft: ReplacementDraft = {
          documentNo,
          equipmentId: replacementForm.equipmentId || null,
          supplierId: replacementForm.supplierId || null,
          departmentId: replacementDepartmentId,
          department: replacementDepartmentName,
          requestedBy: replacementForm.requestedBy.trim() || null,
          approvedBy: replacementForm.approvedBy.trim() || null,
          justification: replacementForm.justification.trim() || null,
          orderDate: replacementForm.orderDate || null,
          receivedDate: replacementForm.receivedDate || null,
          warrantyUntil: replacementForm.warrantyUntil || null,
          cost: costValue,
          status: replacementForm.status,
          notes: replacementForm.notes.trim() || null,
        };

        await logReplacementChanges({
          replacementId,
          action: "INSERT",
          reason: replacementForm.justification.trim() || "สร้างข้อมูลซื้อใหม่/ทดแทน",
          before: null,
          after: draft,
        });

        releaseAttachmentCollection(replacementForm.attachments);
        resetReplacementForm();
        setReplacementDialogOpen(false);
        toast({
          title: "บันทึกการซื้อใหม่/ทดแทนสำเร็จ",
          description: `เพิ่มเอกสาร ${documentNo} เรียบร้อยแล้ว`,
        });
      }

      await Promise.all([fetchReplacementRecords(), fetchEquipments()]);
    } catch (error) {
      toast({
        title: "บันทึกซื้อใหม่/ทดแทนไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmittingReplacement(false);
    }
  };

  const handleUpdateReceipt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingReceiptId || !editingReceiptOriginal) {
      toast({
        title: "ไม่สามารถแก้ไขได้",
        description: "ไม่พบข้อมูลใบลงรับที่ต้องการแก้ไข",
        variant: "destructive",
      });
      return;
    }

    const documentNo = receiptForm.documentNo.trim();
    if (!documentNo) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาระบุเลขที่เอกสาร",
        variant: "destructive",
      });
      return;
    }

    if (!receiptForm.supplierId) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกผู้ขาย",
        variant: "destructive",
      });
      return;
    }

    if (!receiptChangeReason.trim()) {
      toast({
        title: "ต้องระบุเหตุผล",
        description: "กรุณาระบุเหตุผลในการแก้ไขใบลงรับ",
        variant: "destructive",
      });
      return;
    }

    const hasValidItem = receiptForm.items.some(
      (item) =>
        item.productId &&
        (item.quantity ?? 0) > 0 &&
        (item.unitPrice ?? 0) > 0,
    );
    if (!hasValidItem) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาระบุรายการสินค้าอย่างน้อย 1 รายการ",
        variant: "destructive",
      });
      return;
    }

    const items = receiptForm.items
      .filter(
        (item) =>
          item.productId &&
          (item.quantity ?? 0) > 0 &&
          (item.unitPrice ?? 0) > 0,
      )
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity ?? 0,
        unitPrice: item.unitPrice ?? 0,
        unit: item.unit || "ชิ้น",
      }));

    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    let stockReverted = false;
    let newStockApplied = false;
    const revertAdjustments = editingReceiptOriginal.items.map((item) => ({
      inventory_id: item.productId,
      quantity: Number(item.quantity ?? 0),
    }));

    const newItemPayload = items.map((item) => ({
      receipt_id: editingReceiptId,
      inventory_id: item.productId,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      line_total: item.quantity * item.unitPrice,
    }));

    try {
      if (documentNo !== editingReceiptOriginal.documentNo) {
        const { data: duplicate, error: duplicateError } = await inkDb
          .from("ink_receipts")
          .select("id")
          .eq("document_no", documentNo)
          .neq("id", editingReceiptId)
          .maybeSingle();
        if (duplicateError) throw duplicateError;
        if (duplicate) {
          toast({
            title: "เลขที่เอกสารซ้ำ",
            description: "มีเลขที่เอกสารนี้อยู่แล้วในระบบ",
            variant: "destructive",
          });
          return;
        }
      }

      if (revertAdjustments.length > 0) {
        await adjustInventoryForItems(revertAdjustments, -1);
        stockReverted = true;
      }

      const { error: deleteItemsError } = await inkDb
        .from("ink_receipt_items")
        .delete()
        .eq("receipt_id", editingReceiptId);
      if (deleteItemsError) throw deleteItemsError;

      if (newItemPayload.length > 0) {
        const { error: insertNewItemsError } = await inkDb
          .from("ink_receipt_items")
          .insert(newItemPayload);
        if (insertNewItemsError) throw insertNewItemsError;

        await adjustInventoryForItems(
          newItemPayload.map((item) => ({
            inventory_id: item.inventory_id,
            quantity: item.quantity,
          })),
          1,
        );
        newStockApplied = true;
      }

      const { error: updateReceiptError } = await inkDb
        .from("ink_receipts")
        .update({
          document_no: documentNo,
          supplier_id: receiptForm.supplierId,
          received_at: receiptForm.receivedAt,
          total_amount: totalAmount,
          note: receiptForm.note.trim() || null,
        })
        .eq("id", editingReceiptId);
      if (updateReceiptError) throw updateReceiptError;

      if (receiptForm.attachments.length > 0) {
        await uploadReceiptAttachments(editingReceiptId, receiptForm.attachments);
      }

      const updatedDraft: ReceiptDraft = {
        documentNo,
        supplierId: receiptForm.supplierId,
        receivedAt: receiptForm.receivedAt,
        note: receiptForm.note.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit,
        })),
        totalAmount,
      };

      await logReceiptChanges({
        receiptId: editingReceiptId,
        action: "UPDATE",
        reason: receiptChangeReason.trim(),
        before: editingReceiptOriginal,
        after: updatedDraft,
      });

      releaseAttachmentCollection(receiptForm.attachments);
      toast({
        title: "อัปเดตใบลงรับสำเร็จ",
        description: `บันทึกการแก้ไขเอกสาร ${documentNo} เรียบร้อยแล้ว`,
      });

      resetReceiptFormState();
      setReceiptDialogOpen(false);
      await Promise.all([fetchReceipts(), fetchProducts()]);
    } catch (error) {
      if (newStockApplied) {
        try {
          await adjustInventoryForItems(
            newItemPayload.map((item) => ({
              inventory_id: item.inventory_id,
              quantity: item.quantity,
            })),
            -1,
          );
        } catch (adjustError) {
          console.error("ไม่สามารถย้อนจำนวนสต็อกใหม่ได้", adjustError);
        }
      }
      if (stockReverted) {
        try {
          await adjustInventoryForItems(revertAdjustments, 1);
        } catch (restoreError) {
          console.error("ไม่สามารถคืนค่าจำนวนสต็อกเดิมได้", restoreError);
        }
      }

      toast({
        title: "แก้ไขใบลงรับไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const currentReceiptTotal = receiptForm.items.reduce(
    (sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0),
    0,
  );

  const handlePreviewAttachment = async (receiptTitle: string, attachment: AttachmentMeta) => {
    try {
      const previewUrl = await ensureAttachmentPreview(attachment);
      if (!previewUrl) {
        toast({
          title: "ไม่พบไฟล์แนบ",
          description: "ไฟล์นี้ยังไม่มีข้อมูลในระบบ กรุณาตรวจสอบอีกครั้ง",
          variant: "destructive",
        });
        return;
      }

      setPreviewAttachment({
        attachment: { ...attachment, previewUrl },
        receiptTitle,
      });
      setAttachmentPreviewOpen(true);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถเปิดไฟล์แนบได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  };

  const handleAttachmentManageClick = useCallback(
    (entityType: EntityType, recordId: string, recordTitle: string, attachment: AttachmentMeta) => {
      if (!attachment.id) {
        toast({
          title: "ไม่พบข้อมูลไฟล์",
          description: "ไฟล์นี้ไม่สามารถจัดการได้ กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
        return;
      }
      setAttachmentDeleteTarget({ entityType, recordId, recordTitle, attachment });
    },
    [toast],
  );

  const openAttachmentViewer = useCallback(
    (entityType: EntityType, recordId: string, recordTitle: string, attachments: AttachmentMeta[]) => {
      if (!attachments.length) return;
      setAttachmentViewer({ entityType, recordId, recordTitle, attachments });
      setActiveImageIndex(null);
    },
    [],
  );

  useEffect(() => {
    if (!attachmentViewer) {
      setViewerAttachments([]);
      setAttachmentViewerLoading(false);
      setActiveImageIndex(null);
      return;
    }

    let cancelled = false;
    const loadPreviews = async () => {
      setAttachmentViewerLoading(true);
      try {
        const resolved = await Promise.all(
          attachmentViewer.attachments.map(async (attachment) => {
            try {
              const previewUrl = await ensureAttachmentPreview(attachment);
              if (previewUrl) {
                return { ...attachment, previewUrl };
              }
            } catch (error) {
              // If preview generation fails, fall back to existing data.
              console.warn("Failed to preload attachment preview", error);
            }
            return attachment;
          }),
        );
        if (!cancelled) {
          setViewerAttachments(resolved);
          const firstImageIndex = resolved.findIndex((attachment) => isImageAttachment(attachment));
          setActiveImageIndex(firstImageIndex >= 0 ? firstImageIndex : null);
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "ไม่สามารถแสดงไฟล์แนบได้",
            description: getErrorMessage(error),
            variant: "destructive",
          });
          setViewerAttachments(attachmentViewer.attachments);
          const firstImageIndex = attachmentViewer.attachments.findIndex((attachment) =>
            isImageAttachment(attachment),
          );
          setActiveImageIndex(firstImageIndex >= 0 ? firstImageIndex : null);
        }
      } finally {
        if (!cancelled) {
          setAttachmentViewerLoading(false);
        }
      }
    };

    loadPreviews();

    return () => {
      cancelled = true;
    };
  }, [attachmentViewer, ensureAttachmentPreview, toast]);

  const handleConfirmDeleteAttachment = useCallback(async () => {
    if (!attachmentDeleteTarget) return;

    const { entityType, attachment, recordTitle } = attachmentDeleteTarget;
    if (!attachment.id) {
      toast({
        title: "ไม่พบข้อมูลไฟล์",
        description: "ไฟล์นี้ไม่สามารถจัดการได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
      return;
    }

    const tableName =
      entityType === "receipt"
        ? "ink_attachments"
        : entityType === "maintenance"
          ? "equipment_maintenance_attachments"
          : "equipment_replacement_attachments";
    const bucket =
      attachment.storageBucket ??
      (entityType === "receipt"
        ? RECEIPT_STORAGE_BUCKET
        : entityType === "maintenance"
          ? MAINTENANCE_STORAGE_BUCKET
          : REPLACEMENT_STORAGE_BUCKET);

    try {
      setDeletingAttachment(true);

      if (attachment.storagePath) {
        const { error: storageError } = await supabase.storage.from(bucket).remove([attachment.storagePath]);
        if (storageError) throw storageError;
      }

      const { error: deleteRowError } = await inkDb.from(tableName).delete().eq("id", attachment.id);
      if (deleteRowError) throw deleteRowError;

      const cacheKey = getAttachmentCacheKey(attachment);
      setAttachmentPreviewCache((prev) => {
        if (!prev[cacheKey]) return prev;
        const next = { ...prev };
        delete next[cacheKey];
        attachmentCacheOrderRef.current = attachmentCacheOrderRef.current.filter((key) => key !== cacheKey);
        return next;
      });
      releaseAttachmentPreview(attachment);

      if (entityType === "receipt") {
        await Promise.all([fetchReceipts(), fetchProducts()]);
      } else if (entityType === "maintenance") {
        await fetchMaintenanceRecords();
      } else {
        await fetchReplacementRecords();
      }

      toast({
        title: "ลบไฟล์แนบสำเร็จ",
        description: `นำไฟล์ ${attachment.name} ออกจาก ${recordTitle} เรียบร้อยแล้ว`,
      });
      setAttachmentDeleteTarget(null);
    } catch (error) {
      toast({
        title: "ลบไฟล์แนบไม่สำเร็จ",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setDeletingAttachment(false);
    }
  }, [
    attachmentDeleteTarget,
    fetchMaintenanceRecords,
    fetchReceipts,
    fetchReplacementRecords,
    fetchProducts,
    inkDb,
    supabase,
    toast,
  ]);

  const renderAttachmentTabs = useCallback(
    (entityType: EntityType, recordId: string, recordTitle: string, attachments: AttachmentMeta[]): JSX.Element | null => {
      if (!attachments.length) return null;

      const imageAttachments = attachments.filter(isImageAttachment);
      const documentAttachments = attachments.filter((attachment) => !isImageAttachment(attachment));
      const defaultTab = imageAttachments.length ? "images" : "documents";
      const hasImages = imageAttachments.length > 0;
      const hasDocuments = documentAttachments.length > 0;

      return (
        <details className="rounded-lg border border-dashed bg-muted/30" open>
          <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-foreground">
            <span>ไฟล์แนบ</span>
            <span className="text-xs text-muted-foreground">
              {attachments.length.toLocaleString()} รายการ
            </span>
          </summary>
          <div className="space-y-3 px-3 pb-3 pt-1">
            <p className="text-xs text-muted-foreground">คลิกไฟล์เพื่อดูหรือลบออกจากเอกสาร</p>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList
                className={`grid w-full ${hasImages && hasDocuments ? "grid-cols-2" : "grid-cols-1"}`}
              >
                <TabsTrigger value="images" disabled={!hasImages}>
                  รูปภาพ ({imageAttachments.length})
                </TabsTrigger>
                <TabsTrigger value="documents" disabled={!hasDocuments}>
                  เอกสาร ({documentAttachments.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="images" className="mt-3 space-y-2">
                {hasImages ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {imageAttachments.map((attachment) => {
                      const cacheKey = getAttachmentCacheKey(attachment);
                      const previewUrl =
                        attachment.previewUrl ?? attachmentPreviewCache[cacheKey] ?? undefined;
                      return (
                        <button
                          key={attachment.id ?? `${recordTitle}-${attachment.name}`}
                          type="button"
                          className="group relative aspect-video w-full overflow-hidden rounded-md border border-border bg-muted/40 text-left shadow-sm transition hover:border-primary"
                          onClick={() => handleAttachmentManageClick(entityType, recordId, recordTitle, attachment)}
                          onMouseEnter={() => {
                            ensureAttachmentPreview(attachment).catch(() => undefined);
                          }}
                        >
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt={attachment.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[11px] text-white line-clamp-2">
                            {attachment.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">ไม่มีรูปภาพแนบ</p>
                )}
              </TabsContent>
              <TabsContent value="documents" className="mt-3 space-y-2">
                {hasDocuments ? (
                  documentAttachments.map((attachment) => (
                    <Button
                      key={attachment.id ?? `${recordTitle}-${attachment.name}`}
                      type="button"
                      variant="outline"
                      className="flex w-full items-center justify-between gap-2"
                      onClick={() => handleAttachmentManageClick(entityType, recordId, recordTitle, attachment)}
                    >
                      <span className="flex items-center gap-2 truncate text-sm font-medium">
                        <FileText className="h-4 w-4" />
                        <span className="truncate">{attachment.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</span>
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">ไม่มีเอกสารแนบ</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </details>
      );
    },
    [attachmentPreviewCache, ensureAttachmentPreview, handleAttachmentManageClick],
  );

  const sensitiveRequiresReason = sensitiveActionType === "edit" || sensitiveActionType === "delete";
  const sensitiveRequiresPassword = sensitiveActionType === "delete";
  const sensitiveTitle =
    sensitiveActionType === "edit"
      ? "ยืนยันการแก้ไขใบลงรับ"
      : sensitiveActionType === "delete"
        ? "ยืนยันการลบใบลงรับ"
        : sensitiveActionType === "history"
          ? "ยืนยันการดูประวัติใบลงรับ"
          : "ยืนยันการดำเนินการสำคัญ";
  const sensitiveDescription =
    sensitiveActionType === "edit"
      ? "กรุณาระบุเหตุผลประกอบการแก้ไข ระบบจะบันทึกไว้ในประวัติ"
      : sensitiveActionType === "history"
        ? "ระบุเหตุผลเพิ่มเติมได้หากต้องการ ระบบจะบันทึกไว้ในประวัติ"
        : sensitiveRequiresReason
          ? "เพื่อความปลอดภัย กรุณายืนยันรหัสผ่านและระบุเหตุผลในการดำเนินการ"
          : "กรุณายืนยันรหัสผ่านก่อนดำเนินการต่อ";
  const sensitiveButtonLabel =
    sensitiveActionType === "edit"
      ? "ยืนยันการแก้ไข"
      : sensitiveActionType === "delete"
        ? "ยืนยันการลบ"
        : sensitiveActionType === "history"
          ? "ดูประวัติ"
          : "ยืนยัน";

  if (isLoadingData) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        กำลังโหลดข้อมูลสต็อกสินค้า...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Maintenance/Stock</h1>
          <p className="text-muted-foreground mt-2">
            จัดการสินค้า IT หลายประเภท ตั้งแต่ข้อมูลสินค้า ผู้ขาย ไปจนถึงใบลงรับและสถิติภาพรวม
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog
            open={isReceiptDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                releaseAttachmentCollection(receiptForm.attachments);
                resetReceiptFormState();
              }
              setReceiptDialogOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleOpenCreateReceiptDialog}>
                <FileText className="mr-2 h-4 w-4" />
                ลงรับสินค้า
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {receiptDialogMode === "edit" ? "แก้ไขใบลงรับสินค้า" : "บันทึกใบลงรับสินค้า"}
                </DialogTitle>
                <DialogDescription>
                  {receiptDialogMode === "edit"
                    ? "ปรับปรุงข้อมูลใบลงรับ พร้อมบันทึกประวัติและเหตุผลการแก้ไข"
                    : "กรอกข้อมูลผู้ขาย สินค้า และแนบไฟล์ที่เกี่ยวข้อง ระบบจะคำนวณยอดรวมอัตโนมัติ"}
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-6"
                onSubmit={receiptDialogMode === "edit" ? handleUpdateReceipt : handleAddReceipt}
              >
                {receiptDialogMode === "edit" && (
                  <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-4">
                    <Label htmlFor="receipt-reason">เหตุผลในการแก้ไข *</Label>
                    <Textarea
                      id="receipt-reason"
                      value={receiptChangeReason}
                      onChange={(event) => setReceiptChangeReason(event.target.value)}
                      placeholder="อธิบายเหตุผลที่ต้องการแก้ไขใบลงรับ..."
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      เหตุผลนี้จะถูกบันทึกไว้ในประวัติการแก้ไข
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="documentNo">เลขที่เอกสาร *</Label>
                    <Input
                      id="documentNo"
                      value={receiptForm.documentNo}
                      onChange={(event) =>
                        setReceiptForm((prev) => ({ ...prev, documentNo: event.target.value }))
                      }
                      placeholder="เช่น RCP-0003/2567"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receivedAt">วันที่ลงรับ *</Label>
                    <Input
                      id="receivedAt"
                      type="date"
                      value={receiptForm.receivedAt}
                      onChange={(event) =>
                        setReceiptForm((prev) => ({ ...prev, receivedAt: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">เลือกผู้ขาย *</Label>
                  <Select
                    value={receiptForm.supplierId}
                    onValueChange={(value) => setReceiptForm((prev) => ({ ...prev, supplierId: value }))}
                  >
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="เลือกผู้ขาย" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.length === 0 && (
                        <SelectItem value="__empty" disabled>
                          ยังไม่มีข้อมูลผู้ขาย
                        </SelectItem>
                      )}
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>รายการสินค้า *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddReceiptItemRow}>
                      <Plus className="mr-2 h-4 w-4" />
                      เพิ่มรายการ
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {receiptForm.items.map((item) => (
                      <Card key={item.id} className="border-dashed bg-muted/40">
                        <CardContent className="space-y-4 p-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                              <Label>สินค้า</Label>
                              <Select
                                value={item.productId}
                                onValueChange={(value) => handleReceiptItemChange(item.id, "productId", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="เลือกสินค้า" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.modelCode} - {product.description}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>จำนวน</Label>
                              <Input
                                type="number"
                                min={0}
                                value={item.quantity ?? ""}
                                onChange={(event) =>
                                  handleReceiptItemChange(item.id, "quantity", event.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>ราคาต่อหน่วย (บาท)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={item.unitPrice ?? ""}
                                onChange={(event) =>
                                  handleReceiptItemChange(item.id, "unitPrice", event.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>หน่วยนับ</Label>
                              <Input
                                value={item.unit}
                                onChange={(event) => handleReceiptItemChange(item.id, "unit", event.target.value)}
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                              <Label>ยอดรวมรายการ</Label>
                              <Input value={formatCurrency(getLineTotal(item))} disabled />
                            </div>
                          </div>
                          {receiptForm.items.length > 1 && (
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleRemoveReceiptItemRow(item.id)}
                              >
                                ลบรายการ
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">หมายเหตุ</Label>
                  <Textarea
                    id="note"
                    value={receiptForm.note}
                    onChange={(event) =>
                      setReceiptForm((prev) => ({ ...prev, note: event.target.value }))
                    }
                    placeholder="ข้อมูลเพิ่มเติม เช่น เงื่อนไขการชำระเงิน หรือหมายเหตุอื่นๆ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attachment">แนบไฟล์</Label>
                  <Input
                    id="attachment"
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleReceiptAttachments}
                  />
                  {receiptForm.attachments.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ไฟล์:
                      {receiptForm.attachments.map((file) => ` ${file.name}`).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
                  <span className="font-medium text-muted-foreground">ยอดรวมทั้งใบลงรับ</span>
                  <span className="text-lg font-semibold text-primary">
                    {formatCurrency(currentReceiptTotal)}
                  </span>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    {receiptDialogMode === "edit" ? "บันทึกการแก้ไข" : "บันทึกใบลงรับ"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isMaintenanceDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                resetMaintenanceForm();
              }
              setMaintenanceDialogOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetMaintenanceForm()}>
                <Wrench className="mr-2 h-4 w-4" />
                บันทึกการซ่อมบำรุง
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {maintenanceDialogMode === "edit"
                    ? "แก้ไขการซ่อมบำรุงครุภัณฑ์"
                    : "บันทึกการซ่อมบำรุงครุภัณฑ์"}
                </DialogTitle>
                <DialogDescription>
                  เชื่อมโยงข้อมูลครุภัณฑ์ ผู้ให้บริการ และรายละเอียดการซ่อม พร้อมแนบหลักฐานประกอบ
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-6" onSubmit={handleSubmitMaintenance}>
                {maintenanceDialogMode === "edit" && (
                  <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-4">
                    <Label htmlFor="maintenance-reason">เหตุผลในการแก้ไข *</Label>
                    <Textarea
                      id="maintenance-reason"
                      value={maintenanceChangeReason}
                      onChange={(event) => setMaintenanceChangeReason(event.target.value)}
                      placeholder="อธิบายเหตุผลที่ต้องการแก้ไขข้อมูลการซ่อม"
                      required
                    />
                    <p className="text-xs text-muted-foreground">เหตุผลนี้จะถูกบันทึกไว้ในประวัติการแก้ไข</p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-document">เลขที่เอกสาร *</Label>
                    <Input
                      id="maintenance-document"
                      value={maintenanceForm.documentNo}
                      onChange={(event) =>
                        setMaintenanceForm((prev) => ({ ...prev, documentNo: event.target.value }))
                      }
                      placeholder="เช่น MTN-0007/2567"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-status">สถานะงาน</Label>
                    <Select
                      value={maintenanceForm.status}
                      onValueChange={(value: MaintenanceStatus) =>
                        setMaintenanceForm((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger id="maintenance-status">
                        <SelectValue placeholder="เลือกสถานะ" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(MAINTENANCE_STATUS_LABELS) as MaintenanceStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {MAINTENANCE_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>เลือกครุภัณฑ์ *</Label>
                    <Popover open={isMaintenanceEquipmentOpen} onOpenChange={setMaintenanceEquipmentOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={isMaintenanceEquipmentOpen}
                          className="w-full justify-between"
                        >
                          {selectedMaintenanceEquipment
                            ? getEquipmentDisplayLabel(selectedMaintenanceEquipment)
                            : "เลือกครุภัณฑ์"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[min(480px,90vw)] max-h-80 overflow-hidden p-0">
                        <Command>
                          <CommandInput placeholder="พิมพ์ชื่อหรือเลขครุภัณฑ์..." />
                          <CommandList>
                            <CommandEmpty>ไม่พบครุภัณฑ์</CommandEmpty>
                            <CommandGroup>
                              {equipments.map((equipment) => {
                                const meta = getEquipmentMeta(equipment);
                                return (
                                  <CommandItem
                                    key={equipment.id}
                                    value={getEquipmentSearchValue(equipment)}
                                    className="flex items-start justify-between gap-3"
                                    onSelect={() => {
                                      setMaintenanceForm((prev) => ({ ...prev, equipmentId: equipment.id }));
                                      setMaintenanceEquipmentOpen(false);
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{equipment.name}</span>
                                      {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
                                    </div>
                                    <Check
                                      className={cn(
                                        "h-4 w-4 shrink-0 text-primary",
                                        maintenanceForm.equipmentId === equipment.id ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>ผู้ให้บริการ</Label>
                    <Select
                      value={maintenanceForm.supplierId || OPTIONAL_SELECT_VALUE}
                      onValueChange={(value) =>
                        setMaintenanceForm((prev) => ({
                          ...prev,
                          supplierId: value === OPTIONAL_SELECT_VALUE ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกผู้ให้บริการ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={OPTIONAL_SELECT_VALUE}>ไม่ระบุ</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>แผนก/หน่วยงาน</Label>
                    <Popover open={isMaintenanceDepartmentOpen} onOpenChange={setMaintenanceDepartmentOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={isMaintenanceDepartmentOpen}
                          className="w-full justify-between"
                        >
                          {selectedMaintenanceDepartment
                            ? getDepartmentDisplayLabel(selectedMaintenanceDepartment)
                            : maintenanceForm.departmentName
                              ? maintenanceForm.departmentName
                              : "เลือกหน่วยงาน"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[min(420px,90vw)] max-h-72 overflow-hidden p-0">
                        <Command>
                          <CommandInput placeholder="ค้นหาด้วยชื่อหรือรหัสหน่วยงาน..." />
                          <CommandList>
                            <CommandEmpty>ไม่พบหน่วยงาน</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__none__"
                                onSelect={() => {
                                  setMaintenanceForm((prev) => ({
                                    ...prev,
                                    departmentId: "",
                                    departmentName: "",
                                  }));
                                  setMaintenanceDepartmentOpen(false);
                                }}
                              >
                                ไม่ระบุ
                              </CommandItem>
                              {activeDepartments.map((department) => (
                                <CommandItem
                                  key={department.id}
                                  value={getDepartmentSearchValue(department)}
                                  className="flex items-start justify-between gap-3"
                                  onSelect={() => {
                                    setMaintenanceForm((prev) => ({
                                      ...prev,
                                      departmentId: department.id,
                                      departmentName: department.name,
                                    }));
                                    setMaintenanceDepartmentOpen(false);
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                      {getDepartmentDisplayLabel(department)}
                                    </span>
                                    {department.code && (
                                      <span className="text-xs text-muted-foreground">รหัส {department.code}</span>
                                    )}
                                  </div>
                                  <Check
                                    className={cn(
                                      "h-4 w-4 shrink-0 text-primary",
                                      maintenanceForm.departmentId === department.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {maintenanceForm.departmentName && !selectedMaintenanceDepartment && (
                      <p className="text-xs text-muted-foreground">
                        หน่วยงานเดิม: {maintenanceForm.departmentName} (ยังไม่เชื่อมกับข้อมูลปัจจุบัน)
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-technician">ผู้ประสาน/ช่าง</Label>
                    <Input
                      id="maintenance-technician"
                      value={maintenanceForm.technician}
                      onChange={(event) =>
                        setMaintenanceForm((prev) => ({ ...prev, technician: event.target.value }))
                      }
                      placeholder="ระบุชื่อช่างหรือผู้ดำเนินการ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-sent">วันที่ส่งซ่อม</Label>
                    <Input
                      id="maintenance-sent"
                      type="date"
                      value={maintenanceForm.sentAt}
                      onChange={(event) =>
                        setMaintenanceForm((prev) => ({ ...prev, sentAt: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-returned">วันที่รับคืน</Label>
                    <Input
                      id="maintenance-returned"
                      type="date"
                      value={maintenanceForm.returnedAt}
                      onChange={(event) =>
                        setMaintenanceForm((prev) => ({ ...prev, returnedAt: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-warranty">ประกันการซ่อมถึง</Label>
                    <Input
                      id="maintenance-warranty"
                      type="date"
                      value={maintenanceForm.warrantyUntil}
                      onChange={(event) =>
                        setMaintenanceForm((prev) => ({ ...prev, warrantyUntil: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-cost">ค่าใช้จ่าย (บาท)</Label>
                    <Input
                      id="maintenance-cost"
                      type="number"
                      min={0}
                      step="0.01"
                      value={maintenanceForm.cost}
                      onChange={(event) =>
                        setMaintenanceForm((prev) => ({ ...prev, cost: event.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance-issue">อาการ/ปัญหาที่พบ</Label>
                  <Textarea
                    id="maintenance-issue"
                    value={maintenanceForm.issueSummary}
                    onChange={(event) =>
                      setMaintenanceForm((prev) => ({ ...prev, issueSummary: event.target.value }))
                    }
                    placeholder="อธิบายปัญหาหรืออาการที่พบ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance-work">ดำเนินการซ่อม/เปลี่ยนอะไร</Label>
                  <Textarea
                    id="maintenance-work"
                    value={maintenanceForm.workDone}
                    onChange={(event) =>
                      setMaintenanceForm((prev) => ({ ...prev, workDone: event.target.value }))
                    }
                    placeholder="บันทึกรายละเอียดการซ่อม การเปลี่ยนอะไหล่ หรือการปรับปรุง"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance-parts">รายการอะไหล่ที่เปลี่ยน (บรรทัดละ 1 รายการ)</Label>
                  <Textarea
                    id="maintenance-parts"
                    value={maintenanceForm.partsReplaced}
                    onChange={(event) =>
                      setMaintenanceForm((prev) => ({ ...prev, partsReplaced: event.target.value }))
                    }
                    placeholder="เช่น\nชุดลูกดรัม\nสายแพ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance-notes">หมายเหตุเพิ่มเติม</Label>
                  <Textarea
                    id="maintenance-notes"
                    value={maintenanceForm.notes}
                    onChange={(event) =>
                      setMaintenanceForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder="ข้อมูลเพิ่มเติมอื่น ๆ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance-attachments">แนบรูปภาพ (สูงสุด 3 ไฟล์)</Label>
                  <Input
                    id="maintenance-attachments"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMaintenanceAttachments}
                  />
                  {maintenanceForm.attachments.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ไฟล์:
                      {maintenanceForm.attachments.map((file) => ` ${file.name}`).join(", ")}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmittingMaintenance}>
                    {isSubmittingMaintenance ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      "บันทึกการซ่อมบำรุง"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isReplacementDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                resetReplacementForm();
              }
              setReplacementDialogOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetReplacementForm()}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                บันทึกซื้อใหม่/ทดแทน
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {replacementDialogMode === "edit"
                    ? "แก้ไขข้อมูลซื้อใหม่หรือทดแทนครุภัณฑ์"
                    : "บันทึกการซื้อใหม่หรือทดแทนครุภัณฑ์"}
                </DialogTitle>
                <DialogDescription>
                  ติดตามการจัดซื้อเพื่อซ่อมทดแทน พร้อมเหตุผล งบประมาณ และหลักฐานประกอบการจัดซื้อ
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-6" onSubmit={handleSubmitReplacement}>
                {replacementDialogMode === "edit" && (
                  <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-4">
                    <Label htmlFor="replacement-reason">เหตุผลในการแก้ไข *</Label>
                    <Textarea
                      id="replacement-reason"
                      value={replacementChangeReason}
                      onChange={(event) => setReplacementChangeReason(event.target.value)}
                      placeholder="อธิบายเหตุผลที่ต้องการแก้ไขข้อมูลซื้อใหม่/ทดแทน"
                      required
                    />
                    <p className="text-xs text-muted-foreground">เหตุผลนี้จะถูกบันทึกไว้ในประวัติการแก้ไข</p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="replacement-document">เลขที่เอกสาร *</Label>
                    <Input
                      id="replacement-document"
                      value={replacementForm.documentNo}
                      onChange={(event) =>
                        setReplacementForm((prev) => ({ ...prev, documentNo: event.target.value }))
                      }
                      placeholder="เช่น REP-0004/2567"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="replacement-status">สถานะงาน</Label>
                    <Select
                      value={replacementForm.status}
                      onValueChange={(value: ReplacementStatus) =>
                        setReplacementForm((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger id="replacement-status">
                        <SelectValue placeholder="เลือกสถานะ" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(REPLACEMENT_STATUS_LABELS) as ReplacementStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {REPLACEMENT_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>ครุภัณฑ์ที่เกี่ยวข้อง *</Label>
                    <Popover open={isReplacementEquipmentOpen} onOpenChange={setReplacementEquipmentOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={isReplacementEquipmentOpen}
                          className="w-full justify-between"
                        >
                          {selectedReplacementEquipment
                            ? getEquipmentDisplayLabel(selectedReplacementEquipment)
                            : "เลือกครุภัณฑ์"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[min(480px,90vw)] max-h-80 overflow-hidden p-0">
                        <Command>
                          <CommandInput placeholder="พิมพ์ชื่อหรือเลขครุภัณฑ์..." />
                          <CommandList>
                            <CommandEmpty>ไม่พบครุภัณฑ์</CommandEmpty>
                            <CommandGroup>
                              {equipments.map((equipment) => {
                                const meta = getEquipmentMeta(equipment);
                                return (
                                  <CommandItem
                                    key={equipment.id}
                                    value={getEquipmentSearchValue(equipment)}
                                    className="flex items-start justify-between gap-3"
                                    onSelect={() => {
                                      setReplacementForm((prev) => ({ ...prev, equipmentId: equipment.id }));
                                      setReplacementEquipmentOpen(false);
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{equipment.name}</span>
                                      {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
                                    </div>
                                    <Check
                                      className={cn(
                                        "h-4 w-4 shrink-0 text-primary",
                                        replacementForm.equipmentId === equipment.id ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>ผู้ขาย/บริษัท</Label>
                    <Select
                      value={replacementForm.supplierId || OPTIONAL_SELECT_VALUE}
                      onValueChange={(value) =>
                        setReplacementForm((prev) => ({
                          ...prev,
                          supplierId: value === OPTIONAL_SELECT_VALUE ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกผู้ขาย" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={OPTIONAL_SELECT_VALUE}>ไม่ระบุ</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>แผนกที่ร้องขอ</Label>
                    <Popover open={isReplacementDepartmentOpen} onOpenChange={setReplacementDepartmentOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={isReplacementDepartmentOpen}
                          className="w-full justify-between"
                        >
                          {selectedReplacementDepartment
                            ? getDepartmentDisplayLabel(selectedReplacementDepartment)
                            : replacementForm.departmentName
                              ? replacementForm.departmentName
                              : "เลือกหน่วยงาน"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[min(420px,90vw)] max-h-72 overflow-hidden p-0">
                        <Command>
                          <CommandInput placeholder="ค้นหาด้วยชื่อหรือรหัสหน่วยงาน..." />
                          <CommandList>
                            <CommandEmpty>ไม่พบหน่วยงาน</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__none__"
                                onSelect={() => {
                                  setReplacementForm((prev) => ({
                                    ...prev,
                                    departmentId: "",
                                    departmentName: "",
                                  }));
                                  setReplacementDepartmentOpen(false);
                                }}
                              >
                                ไม่ระบุ
                              </CommandItem>
                              {activeDepartments.map((department) => (
                                <CommandItem
                                  key={department.id}
                                  value={getDepartmentSearchValue(department)}
                                  className="flex items-start justify-between gap-3"
                                  onSelect={() => {
                                    setReplacementForm((prev) => ({
                                      ...prev,
                                      departmentId: department.id,
                                      departmentName: department.name,
                                    }));
                                    setReplacementDepartmentOpen(false);
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                      {getDepartmentDisplayLabel(department)}
                                    </span>
                                    {department.code && (
                                      <span className="text-xs text-muted-foreground">รหัส {department.code}</span>
                                    )}
                                  </div>
                                  <Check
                                    className={cn(
                                      "h-4 w-4 shrink-0 text-primary",
                                      replacementForm.departmentId === department.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {replacementForm.departmentName && !selectedReplacementDepartment && (
                      <p className="text-xs text-muted-foreground">
                        หน่วยงานเดิม: {replacementForm.departmentName} (ยังไม่เชื่อมกับข้อมูลปัจจุบัน)
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="replacement-requester">ผู้ร้องขอ</Label>
                    <Input
                      id="replacement-requester"
                      value={replacementForm.requestedBy}
                      onChange={(event) =>
                        setReplacementForm((prev) => ({ ...prev, requestedBy: event.target.value }))
                      }
                      placeholder="เช่น นางสาวเอ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="replacement-approver">ผู้อนุมัติ</Label>
                    <Input
                      id="replacement-approver"
                      value={replacementForm.approvedBy}
                      onChange={(event) =>
                        setReplacementForm((prev) => ({ ...prev, approvedBy: event.target.value }))
                      }
                      placeholder="เช่น ผู้จัดการฝ่าย"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="replacement-order-date">วันที่สั่งซื้อ</Label>
                    <Input
                      id="replacement-order-date"
                      type="date"
                      value={replacementForm.orderDate}
                      onChange={(event) =>
                        setReplacementForm((prev) => ({ ...prev, orderDate: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="replacement-received-date">วันที่รับสินค้า</Label>
                    <Input
                      id="replacement-received-date"
                      type="date"
                      value={replacementForm.receivedDate}
                      onChange={(event) =>
                        setReplacementForm((prev) => ({ ...prev, receivedDate: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="replacement-warranty">ประกันสินค้า</Label>
                    <Input
                      id="replacement-warranty"
                      type="date"
                      value={replacementForm.warrantyUntil}
                      onChange={(event) =>
                        setReplacementForm((prev) => ({ ...prev, warrantyUntil: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="replacement-cost">งบประมาณ/ราคา (บาท)</Label>
                    <Input
                      id="replacement-cost"
                      type="number"
                      min={0}
                      step="0.01"
                      value={replacementForm.cost}
                      onChange={(event) =>
                        setReplacementForm((prev) => ({ ...prev, cost: event.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="replacement-justification">เหตุผลในการซื้อใหม่/ทดแทน</Label>
                  <Textarea
                    id="replacement-justification"
                    value={replacementForm.justification}
                    onChange={(event) =>
                      setReplacementForm((prev) => ({ ...prev, justification: event.target.value }))
                    }
                    placeholder="อธิบายเหตุผล เช่น ครุภัณฑ์เดิมชำรุด หลุดประกัน หรือจำเป็นต้องเพิ่ม"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replacement-notes">หมายเหตุเพิ่มเติม</Label>
                  <Textarea
                    id="replacement-notes"
                    value={replacementForm.notes}
                    onChange={(event) =>
                      setReplacementForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder="ข้อมูลประกอบการจัดซื้ออื่น ๆ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replacement-attachments">แนบรูปภาพ (สูงสุด 3 ไฟล์)</Label>
                  <Input
                    id="replacement-attachments"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleReplacementAttachments}
                  />
                  {replacementForm.attachments.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ไฟล์:
                      {replacementForm.attachments.map((file) => ` ${file.name}`).join(", ")}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmittingReplacement}>
                    {isSubmittingReplacement ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      "บันทึกซื้อใหม่/ทดแทน"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isProductDialogOpen}
            onOpenChange={(open) => {
              setProductDialogOpen(open);
              if (!open) {
                resetProductForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetProductForm()}>
                <Package className="mr-2 h-4 w-4" />
                เพิ่มสินค้า
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {productDialogMode === "create" ? "เพิ่มข้อมูล" : "แก้ไขข้อมูลสินค้า"}
                </DialogTitle>
                <DialogDescription>
                  {productDialogMode === "create"
                    ? "รองรับสินค้า IT หลายประเภท เช่น Ink, Toner, Drum, ผ้าหมึก, Mouse และ Keyboard"
                    : "ปรับปรุงข้อมูลสินค้าที่เลือกให้ถูกต้องและเป็นปัจจุบัน"}
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmitProduct}>
                <div className="space-y-2">
                  <Label htmlFor="brandId">ยี่ห้อ *</Label>
                  <Select
                    value={productForm.brandId}
                    onValueChange={(value) => setProductForm((prev) => ({ ...prev, brandId: value }))}
                  >
                    <SelectTrigger id="brandId">
                      <SelectValue placeholder="เลือกยี่ห้อ" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inkType">ประเภทสินค้า *</Label>
                  <Select
                    value={productForm.inkType}
                    onValueChange={(value: InkType) =>
                      setProductForm((prev) => ({ ...prev, inkType: value }))
                    }
                  >
                    <SelectTrigger id="inkType">
                      <SelectValue placeholder="เลือกประเภทสินค้า" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(INK_TYPE_LABELS) as InkType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {INK_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="modelCode">รุ่น / เบอร์ *</Label>
                    <Input
                      id="modelCode"
                      value={productForm.modelCode}
                      onChange={(event) =>
                        setProductForm((prev) => ({ ...prev, modelCode: event.target.value }))
                      }
                      placeholder="เช่น CF226A"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">รหัสสินค้า (SKU) *</Label>
                    <Input
                      id="sku"
                      value={productForm.sku}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, sku: event.target.value }))}
                      placeholder="เช่น HP-26A"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">รายละเอียด</Label>
                  <Textarea
                    id="description"
                    value={productForm.description}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="รายละเอียดอื่นๆ เช่น เครื่องพิมพ์ที่รองรับ"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="unit">หน่วยนับ</Label>
                    <Input
                      id="unit"
                      value={productForm.unit}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, unit: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stockQuantity">คงเหลือในสต็อก</Label>
                    <Input
                      id="stockQuantity"
                      type="number"
                      min={0}
                      value={productForm.stockQuantity}
                      onChange={(event) =>
                        setProductForm((prev) => ({
                          ...prev,
                          stockQuantity: event.target.valueAsNumber || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorderPoint">จุดสั่งซื้อซ้ำ</Label>
                    <Input
                      id="reorderPoint"
                      type="number"
                      min={0}
                      value={productForm.reorderPoint}
                      onChange={(event) =>
                        setProductForm((prev) => ({
                          ...prev,
                          reorderPoint: event.target.valueAsNumber || 0,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    {productDialogMode === "create" ? "บันทึกข้อมูลสินค้า" : "บันทึกการแก้ไข"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isSupplierDialogOpen}
            onOpenChange={(open) => {
              setSupplierDialogOpen(open);
              if (!open) {
                resetSupplierForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetSupplierForm()}>
                <Store className="mr-2 h-4 w-4" />
                เพิ่มผู้ขาย
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {supplierDialogMode === "create" ? "เพิ่มข้อมูลผู้ขาย" : "แก้ไขข้อมูลผู้ขาย"}
                </DialogTitle>
                <DialogDescription>
                  {supplierDialogMode === "create"
                    ? "เก็บข้อมูลที่อยู่ หมายเลขผู้เสียภาษี เบอร์โทรศัพท์ และอีเมล"
                    : "ปรับปรุงรายละเอียดผู้ขายให้เป็นข้อมูลล่าสุด"}
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmitSupplier}>
                <div className="space-y-2">
                  <Label htmlFor="supplierName">ชื่อผู้ขาย *</Label>
                  <Input
                    id="supplierName"
                    value={supplierForm.name}
                    onChange={(event) => setSupplierForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="ชื่อบริษัทหรือร้านค้า"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierTaxId">หมายเลขผู้เสียภาษี</Label>
                  <Input
                    id="supplierTaxId"
                    value={supplierForm.taxId}
                    onChange={(event) => setSupplierForm((prev) => ({ ...prev, taxId: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierAddress">ที่อยู่</Label>
                  <Textarea
                    id="supplierAddress"
                    value={supplierForm.address}
                    onChange={(event) =>
                      setSupplierForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="supplierPhone">เบอร์โทร</Label>
                    <Input
                      id="supplierPhone"
                      value={supplierForm.phone}
                      onChange={(event) => setSupplierForm((prev) => ({ ...prev, phone: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplierEmail">อีเมล</Label>
                    <Input
                      id="supplierEmail"
                      type="email"
                      value={supplierForm.email}
                      onChange={(event) => setSupplierForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    {supplierDialogMode === "create" ? "บันทึกผู้ขาย" : "บันทึกการแก้ไข"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isBrandDialogOpen}
            onOpenChange={(open) => {
              setBrandDialogOpen(open);
              if (!open) {
                resetBrandForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetBrandForm()}>
                <Building2 className="mr-2 h-4 w-4" />
                เพิ่มยี่ห้อ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {brandDialogMode === "create" ? "เพิ่มยี่ห้อสินค้า" : "แก้ไขยี่ห้อสินค้า"}
                </DialogTitle>
                <DialogDescription>
                  {brandDialogMode === "create"
                    ? "กรอกชื่อยี่ห้อสินค้าที่ต้องการเพิ่มในระบบ"
                    : "แก้ไขชื่อยี่ห้อสินค้าที่เลือก"}
                </DialogDescription>
              </DialogHeader>
          <div className="space-y-4">
            <form className="space-y-4" onSubmit={handleSubmitBrand}>
              <div className="space-y-2">
                <Label htmlFor="brandName">ชื่อยี่ห้อ *</Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(event) => setBrandName(event.target.value)}
                  placeholder="เช่น HP, Canon, Brother"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  {brandDialogMode === "create" ? "บันทึกยี่ห้อ" : "บันทึกการแก้ไข"}
                </Button>
              </DialogFooter>
            </form>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">ยี่ห้อที่มีในระบบ</Label>
              <ScrollArea className="h-40 rounded-md border bg-muted/20 p-3">
                {brands.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    ยังไม่มียี่ห้อสินค้าในระบบ
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {brands.map((brand) => (
                      <li key={brand.id} className="flex justify-between items-center">
                        <span className="font-medium text-foreground">{brand.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {brandUsage.get(brand.id) ?? 0} รุ่น
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 gap-2 sm:grid-cols-6">
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="products">ข้อมูลสินค้า</TabsTrigger>
          <TabsTrigger value="suppliers">ผู้ขาย</TabsTrigger>
          <TabsTrigger value="receipts">ใบลงรับ</TabsTrigger>
          <TabsTrigger value="maintenance">การซ่อมบำรุง</TabsTrigger>
          <TabsTrigger value="replacement">ซื้อใหม่/ทดแทน</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">ยี่ห้อในระบบ</CardTitle>
                <CardDescription>จำนวนยี่ห้อทั้งหมดที่ลงทะเบียน</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">{brands.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">จำนวนรุ่นสินค้า</CardTitle>
                <CardDescription>สินค้าทั้งหมดในคลัง</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">{products.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">ยอดมูลค่าคงคลัง</CardTitle>
                <CardDescription>ข้อมูลจากใบลงรับล่าสุด</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">
                  {formatCurrency(totalInventoryValue)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">ผู้ขาย</CardTitle>
                <CardDescription>จำนวนผู้ขายที่พร้อมใช้งาน</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">{suppliers.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ตัวกรองข้อมูลสถิติ</CardTitle>
              <CardDescription>
                กรองข้อมูลสถิติได้ตามยี่ห้อ ประเภทสินค้า ผู้ขาย และปีที่ต้องการ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>ยี่ห้อ</Label>
                  <Select value={filterBrand} onValueChange={setFilterBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกยี่ห้อ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ประเภทสินค้า</Label>
                  <Select value={filterInkType} onValueChange={(value: InkType | "all") => setFilterInkType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {(Object.keys(INK_TYPE_LABELS) as InkType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {INK_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ผู้ขาย</Label>
                  <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกผู้ขาย" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ปีงบประมาณ</Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกปี" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {uniqueYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>สัดส่วนมูลค่าตามยี่ห้อ</CardTitle>
                <CardDescription>ดูภาพรวมของมูลค่าใบลงรับที่แบ่งตามยี่ห้อสินค้า</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={brandTotals} dataKey="value" nameKey="name" outerRadius={110} label>
                      {brandTotals.map((_, index) => (
                        <Cell
                          key={`cell-${brandTotals[index].brandId}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number | string) => formatCurrency(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>มูลค่าตามผู้ขาย</CardTitle>
                <CardDescription>เปรียบเทียบมูลค่าการลงรับสินค้ารายผู้ขาย</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplierTotals}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="supplier" />
                    <YAxis />
                    <Tooltip formatter={(value: number | string) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="value" name="มูลค่า (บาท)" fill="#2563eb" />
                    <Bar dataKey="quantity" name="จำนวน (ชิ้น)" fill="#fb923c" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>แนวโน้มการลงรับตามช่วงเวลา</CardTitle>
              <CardDescription>ดูภาพรวมการลงรับสินค้าในแต่ละเดือน</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number | string) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="value" name="มูลค่าลงรับ (บาท)" stroke="#22c55e" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>รายการสินค้าทั้งหมด</CardTitle>
              <CardDescription>
                แสดงข้อมูลรุ่นสินค้า ประเภท ยี่ห้อ จำนวนคงเหลือ และสถานะสต็อก
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รุ่น / เบอร์</TableHead>
                    <TableHead>ยี่ห้อ</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>คงเหลือ</TableHead>
                    <TableHead>จุดสั่งซื้อซ้ำ</TableHead>
                    <TableHead>หน่วย</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSummary.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        ยังไม่มีข้อมูลสินค้า
                      </TableCell>
                    </TableRow>
                  )}
                  {productSummary.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{product.modelCode}</div>
                        <div className="text-xs text-muted-foreground">{product.description}</div>
                      </TableCell>
                      <TableCell>{product.brandName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{INK_TYPE_LABELS[product.inkType]}</Badge>
                      </TableCell>
                      <TableCell>{product.stockQuantity.toLocaleString("th-TH")}</TableCell>
                      <TableCell>{product.reorderPoint.toLocaleString("th-TH")}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                    <TableCell>
                      {product.outstanding ? (
                        <Badge className="bg-red-500 text-white">ควรสั่งซื้อ</Badge>
                      ) : (
                        <Badge className="bg-emerald-500 text-white">เพียงพอ</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditProduct(product)}
                          aria-label={`แก้ไขสินค้า ${product.modelCode}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog("product", product.id)}
                          aria-label={`ลบสินค้า ${product.modelCode}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ยี่ห้อสินค้า</CardTitle>
            <CardDescription>
              จัดการรายการยี่ห้อสินค้าและตรวจสอบจำนวนรุ่นที่ใช้งานในระบบ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ยี่ห้อ</TableHead>
                  <TableHead className="w-40 text-center">จำนวนรุ่นที่เชื่อมโยง</TableHead>
                  <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      ยังไม่มีข้อมูลยี่ห้อ กรุณาเพิ่มยี่ห้อใหม่
                    </TableCell>
                  </TableRow>
                ) : (
                  brands.map((brand) => {
                    const usageCount = brandUsage.get(brand.id) ?? 0;
                    return (
                      <TableRow key={brand.id}>
                        <TableCell className="font-medium text-foreground">{brand.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{usageCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditBrand(brand)}
                              aria-label={`แก้ไขยี่ห้อ ${brand.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog("brand", brand.id)}
                              aria-label={`ลบยี่ห้อ ${brand.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="suppliers" className="space-y-6">
        <Card>
          <CardHeader>
              <CardTitle>ข้อมูลผู้ขายทั้งหมด</CardTitle>
              <CardDescription>
                แก้ไขหรือเพิ่มข้อมูลผู้ขายเพื่อใช้ในการลงรับสินค้า
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อผู้ขาย</TableHead>
                    <TableHead>ที่อยู่</TableHead>
                    <TableHead>เลขประจำตัวผู้เสียภาษี</TableHead>
                    <TableHead>เบอร์โทร</TableHead>
                    <TableHead>อีเมล</TableHead>
                    <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        ยังไม่มีข้อมูลผู้ขาย
                      </TableCell>
                    </TableRow>
                  )}
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium text-foreground">{supplier.name}</TableCell>
                      <TableCell className="max-w-sm text-sm text-muted-foreground">
                        {supplier.address || "-"}
                      </TableCell>
                      <TableCell>{supplier.taxId || "-"}</TableCell>
                      <TableCell>{supplier.phone || "-"}</TableCell>
                      <TableCell>{supplier.email || "-"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSupplier(supplier)}
                            aria-label={`แก้ไขผู้ขาย ${supplier.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog("supplier", supplier.id)}
                            aria-label={`ลบผู้ขาย ${supplier.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ใบลงรับสินค้า</CardTitle>
              <CardDescription>
                ติดตามมูลค่าและรายการสินค้าที่ได้รับ พร้อมไฟล์แนบประกอบเอกสาร
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredReceipts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                ยังไม่มีใบลงรับในช่วงที่เลือก
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
                <div className="rounded-lg border bg-muted/30">
                  <ScrollArea className="h-[420px]">
                    <div className="space-y-4 p-3">
                      {groupedReceipts.map((group) => (
                        <div key={group.key} className="space-y-2">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {group.label}
                          </div>
                          <div className="space-y-1">
                            {group.receipts.map((receipt) => {
                              const supplierName =
                                receipt.supplierName ||
                                supplierById.get(receipt.supplierId)?.name ||
                                "ไม่ทราบผู้ขาย";
                              const totalAmount = receipt.items.reduce(
                                (sum, item) => sum + getLineTotal(item),
                                0,
                              );
                              const isSelected = receipt.id === selectedReceiptId;

                              return (
                                <button
                                  key={receipt.id}
                                  type="button"
                                  onClick={() => setSelectedReceiptId(receipt.id)}
                                  className={`w-full rounded-lg border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    isSelected
                                      ? "border-primary bg-primary/10"
                                      : "border-transparent hover:border-muted"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                      เอกสาร {receipt.documentNo}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(receipt.receivedAt).toLocaleDateString("th-TH")}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">{supplierName}</div>
                                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{receipt.items.length} รายการ</span>
                                    <span className="font-medium text-foreground">
                                      {formatCurrency(totalAmount)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div>
                  {selectedReceipt ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="text-xs uppercase text-muted-foreground">เอกสาร</div>
                            <div className="text-lg font-semibold text-foreground">
                              เอกสาร {selectedReceipt.documentNo}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {selectedReceipt.supplierName ||
                                supplierById.get(selectedReceipt.supplierId)?.name ||
                                "ไม่ทราบผู้ขาย"}
                              {" • "}
                              ลงรับเมื่อ{" "}
                              {new Date(selectedReceipt.receivedAt).toLocaleDateString("th-TH")}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">ยอดรวม</div>
                            <div className="text-xl font-semibold text-primary">
                              {formatCurrency(
                                selectedReceipt.items.reduce(
                                  (sum, item) => sum + getLineTotal(item),
                                  0,
                                ),
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openSensitiveAction("receipt", "edit", selectedReceipt.id)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            แก้ไข
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSensitiveAction("receipt", "history", selectedReceipt.id)}
                          >
                            <History className="mr-2 h-4 w-4" />
                            ประวัติ
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openSensitiveAction("receipt", "delete", selectedReceipt.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            ลบ
                          </Button>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-lg border bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>สินค้า</TableHead>
                              <TableHead>ประเภท</TableHead>
                              <TableHead>จำนวน</TableHead>
                              <TableHead>ราคาต่อหน่วย</TableHead>
                              <TableHead>ยอดรวม</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedReceipt.items.map((item, index) => {
                              const product = productById.get(item.productId);
                              return (
                                <TableRow key={`${selectedReceipt.id}-item-${index}`}>
                                  <TableCell>
                                    <div className="font-medium text-foreground">
                                      {product?.modelCode ?? "ไม่พบสินค้า"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {product?.description ?? "-"}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {product ? INK_TYPE_LABELS[product.inkType] : "-"}
                                  </TableCell>
                                  <TableCell>
                                    {item.quantity.toLocaleString("th-TH")} {item.unit}
                                  </TableCell>
                                  <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                  <TableCell>{formatCurrency(getLineTotal(item))}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {renderAttachmentTabs("receipt", selectedReceipt.id, selectedReceipt.documentNo, selectedReceipt.attachments)}

                      {selectedReceipt.note && (
                        <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
                          หมายเหตุ: {selectedReceipt.note}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                      เลือกเอกสารเพื่อดูรายละเอียดใบลงรับ
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">จำนวนงานซ่อม</CardTitle>
                <CardDescription>บันทึกทั้งหมดในระบบ</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">{maintenanceRecords.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">ค่าใช้จ่ายรวม</CardTitle>
                <CardDescription>รวมค่าใช้จ่ายจากงานซ่อมบำรุง</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">{formatCurrency(maintenanceTotalCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">กำลังดำเนินการ</CardTitle>
                <CardDescription>งานที่อยู่ระหว่างซ่อม/รอผล</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">{maintenanceInProgressCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">เสร็จสิ้น</CardTitle>
                <CardDescription>งานที่ปิดจบพร้อมใช้งาน</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">{maintenanceCompletedCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">สถานะอื่น ๆ :</span>
            <Badge variant={getMaintenanceStatusVariant("not_worth_repair")}>
              ไม่คุ้มค่าซ่อม {maintenanceNotWorthRepairCount}
            </Badge>
            <Badge variant={getMaintenanceStatusVariant("disposed")}>
              จำหน่าย {maintenanceDisposedCount}
            </Badge>
            <Badge variant={getMaintenanceStatusVariant("pending_disposal")}>
              รอจำหน่าย {maintenancePendingDisposalCount}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>สถานะการซ่อม</CardTitle>
                <CardDescription>สัดส่วนงานซ่อมในแต่ละสถานะ</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                {maintenanceRecords.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    ยังไม่มีข้อมูลการซ่อมบำรุง
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={maintenanceStatusSummary.map((item, index) => ({
                          name: MAINTENANCE_STATUS_LABELS[item.status],
                          value: item.count,
                          fill: PIE_COLORS[index % PIE_COLORS.length],
                        }))}
                        dataKey="value"
                        innerRadius={50}
                      >
                        {maintenanceStatusSummary.map((_, index) => (
                          <Cell key={`maintenance-status-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} งาน`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>ค่าใช้จ่ายตามผู้ให้บริการ</CardTitle>
                <CardDescription>เปรียบเทียบผู้ให้บริการที่ใช้จ่ายสูงสุด</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                {maintenanceSupplierTotals.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    ยังไม่มีข้อมูลค่าใช้จ่าย
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={maintenanceSupplierTotals}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="supplier" hide={maintenanceSupplierTotals.length > 4} />
                      <Tooltip formatter={(value: number | string) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="value" name="ค่าใช้จ่าย" fill={PIE_COLORS[0]} radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>แนวโน้มค่าใช้จ่ายรายเดือน</CardTitle>
                <CardDescription>ติดตามค่าใช้จ่ายซ่อมบำรุงตามช่วงเวลา</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                {maintenanceTrendData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    ยังไม่มีข้อมูลแนวโน้ม
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={maintenanceTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number | string) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line type="monotone" dataKey="value" name="ค่าใช้จ่าย" stroke={PIE_COLORS[1]} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>หน่วยงานที่มีงานซ่อมบำรุง</CardTitle>
              <CardDescription>จำนวนงานและค่าใช้จ่ายจำแนกตามหน่วยงาน</CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceDepartmentSummary.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  ยังไม่มีข้อมูลหน่วยงานที่บันทึกการซ่อม
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 text-xs font-medium uppercase text-muted-foreground">
                    <span>หน่วยงาน</span>
                    <span className="text-center">จำนวนงาน</span>
                    <span className="text-right">ค่าใช้จ่าย</span>
                  </div>
                  <div className="space-y-2">
                    {maintenanceDepartmentSummary.slice(0, 8).map((item) => (
                      <div
                        key={item.department}
                        className="grid grid-cols-3 items-center rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm"
                      >
                        <span className="truncate font-medium text-foreground" title={item.department}>
                          {item.department}
                        </span>
                        <span className="text-center text-muted-foreground">{item.count.toLocaleString()}</span>
                        <span className="text-right font-semibold text-primary">
                          {formatCurrency(item.totalCost)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="ค้นหาเลขที่เอกสารหรือหน่วยงาน"
                value={maintenanceSearchTerm}
                onChange={(event) => setMaintenanceSearchTerm(event.target.value)}
              />
            </div>
            {maintenanceSearchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setMaintenanceSearchTerm("")}>
                ล้างการค้นหา
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {maintenanceRecords.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                ยังไม่มีการบันทึกการซ่อมบำรุง
              </div>
            ) : filteredMaintenanceRecords.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                ไม่พบข้อมูลการซ่อมที่ตรงกับการค้นหา
              </div>
            ) : (
              filteredMaintenanceRecords.map((record) => {
                const equipment = equipmentById.get(record.equipmentId);
                return (
                  <Card
                    key={record.id}
                    className={cn(
                      "transition-shadow hover:shadow-md",
                      MAINTENANCE_STATUS_CARD_STYLES[record.status],
                    )}
                  >
                    <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold text-foreground">
                          เอกสาร {record.documentNo}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap gap-2 text-sm">
                          <span>
                            {equipment?.name ?? record.equipmentName ?? "ไม่ทราบครุภัณฑ์"}
                            {(equipment?.assetNumber ?? record.equipmentAssetNumber)
                              ? ` • ${equipment?.assetNumber ?? record.equipmentAssetNumber}`
                              : ""}
                            {equipment?.model ? ` • ${equipment.model}` : ""}
                            {(equipment?.location ?? record.equipmentLocation)
                              ? ` (${equipment?.location ?? record.equipmentLocation})`
                              : ""}
                          </span>
                          {equipment?.location && <span>• {equipment.location}</span>}
                          {record.sentAt && (
                            <span>
                              • ส่งเมื่อ {new Date(record.sentAt).toLocaleDateString("th-TH")}
                            </span>
                          )}
                          {record.returnedAt && (
                            <span>
                              • รับคืน {new Date(record.returnedAt).toLocaleDateString("th-TH")}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <Badge variant={getMaintenanceStatusVariant(record.status)}>
                          {MAINTENANCE_STATUS_LABELS[record.status]}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">อัปเดตสถานะ</span>
                          <Select
                            value={record.status}
                            disabled={updatingMaintenanceStatusId === record.id}
                            onValueChange={(value) =>
                              handleUpdateMaintenanceStatus(record, value as MaintenanceStatus)
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 w-[12.5rem] justify-between text-sm font-medium",
                                MAINTENANCE_STATUS_TEXT_CLASSES[record.status],
                              )}
                            >
                              <SelectValue placeholder="เลือกสถานะ" />
                              {updatingMaintenanceStatusId === record.id && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {MAINTENANCE_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getMaintenanceStatusVariant(status)}>
                                      {MAINTENANCE_STATUS_LABELS[status]}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {status === "planned"
                                        ? "เริ่มต้นการซ่อม"
                                        : status === "in_progress"
                                          ? "กำลังดำเนินงาน"
                                          : status === "completed"
                                            ? "เสร็จสิ้นแล้ว"
                                            : status === "not_worth_repair"
                                              ? "ไม่คุ้มค่าซ่อม"
                                              : status === "disposed"
                                                ? "จำหน่ายแล้ว"
                                                : "รอจำหน่าย"}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="text-xs text-muted-foreground">ค่าใช้จ่าย</div>
                        <div className="text-lg font-semibold text-primary">{formatCurrency(record.cost)}</div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMaintenanceDocumentDialog(record)}
                          >
                            <FilePlus className="mr-2 h-4 w-4" />
                            เพิ่มเอกสาร
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openSensitiveAction("maintenance", "edit", record.id)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            แก้ไข
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSensitiveAction("maintenance", "history", record.id)}
                          >
                            <History className="mr-2 h-4 w-4" />
                            ประวัติ
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openSensitiveAction("maintenance", "delete", record.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            ลบ
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-muted-foreground">รายละเอียดการซ่อม</p>
                          <p className="text-foreground whitespace-pre-wrap">
                            {record.workDone || "-"}
                          </p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-muted-foreground">อาการ/ปัญหา</p>
                          <p className="text-foreground whitespace-pre-wrap">
                            {record.issueSummary || "-"}
                          </p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-muted-foreground">ผู้ให้บริการ</p>
                          <p className="text-foreground">
                            {record.supplierName || "-"}
                            {record.technician ? ` • ${record.technician}` : ""}
                          </p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-muted-foreground">แผนกที่เกี่ยวข้อง</p>
                          <p className="text-foreground">
                            {record.departmentName ?? record.department ?? "-"}
                          </p>
                        </div>
                        {record.warrantyUntil && (
                          <div className="space-y-1 text-sm">
                            <p className="font-medium text-muted-foreground">ประกันการซ่อม</p>
                            <p className="text-foreground">
                              ถึง {new Date(record.warrantyUntil).toLocaleDateString("th-TH")}
                            </p>
                          </div>
                        )}
                        {record.partsReplaced.length > 0 && (
                          <div className="space-y-1 text-sm">
                            <p className="font-medium text-muted-foreground">อะไหล่ที่เปลี่ยน</p>
                            <ul className="list-disc space-y-1 pl-5 text-foreground">
                              {record.partsReplaced.map((part, index) => (
                                <li key={`${record.id}-part-${index}`}>{part}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {record.notes && (
                        <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
                          หมายเหตุ: {record.notes}
                        </div>
                      )}

                      {record.attachments.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-2">
                          {record.attachments.some((attachment) => !isImageAttachment(attachment)) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openAttachmentViewer(
                                  "maintenance",
                                  record.id,
                                  record.documentNo,
                                  record.attachments.filter((attachment) => !isImageAttachment(attachment)),
                                )
                              }
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              ดูเอกสาร
                            </Button>
                          )}
                          {record.attachments.some(isImageAttachment) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openAttachmentViewer(
                                  "maintenance",
                                  record.id,
                                  record.documentNo,
                                  record.attachments.filter(isImageAttachment),
                                )
                              }
                            >
                              <ImageIcon className="mr-2 h-4 w-4" />
                              ดูรูปภาพ
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="replacement" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">จำนวนการซื้อใหม่</CardTitle>
                <CardDescription>บันทึกทั้งหมดในระบบ</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">{replacementRecords.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">งบประมาณรวม</CardTitle>
                <CardDescription>รวมค่าใช้จ่ายซื้อใหม่/ทดแทน</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">{formatCurrency(replacementTotalCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">กำลังดำเนินการ</CardTitle>
                <CardDescription>งานที่อยู่ระหว่างสั่งซื้อ</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">{replacementOrderedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">รับสินค้าแล้ว</CardTitle>
                <CardDescription>งานที่ปิดจบพร้อมใช้งาน</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-primary">{replacementReceivedCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>สถานะการซื้อ</CardTitle>
                <CardDescription>ดูความคืบหน้าการซื้อใหม่/ทดแทน</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                {replacementRecords.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    ยังไม่มีข้อมูลการซื้อใหม่/ทดแทน
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={replacementStatusSummary.map((item, index) => ({
                          name: REPLACEMENT_STATUS_LABELS[item.status],
                          value: item.count,
                          fill: PIE_COLORS[index % PIE_COLORS.length],
                        }))}
                        dataKey="value"
                        innerRadius={50}
                      >
                        {replacementStatusSummary.map((_, index) => (
                          <Cell key={`replacement-status-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} รายการ`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>งบประมาณตามผู้ขาย</CardTitle>
                <CardDescription>วิเคราะห์ผู้ขายที่ใช้จ่ายสูงสุด</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                {replacementSupplierTotals.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    ยังไม่มีข้อมูลค่าใช้จ่าย
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={replacementSupplierTotals}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="supplier" hide={replacementSupplierTotals.length > 4} />
                      <Tooltip formatter={(value: number | string) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="value" name="งบประมาณ" fill={PIE_COLORS[2]} radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>แนวโน้มการซื้อ</CardTitle>
                <CardDescription>ติดตามงบประมาณจัดซื้อรายเดือน</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                {replacementTrendData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    ยังไม่มีข้อมูลแนวโน้ม
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={replacementTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number | string) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line type="monotone" dataKey="value" name="งบประมาณ" stroke={PIE_COLORS[3]} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>หน่วยงานที่มีการซื้อใหม่/ทดแทน</CardTitle>
              <CardDescription>จำนวนการขอซื้อและงบประมาณตามหน่วยงาน</CardDescription>
            </CardHeader>
            <CardContent>
              {replacementDepartmentSummary.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  ยังไม่มีข้อมูลหน่วยงานที่ขอซื้อใหม่/ทดแทน
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 text-xs font-medium uppercase text-muted-foreground">
                    <span>หน่วยงาน</span>
                    <span className="text-center">จำนวนคำขอ</span>
                    <span className="text-right">งบประมาณ</span>
                  </div>
                  <div className="space-y-2">
                    {replacementDepartmentSummary.slice(0, 8).map((item) => (
                      <div
                        key={item.department}
                        className="grid grid-cols-3 items-center rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm"
                      >
                        <span className="truncate font-medium text-foreground" title={item.department}>
                          {item.department}
                        </span>
                        <span className="text-center text-muted-foreground">{item.count.toLocaleString()}</span>
                        <span className="text-right font-semibold text-primary">
                          {formatCurrency(item.totalCost)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="ค้นหาเลขที่เอกสารหรือหน่วยงาน"
                value={replacementSearchTerm}
                onChange={(event) => setReplacementSearchTerm(event.target.value)}
              />
            </div>
            {replacementSearchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setReplacementSearchTerm("")}>
                ล้างการค้นหา
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {replacementRecords.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                ยังไม่มีการบันทึกซื้อใหม่/ทดแทน
              </div>
            ) : filteredReplacementRecords.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                ไม่พบข้อมูลการซื้อใหม่/ทดแทนที่ตรงกับการค้นหา
              </div>
            ) : (
              filteredReplacementRecords.map((record) => {
                const equipment = record.equipmentId ? equipmentById.get(record.equipmentId) : null;
                return (
                  <Card key={record.id}>
                    <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold text-foreground">
                          เอกสาร {record.documentNo}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap gap-2 text-sm">
                          <span>
                            {equipment?.name ?? record.equipmentName ?? "ไม่ทราบครุภัณฑ์"}
                            {(equipment?.assetNumber ?? record.equipmentAssetNumber)
                              ? ` • ${equipment?.assetNumber ?? record.equipmentAssetNumber}`
                              : ""}
                            {equipment?.model ? ` • ${equipment.model}` : ""}
                          </span>
                          {(equipment?.location ?? record.equipmentLocation) && (
                            <span>• {equipment?.location ?? record.equipmentLocation}</span>
                          )}
                          {record.orderDate && (
                            <span>
                              • สั่งซื้อเมื่อ {new Date(record.orderDate).toLocaleDateString("th-TH")}
                            </span>
                          )}
                          {record.receivedDate && (
                            <span>
                              • รับเมื่อ {new Date(record.receivedDate).toLocaleDateString("th-TH")}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <Badge variant={getReplacementStatusVariant(record.status)}>
                          {REPLACEMENT_STATUS_LABELS[record.status]}
                        </Badge>
                        <div className="text-xs text-muted-foreground">งบประมาณ</div>
                        <div className="text-lg font-semibold text-primary">{formatCurrency(record.cost)}</div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReplacementDocumentDialog(record)}
                          >
                            <FilePlus className="mr-2 h-4 w-4" />
                            เพิ่มเอกสาร
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openSensitiveAction("replacement", "edit", record.id)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            แก้ไข
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSensitiveAction("replacement", "history", record.id)}
                          >
                            <History className="mr-2 h-4 w-4" />
                            ประวัติ
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openSensitiveAction("replacement", "delete", record.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            ลบ
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-muted-foreground">ผู้ขาย/บริษัท</p>
                          <p className="text-foreground">{record.supplierName || "-"}</p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-muted-foreground">แผนกที่ร้องขอ</p>
                          <p className="text-foreground">
                            {record.departmentName ?? record.department ?? "-"}
                          </p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-muted-foreground">ผู้ร้องขอ</p>
                          <p className="text-foreground">{record.requestedBy || "-"}</p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-muted-foreground">ผู้อนุมัติ</p>
                          <p className="text-foreground">{record.approvedBy || "-"}</p>
                        </div>
                        {record.warrantyUntil && (
                          <div className="space-y-1 text-sm">
                            <p className="font-medium text-muted-foreground">ประกันสินค้า</p>
                            <p className="text-foreground">
                              ถึง {new Date(record.warrantyUntil).toLocaleDateString("th-TH")}
                            </p>
                          </div>
                        )}
                      </div>

                      {record.justification && (
                        <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
                          เหตุผล: {record.justification}
                        </div>
                      )}

                      {record.notes && (
                        <div className="rounded-lg border border-dashed bg-muted/10 p-3 text-sm text-muted-foreground">
                          หมายเหตุ: {record.notes}
                        </div>
                      )}

                      {record.attachments.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-2">
                          {record.attachments.some((attachment) => !isImageAttachment(attachment)) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openAttachmentViewer(
                                  "replacement",
                                  record.id,
                                  record.documentNo,
                                  record.attachments.filter((attachment) => !isImageAttachment(attachment)),
                                )
                              }
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              ดูเอกสาร
                            </Button>
                          )}
                          {record.attachments.some(isImageAttachment) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openAttachmentViewer(
                                  "replacement",
                                  record.id,
                                  record.documentNo,
                                  record.attachments.filter(isImageAttachment),
                                )
                              }
                            >
                              <ImageIcon className="mr-2 h-4 w-4" />
                              ดูรูปภาพ
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

      </Tabs>

      <Dialog
        open={isMaintenanceDocumentDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeMaintenanceDocumentDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มเอกสารงานซ่อม</DialogTitle>
            <DialogDescription>
              {maintenanceDocumentTarget
                ? `แนบไฟล์เพิ่มเติมให้เอกสาร ${maintenanceDocumentTarget.documentNo}`
                : "เลือกเอกสารงานซ่อมที่ต้องการเพิ่มไฟล์แนบ"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitMaintenanceDocument}>
            <div className="space-y-2">
              <Label htmlFor="maintenance-document-file">ไฟล์เอกสาร (PDF) (ไม่บังคับ)</Label>
              <Input
                id="maintenance-document-file"
                type="file"
                accept="application/pdf"
                onChange={handleMaintenanceDocumentFileChange}
                disabled={isUploadingMaintenanceDocument}
              />
              {maintenanceDocumentFile && (
                <p className="text-xs text-muted-foreground">ไฟล์: {maintenanceDocumentFile.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-document-images">แนบรูปภาพ (สูงสุด 3 ไฟล์)</Label>
              <Input
                id="maintenance-document-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleMaintenanceDocumentImagesChange}
                disabled={isUploadingMaintenanceDocument}
              />
              {maintenanceDocumentImages.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  รูปภาพ:
                  {maintenanceDocumentImages.map((file) => ` ${file.name}`).join(", ")}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              สามารถแนบไฟล์เอกสาร PDF 1 ไฟล์ รูปภาพไม่เกิน {MAX_IMAGE_ATTACHMENTS} รูป หรือเลือกเฉพาะประเภทใดประเภทหนึ่งได้
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeMaintenanceDocumentDialog}
                disabled={isUploadingMaintenanceDocument}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isUploadingMaintenanceDocument}>
                {isUploadingMaintenanceDocument ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึกเอกสาร"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isReplacementDocumentDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeReplacementDocumentDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มเอกสารซื้อใหม่/ทดแทน</DialogTitle>
            <DialogDescription>
              {replacementDocumentTarget
                ? `แนบไฟล์เพิ่มเติมให้เอกสาร ${replacementDocumentTarget.documentNo}`
                : "เลือกเอกสารซื้อใหม่/ทดแทนที่ต้องการเพิ่มไฟล์แนบ"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitReplacementDocument}>
            <div className="space-y-2">
              <Label htmlFor="replacement-document-file">ไฟล์เอกสาร (PDF) (ไม่บังคับ)</Label>
              <Input
                id="replacement-document-file"
                type="file"
                accept="application/pdf"
                onChange={handleReplacementDocumentFileChange}
                disabled={isUploadingReplacementDocument}
              />
              {replacementDocumentFile && (
                <p className="text-xs text-muted-foreground">ไฟล์: {replacementDocumentFile.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="replacement-document-images">แนบรูปภาพ (สูงสุด 3 ไฟล์)</Label>
              <Input
                id="replacement-document-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleReplacementDocumentImagesChange}
                disabled={isUploadingReplacementDocument}
              />
              {replacementDocumentImages.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  รูปภาพ:
                  {replacementDocumentImages.map((file) => ` ${file.name}`).join(", ")}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              สามารถแนบไฟล์เอกสาร PDF 1 ไฟล์ รูปภาพไม่เกิน {MAX_IMAGE_ATTACHMENTS} รูป หรือเลือกเฉพาะประเภทใดประเภทหนึ่งได้
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeReplacementDocumentDialog}
                disabled={isUploadingReplacementDocument}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isUploadingReplacementDocument}>
                {isUploadingReplacementDocument ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึกเอกสาร"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(attachmentViewer)}
        onOpenChange={(open) => {
          if (!open) {
            setAttachmentViewer(null);
            setViewerAttachments([]);
            setActiveImageIndex(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] w-full max-w-4xl overflow-hidden bg-background p-0 sm:rounded-xl">
          {attachmentViewer && (
            <div
              className={cn(
                "p-6",
                imageViewerAttachments.length > 0
                  ? "grid gap-6 sm:grid-cols-[minmax(0,2fr),minmax(0,1fr)]"
                  : "space-y-6",
              )}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {attachmentViewer.recordTitle} • ไฟล์แนบ
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {imageViewerAttachments.length > 0 && documentViewerAttachments.length === 0
                      ? "รูปภาพที่แนบไว้ทั้งหมด"
                      : documentViewerAttachments.length > 0 && imageViewerAttachments.length === 0
                        ? "เอกสารที่แนบไว้ทั้งหมด"
                        : "รายการไฟล์แนบทั้งหมด"}
                  </p>
                </div>

                {imageViewerAttachments.length > 0 && (
                  <div className="relative flex min-h-[360px] items-center justify-center rounded-lg border bg-muted/10">
                    {isAttachmentViewerLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        กำลังโหลดไฟล์แนบ...
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="group absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 shadow-sm transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
                          onClick={() =>
                            setActiveImageIndex((index) => (index === null ? null : Math.max(0, index - 1)))
                          }
                          disabled={activeImageIndex === null || activeImageIndex <= 0}
                        >
                          <span className="sr-only">ภาพก่อนหน้า</span>
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          className="group absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 shadow-sm transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
                          onClick={() =>
                            setActiveImageIndex((index) =>
                              index === null ? null : Math.min(imageViewerAttachments.length - 1, index + 1),
                            )
                          }
                          disabled={
                            activeImageIndex === null || activeImageIndex >= imageViewerAttachments.length - 1
                          }
                        >
                          <span className="sr-only">ภาพถัดไป</span>
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        {activeImageIndex !== null && imageViewerAttachments[activeImageIndex] ? (
                          <div className="flex flex-col items-center gap-3">
                            <img
                              src={imageViewerAttachments[activeImageIndex].previewUrl}
                              alt={imageViewerAttachments[activeImageIndex].name}
                              className="max-h-[60vh] w-auto max-w-full rounded-lg object-contain"
                            />
                            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                              <span>{imageViewerAttachments[activeImageIndex].name}</span>
                              <span>{formatFileSize(imageViewerAttachments[activeImageIndex].size)}</span>
                              {imageViewerAttachments[activeImageIndex].uploadedAt && (
                                <span>
                                  {new Date(imageViewerAttachments[activeImageIndex].uploadedAt!).toLocaleDateString(
                                    "th-TH",
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">เลือกภาพจากแถบด้านขวาเพื่อแสดง</div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {imageViewerAttachments.length === 0 && documentViewerAttachments.length === 0 && !isAttachmentViewerLoading && (
                  <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    ไม่พบไฟล์แนบในกลุ่มนี้
                  </div>
                )}
              </div>

              <ScrollArea className={cn("h-[70vh] pr-2", imageViewerAttachments.length === 0 && "h-auto")}>
                <div className="space-y-4">
                  {imageViewerAttachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        รูปภาพ ({imageViewerAttachments.length})
                      </p>
                      <div className="space-y-2">
                        {imageViewerAttachments.map((attachment, index) => (
                          <button
                            key={attachment.id ?? `${attachmentViewer.recordId}-image-${index}`}
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg border bg-muted/10 p-2 text-left transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary",
                              activeImageIndex === index && "border-primary bg-primary/5",
                            )}
                            onClick={() => setActiveImageIndex(index)}
                          >
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border bg-background">
                              {attachment.previewUrl ? (
                                <img
                                  src={attachment.previewUrl}
                                  alt={attachment.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{attachment.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.size)}
                                {attachment.uploadedAt
                                  ? ` • ${new Date(attachment.uploadedAt).toLocaleDateString("th-TH")}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!attachment.previewUrl}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenAttachmentInNewTab(attachment.previewUrl);
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleAttachmentManageClick(
                                    attachmentViewer.entityType,
                                    attachmentViewer.recordId,
                                    attachmentViewer.recordTitle,
                                    attachment,
                                  );
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {documentViewerAttachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        เอกสาร ({documentViewerAttachments.length})
                      </p>
                      <div className="space-y-2">
                        {documentViewerAttachments.map((attachment) => (
                          <div
                            key={attachment.id ?? `${attachmentViewer.recordId}-${attachment.name}`}
                            className="flex flex-col gap-3 rounded-lg border bg-muted/15 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <FileText className="h-4 w-4" />
                                <span className="truncate">{attachment.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.size)}
                                {attachment.uploadedAt
                                  ? ` • ${new Date(attachment.uploadedAt).toLocaleDateString("th-TH")}`
                                  : ""}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!attachment.previewUrl}
                                onClick={() => handleOpenAttachmentInNewTab(attachment.previewUrl)}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                เปิดเอกสาร
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleAttachmentManageClick(
                                    attachmentViewer.entityType,
                                    attachmentViewer.recordId,
                                    attachmentViewer.recordTitle,
                                    attachment,
                                  )
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                ลบไฟล์
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(attachmentDeleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeletingAttachment) {
            setAttachmentDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {attachmentDeleteTarget ? `ไฟล์แนบ • ${attachmentDeleteTarget.recordTitle}` : "ไฟล์แนบ"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              เลือก "ดูไฟล์" เพื่อเปิด หรือ "ลบไฟล์" เพื่อเอาออกจากเอกสาร
            </AlertDialogDescription>
          </AlertDialogHeader>
          {attachmentDeleteTarget && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">{attachmentDeleteTarget.attachment.name}</div>
              <div>ขนาดไฟล์: {formatFileSize(attachmentDeleteTarget.attachment.size)}</div>
              <div>
                ประเภทไฟล์:{" "}
                {attachmentDeleteTarget.attachment.type
                  ? attachmentDeleteTarget.attachment.type.toUpperCase()
                  : "ไม่ทราบ"}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!attachmentDeleteTarget) return;
                handlePreviewAttachment(
                  attachmentDeleteTarget.recordTitle,
                  attachmentDeleteTarget.attachment,
                );
              }}
              disabled={!attachmentDeleteTarget || isDeletingAttachment}
            >
              ดูไฟล์
            </Button>
            <AlertDialogCancel
              onClick={() => {
                if (!isDeletingAttachment) {
                  setAttachmentDeleteTarget(null);
                }
              }}
              disabled={isDeletingAttachment}
            >
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAttachment}
              disabled={isDeletingAttachment}
            >
              {isDeletingAttachment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                "ลบไฟล์"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={sensitiveDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setSensitiveDialogOpen(true);
          } else {
            closeSensitiveDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{sensitiveTitle}</DialogTitle>
            <DialogDescription>{sensitiveDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {sensitiveRequiresPassword && (
              <div className="space-y-2">
                <Label htmlFor="sensitive-password">รหัสผ่าน *</Label>
                <Input
                  id="sensitive-password"
                  type="password"
                  autoComplete="current-password"
                  value={sensitivePassword}
                  onChange={(event) => setSensitivePassword(event.target.value)}
                  placeholder="กรอกรหัสผ่านเพื่อยืนยัน"
                  required
                />
              </div>
            )}
            {sensitiveRequiresReason && (
              <div className="space-y-2">
                <Label htmlFor="sensitive-reason">เหตุผล *</Label>
                <Textarea
                  id="sensitive-reason"
                  value={sensitiveReason}
                  onChange={(event) => setSensitiveReason(event.target.value)}
                  placeholder="ระบุเหตุผลประกอบการดำเนินการ..."
                  minLength={5}
                  required
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              ระบบจะบันทึกผู้ดำเนินการ เวลา และเหตุผลไว้ในประวัติการแก้ไข
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeSensitiveDialog}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleSensitiveActionSubmit} disabled={sensitiveLoading}>
              {sensitiveLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังตรวจสอบ...
                </>
              ) : (
                sensitiveButtonLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isHistoryDialogOpen}
        onOpenChange={(open) => {
          setHistoryDialogOpen(open);
          if (!open) {
            setAuditHistoryEntries([]);
            setHistoryContext(null);
          }
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              ประวัติการแก้ไข
              {historyContext ? ` • ${historyContext.title}` : ""}
            </DialogTitle>
            <DialogDescription>
              ตรวจสอบรายละเอียดการสร้าง แก้ไข หรือลบ พร้อมเหตุผลและผู้ดำเนินการ
            </DialogDescription>
          </DialogHeader>
          {isHistoryLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              กำลังโหลดประวัติ...
            </div>
          ) : auditHistoryEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              ยังไม่มีประวัติการแก้ไขสำหรับใบลงรับนี้
            </div>
          ) : (
            <div className="space-y-4">
              {auditHistoryEntries.map((entry) => {
                const entityType = historyContext?.type ?? "receipt";
                const oldValue = formatHistoryValue(entityType, entry.fieldName, entry.oldValue);
                const newValue = formatHistoryValue(entityType, entry.fieldName, entry.newValue);
                const actionLabel =
                  entry.action === "INSERT"
                    ? "สร้างใหม่"
                    : entry.action === "UPDATE"
                      ? "แก้ไข"
                      : "ลบ";
                const actionVariant: "secondary" | "outline" | "destructive" =
                  entry.action === "INSERT"
                    ? "secondary"
                    : entry.action === "UPDATE"
                      ? "outline"
                      : "destructive";

                return (
                  <div key={entry.id} className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={actionVariant as any}>{actionLabel}</Badge>
                        <span className="text-sm font-medium text-foreground">
                          {getAuditFieldLabel(entityType, entry.fieldName)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.changedAt).toLocaleString("th-TH", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">ก่อนแก้ไข</p>
                        <div className="mt-1 rounded-md bg-background/70 p-2 text-sm text-foreground whitespace-pre-wrap">
                          {oldValue}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">หลังแก้ไข</p>
                        <div className="mt-1 rounded-md bg-background/70 p-2 text-sm text-foreground whitespace-pre-wrap">
                          {newValue}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>โดย: {entry.changedByName ?? "ไม่ทราบผู้ใช้"}</span>
                      {entry.reason && <span>เหตุผล: {entry.reason}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAttachmentPreviewOpen}
        onOpenChange={(open) => {
          setAttachmentPreviewOpen(open);
          if (!open) {
            setPreviewAttachment(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {previewAttachment
                ? `ไฟล์แนบ: ${previewAttachment.attachment.name}`
                : "ไฟล์แนบ"}
            </DialogTitle>
            <DialogDescription>
              {previewAttachment
                ? `จากใบลงรับ ${previewAttachment.receiptTitle}`
                : "เลือกไฟล์แนบเพื่อดูรายละเอียด"}
            </DialogDescription>
          </DialogHeader>
          {previewAttachment ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <p className="font-medium text-foreground">{previewAttachment.attachment.name}</p>
                <p className="text-muted-foreground">
                  ประเภทไฟล์: {previewAttachment.attachment.type || "ไม่ทราบ"}
                </p>
                <p className="text-muted-foreground">ขนาดไฟล์: {formatFileSize(previewAttachment.attachment.size)}</p>
              </div>
              {previewAttachment.attachment.previewUrl ? (
                <>
                  {previewAttachment.attachment.type.startsWith("image/") ? (
                    <div className="overflow-hidden rounded-lg border bg-muted/30 p-2">
                      <img
                        src={previewAttachment.attachment.previewUrl}
                        alt={previewAttachment.attachment.name}
                        className="mx-auto max-h-[480px] w-auto rounded-md"
                      />
                    </div>
                  ) : previewAttachment.attachment.type === "application/pdf" ? (
                    <div className="h-[480px] w-full overflow-hidden rounded-lg border">
                      <iframe
                        src={previewAttachment.attachment.previewUrl}
                        title={previewAttachment.attachment.name}
                        className="h-full w-full"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                      ระบบไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้ กรุณาเปิดไฟล์ในแท็บใหม่
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <a
                        href={previewAttachment.attachment.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        เปิดในแท็บใหม่
                      </a>
                    </Button>
                    <Button variant="secondary" asChild>
                      <a
                        href={previewAttachment.attachment.previewUrl}
                        download={previewAttachment.attachment.name}
                      >
                        ดาวน์โหลดไฟล์
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  ไฟล์แนบบันทึกไว้ในระบบเดิมและยังไม่มีตัวอย่างให้เปิดดูในสภาพแวดล้อมนี้
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              ไม่พบข้อมูลไฟล์แนบ
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setDeleteDialogOpen(true);
          } else {
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteDialogDetails?.title ?? "ยืนยันการลบ"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialogDetails?.description ?? "ต้องการลบรายการนี้ออกจากระบบหรือไม่"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDeleteDialog}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDialogDetails?.confirmLabel ?? "ลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StockInkToner;
