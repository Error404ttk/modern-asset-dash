import { useState, useRef, useEffect, useMemo, useCallback, ChangeEvent } from "react";
import { Save, ArrowLeft, Upload, Computer, Monitor, Loader2, Camera, X, Info, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BASE_EQUIPMENT_TYPES, type EquipmentTypeOption } from "@/data/equipmentTypes.ts";
import { TechnicalSpecRecord } from "@/data/technicalSpecs";
import { getWarrantyStatusInfo } from "@/lib/warranty";
import { cn } from "@/lib/utils";
import { normalizeAssetNumber } from "@/lib/asset-number";
import QuickScanDialog from "@/components/scanner/QuickScanDialog";

const STATUS_VARIANTS: Record<string, { label: string; className: string }> = {
  available: { label: "พร้อมใช้งาน", className: "border border-emerald-200 bg-emerald-100 text-emerald-700" },
  borrowed: { label: "ถูกยืม", className: "border border-blue-200 bg-blue-100 text-blue-700" },
  maintenance: { label: "ซ่อมบำรุง", className: "border border-amber-200 bg-amber-100 text-amber-700" },
  damaged: { label: "ชำรุด", className: "border border-rose-200 bg-rose-100 text-rose-700" },
  pending_disposal: { label: "รอจำหน่าย", className: "border border-slate-200 bg-slate-100 text-slate-700" },
  disposed: { label: "จำหน่าย", className: "border border-purple-200 bg-purple-100 text-purple-700" },
  lost: { label: "สูญหาย", className: "border border-rose-200 bg-rose-100 text-rose-700" },
};

const getStatusDisplay = (status: string | null | undefined) => {
  if (!status) {
    return {
      label: "-",
      className: "border border-muted-foreground/20 bg-muted/60 text-muted-foreground",
    };
  }

  const normalized = status.trim().toLowerCase();
  if (!normalized) {
    return {
      label: "-",
      className: "border border-muted-foreground/20 bg-muted/60 text-muted-foreground",
    };
  }

  return (
    STATUS_VARIANTS[normalized] || {
      label: status,
      className: "border border-muted-foreground/20 bg-muted/60 text-muted-foreground",
    }
  );
};

type AssetRecord = {
  assetNumber: string;
  basePrefix: string;
  sequence: number | null;
  name: string | null;
  status: string | null;
  department: string | null;
  location: string | null;
};

const compareAssetRecords = (a: AssetRecord, b: AssetRecord) => {
  const baseA = a.basePrefix || a.assetNumber;
  const baseB = b.basePrefix || b.assetNumber;

  const baseCompare = baseA.localeCompare(baseB, 'th', {
    numeric: true,
    sensitivity: 'base',
  });

  if (baseCompare !== 0) return baseCompare;

  const seqA = a.sequence;
  const seqB = b.sequence;

  if (seqA !== null && seqB !== null && seqA !== seqB) {
    return seqA - seqB;
  }

  if (seqA !== null && seqB === null) return -1;
  if (seqA === null && seqB !== null) return 1;

  return a.assetNumber.localeCompare(b.assetNumber, 'th', {
    numeric: true,
    sensitivity: 'base',
  });
};

type Vendor = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
};

