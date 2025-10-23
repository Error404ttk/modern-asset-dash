import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Plus, Building2, Package, Store, FileText, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";

const inkDb = supabase as SupabaseClient<any>;

type InkType = "ink" | "toner" | "drum" | "ribbon";

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

const INK_TYPE_LABELS: Record<InkType, string> = {
  ink: "Ink",
  toner: "Toner",
  drum: "Drum",
  ribbon: "ผ้าหมึก",
};

const RECEIPT_STORAGE_BUCKET = "ink-receipts";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
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

  const [isAttachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{
    attachment: AttachmentMeta;
    receiptTitle: string;
  } | null>(null);

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
        description: `ไม่สามารถโหลดยี่ห้อหมึกได้: ${getErrorMessage(error)}`,
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
        description: `ไม่สามารถโหลดข้อมูลหมึกพิมพ์ได้: ${getErrorMessage(error)}`,
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
        .order("received_at", { ascending: false });
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
          storagePath: attachment.storage_path ?? undefined,
          uploadedAt: attachment.uploaded_at ?? undefined,
        })),
      }));

      setReceipts(mapped);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดใบลงรับสินค้าได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  }, []);

  const uploadReceiptAttachments = useCallback(
    async (receiptId: string, attachments: AttachmentMeta[]) => {
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
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        await Promise.all([fetchBrands(), fetchSuppliers(), fetchProducts(), fetchReceipts()]);
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fetchBrands, fetchSuppliers, fetchProducts, fetchReceipts]);

  const brandById = useMemo(() => new Map(brands.map((item) => [item.id, item])), [brands]);
  const supplierById = useMemo(() => new Map(suppliers.map((item) => [item.id, item])), [suppliers]);
  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);
  const brandUsage = useMemo(() => {
    const usage = new Map<string, number>();
    products.forEach((product) => {
      usage.set(product.brandId, (usage.get(product.brandId) ?? 0) + 1);
    });
    return usage;
  }, [products]);

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
        title: product ? `ลบหมึกพิมพ์ ${product.modelCode}` : "ลบหมึกพิมพ์",
        description:
          receiptCount > 0
            ? `การลบจะนำหมึกนี้ออกจากใบลงรับจำนวน ${receiptCount} รายการด้วย คุณต้องการดำเนินการต่อหรือไม่?`
            : "การลบจะนำหมึกนี้ออกจากระบบ คุณต้องการดำเนินการต่อหรือไม่?",
        confirmLabel: "ลบหมึกพิมพ์",
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
          ? `การลบยี่ห้อนี้จะนำหมึกที่เกี่ยวข้องจำนวน ${relatedProducts.length} รายการ และลบออกจากใบลงรับ ${receiptCount} รายการด้วย คุณต้องการดำเนินการต่อหรือไม่?`
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
        description: "กรุณาระบุชื่อยี่ห้อหมึก",
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
          throw new Error("ไม่พบข้อมูลรุ่นหมึกสำหรับรายการนี้");
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
          description: "เพิ่มข้อมูลหมึกพิมพ์เรียบร้อยแล้ว",
        });
      }

      await Promise.all([fetchProducts(), fetchBrands(), fetchReceipts()]);
      setProductDialogOpen(false);
      resetProductForm();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `บันทึกข้อมูลหมึกพิมพ์ไม่สำเร็จ: ${getErrorMessage(error)}`,
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

  const handleReceiptAttachments = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setReceiptForm((prev) => {
      if (prev.attachments.length > 0) {
        releaseAttachmentCollection(prev.attachments);
      }

      return {
        ...prev,
        attachments: files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      };
    });
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
              description: "ไม่สามารถลบหมึกที่ถูกใช้งานในใบลงรับได้",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "ลบสำเร็จ",
            description: "นำหมึกออกจากระบบแล้ว",
          });
          await Promise.all([fetchProducts(), fetchReceipts()]);
        }
      } catch (error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: `ลบข้อมูลหมึกไม่สำเร็จ: ${getErrorMessage(error)}`,
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
            description: "ยังมีหมึกพิมพ์ที่ใช้ยี่ห้อนี้อยู่",
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

      for (const item of itemPayload) {
        const { data: inventoryRow, error: inventoryError } = await inkDb
          .from("ink_inventory")
          .select("stock_quantity")
          .eq("id", item.inventory_id)
          .single();
        if (inventoryError) throw inventoryError;

        const currentStock = Number(inventoryRow?.stock_quantity ?? 0);
        const newStock = currentStock + Number(item.quantity ?? 0);

        const { error: updateInventoryError } = await inkDb
          .from("ink_inventory")
          .update({ stock_quantity: newStock })
          .eq("id", item.inventory_id);
        if (updateInventoryError) throw updateInventoryError;
      }

      if (receiptForm.attachments.length > 0) {
        await uploadReceiptAttachments(receiptId, receiptForm.attachments);
      }

      releaseAttachmentCollection(receiptForm.attachments);
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

  const currentReceiptTotal = receiptForm.items.reduce(
    (sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0),
    0,
  );

  const handlePreviewAttachment = async (receiptTitle: string, attachment: AttachmentMeta) => {
    try {
      if (attachment.previewUrl) {
        setPreviewAttachment({ attachment, receiptTitle });
        setAttachmentPreviewOpen(true);
        return;
      }

      if (attachment.storagePath) {
        const { data, error } = await supabase.storage
          .from(RECEIPT_STORAGE_BUCKET)
          .createSignedUrl(attachment.storagePath, 120);
        if (error) throw error;
        const signedUrl = data?.signedUrl;
        if (!signedUrl) {
          throw new Error("ไม่สามารถสร้างลิงก์สำหรับไฟล์แนบได้");
        }
        setPreviewAttachment({
          attachment: { ...attachment, previewUrl: signedUrl },
          receiptTitle,
        });
        setAttachmentPreviewOpen(true);
        return;
      }

      toast({
        title: "ไม่พบไฟล์แนบ",
        description: "ไฟล์นี้ยังไม่มีข้อมูลในระบบ กรุณาตรวจสอบอีกครั้ง",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถเปิดไฟล์แนบได้: ${getErrorMessage(error)}`,
        variant: "destructive",
      });
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        กำลังโหลดข้อมูลสต็อกหมึก...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stock Ink & Toner</h1>
          <p className="text-muted-foreground mt-2">
            จัดการหมึกพิมพ์ทุกประเภท ตั้งแต่ข้อมูลสินค้า ผู้ขาย ไปจนถึงใบลงรับและสถิติภาพรวม
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isReceiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <FileText className="mr-2 h-4 w-4" />
                ลงรับสินค้า
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>บันทึกใบลงรับสินค้า</DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลผู้ขาย สินค้า และแนบไฟล์ที่เกี่ยวข้อง ระบบจะคำนวณยอดรวมอัตโนมัติ
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-6" onSubmit={handleAddReceipt}>
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
                    บันทึกใบลงรับ
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
                เพิ่มหมึกพิมพ์
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {productDialogMode === "create" ? "เพิ่มข้อมูลหมึกพิมพ์" : "แก้ไขข้อมูลหมึกพิมพ์"}
                </DialogTitle>
                <DialogDescription>
                  {productDialogMode === "create"
                    ? "รองรับหมึกหลายประเภท ทั้ง Ink, Toner, Drum และผ้าหมึก"
                    : "ปรับปรุงข้อมูลหมึกพิมพ์ที่เลือกให้ถูกต้องและเป็นปัจจุบัน"}
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
                  <Label htmlFor="inkType">ประเภทหมึก *</Label>
                  <Select
                    value={productForm.inkType}
                    onValueChange={(value: InkType) =>
                      setProductForm((prev) => ({ ...prev, inkType: value }))
                    }
                  >
                    <SelectTrigger id="inkType">
                      <SelectValue placeholder="เลือกประเภทหมึก" />
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
                    {productDialogMode === "create" ? "บันทึกข้อมูลหมึกพิมพ์" : "บันทึกการแก้ไข"}
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
                  {brandDialogMode === "create" ? "เพิ่มยี่ห้อหมึก" : "แก้ไขยี่ห้อหมึก"}
                </DialogTitle>
                <DialogDescription>
                  {brandDialogMode === "create"
                    ? "กรอกชื่อยี่ห้อหมึกพิมพ์ที่ต้องการเพิ่มในระบบ"
                    : "แก้ไขชื่อยี่ห้อหมึกพิมพ์ที่เลือก"}
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
                    ยังไม่มียี่ห้อหมึกในระบบ
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
        <TabsList className="grid w-full grid-cols-1 gap-2 sm:grid-cols-4">
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="products">ข้อมูลหมึก</TabsTrigger>
          <TabsTrigger value="suppliers">ผู้ขาย</TabsTrigger>
          <TabsTrigger value="receipts">ใบลงรับ</TabsTrigger>
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
                <CardTitle className="text-sm text-muted-foreground">จำนวนรุ่นหมึก</CardTitle>
                <CardDescription>หมึกทั้งหมดในคลัง</CardDescription>
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
                กรองข้อมูลสถิติได้ตามยี่ห้อ ประเภทหมึก ผู้ขาย และปีที่ต้องการ
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
                  <Label>ประเภทหมึก</Label>
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
                <CardDescription>ดูภาพรวมของมูลค่าใบลงรับที่แบ่งตามยี่ห้อหมึก</CardDescription>
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
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
              <CardDescription>ดูภาพรวมการลงรับหมึกในแต่ละเดือน</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="value" name="มูลค่าลงรับ (บาท)" stroke="#22c55e" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>รายการหมึกพิมพ์ทั้งหมด</CardTitle>
              <CardDescription>
                แสดงข้อมูลรุ่นหมึก ประเภท ยี่ห้อ จำนวนคงเหลือ และสถานะสต็อก
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
                        ยังไม่มีข้อมูลหมึก
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
                          aria-label={`แก้ไขหมึก ${product.modelCode}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog("product", product.id)}
                          aria-label={`ลบหมึก ${product.modelCode}`}
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
            <CardTitle>ยี่ห้อหมึก</CardTitle>
            <CardDescription>
              จัดการรายการยี่ห้อหมึกและตรวจสอบจำนวนรุ่นที่ใช้งานในระบบ
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
                filteredReceipts.map((receipt) => {
                  const supplierName =
                    receipt.supplierName || supplierById.get(receipt.supplierId)?.name || "ไม่ทราบผู้ขาย";
                  const totalAmount = receipt.items.reduce((sum, item) => sum + getLineTotal(item), 0);

                  return (
                    <Card key={receipt.id} className="border border-dashed">
                      <CardHeader>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <CardTitle className="text-lg font-semibold text-foreground">
                              เอกสาร {receipt.documentNo}
                            </CardTitle>
                            <CardDescription>
                              {supplierName} • ลงรับเมื่อ {new Date(receipt.receivedAt).toLocaleDateString("th-TH")}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">ยอดรวม</div>
                            <div className="text-xl font-semibold text-primary">
                              {formatCurrency(totalAmount)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="overflow-x-auto">
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
                              {receipt.items.map((item, index) => {
                                const product = productById.get(item.productId);
                                return (
                                  <TableRow key={`${receipt.id}-item-${index}`}>
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
                        {receipt.attachments.length > 0 && (
                          <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
                            <div className="font-medium text-foreground">ไฟล์แนบ</div>
                            <ul className="mt-2 space-y-3">
                              {receipt.attachments.map((attachment, index) => (
                                <li
                                  key={`${receipt.id}-attachment-${index}`}
                                  className="flex flex-col gap-2 rounded-md border border-dashed bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div>
                                    <p className="font-medium text-foreground">{attachment.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {attachment.type || "ไม่ระบุประเภท"} • {formatFileSize(attachment.size)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePreviewAttachment(receipt.documentNo, attachment)}
                                    >
                                      ดูไฟล์
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {receipt.note && (
                          <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
                            หมายเหตุ: {receipt.note}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
