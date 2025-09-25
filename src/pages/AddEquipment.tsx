import { useState, useRef, useEffect, useMemo } from "react";
import { Save, ArrowLeft, Upload, Computer, Monitor, Loader2, Camera, X } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const sequencePreview = useMemo(() => {
    const parsed = parseInt(quantity, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed.toString();
    }
    return "1";
  }, [quantity]);

  // Load active equipment types and departments on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load equipment types
        const { data: equipmentTypesData } = await supabase
          .from('equipment_types')
          .select('*')
          .eq('active', true)
          .order('name');

        if (equipmentTypesData) {
          // Map database equipment types to the format expected by the UI
          const mappedTypes = equipmentTypesData.map(dbType => {
            // Prefer exact code match; if not found, fall back to strict label equality
            const matchingType =
              baseEquipmentTypes.find(t => t.code === dbType.code) ||
              baseEquipmentTypes.find(t => t.label === dbType.name);

            return {
              value: dbType.code.toLowerCase(),
              label: dbType.name,
              icon: matchingType?.icon || Computer,
              code: dbType.code,
              subTypes: matchingType?.subTypes || []
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
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

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
      }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/equipment">
            <Button variant="ghost" size="sm" className="hover:bg-muted">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">เพิ่มครุภัณฑ์ใหม่</h1>
            <p className="text-muted-foreground">บันทึกข้อมูลครุภัณฑ์คอมพิวเตอร์</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                    </div>
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
                    <Input
                      id="model"
                      name="model"
                      placeholder="เช่น OptiPlex 7090, LaserJet Pro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input
                      id="serialNumber"
                      name="serialNumber"
                      placeholder="เช่น DELL7090001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assetNumber">เลขครุภัณฑ์</Label>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Input
                          id="assetNumber"
                          name="assetNumber"
                          placeholder={equipmentSubType ? `อัตโนมัติ: ${equipmentSubType}` : "เช่น EQ001"}
                          defaultValue={equipmentSubType || ""}
                          readOnly={!!equipmentSubType}
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="mx-2 text-muted-foreground">/</span>
                      </div>
                      <div className="w-20">
                        <Input
                          id="quantity"
                          name="quantity"
                          type="number"
                          placeholder="1"
                          defaultValue={quantity}
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

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={selectedImages.length >= 3}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>เลือกรูปภาพ</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={selectedImages.length >= 3}
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
                  อัปโหลดรูปภาพได้สูงสุด 3 รูป (สนับสนุนไฟล์ JPG, PNG, WEBP ขนาดไม่เกิน 5MB ต่อรูป)
                </p>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
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
        <div className="flex justify-end space-x-4">
          <Link to="/equipment">
            <Button variant="outline" type="button">
              ยกเลิก
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-gradient-primary hover:opacity-90 shadow-soft"
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
    </div>
  );
}
