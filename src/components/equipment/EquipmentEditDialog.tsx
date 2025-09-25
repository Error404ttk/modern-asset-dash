import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, Computer, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BASE_EQUIPMENT_TYPES, type EquipmentTypeOption } from "@/data/equipmentTypes.ts";
import { joinAssetNumber, normalizeAssetNumber } from "@/lib/asset-number";

const DEFAULT_SPEC_FIELDS: Record<string, string> = {
  cpu: "",
  cpuSeries: "",
  ramGb: "",
  harddisk: "",
  operatingSystem: "",
  officeSuite: "",
  gpu: "",
  productKey: "",
  ipAddress: "",
  macAddress: "",
  hostname: "",
  notes: "",
  reason: "",
};

const COMPUTER_SPEC_FIELDS: Array<{
  key: keyof typeof DEFAULT_SPEC_FIELDS;
  label: string;
  placeholder?: string;
  type?: string;
}> = [
  { key: "cpu", label: "CPU", placeholder: "เช่น Intel Core i5-11500" },
  { key: "cpuSeries", label: "CPU Series", placeholder: "เช่น 11th Gen Core i5" },
  { key: "ramGb", label: "RAM (GB)", type: "number", placeholder: "เช่น 16" },
  { key: "harddisk", label: "Harddisk", placeholder: "เช่น HDD 1TB" },
  { key: "operatingSystem", label: "Operating System", placeholder: "เช่น Windows 11 Pro" },
  { key: "officeSuite", label: "Office", placeholder: "เช่น Microsoft 365" },
];

const SYSTEM_SPEC_FIELDS: Array<{
  key: keyof typeof DEFAULT_SPEC_FIELDS;
  label: string;
  placeholder?: string;
  type?: string;
}> = [
  { key: "gpu", label: "Graphic Card (GPU)", placeholder: "เช่น NVIDIA GTX 1650" },
  { key: "productKey", label: "Product Key", placeholder: "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" },
  { key: "ipAddress", label: "IP Address", placeholder: "เช่น 192.168.1.100" },
  { key: "macAddress", label: "MAC Address", placeholder: "เช่น 00:11:22:33:44:55" },
  { key: "hostname", label: "Hostname", placeholder: "เช่น PC-OFFICE-01" },
];

const normalizeSpecs = (specs: unknown) => {
  const normalized = { ...DEFAULT_SPEC_FIELDS } as Record<string, string>;
  if (specs && typeof specs === "object" && !Array.isArray(specs)) {
    Object.entries(specs as Record<string, unknown>).forEach(([key, value]) => {
      normalized[key] = value === null || value === undefined ? "" : String(value);
    });
  }
  if (!normalized.reason && normalized.notes) {
    normalized.reason = normalized.notes;
  } else if (!normalized.notes && normalized.reason) {
    normalized.notes = normalized.reason;
  }
  return normalized;
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

interface EquipmentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment;
  onSave: (equipment: Equipment) => void;
}

