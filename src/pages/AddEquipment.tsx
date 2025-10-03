import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BASE_EQUIPMENT_TYPES } from "@/data/equipmentTypes.ts";
import { getWarrantyStatusInfo } from "@/lib/warranty";
import { cn } from "@/lib/utils";
import { normalizeAssetNumber } from "@/lib/asset-number";
import QuickScanDialog from "@/components/scanner/QuickScanDialog";

type Vendor = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
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
  const [latestAssetNumber, setLatestAssetNumber] = useState<string | null>(null);
  const [checkingLatestAsset, setCheckingLatestAsset] = useState(false);
  const [modelValue, setModelValue] = useState("");
  const [serialNumberValue, setSerialNumberValue] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<"model" | "serial" | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | undefined>(undefined);
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const FORM_STORAGE_KEY = "add-equipment-draft";

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
          const mappedTypes = equipmentTypesData.map(dbType => {
            // Prefer exact code match; if not found, fall back to strict label equality
            const matchingType =
              baseEquipmentTypes.find(t => t.code === dbType.code) ||
              baseEquipmentTypes.find(t => t.label === dbType.name);

            const details = (dbType.equipment_type_details || []) as Array<{
              id: string;
              name: string;
              code: string;
              active: boolean;
            }>;

            const activeDetails = details
              .filter(detail => detail.active)
              .sort((a, b) => a.code.localeCompare(b.code, 'th'))
              .map(detail => ({ value: detail.code, label: detail.name }));

            return {
              value: dbType.code.toLowerCase(),
              label: dbType.name,
              icon: matchingType?.icon || Computer,
              code: dbType.code,
              subTypes: activeDetails.length > 0 ? activeDetails : (matchingType?.subTypes || [])
            };
          });

          setActiveEquipmentTypes(mappedTypes);
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
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!equipmentSubType) {
      setLatestAssetNumber(null);
      setCheckingLatestAsset(false);
      return;
    }

    let isActive = true;

    const fetchLatestAsset = async () => {
      try {
        setCheckingLatestAsset(true);
        const { data, error } = await supabase
          .from('equipment')
          .select('asset_number, created_at')
          .ilike('asset_number', `${equipmentSubType}/%`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (!isActive) return;

        if (data && data.length > 0 && typeof data[0].asset_number === 'string') {
          setLatestAssetNumber(data[0].asset_number);
        } else {
          setLatestAssetNumber(null);
        }
      } catch (error) {
        if (isActive) {
          console.error('Error fetching latest asset number:', error);
          setLatestAssetNumber(null);
        }
      } finally {
        if (isActive) {
          setCheckingLatestAsset(false);
        }
      }
    };

    fetchLatestAsset();

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
      const gpu = getTrimmedValue('gpu');

      if (cpu) specs.cpu = cpu;
      if (cpuSeries) specs.cpuSeries = cpuSeries;
      if (ramGb) specs.ramGb = ramGb;
      if (harddisk) specs.harddisk = harddisk;
      if (operatingSystem) specs.operatingSystem = operatingSystem;
      if (officeSuite) specs.officeSuite = officeSuite;
      if (gpu) specs.gpu = gpu;

      const productKey = getTrimmedValue('productKey');
      const ipAddress = getTrimmedValue('ipAddress');
      const macAddress = getTrimmedValue('macAddress');
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
                          <Alert className="border-primary/30 bg-primary/10 text-primary">
                            <div className="flex items-start space-x-3">
                              <Info className="mt-1 h-4 w-4" />
                              <AlertDescription className="text-sm leading-relaxed text-primary">
                                {checkingLatestAsset
                                  ? "กำลังตรวจสอบเลขครุภัณฑ์ล่าสุด..."
                                  : latestAssetNumber
                                    ? `เลขครุภัณฑ์ล่าสุดของรายละเอียดนี้คือ ${latestAssetNumber}`
                                    : "ยังไม่มีข้อมูลเลขครุภัณฑ์สำหรับรายละเอียดนี้"}
                              </AlertDescription>
                            </div>
                          </Alert>
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
                    <Input
                      id="brand"
                      name="brand"
                      placeholder="เช่น Dell, HP, Lenovo"
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
                  <Input 
                    id="cpu" 
                    name="cpu"
                    placeholder="เช่น Intel Core i5-11500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpuSeries">CPU Series</Label>
                  <Input 
                    id="cpuSeries" 
                    name="cpuSeries"
                    placeholder="เช่น 11th Gen Core i5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ramGb">RAM (GB)</Label>
                  <Input 
                    id="ramGb" 
                    name="ramGb"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="เช่น 16"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="harddisk">Harddisk</Label>
                  <Input 
                    id="harddisk" 
                    name="harddisk"
                    placeholder="เช่น HDD 1TB"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operatingSystem">Operating System</Label>
                  <Input 
                    id="operatingSystem" 
                    name="operatingSystem"
                    placeholder="เช่น Windows 11 Pro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="officeSuite">Office</Label>
                  <Input 
                    id="officeSuite" 
                    name="officeSuite"
                    placeholder="เช่น Microsoft 365"
                  />
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