type EquipmentBrand = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export default function AddEquipment() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [equipmentType, setEquipmentType] = useState("");
  const [equipmentSubType, setEquipmentSubType] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [warrantyEnd, setWarrantyEnd] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [activeEquipmentTypes, setActiveEquipmentTypes] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [brands, setBrands] = useState<EquipmentBrand[]>([]);
  const [brandsSupported, setBrandsSupported] = useState(true);
  const [assetRecords, setAssetRecords] = useState<AssetRecord[]>([]);
  const [checkingLatestAsset, setCheckingLatestAsset] = useState(false);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [modelValue, setModelValue] = useState("");
  const [serialNumberValue, setSerialNumberValue] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<"model" | "serial" | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | undefined>(undefined);
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [brandSelectionMode, setBrandSelectionMode] = useState<"manual" | "select">("manual");
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [technicalSpecs, setTechnicalSpecs] = useState<Record<string, any[]>>({
    cpu: [],
    ram: [],
    harddisk: [],
    os: [],
    office: [],
  });
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const FORM_STORAGE_KEY = "add-equipment-draft";
  const NONE_SPEC_VALUE = "__none__";

  const openScanner = (target: "model" | "serial") => {
    setScannerTarget(target);
    setScannerOpen(true);
  };

  const handleVendorSelect = (value: string) => {
    if (value === '__manual__') {
      setSelectedVendorId(undefined);
      setVendorName("");
      setVendorPhone("");
      setVendorAddress("");
      return;
    }

    setSelectedVendorId(value);
    const selectedVendor = vendors.find((vendor) => vendor.id === value);
    if (selectedVendor) {
      setVendorName(selectedVendor.name);
      setVendorPhone(selectedVendor.phone ?? "");
      setVendorAddress(selectedVendor.address ?? "");
    }
  };

  const handleClearVendorSelection = () => {
    setSelectedVendorId(undefined);
    setVendorName("");
    setVendorPhone("");
    setVendorAddress("");
  };

  const handleBrandSelectChange = (value: string) => {
    if (!brandsSupported) {
      setBrandSelectionMode("manual");
      setSelectedBrandId("");
      return;
    }
    if (value === '__manual__') {
      setBrandSelectionMode("manual");
      setSelectedBrandId("");
      return;
    }

    setBrandSelectionMode("select");
    setSelectedBrandId(value);

    const brand = brands.find((item) => item.id === value);
    if (brand && brandInputRef.current) {
      brandInputRef.current.value = brand.name || "";
      brandInputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      brandInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const handleBrandInputChange = (_event: ChangeEvent<HTMLInputElement>) => {
    if (brandSelectionMode === "select") {
      setBrandSelectionMode("manual");
      setSelectedBrandId("");
    }
  };

  const handleScanDetected = (value: string) => {
    const cleaned = value.trim();
    if (!cleaned) return;

    if (scannerTarget === "model") {
      setModelValue(cleaned);
      toast({
        title: "สแกนสำเร็จ",
        description: "กรอกรุ่น/โมเดลจากรหัสที่สแกนแล้ว",
      });
    } else if (scannerTarget === "serial") {
      setSerialNumberValue(cleaned);
      toast({
        title: "สแกนสำเร็จ",
        description: "กรอก Serial Number จากรหัสที่สแกนแล้ว",
      });
    }

    setScannerTarget(null);
  };

  const sequencePreview = useMemo(() => {
    const parsed = parseInt(quantity, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed.toString();
    }
    return "1";
  }, [quantity]);

  useEffect(() => {
    const savedRaw = localStorage.getItem(FORM_STORAGE_KEY);
    if (!savedRaw) {
      setHasRestoredDraft(true);
      return;
    }

    try {
      const saved = JSON.parse(savedRaw) as {
        fields?: Record<string, string>;
        state?: {
          equipmentType?: string;
          equipmentSubType?: string;
          quantity?: string;
          warrantyEnd?: string;
          modelValue?: string;
          serialNumberValue?: string;
          vendorName?: string;
          vendorPhone?: string;
          vendorAddress?: string;
          selectedVendorId?: string;
          selectedBrandId?: string;
          brandSelectionMode?: "manual" | "select";
        };
      };

      if (saved.state) {
        if (typeof saved.state.equipmentType === "string") {
          setEquipmentType(saved.state.equipmentType);
        }
        if (typeof saved.state.equipmentSubType === "string") {
          setEquipmentSubType(saved.state.equipmentSubType);
        }
        if (typeof saved.state.quantity === "string") {
          setQuantity(saved.state.quantity);
        }
        if (typeof saved.state.warrantyEnd === "string") {
          setWarrantyEnd(saved.state.warrantyEnd);
        }
        if (typeof saved.state.modelValue === "string") {
          setModelValue(saved.state.modelValue);
        }
        if (typeof saved.state.serialNumberValue === "string") {
          setSerialNumberValue(saved.state.serialNumberValue);
        }
        if (typeof saved.state.vendorName === "string") {
          setVendorName(saved.state.vendorName);
        }
        if (typeof saved.state.vendorPhone === "string") {
          setVendorPhone(saved.state.vendorPhone);
        }
        if (typeof saved.state.vendorAddress === "string") {
          setVendorAddress(saved.state.vendorAddress);
        }
        if (typeof saved.state.selectedVendorId === "string") {
          setSelectedVendorId(saved.state.selectedVendorId || undefined);
        }
        if (typeof saved.state.selectedBrandId === "string") {
          setSelectedBrandId(saved.state.selectedBrandId);
        }
        if (saved.state.brandSelectionMode === "select" || saved.state.brandSelectionMode === "manual") {
          setBrandSelectionMode(saved.state.brandSelectionMode);
        }
      }

      if (saved.fields) {
        requestAnimationFrame(() => {
          const form = formRef.current;
          if (!form) {
            setHasRestoredDraft(true);
            return;
          }
          Object.entries(saved.fields as Record<string, string>).forEach(([name, value]) => {
            const field = form.elements.namedItem(name);
            if (!field) return;
            if (field instanceof HTMLInputElement) {
              if (field.type === "file") return;
              if (field.type === "checkbox") {
                field.checked = value === "true";
                return;
              }
              if (field.type === "radio") {
                field.checked = field.value === value;
                return;
              }
            }
            if (field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
              field.value = value;
              field.dispatchEvent(new Event("input", { bubbles: true }));
              field.dispatchEvent(new Event("change", { bubbles: true }));
            }
          });
          setHasRestoredDraft(true);
        });
        return;
      }

      setHasRestoredDraft(true);
    } catch (error) {
      console.error("Failed to restore add equipment draft", error);
      setHasRestoredDraft(true);
    }
  }, []);

  // Load active equipment types and departments on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load equipment types
        const { data: equipmentTypesData } = await supabase
          .from('equipment_types')
          .select('*, equipment_type_details(*)')
          .eq('active', true)
          .order('name');

        if (equipmentTypesData) {
          // Map database equipment types to the format expected by the UI
          const mappedTypes = equipmentTypesData
            .map<EquipmentTypeOption | null>((dbType) => {
              const matchingType =
                baseEquipmentTypes.find((type) => type.code === dbType?.code) ||
                baseEquipmentTypes.find((type) => type.label === dbType?.name);

              const rawCode = typeof dbType?.code === "string" ? dbType.code.trim() : "";
              const rawName = typeof dbType?.name === "string" ? dbType.name.trim() : "";
              const label = rawName || matchingType?.label || rawCode;

              if (!label) {
                return null;
              }

              const fallbackCode = typeof matchingType?.code === "string" ? matchingType.code.trim() : "";
              const normalizedCode = (rawCode || fallbackCode || label).trim();
              const details = Array.isArray(dbType?.equipment_type_details)
                ? (dbType.equipment_type_details as Array<{
                    id: string;
                    name: string;
                    code: string;
                    active: boolean;
                  }>)
                : [];

              const activeDetails = details
                .filter(
                  (detail) =>
                    detail &&
                    detail.active &&
                    typeof detail.code === "string" &&
                    detail.code.trim().length > 0 &&
                    typeof detail.name === "string" &&
                    detail.name.trim().length > 0
                )
                .map((detail) => ({
                  value: detail.code.trim(),
                  label: detail.name.trim(),
                }))
                .sort((a, b) => a.value.localeCompare(b.value, "th"));

              let subTypes = activeDetails;
              if (subTypes.length === 0) {
                if (matchingType?.subTypes?.length) {
                  subTypes = matchingType.subTypes;
                } else {
                  subTypes = [{ value: normalizedCode, label }];
                }
              }

              return {
                value: normalizedCode.toLowerCase(),
                label,
                icon: matchingType?.icon || Computer,
                code: normalizedCode,
                subTypes,
              };
            })
            .filter((type): type is EquipmentTypeOption => Boolean(type));

          if (mappedTypes.length > 0) {
            const uniqueByValue = new Map<string, EquipmentTypeOption>();
            mappedTypes.forEach((type) => {
              if (!uniqueByValue.has(type.value)) {
                uniqueByValue.set(type.value, type);
              }
            });
            setActiveEquipmentTypes(Array.from(uniqueByValue.values()));
          }
        }

        // Load departments
        const { data: departmentsData } = await supabase
          .from('departments')
          .select('*')
          .eq('active', true)
          .order('name');

        if (departmentsData) {
          setDepartments(departmentsData);
        }

        const { data: vendorsData } = await supabase
          .from('vendors')
          .select('*')
          .eq('active', true)
          .order('name');

        if (vendorsData) {
          setVendors(vendorsData);
        }

        const { data: brandsData, error: brandsError, status: brandsStatus } = await supabase
          .from('equipment_brands')
          .select('*')
          .eq('active', true)
          .order('name');

        if (brandsError) {
          const message = typeof brandsError.message === "string" ? brandsError.message.toLowerCase() : "";
          const missingTable =
            brandsStatus === 404 ||
            brandsError.code === 'PGRST116' ||
            brandsError.code === '42P01' ||
            message.includes('not found') ||
            message.includes('does not exist');

          if (missingTable) {
            setBrandsSupported(false);
            setBrands([]);
            setBrandSelectionMode("manual");
            setSelectedBrandId("");
          } else {
            throw brandsError;
          }
        } else {
          setBrandsSupported(true);
          setBrands(brandsData || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Load technical specifications
  useEffect(() => {
    const loadTechnicalSpecs = async () => {
      try {
        const specsData: Record<string, TechnicalSpecRecord[]> = {};

        for (const specType of ['cpu', 'ram', 'harddisk', 'os', 'office'] as const) {
          try {
            // Skip loading technical specs until tables are created
            specsData[specType] = [];
          } catch (err) {
            console.error(`Failed to load ${specType} specs:`, err);
            specsData[specType] = [];
          }
        }

        setTechnicalSpecs(specsData);
      } catch (error) {
        console.error('Error loading technical specs:', error);
      }
    };

    loadTechnicalSpecs();
  }, []);

  useEffect(() => {
    if (!brandsSupported) {
      return;
    }
    if (brandSelectionMode !== "select") return;
    if (!selectedBrandId) return;
    const brand = brands.find((item) => item.id === selectedBrandId);
    if (!brand) {
      if (brands.length === 0) {
        return;
      }
      setBrandSelectionMode("manual");
      setSelectedBrandId("");
      return;
    }
    const input = brandInputRef.current;
    if (!input) return;

    const nextValue = brand.name || "";
    if (input.value !== nextValue) {
      input.value = nextValue;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, [brandSelectionMode, selectedBrandId, brands, brandsSupported]);

  useEffect(() => {
    if (!equipmentSubType) {
      setAssetRecords([]);
      setCheckingLatestAsset(false);
      setIsAssetDialogOpen(false);
      return;
    }

    let isActive = true;

    const fetchAssetNumbers = async () => {
      try {
        setCheckingLatestAsset(true);
        const prefixCandidates = new Set<string>();
        const normalizedSubType = equipmentSubType.trim();
        if (normalizedSubType) {
          prefixCandidates.add(normalizedSubType);
          const lastDash = normalizedSubType.lastIndexOf('-');
          if (lastDash !== -1) {
            const basePrefix = normalizedSubType.slice(0, lastDash);
            if (basePrefix) {
              prefixCandidates.add(basePrefix);
            }
          }
        }

        const prefixes = Array.from(prefixCandidates);

        let query = supabase
          .from('equipment')
          .select('asset_number, name, status, location, specs')
          .order('asset_number', { ascending: true });

        if (prefixes.length > 0) {
          const orFilter = prefixes
            .flatMap((prefix) => {
              const escapedPrefix = prefix.replace(/,/g, '\\,');
              return [
                `asset_number.ilike.${escapedPrefix}/%`,
                `asset_number.ilike.${escapedPrefix}-%`,
              ];
            })
            .join(',');

          if (orFilter.length > 0) {
            query = query.or(orFilter);
          }
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!isActive) return;

        const records = (data || [])
          .map((item) => {
            if (typeof item.asset_number !== 'string') return null;
            const assetNumber = item.asset_number.trim();
            if (!assetNumber) return null;

            const [baseRaw = '', sequenceRaw = ''] = assetNumber.split('/');
            const basePrefix = baseRaw.trim();
            let sequence: number | null = null;

            if (sequenceRaw) {
              const trimmedSequence = sequenceRaw.trim();
              if (/^\d+$/.test(trimmedSequence)) {
                sequence = parseInt(trimmedSequence, 10);
              }
            }

            const rawSpecs = (item as { specs?: Record<string, unknown> }).specs;
            const departmentFromSpecs = rawSpecs && typeof rawSpecs['department'] === 'string'
              ? (rawSpecs['department'] as string).trim()
              : '';
            const departmentColumn = (item as { department?: string | null }).department;

            return {
              assetNumber,
              basePrefix,
              sequence,
              name: typeof item.name === 'string' && item.name.trim().length > 0 ? item.name.trim() : null,
              status: typeof item.status === 'string' && item.status.trim().length > 0 ? item.status.trim() : null,
              department: typeof departmentColumn === 'string' && departmentColumn.trim().length > 0
                ? departmentColumn.trim()
                : departmentFromSpecs || null,
              location: typeof item.location === 'string' && item.location.trim().length > 0 ? item.location.trim() : null,
            } satisfies AssetRecord;
          })
          .filter((value): value is AssetRecord => value !== null);

        const filteredRecords = records.filter((record) => {
          const baseValue = record.basePrefix || record.assetNumber;
          return prefixes.some((prefix) => baseValue.startsWith(prefix));
        });

        const uniqueRecords = new Map<string, AssetRecord>();
        for (const record of filteredRecords) {
          if (!uniqueRecords.has(record.assetNumber)) {
            uniqueRecords.set(record.assetNumber, record);
          }
        }

        const sortedRecords = Array.from(uniqueRecords.values()).sort(compareAssetRecords);
        setAssetRecords(sortedRecords);
        setIsAssetDialogOpen(true);
      } catch (error) {
        if (isActive) {
          console.error('Error fetching asset numbers:', error);
          setAssetRecords([]);
          setIsAssetDialogOpen(false);
        }
      } finally {
        if (isActive) {
          setCheckingLatestAsset(false);
        }
      }
    };

    fetchAssetNumbers();

    return () => {
      isActive = false;
    };
  }, [equipmentSubType]);

  const persistDraft = useCallback(() => {
    if (!hasRestoredDraft) return;
    const form = formRef.current;
    if (!form) return;

    const fields: Record<string, string> = {};
    const elements = Array.from(form.elements) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
    elements.forEach((element) => {
      if (!element.name) return;
      if (element instanceof HTMLInputElement) {
        if (element.type === "file") return;
        if (element.type === "checkbox") {
          fields[element.name] = element.checked ? "true" : "false";
          return;
        }
        if (element.type === "radio") {
          if (element.checked) {
            fields[element.name] = element.value;
          }
          return;
        }
      }

      fields[element.name] = element.value;
    });

    const payload = {
      fields,
      state: {
        equipmentType,
        equipmentSubType,
        quantity,
        warrantyEnd,
        modelValue,
        serialNumberValue,
        vendorName,
        vendorPhone,
        vendorAddress,
        selectedVendorId: selectedVendorId ?? "",
        selectedBrandId,
        brandSelectionMode,
      },
    };

    try {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to persist add equipment draft", error);
    }
  }, [
    equipmentType,
    equipmentSubType,
    hasRestoredDraft,
    modelValue,
    quantity,
    selectedBrandId,
    brandSelectionMode,
    selectedVendorId,
    serialNumberValue,
    vendorAddress,
    vendorName,
    vendorPhone,
    warrantyEnd,
  ]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleMutate = () => {
      persistDraft();
    };

    const listenerOptions = { capture: true } as const;

    form.addEventListener("input", handleMutate, listenerOptions);
    form.addEventListener("change", handleMutate, listenerOptions);

    return () => {
      form.removeEventListener("input", handleMutate, listenerOptions);
      form.removeEventListener("change", handleMutate, listenerOptions);
    };
  }, [persistDraft]);

  useEffect(() => {
    if (!hasRestoredDraft) return;
    persistDraft();
  }, [hasRestoredDraft, persistDraft]);

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).slice(0, 3 - selectedImages.length);
    const updatedImages = [...selectedImages, ...newFiles];
    
    if (updatedImages.length > 3) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "สามารถอัปโหลดรูปภาพได้สูงสุด 3 รูป",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedImages(updatedImages);
    
    // Create previews
    const newPreviews = [...imagePreviews];
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === selectedImages.length + newFiles.length) {
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const updatedImages = selectedImages.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(updatedImages);
    setImagePreviews(updatedPreviews);
  };

  const uploadImages = async (equipmentId: string): Promise<string[]> => {
    const imageUrls: string[] = [];
    
    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${equipmentId}-${Date.now()}-${i + 1}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('equipment-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('equipment-images')
        .getPublicUrl(fileName);
        
      imageUrls.push(publicUrl);
    }
    
    return imageUrls;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);

    const getTrimmedValue = (field: string): string | undefined => {
      const value = formData.get(field);
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }
      // For non-string (e.g., File), treat as undefined for this text helper
      return undefined;
    };

    // Build specs object for computer types
    const specs: Record<string, string> = {};
    if (isComputerType) {
      const cpu = getTrimmedValue('cpu');
      const cpuSeries = getTrimmedValue('cpuSeries');
      const ramGb = getTrimmedValue('ramGb');
      const harddisk = getTrimmedValue('harddisk');
      const operatingSystem = getTrimmedValue('operatingSystem');
      const officeSuite = getTrimmedValue('officeSuite');
      const osLicenseType = getTrimmedValue('osLicenseType');
      const officeLicenseType = getTrimmedValue('officeLicenseType');
      const gpu = getTrimmedValue('gpu');
      const productKey = getTrimmedValue('productKey');
      const ipAddress = getTrimmedValue('ipAddress');
      const macAddress = getTrimmedValue('macAddress');

      if (cpu && cpu !== NONE_SPEC_VALUE) specs.cpu = cpu;
      if (ramGb && ramGb !== NONE_SPEC_VALUE) specs.ramGb = ramGb;
      if (harddisk && harddisk !== NONE_SPEC_VALUE) specs.harddisk = harddisk;
      if (operatingSystem && operatingSystem !== NONE_SPEC_VALUE) specs.operatingSystem = operatingSystem;
      if (officeSuite && officeSuite !== NONE_SPEC_VALUE) specs.officeSuite = officeSuite;
      if (osLicenseType && osLicenseType !== NONE_SPEC_VALUE) specs.osLicenseType = osLicenseType;
      if (officeLicenseType && officeLicenseType !== NONE_SPEC_VALUE) specs.officeLicenseType = officeLicenseType;
      if (gpu) specs.gpu = gpu;
      const hostname = getTrimmedValue('hostname');

      if (productKey) specs.productKey = productKey;
      if (ipAddress) specs.ipAddress = ipAddress;
      if (macAddress) specs.macAddress = macAddress;
      if (hostname) specs.hostname = hostname;
    }

    const reasonValue = getTrimmedValue('notes');
    if (reasonValue) {
      specs.reason = reasonValue;
      specs.notes = reasonValue;
    }

    const nameValue = getTrimmedValue('equipmentName');
    const brandValue = getTrimmedValue('brand');
    const modelValue = getTrimmedValue('model');
    const serialNumberValue = getTrimmedValue('serialNumber');
    const purchaseDateValue = getTrimmedValue('purchaseDate');
    const budgetTypeValue = getTrimmedValue('budgetType');
    const acquisitionMethodValue = getTrimmedValue('acquisitionMethod');
    const vendorNameValue = getTrimmedValue('vendorName');
    const vendorPhoneValue = getTrimmedValue('vendorPhone');
    const vendorAddressValue = getTrimmedValue('vendorAddress');

    const rawAssetNumberInput = equipmentSubType || getTrimmedValue('assetNumber');

    if (!rawAssetNumberInput) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณาระบุเลขครุภัณฑ์ให้ครบถ้วน",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const assetNumberInfo = normalizeAssetNumber(rawAssetNumberInput, quantity);

    if (!assetNumberInfo.base) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "รูปแบบเลขครุภัณฑ์ไม่ถูกต้อง",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const assetNumberValue = assetNumberInfo.formatted;
    const sequenceNumber = parseInt(assetNumberInfo.sequence, 10) || 1;

    const equipmentData = {
      // Ensure name is always a non-empty string for insertion
      name: nameValue || getEquipmentTypeLabel(equipmentType) || "ครุภัณฑ์",
      type: getEquipmentTypeLabel(equipmentType),
      brand: brandValue,
      model: modelValue,
      serial_number: serialNumberValue,
      asset_number: assetNumberValue,
      quantity: sequenceNumber,
      status: (formData.get('status') as string) || 'available',
      location: getLocationLabel(formData.get('location') as string),
      assigned_to: getTrimmedValue('currentUser'),
      purchase_date: purchaseDateValue,
      warranty_end: getTrimmedValue('warrantyEnd'),
      specs: {
        ...specs,
        price: parseFloat(formData.get('price') as string) || null,
        budgetType: budgetTypeValue,
        acquisitionMethod: acquisitionMethodValue,
        department: getTrimmedValue('department')
      },
      vendor_id: selectedVendorId || null,
      vendor_name: vendorNameValue ?? null,
      vendor_phone: vendorPhoneValue ?? null,
      vendor_address: vendorAddressValue ?? null,
    };

    try {
      const { data, error } = await supabase
        .from('equipment')
        .insert([equipmentData])
        .select()
        .single();

      if (error) throw error;

      // Upload images if any
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        imageUrls = await uploadImages(data.id);
        
        // Update equipment with image URLs
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ images: imageUrls })
          .eq('id', data.id);
          
        if (updateError) throw updateError;
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: "ข้อมูลครุภัณฑ์ได้ถูกบันทึกเรียบร้อยแล้ว",
      });

      localStorage.removeItem(FORM_STORAGE_KEY);

      // Navigate back to equipment list
      navigate('/equipment');
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEquipmentTypeLabel = (value: string) => {
    const types = activeEquipmentTypes.length > 0 ? activeEquipmentTypes : baseEquipmentTypes;
    const type = types.find(t => t.value === value);
    return type ? type.label : value;
  };

  const getLocationLabel = (value: string) => {
    const locations = {
      'it-101': 'ห้อง IT-101',
      'admin-201': 'ห้องธุรการ 201',
      'meeting-301': 'ห้องประชุม 301',
      'director': 'ห้องผู้อำนวยการ',
      'storage': 'ห้องจัดเก็บ'
    };
    return locations[value as keyof typeof locations] || value;
  };

  const baseEquipmentTypes = BASE_EQUIPMENT_TYPES;

  const getSubTypes = (equipmentType: string) => {
    const types = activeEquipmentTypes.length > 0 ? activeEquipmentTypes : baseEquipmentTypes;
    const type = types.find(t => t.value === equipmentType);
    return type?.subTypes || [];
  };

  const handleEquipmentTypeChange = (value: string) => {
    setEquipmentType(value);
    setEquipmentSubType(""); // Reset sub type when main type changes
  };

  // Determine if current selection is a computer-type (for showing specs)
  const isComputerType = useMemo(() => {
    const types = activeEquipmentTypes.length > 0 ? activeEquipmentTypes : baseEquipmentTypes;
    const selected = types.find(t => t.value === equipmentType);
    const val = selected?.value || "";
    const code = selected?.code || "";
    const valueIsComputer = ["desktop", "laptop", "server", "tablet", "blade_server"].includes(val);
    const codeIsComputer = ["7440-001", "7440-002", "7440-004", "7440-005", "7440-010"].includes(code);
    return valueIsComputer || codeIsComputer;
  }, [equipmentType, activeEquipmentTypes]);

  const subTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    return getSubTypes(equipmentType).filter((subType) => {
      if (seen.has(subType.value)) return false;
      seen.add(subType.value);
      return true;
    });
  }, [equipmentType, activeEquipmentTypes]);

  const selectedSubType = useMemo(() => {
    if (!equipmentSubType) return null;
    return subTypeOptions.find((subType) => subType.value === equipmentSubType) || null;
  }, [equipmentSubType, subTypeOptions]);

  type EquipmentGroup = {
    title: string;
    records: AssetRecord[];
    key: string;
  };

  const groupedAssetRecords = useMemo<EquipmentGroup[]>(() => {
    if (!assetRecords?.length) return [];

    const fallbackTitle = 'ไม่ระบุรายละเอียดครุภัณฑ์';
    const types = activeEquipmentTypes?.length ? activeEquipmentTypes : baseEquipmentTypes;
    const labelCache = new Map<string, string>();

    const resolveDetailTitle = (value: string | null | undefined): string => {
      try {
        const detailValue = String(value || '').trim();
        if (!detailValue) return fallbackTitle;

        // Return cached title if available
        const cachedTitle = labelCache.get(detailValue);
        if (cachedTitle) return cachedTitle;

        // Try to find a matching equipment type
        let composedTitle = detailValue;
        for (const type of types) {
          const subTypes = Array.isArray(type?.subTypes) ? type.subTypes : [];
          const match = subTypes.find((subType) => subType?.value === detailValue);
          
          if (match?.label) {
            composedTitle = `${detailValue} • ${match.label}`;
            break;
          }
        }

        // Cache and return the composed title
        labelCache.set(detailValue, composedTitle);
        return composedTitle;
      } catch (error) {
        console.error('Error resolving detail title:', error);
        return fallbackTitle;
      }
    };

    // Group records by their base prefix
    const groups = new Map<string, EquipmentGroup>();

    for (const record of assetRecords) {
      try {
        const detailValue = String(record.basePrefix ?? '').trim();
        const title = resolveDetailTitle(detailValue);
        const key = detailValue || title || fallbackTitle;

        if (!groups.has(key)) {
          groups.set(key, {
            title: title || fallbackTitle,
            records: [],
            key: `group-${key}`
          });
        }

        groups.get(key)?.records.push(record);
      } catch (error) {
        console.error('Error processing record:', record, error);
      }
    }

    // Sort groups by title and records by asset number
    return Array.from(groups.values())
      .sort((a, b) => a.title.localeCompare(b.title, 'th'))
      .map(group => ({
        ...group,
        records: [...group.records].sort((a, b) => 
          (a.assetNumber || '').localeCompare(b.assetNumber || '', 'th')
        )
      }));
  }, [assetRecords, activeEquipmentTypes, baseEquipmentTypes]);

  const warrantyStatus = useMemo(() => {
    if (!warrantyEnd) return null;
    return getWarrantyStatusInfo(warrantyEnd);
  }, [warrantyEnd]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link to="/equipment">
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-muted w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <div className="sm:flex-1">
            <h1 className="text-3xl font-bold text-foreground">เพิ่มครุภัณฑ์ใหม่</h1>
            <p className="text-muted-foreground">บันทึกข้อมูลครุภัณฑ์คอมพิวเตอร์</p>
          </div>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            {/* Basic Information */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Computer className="h-5 w-5 text-primary" />
                  <span>ข้อมูลทั่วไป</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="equipmentName">ชื่อครุภัณฑ์</Label>
                    <Input
                      id="equipmentName"
                      name="equipmentName"
                      placeholder="เช่น Dell OptiPlex 7090"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipmentType">ประเภทครุภัณฑ์ *</Label>
                    <Select value={equipmentType} onValueChange={handleEquipmentTypeChange} required>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกประเภทครุภัณฑ์" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg z-50">
                    {(activeEquipmentTypes.length > 0 ? activeEquipmentTypes : baseEquipmentTypes).map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center space-x-2">
                              <type.icon className="h-4 w-4" />
                              <span>{type.code} - {type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {equipmentType && (
                    subTypeOptions.length > 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor="equipmentSubType">รายละเอียดครุภัณฑ์ *</Label>
                        <Select value={equipmentSubType} onValueChange={setEquipmentSubType} required>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกรายละเอียดครุภัณฑ์" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border shadow-lg z-50 max-h-60 overflow-auto">
                            {subTypeOptions.map((subType, index) => (
                              <SelectItem key={`${subType.value}-${index}`} value={subType.value}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{subType.value}</span>
                                  <span className="text-sm text-muted-foreground">{subType.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {equipmentSubType ? (
                          <div className="space-y-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-center gap-2 sm:w-auto"
                                onClick={() => setIsAssetDialogOpen(true)}
                                disabled={checkingLatestAsset}
                              >
                                {checkingLatestAsset ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>กำลังโหลดเลขครุภัณฑ์...</span>
                                  </>
                                ) : (
                                  <>
                                    <Info className="h-4 w-4" />
                                    <span>ดูเลขครุภัณฑ์ทั้งหมด</span>
                                  </>
                                )}
                              </Button>
                              {!checkingLatestAsset ? (
                                <p className="text-sm text-muted-foreground sm:ml-1">
                                  {assetRecords.length > 0
                                    ? `พบ ${assetRecords.length} เลขครุภัณฑ์สำหรับรายละเอียดนี้`
                                    : "ยังไม่มีข้อมูลเลขครุภัณฑ์สำหรับรายละเอียดนี้"}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label htmlFor="equipmentSubTypeHint">รายละเอียดครุภัณฑ์</Label>
                        <p id="equipmentSubTypeHint" className="text-sm text-muted-foreground">
                          ยังไม่มีรายละเอียดสำหรับประเภทนี้ สามารถกำหนดเลขครุภัณฑ์ได้เองที่ช่องด้านล่าง
                        </p>
                      </div>
                    )
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="brand">ยี่ห้อ</Label>
                    {brandsSupported && brands.length > 0 ? (
                      <Select
                        value={brandSelectionMode === "select" ? selectedBrandId : "__manual__"}
                        onValueChange={handleBrandSelectChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกยี่ห้อจากรายการ หรือกำหนดเอง" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border shadow-lg z-50 max-h-60 overflow-auto">
                          <SelectItem value="__manual__">กำหนดเอง</SelectItem>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name || "ไม่ระบุชื่อ"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <Input
                      ref={brandInputRef}
                      id="brand"
                      name="brand"
                      placeholder="เช่น Dell, HP, Lenovo"
                      onChange={handleBrandInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">รุ่น/โมเดล</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        id="model"
                        name="model"
                        placeholder="เช่น OptiPlex 7090, LaserJet Pro"
                        value={modelValue}
                        onChange={(event) => setModelValue(event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-11 sm:px-0"
                        onClick={() => openScanner("model")}
                        aria-label="สแกนรุ่นหรือโมเดล"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        id="serialNumber"
                        name="serialNumber"
                        placeholder="เช่น DELL7090001"
                        value={serialNumberValue}
                        onChange={(event) => setSerialNumberValue(event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-11 sm:px-0"
                        onClick={() => openScanner("serial")}
                        aria-label="สแกน Serial Number"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assetNumber">เลขครุภัณฑ์</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className="w-full sm:flex-1">
                        <Input
                          id="assetNumber"
                          name="assetNumber"
                          placeholder={equipmentSubType ? `อัตโนมัติ: ${equipmentSubType}` : "เช่น EQ001"}
                          defaultValue={equipmentSubType || ""}
                          readOnly={!!equipmentSubType}
                        />
                      </div>
                      <div className="flex items-center justify-center text-muted-foreground sm:px-2">
                        /
                      </div>
                      <div className="w-full sm:w-24">
                        <Input
                          id="quantity"
                          name="quantity"
                          type="number"
                          placeholder="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          min="1"
                          aria-label="ลำดับ"
                          required
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {equipmentSubType
                        ? `บันทึกเป็น: ${equipmentSubType}/${sequencePreview}`
                        : "รูปแบบ: เลขครุภัณฑ์/ลำดับ (เช่น 7440-001-0001/1)"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">วันที่ได้มา</Label>
                    <Input
                      id="purchaseDate"
                      name="purchaseDate"
                      type="date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warrantyEnd">วันที่หมดประกัน</Label>
                    <Input
                      id="warrantyEnd"
                      name="warrantyEnd"
                      type="date"
                      value={warrantyEnd}
                      onChange={(event) => setWarrantyEnd(event.target.value)}
                    />
                    {warrantyStatus && (
                      <Alert
                        variant={warrantyStatus.tone === "destructive" ? "destructive" : "default"}
                        className={cn(
                          "mt-2",
                          warrantyStatus.tone === "warning" && "border-warning/40 bg-warning/10 text-warning",
                          warrantyStatus.tone === "success" && "border-success/40 bg-success/10 text-success",
                          warrantyStatus.tone === "destructive" && "bg-destructive/10 text-destructive"
                        )}
                      >
                        <AlertDescription>
                          <span className="font-medium">{warrantyStatus.label}</span>
                          {warrantyStatus.detail ? ` • ${warrantyStatus.detail}` : null}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendorSelect">ผู้ขาย/ผู้รับจ้าง/ผู้บริจาค</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <Select value={selectedVendorId} onValueChange={handleVendorSelect}>
                        <SelectTrigger id="vendorSelect" className="w-full">
                          <SelectValue placeholder="เลือกผู้ขายจากระบบ หรือกรอกข้อมูลเอง" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border shadow-lg z-50">
                          <SelectItem value="__manual__">กรอกข้อมูลเอง</SelectItem>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{vendor.name}</span>
                                {vendor.phone ? (
                                  <span className="text-xs text-muted-foreground">โทรศัพท์: {vendor.phone}</span>
                                ) : null}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedVendorId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-10 px-3 text-sm w-full sm:w-auto"
                          onClick={handleClearVendorSelection}
                        >
                          ล้าง
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      เลือกจากข้อมูลที่ตั้งค่าไว้ หรือเลือก "กรอกข้อมูลเอง" เพื่อพิมพ์ข้อมูลติดต่อใหม่
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="vendorName">ชื่อผู้ขาย/ผู้รับจ้าง/ผู้บริจาค</Label>
                      <Input
                        id="vendorName"
                        name="vendorName"
                        value={vendorName}
                        onChange={(event) => setVendorName(event.target.value)}
                        placeholder="กรอกชื่อผู้ขาย/ผู้รับจ้าง/ผู้บริจาค"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendorPhone">โทรศัพท์</Label>
                      <Input
                        id="vendorPhone"
                        name="vendorPhone"
                        value={vendorPhone}
                        onChange={(event) => setVendorPhone(event.target.value)}
                        placeholder="หมายเลขโทรศัพท์"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendorAddress">ที่อยู่</Label>
                    <Textarea
                      id="vendorAddress"
                      name="vendorAddress"
                      value={vendorAddress}
                      onChange={(event) => setVendorAddress(event.target.value)}
                      placeholder="ที่อยู่ของผู้ขาย/ผู้รับจ้าง/ผู้บริจาค"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">สถานะ *</Label>
                    <Select name="status" defaultValue="available" required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">พร้อมใช้งาน</SelectItem>
                        <SelectItem value="borrowed">ถูกยืม</SelectItem>
                        <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                        <SelectItem value="damaged">ชำรุด</SelectItem>
                        <SelectItem value="pending_disposal">รอจำหน่าย</SelectItem>
                        <SelectItem value="disposed">จำหน่าย</SelectItem>
                        <SelectItem value="lost">สูญหาย</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="price">ราคาครุภัณฑ์ (บาท)</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budgetType">ประเภทของเงิน</Label>
                    <Select name="budgetType">
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกประเภทของเงิน" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg z-50">
                        <SelectItem value="budget">เงินงบประมาณ</SelectItem>
                        <SelectItem value="non-budget">เงินนอกงบประมาณ</SelectItem>
                        <SelectItem value="donation">เงินบริจาค</SelectItem>
                        <SelectItem value="other">อื่น ๆ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="acquisitionMethod">วิธีการได้มา</Label>
                    <Select name="acquisitionMethod">
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกวิธีการได้มา" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg z-50">
                        <SelectItem value="price-agreement">ตกลงราคา</SelectItem>
                        <SelectItem value="price-auction">ประกวดราคา</SelectItem>
                        <SelectItem value="special-method">วิธีพิเศษ</SelectItem>
                        <SelectItem value="donation-received">รับบริจาค</SelectItem>
                        <SelectItem value="price-inquiry">สอบราคา</SelectItem>
                        <SelectItem value="e-bidding">e-bidding</SelectItem>
                        <SelectItem value="e-market">e-market</SelectItem>
                        <SelectItem value="selection">คัดเลือก</SelectItem>
                        <SelectItem value="specific">เฉพาะเจาะจง</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Computer Specifications */}
            {isComputerType && (
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Computer className="h-5 w-5 text-primary" />
                    <span>ข้อมูลเฉพาะคอมพิวเตอร์</span>
                  </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cpu">CPU</Label>
                  <Select name="cpu">
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก CPU" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SPEC_VALUE}>ไม่ระบุ</SelectItem>
                      {technicalSpecs.cpu && technicalSpecs.cpu.length > 0 ? (() => {
                        try {
                          // ตรวจสอบข้อมูลอย่างเข้มงวดก่อนแสดงผล
                          const validCpuItems = technicalSpecs.cpu
                            .filter((cpu: any) => {
                              if (!cpu) return false;
                              if (typeof cpu !== 'object') return false;
                              if (!('name' in cpu)) return false;
                              if (typeof cpu.name !== 'string') return false;
                              const name = cpu.name.trim();
                              return name.length > 0 && name !== 'null' && name !== 'undefined';
                            })
                            .map((cpu: any) => {
                              const name = String(cpu.name).trim();
                              if (!name || name === '' || name === 'null' || name === 'undefined') return null;

                              return (
                                <SelectItem key={cpu.id || `cpu-${Math.random()}`} value={name}>
                                  {name} {cpu.brand && `(${cpu.brand})`}
                                </SelectItem>
                              );
                            })
                            .filter(Boolean);

                          return validCpuItems.length > 0 ? validCpuItems : null;
                        } catch (error) {
                          console.error('Error rendering CPU items:', error);
                          return null;
                        }
                      })() : null}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ramGb">RAM (GB)</Label>
                  <Select name="ramGb">
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก RAM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SPEC_VALUE}>ไม่ระบุ</SelectItem>
                      {technicalSpecs.ram && technicalSpecs.ram.length > 0 ? (() => {
                        try {
                          const validRamItems = technicalSpecs.ram
                            .filter((ram: any) => {
                              if (!ram) return false;
                              if (typeof ram !== 'object') return false;
                              if (!('name' in ram)) return false;
                              if (typeof ram.name !== 'string') return false;
                              const name = ram.name.trim();
                              return name.length > 0 && name !== 'null' && name !== 'undefined';
                            })
                            .map((ram: any) => {
                              const name = String(ram.name).trim();
                              if (!name || name === '' || name === 'null' || name === 'undefined') return null;

                              return (
                                <SelectItem key={ram.id || `ram-${Math.random()}`} value={`${ram.capacity_gb}GB`}>
                                  {name} ({ram.capacity_gb}GB {ram.type})
                                </SelectItem>
                              );
                            })
                            .filter(Boolean);

                          return validRamItems.length > 0 ? validRamItems : null;
                        } catch (error) {
                          console.error('Error rendering RAM items:', error);
                          return null;
                        }
                      })() : null}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="harddisk">Harddisk</Label>
                  <Select name="harddisk">
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก Harddisk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SPEC_VALUE}>ไม่ระบุ</SelectItem>
                      {technicalSpecs.harddisk && technicalSpecs.harddisk.length > 0 ? (() => {
                        try {
                          const validHarddiskItems = technicalSpecs.harddisk
                            .filter((disk: any) => {
                              if (!disk) return false;
                              if (typeof disk !== 'object') return false;
                              if (!('name' in disk)) return false;
                              if (typeof disk.name !== 'string') return false;
                              const name = disk.name.trim();
                              return name.length > 0 && name !== 'null' && name !== 'undefined';
                            })
                            .map((disk: any) => {
                              const name = String(disk.name).trim();
                              if (!name || name === '' || name === 'null' || name === 'undefined') return null;

                              return (
                                <SelectItem key={disk.id || `harddisk-${Math.random()}`} value={`${disk.capacity_gb}GB`}>
                                  {name} ({disk.capacity_gb}GB {disk.type})
                                </SelectItem>
                              );
                            })
                            .filter(Boolean);

                          return validHarddiskItems.length > 0 ? validHarddiskItems : null;
                        } catch (error) {
                          console.error('Error rendering Harddisk items:', error);
                          return null;
                        }
                      })() : null}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operatingSystem">Operating System</Label>
                  <Select name="operatingSystem">
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก OS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SPEC_VALUE}>ไม่ระบุ</SelectItem>
                      {technicalSpecs.os && technicalSpecs.os.length > 0 ? (() => {
                        try {
                          const validOsItems = technicalSpecs.os
                            .filter((os: any) => {
                              if (!os) return false;
                              if (typeof os !== 'object') return false;
                              if (!('name' in os)) return false;
                              if (typeof os.name !== 'string') return false;
                              const name = os.name.trim();
                              return name.length > 0 && name !== 'null' && name !== 'undefined';
                            })
                            .map((os: any) => {
                              const name = String(os.name).trim();
                              if (!name || name === '' || name === 'null' || name === 'undefined') return null;

                              return (
                                <SelectItem key={os.id || `os-${Math.random()}`} value={name}>
                                  {name} {os.version && `(${os.version})`}
                                </SelectItem>
                              );
                            })
                            .filter(Boolean);

                          return validOsItems.length > 0 ? validOsItems : null;
                        } catch (error) {
                          console.error('Error rendering OS items:', error);
                          return null;
                        }
                      })() : null}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="osLicenseType">ประเภทลิขสิทธิ์ OS</Label>
                  <Select name="osLicenseType">
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภทลิขสิทธิ์" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SPEC_VALUE}>ไม่ระบุ</SelectItem>
                      <SelectItem value="OEM">OEM</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Volume">Volume</SelectItem>
                      <SelectItem value="Unactivated">Unactivated</SelectItem>
                      <SelectItem value="Not activated">Not activated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="officeSuite">Office</Label>
                  <Select name="officeSuite">
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก Office" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SPEC_VALUE}>ไม่ระบุ</SelectItem>
                      {technicalSpecs.office && technicalSpecs.office.length > 0 ? (() => {
                        try {
                          const validOfficeItems = technicalSpecs.office
                            .filter((office: any) => {
                              if (!office) return false;
                              if (typeof office !== 'object') return false;
                              if (!('name' in office)) return false;
                              if (typeof office.name !== 'string') return false;
                              const name = office.name.trim();
                              return name.length > 0 && name !== 'null' && name !== 'undefined';
                            })
                            .map((office: any) => {
                              const name = String(office.name).trim();
                              if (!name || name === '' || name === 'null' || name === 'undefined') return null;

                              return (
                                <SelectItem key={office.id || `office-${Math.random()}`} value={name}>
                                  {name} {office.version && `(${office.version})`}
                                </SelectItem>
                              );
                            })
                            .filter(Boolean);

                          return validOfficeItems.length > 0 ? validOfficeItems : null;
                        } catch (error) {
                          console.error('Error rendering Office items:', error);
                          return null;
                        }
                      })() : null}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="officeLicenseType">ประเภทลิขสิทธิ์ Office</Label>
                  <Select name="officeLicenseType">
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภทลิขสิทธิ์" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SPEC_VALUE}>ไม่ระบุ</SelectItem>
                      <SelectItem value="Perpetual">Perpetual</SelectItem>
                      <SelectItem value="Subscription">Subscription</SelectItem>
                      <SelectItem value="Unlicensed">Unlicensed</SelectItem>
                      <SelectItem value="Unlicensed Product">Unlicensed Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gpu">Graphic Card (GPU)</Label>
                  <Input
                    id="gpu"
                    name="gpu"
                    placeholder="เช่น NVIDIA GTX 1650"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productKey">Product Key</Label>
                  <Input
                    id="productKey"
                    name="productKey"
                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ipAddress">IP Address</Label>
                  <Input
                    id="ipAddress"
                    name="ipAddress"
                    placeholder="เช่น 192.168.1.100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="macAddress">MAC Address</Label>
                  <Input
                    id="macAddress"
                    name="macAddress"
                    placeholder="เช่น 00:11:22:33:44:55"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hostname">ชื่อ Hostname</Label>
                  <Input
                    id="hostname"
                    name="hostname"
                    placeholder="เช่น PC-OFFICE-01"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

            {/* Usage Information */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  <span>ข้อมูลการใช้งาน/จัดเก็บ</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="department">หน่วยงานที่รับผิดชอบ *</Label>
                    <Select name="department" required>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกหน่วยงาน" />
                      </SelectTrigger>
                      <SelectContent className="z-50 max-h-60 overflow-auto border border-border bg-background shadow-lg">
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">สถานที่ติดตั้ง/จัดเก็บ *</Label>
                    <Input 
                      id="location" 
                      name="location"
                      placeholder="เช่น ห้อง IT-101"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentUser">ผู้ใช้งานปัจจุบัน</Label>
                    <Input 
                      id="currentUser" 
                      name="currentUser"
                      placeholder="เช่น นายสมชาย ใจดี"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">เหตุผล</Label>
                    <Textarea 
                      id="notes" 
                      name="notes"
                      placeholder="ระบุเหตุผลในการจัดซื้อหรือการได้มาของครุภัณฑ์..."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
            {/* Image Upload Section */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="h-5 w-5 text-primary" />
                  <span>รูปภาพครุภัณฑ์</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-4 text-sm">
                  <p className="font-medium text-foreground">จัดการรูปภาพ</p>
                  <p className="text-muted-foreground">
                    เลือกหรือถ่ายรูปเพื่อแสดงรายละเอียดครุภัณฑ์ ภาพแรกจะถูกใช้เป็นรูปหลัก
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={selectedImages.length >= 3}
                    className="flex w-full items-center justify-center space-x-2 sm:w-auto"
                  >
                    <Upload className="h-4 w-4" />
                    <span>เลือกรูปภาพ</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={selectedImages.length >= 3}
                    className="flex w-full items-center justify-center space-x-2 sm:w-auto"
                  >
                    <Camera className="h-4 w-4" />
                    <span>ถ่ายรูป</span>
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files)}
                />

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files)}
                />

                <p className="text-sm text-muted-foreground">
                  อัปโหลดรูปภาพได้สูงสุด 3 รูป (สนับสนุนไฟล์ JPG, PNG, WEBP ขนาดไม่เกิน 5MB ต่อรูป)
                </p>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 shadow-md"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
          <Link to="/equipment" className="w-full sm:w-auto">
            <Button variant="outline" type="button" className="w-full">
              ยกเลิก
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-gradient-primary shadow-soft hover:opacity-90 sm:w-auto"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </Button>
        </div>
      </form>
      <Dialog open={isAssetDialogOpen && !!equipmentSubType} onOpenChange={setIsAssetDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>เลขครุภัณฑ์ทั้งหมด</DialogTitle>
            <DialogDescription>
              {selectedSubType
                ? `${selectedSubType.value} • ${selectedSubType.label}`
                : equipmentSubType
                  ? `รายละเอียด: ${equipmentSubType}`
                  : ""}
            </DialogDescription>
          </DialogHeader>
          {checkingLatestAsset ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>กำลังดึงข้อมูลเลขครุภัณฑ์...</span>
            </div>
          ) : assetRecords.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                ทั้งหมด {assetRecords.length} รายการ
              </p>
              <ScrollArea className="max-h-[360px] rounded-md border border-border/70">
                <div className="space-y-4 p-1">
                  {groupedAssetRecords.length > 0 ? (
                    groupedAssetRecords.map(({ title, records, key }) => (
                      <div key={key} className="overflow-hidden rounded-md border border-border/60 bg-card">
                      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2">
                        <span className="text-sm font-semibold text-foreground">{title}</span>
                        <span className="text-xs text-muted-foreground">ทั้งหมด {records.length} รายการ</span>
                      </div>
                      <div className="divide-y divide-border/70">
                        {records.map((record) => {
                          const statusDisplay = getStatusDisplay(record.status);

                          return (
                            <div key={record.assetNumber} className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-semibold text-foreground">{record.assetNumber}</span>
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                      statusDisplay.className,
                                    )}
                                  >
                                    {statusDisplay.label}
                                  </span>
                                </div>
                                <dl className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                                  <div className="flex flex-col">
                                    <dt className="font-medium text-foreground">ชื่อครุภัณฑ์</dt>
                                    <dd>{record.name || '-'}</dd>
                                  </div>
                                  <div className="flex flex-col">
                                    <dt className="font-medium text-foreground">หน่วยงาน</dt>
                                    <dd>{record.department || '-'}</dd>
                                  </div>
                                  <div className="flex flex-col">
                                    <dt className="font-medium text-foreground">สถานะ</dt>
                                    <dd>
                                      <span
                                        className={cn(
                                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                          statusDisplay.className,
                                        )}
                                      >
                                        {statusDisplay.label}
                                      </span>
                                    </dd>
                                  </div>
                                  <div className="flex flex-col">
                                    <dt className="font-medium text-foreground">สถานที่</dt>
                                    <dd>{record.location || '-'}</dd>
                                  </div>
                                </dl>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-md border border-border/60 bg-card">
                    <p className="text-muted-foreground">ไม่พบข้อมูลครุภัณฑ์</p>
                  </div>
                )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <p className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              ยังไม่มีข้อมูลเลขครุภัณฑ์สำหรับรายละเอียดนี้
            </p>
          )}
        </DialogContent>
      </Dialog>
      <QuickScanDialog
        open={scannerOpen}
        onOpenChange={(open) => {
          setScannerOpen(open);
          if (!open) {
            setScannerTarget(null);
          }
        }}
        onDetected={handleScanDetected}
        title={scannerTarget === "serial" ? "สแกน Serial Number" : "สแกนรุ่น/โมเดล"}
        description="จัดวางรหัสให้อยู่ในกรอบของกล้องเพื่อให้ระบบอ่านอัตโนมัติ"
      />
    </div>
  );
}