export default function EquipmentEditDialog({ 
  open, 
  onOpenChange, 
  equipment, 
  onSave 
}: EquipmentEditDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Equipment>({
    ...equipment,
    specs: normalizeSpecs(equipment.specs),
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [availableEquipmentTypes, setAvailableEquipmentTypes] = useState<EquipmentTypeOption[]>(BASE_EQUIPMENT_TYPES);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const assetInfo = normalizeAssetNumber(equipment.assetNumber, equipment.quantity);
    const assetNumberBase = assetInfo.base || equipment.assetNumber || "";
    const quantityValue = assetInfo.sequence || "1";

    // Ensure all string fields are never null to avoid React warnings
    setFormData({
      ...equipment,
      assetNumber: assetNumberBase,
      quantity: quantityValue,
      brand: equipment.brand || "",
      model: equipment.model || "",
      serialNumber: equipment.serialNumber || "",
      location: equipment.location || "",
      user: equipment.user || "",
      purchaseDate: equipment.purchaseDate || "",
      warrantyEnd: equipment.warrantyEnd || "",
      specs: normalizeSpecs(equipment.specs)
    });
    
    // Set existing images
    setExistingImages(equipment.images || []);
    setSelectedImages([]);
    setImagePreviews([]);
    setImagesToDelete([]);
  }, [equipment, open]);

  useEffect(() => {
    if (!open) return;

    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .eq('active', true)
          .order('name');

        if (error) throw error;
        setDepartments(data ?? []);
      } catch (error) {
        console.error('Error loading departments:', error);
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const fetchEquipmentTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('equipment_types')
          .select('*, equipment_type_details(*)')
          .eq('active', true)
          .order('name');

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped = data
            .map((dbType) => {
              const matchingType = BASE_EQUIPMENT_TYPES.find(
                (type) => type.code === dbType.code || type.label === dbType.name
              );

              const label = (dbType?.name || matchingType?.label || dbType?.code || '').trim();
              if (!label) {
                return null;
              }

              const details = (dbType?.equipment_type_details || []) as Array<{
                id: string;
                name: string;
                code: string;
                active: boolean;
              }>;

              const activeDetails = details
                .filter((detail) => detail.active)
                .sort((a, b) => a.code.localeCompare(b.code, 'th'))
                .map((detail) => ({ value: detail.code, label: detail.name }));

              return {
                value: (dbType?.code || matchingType?.code || label).toLowerCase(),
                label,
                code: dbType?.code || matchingType?.code || '',
                icon: matchingType?.icon || Computer,
                subTypes: activeDetails.length > 0 ? activeDetails : (matchingType?.subTypes || []),
              } satisfies EquipmentTypeOption;
            })
            .filter((item): item is EquipmentTypeOption => Boolean(item));

          if (mapped.length > 0) {
            setAvailableEquipmentTypes(mapped);
            return;
          }
        }

        setAvailableEquipmentTypes(BASE_EQUIPMENT_TYPES);
      } catch (error) {
        console.error('Error loading equipment types:', error);
        setAvailableEquipmentTypes(BASE_EQUIPMENT_TYPES);
      }
    };

    fetchEquipmentTypes();
  }, [open]);

  const fullAssetNumber = joinAssetNumber(
    formData.assetNumber,
    formData.quantity && formData.quantity.trim().length > 0 ? formData.quantity : "1",
  );

  const handleAssetNumberChange = (value: string) => {
    const inputValue = value.trim();

    if (inputValue.length === 0) {
      setFormData((prev) => ({
        ...prev,
        assetNumber: "",
        quantity: ""
      }));
      return;
    }

    setFormData((prev) => {
      const assetInfo = normalizeAssetNumber(inputValue, prev.quantity || "1");
      return {
        ...prev,
        assetNumber: assetInfo.base || inputValue,
        quantity: assetInfo.sequence || prev.quantity || "1",
      };
    });
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    const totalImages = existingImages.length + selectedImages.length;
    const newFiles = Array.from(files).slice(0, 3 - totalImages);
    
    if (totalImages + newFiles.length > 3) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "สามารถอัปโหลดรูปภาพได้สูงสุด 3 รูป",
        variant: "destructive",
      });
      return;
    }
    
    const updatedImages = [...selectedImages, ...newFiles];
    setSelectedImages(updatedImages);
    
    // Create previews for new files
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeNewImage = (index: number) => {
    const updatedImages = selectedImages.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(updatedImages);
    setImagePreviews(updatedPreviews);
  };

  const removeExistingImage = (imageUrl: string) => {
    setExistingImages(prev => prev.filter(img => img !== imageUrl));
    setImagesToDelete(prev => [...prev, imageUrl]);
  };

  const uploadNewImages = async (equipmentId: string): Promise<string[]> => {
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

  const deleteRemovedImages = async () => {
    for (const imageUrl of imagesToDelete) {
      // Extract filename from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error } = await supabase.storage
        .from('equipment-images')
        .remove([fileName]);
        
      if (error) {
        console.error('Error deleting image:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Upload new images
      let newImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        newImageUrls = await uploadNewImages(equipment.id);
      }
      
      // Delete removed images
      if (imagesToDelete.length > 0) {
        await deleteRemovedImages();
      }
      
      // Combine existing and new images
      const finalImages = [...existingImages, ...newImageUrls];
      
      const cleanedSpecsEntries = Object.entries(formData.specs || {})
        .map(([key, value]) => {
          const trimmed = value?.toString().trim();
          return trimmed ? [key, trimmed] : null;
        })
        .filter((entry): entry is [string, string] => Boolean(entry));

      const cleanedSpecs = Object.fromEntries(cleanedSpecsEntries);
      if (cleanedSpecs.reason && !cleanedSpecs.notes) {
        cleanedSpecs.notes = cleanedSpecs.reason;
      } else if (!cleanedSpecs.reason && cleanedSpecs.notes) {
        cleanedSpecs.reason = cleanedSpecs.notes;
      }

      const trimmedAssetNumber = formData.assetNumber.trim();
      const rawQuantity = formData.quantity?.toString().trim() || "1";

      if (!trimmedAssetNumber) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "กรุณาระบุเลขครุภัณฑ์",
          variant: "destructive",
        });
        return;
      }

      const sanitizedQuantity = /^\d+$/.test(rawQuantity) && parseInt(rawQuantity, 10) > 0
        ? rawQuantity
        : "1";

      const combinedAssetNumber = joinAssetNumber(trimmedAssetNumber, sanitizedQuantity);

      // Update equipment data
      const updatedEquipment = {
        ...formData,
        assetNumber: combinedAssetNumber,
        quantity: sanitizedQuantity,
        specs: cleanedSpecs,
        images: finalImages
      };
      
      onSave(updatedEquipment);
      
      toast({
        title: "บันทึกสำเร็จ",
        description: "ข้อมูลครุภัณฑ์ได้รับการอัปเดตแล้ว",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตข้อมูลได้",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSpecChange = (specKey: string, value: string) => {
    setFormData(prev => {
      const updatedSpecs = {
        ...prev.specs,
        [specKey]: value,
      } as Record<string, string>;

      if (specKey === "reason") {
        updatedSpecs.notes = value;
      } else if (specKey === "notes") {
        updatedSpecs.reason = value;
      }

      return {
        ...prev,
        specs: updatedSpecs,
      };
    });
  };

  const combinedEquipmentTypes = useMemo(() => {
    const seen = new Set<string>();
    const combined: EquipmentTypeOption[] = [];
    [...availableEquipmentTypes, ...BASE_EQUIPMENT_TYPES].forEach((type) => {
      const key = (type.code || type.label || '').trim();
      if (!key || seen.has(key)) {
        return;
      }
      seen.add(key);
      combined.push(type);
    });
    return combined;
  }, [availableEquipmentTypes]);

  const typeSelectOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ value: string; display: string }> = [];

    combinedEquipmentTypes.forEach((type) => {
      const label = (type.label || '').trim();
      if (!label || seen.has(label)) {
        return;
      }
      seen.add(label);
      const display = type.code ? `${type.code} - ${label}` : label;
      options.push({ value: label, display });
    });

    const currentType = (formData.type || '').trim();
    if (currentType && !seen.has(currentType)) {
      options.push({ value: currentType, display: currentType });
    }

    return options;
  }, [combinedEquipmentTypes, formData.type]);

  const departmentValue = typeof formData.specs?.department === "string" ? formData.specs.department || "" : "";
  const departmentOptions = departments
    .map((dept) => (typeof dept?.name === "string" ? dept.name : ""))
    .filter((name): name is string => Boolean(name));
  const hasDepartmentInOptions = departmentValue ? departmentOptions.includes(departmentValue) : false;
  const NONE_DEPARTMENT_VALUE = "__none__";
  const selectDepartmentValue = departmentValue ? departmentValue : NONE_DEPARTMENT_VALUE;
  const additionalSpecKeys = Object.keys(formData.specs || {}).filter(
    (key) => key !== "department" && !Object.prototype.hasOwnProperty.call(DEFAULT_SPEC_FIELDS, key)
  );

  const getSpecLabel = (key: string) => {
    const computerField = COMPUTER_SPEC_FIELDS.find((field) => field.key === key);
    if (computerField) return computerField.label;
    const systemField = SYSTEM_SPEC_FIELDS.find((field) => field.key === key);
    if (systemField) return systemField.label;
    const prettified = key
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]+/g, " ")
      .trim();
    return prettified.charAt(0).toUpperCase() + prettified.slice(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูลครุภัณฑ์</DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลครุภัณฑ์ {equipment.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
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
                  <Label htmlFor="name">ชื่อครุภัณฑ์</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">ประเภท</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => handleInputChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภทครุภัณฑ์" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeSelectOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.display}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="brand">ยี่ห้อ</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="model">รุ่น</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="assetNumber">เลขครุภัณฑ์</Label>
                  <Input
                    id="assetNumber"
                    value={fullAssetNumber}
                    onChange={(e) => handleAssetNumberChange(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ข้อมูลการใช้งาน/จัดเก็บ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลการใช้งาน/จัดเก็บ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">สถานะ</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
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
                <div>
                  <Label htmlFor="location">สถานที่ติดตั้ง/จัดเก็บ</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="department">หน่วยงานที่รับผิดชอบ</Label>
                  {departments.length > 0 ? (
                    <Select
                      value={selectDepartmentValue}
                      onValueChange={(value) =>
                        handleSpecChange('department', value === NONE_DEPARTMENT_VALUE ? "" : value)
                      }
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="เลือกหน่วยงาน" />
                      </SelectTrigger>
                      <SelectContent>
                        {!hasDepartmentInOptions && departmentValue && (
                          <SelectItem value={departmentValue}>
                            {departmentValue}
                          </SelectItem>
                        )}
                        <SelectItem value={NONE_DEPARTMENT_VALUE}>ไม่ระบุ</SelectItem>
                        {departments.map((dept) => {
                          const name = typeof dept?.name === "string" ? dept.name : "";
                          if (!name) {
                            return null;
                          }

                          return (
                            <SelectItem key={dept.id} value={name}>
                              {name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="department"
                      value={departmentValue}
                      onChange={(e) => handleSpecChange('department', e.target.value)}
                      placeholder="ระบุหน่วยงาน"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="user">ผู้ใช้งาน</Label>
                  <Input
                    id="user"
                    value={formData.user}
                    onChange={(e) => handleInputChange('user', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseDate">วันที่ได้มา</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                  />
                </div>
              <div>
                <Label htmlFor="warrantyEnd">หมดประกัน</Label>
                <Input
                  id="warrantyEnd"
                  type="date"
                  value={formData.warrantyEnd}
                  onChange={(e) => handleInputChange('warrantyEnd', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="reason">เหตุผล</Label>
                <Textarea
                  id="reason"
                  value={formData.specs?.reason ?? formData.specs?.notes ?? ""}
                  onChange={(e) => handleSpecChange('reason', e.target.value)}
                  rows={3}
                  placeholder="ระบุเหตุผลของการจัดซื้อหรือการได้มาของครุภัณฑ์"
                />
              </div>
            </div>
          </CardContent>
        </Card>

          {/* ข้อมูลเทคนิค */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลเทคนิค</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COMPUTER_SPEC_FIELDS.map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type={type ?? "text"}
                      value={formData.specs?.[key] ?? ""}
                      onChange={(e) => handleSpecChange(key, e.target.value)}
                      placeholder={placeholder}
                      min={type === "number" ? 0 : undefined}
                      step={type === "number" ? "1" : undefined}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SYSTEM_SPEC_FIELDS.map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type={type ?? "text"}
                      value={formData.specs?.[key] ?? ""}
                      onChange={(e) => handleSpecChange(key, e.target.value)}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>

              {additionalSpecKeys.length > 0 && (
                <div className="space-y-4">
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {additionalSpecKeys.map((key) => (
                      <div key={key}>
                        <Label htmlFor={`spec-${key}`}>{getSpecLabel(key)}</Label>
                        <Input
                          id={`spec-${key}`}
                          value={formData.specs?.[key] ?? ""}
                          onChange={(e) => handleSpecChange(key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
        <div className="space-y-6 lg:sticky lg:top-20">
          {/* Image Management Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5 text-primary" />
                <span>รูปภาพครุภัณฑ์</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={existingImages.length + selectedImages.length >= 3}
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>เลือกรูปภาพ</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={existingImages.length + selectedImages.length >= 3}
                  className="flex items-center space-x-2"
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
                จัดการรูปภาพได้สูงสุด 3 รูป (สนับสนุนไฟล์ JPG, PNG, WEBP ขนาดไม่เกิน 5MB ต่อรูป)
              </p>

              {existingImages.length === 0 && imagePreviews.length === 0 && (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                  ยังไม่มีรูปภาพสำหรับครุภัณฑ์รายการนี้
                </div>
              )}

              {existingImages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">รูปภาพปัจจุบัน</h4>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                    {existingImages.map((imageUrl, index) => (
                      <div key={`existing-${index}`} className="relative">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                          <img
                            src={imageUrl}
                            alt={`Existing ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 shadow-md"
                          onClick={() => removeExistingImage(imageUrl)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {imagePreviews.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">รูปภาพใหม่</h4>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={`new-${index}`} className="relative">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                          <img
                            src={preview}
                            alt={`New Preview ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 shadow-md"
                          onClick={() => removeNewImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          ยกเลิก
        </Button>
        <Button type="submit" className="bg-gradient-primary hover:opacity-90">
          บันทึกการแก้ไข
        </Button>
      </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
