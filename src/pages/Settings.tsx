import { useState, useEffect, ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings as SettingsIcon, Building, Tag, Tags, Store, Plus, Edit, Trash2, Save, Loader2, Image as ImageIcon, AlertTriangle, ListChecks, Cpu, HardDrive, MemoryStick, Monitor, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DepartmentDialog } from "@/components/settings/DepartmentDialog";
import { EquipmentTypeDialog } from "@/components/settings/EquipmentTypeDialog";
import { EquipmentTypeDetailDialog, EquipmentTypeDetail } from "@/components/settings/EquipmentTypeDetailDialog";
import { DeleteConfirmDialog } from "@/components/settings/DeleteConfirmDialog";
import { VendorDialog } from "@/components/settings/VendorDialog";
import { BrandDialog } from "@/components/settings/BrandDialog";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { TechnicalSpecDialog } from "@/components/settings/TechnicalSpecDialog";
import { TECHNICAL_SPEC_TYPES, TechnicalSpecType } from "@/data/technicalSpecs";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
}

interface EquipmentType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  details: EquipmentTypeDetail[];
}

interface Vendor {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
}

interface Brand {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

type OrganizationFormState = {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  email_notifications: boolean;
  auto_backup: boolean;
  session_timeout: number;
  app_title: string;
};

const DEFAULT_APP_TITLE = "ระบบครุภัณฑ์";

const createDefaultOrgForm = (): OrganizationFormState => ({
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  email_notifications: true,
  auto_backup: true,
  session_timeout: 30,
  app_title: DEFAULT_APP_TITLE,
});

const Settings = () => {
  const { toast } = useToast();
  const { settings: orgSettings, loading: orgSettingsLoading, refresh: refreshOrgSettings } = useOrganizationSettings();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("organization");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsSupported, setBrandsSupported] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoPreviewObjectUrl, setLogoPreviewObjectUrl] = useState<string | null>(null);
  const [logoCleared, setLogoCleared] = useState(false);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [faviconPreviewObjectUrl, setFaviconPreviewObjectUrl] = useState<string | null>(null);
  const [faviconCleared, setFaviconCleared] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [brandingSupported, setBrandingSupported] = useState(true);
  const [isDetailDeleteDialogOpen, setIsDetailDeleteDialogOpen] = useState(false);
  const [technicalSpecs, setTechnicalSpecs] = useState<Record<string, any[]>>({
    cpu: [],
    ram: [],
    harddisk: [],
    os: [],
    office: []
  });

  // Dialog states
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isEquipmentTypeDialogOpen, setIsEquipmentTypeDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEquipmentDetailDialogOpen, setIsEquipmentDetailDialogOpen] = useState(false);
  // Technical specs dialog states
  const [isTechnicalSpecDialogOpen, setIsTechnicalSpecDialogOpen] = useState(false);
  const [currentSpecType, setCurrentSpecType] = useState<TechnicalSpecType | null>(null);
  const [editingSpecRecord, setEditingSpecRecord] = useState<any>(null);
  
  // Edit states
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingEquipmentType, setEditingEquipmentType] = useState<EquipmentType | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  interface TechnicalSpecItem {
    id: string;
    name: string;
    active: boolean;
    specType: TechnicalSpecType;
    [key: string]: any;
  }

  const [deletingItem, setDeletingItem] = useState<{ 
  type: 'department' | 'equipmentType' | 'vendor' | 'brand' | 'technicalSpec', 
  item: Department | EquipmentType | Vendor | Brand | TechnicalSpecItem 
} | null>(null);
  const [detailDialogState, setDetailDialogState] = useState<{ equipmentType: EquipmentType; detail: EquipmentTypeDetail | null } | null>(null);
  const [detailDeleteState, setDetailDeleteState] = useState<{ equipmentType: EquipmentType; detail: EquipmentTypeDetail } | null>(null);

  // Organization form state
  const [orgForm, setOrgForm] = useState<OrganizationFormState>(createDefaultOrgForm);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const checkBrandingSupport = async () => {
      try {
        const { error } = await supabase
          .from('organization_settings')
          .select('app_title')
          .limit(1);

        if (error?.code === 'PGRST204') {
          setBrandingSupported(false);
        } else if (error) {
          console.error('Branding support check failed', error);
          setBrandingSupported(false);
        } else {
          setBrandingSupported(true);
        }
      } catch (error) {
        console.error('Branding support check threw', error);
        setBrandingSupported(false);
      }
    };

    checkBrandingSupport();
  }, []);

  useEffect(() => {
    if (!brandsSupported) {
      if (activeTab === "brands") {
        setActiveTab("organization");
      }
      if (isBrandDialogOpen) {
        setIsBrandDialogOpen(false);
      }
    }
  }, [brandsSupported, activeTab, isBrandDialogOpen]);

  useEffect(() => () => {
    if (logoPreviewObjectUrl) {
      URL.revokeObjectURL(logoPreviewObjectUrl);
    }
  }, [logoPreviewObjectUrl]);

  useEffect(() => () => {
    if (faviconPreviewObjectUrl) {
      URL.revokeObjectURL(faviconPreviewObjectUrl);
    }
  }, [faviconPreviewObjectUrl]);

  useEffect(() => {
    if (orgSettings) {
      setLogoPreviewObjectUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setFaviconPreviewObjectUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setLogoFile(null);
      setLogoCleared(false);
      setLogoPreview(orgSettings.logo_url);
      setFaviconFile(null);
      setFaviconCleared(false);
      setFaviconPreview(orgSettings.favicon_url ?? null);
      setOrgForm({
        name: orgSettings.name,
        code: orgSettings.code,
        address: orgSettings.address ?? "",
        phone: orgSettings.phone ?? "",
        email: orgSettings.email ?? "",
        email_notifications: orgSettings.email_notifications ?? true,
        auto_backup: orgSettings.auto_backup ?? true,
        session_timeout: orgSettings.session_timeout ?? 30,
        app_title: orgSettings.app_title ?? orgSettings.name ?? DEFAULT_APP_TITLE,
      });
    } else {
      setOrgForm(createDefaultOrgForm());
      setLogoPreviewObjectUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setLogoPreview(null);
      setLogoFile(null);
      setLogoCleared(false);
      setFaviconPreviewObjectUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setFaviconPreview(null);
      setFaviconFile(null);
      setFaviconCleared(false);
    }
  }, [orgSettings]);

  const loadTechnicalSpecs = async () => {
    try {
      const specs: Record<string, any[]> = {};
      
      // Load each type of technical specification
      for (const specType of TECHNICAL_SPEC_TYPES) {
        // Use type assertion to handle dynamic table names
        const { data, error } = await (supabase as any)
          .from(specType.tableName)
          .select('*')
          .order('name', { ascending: true });
          
        if (error) throw error;
        
        specs[specType.id] = data || [];
      }
      
      setTechnicalSpecs(specs);
    } catch (error: Error | unknown) {
      console.error('Error loading technical specs:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลสเปคเทคนิคได้',
        variant: "destructive",
      });
      // Set empty specs on error to prevent UI issues
      setTechnicalSpecs({
        cpu: [],
        ram: [],
        harddisk: [],
        os: [],
        office: []
      });
    }
  };
  
  // Handle adding a new technical specification
  const handleTechnicalSpecAdd = (specType: TechnicalSpecType) => {
    setCurrentSpecType(specType);
    setEditingSpecRecord(null);
    setIsTechnicalSpecDialogOpen(true);
  };
  
  // Handle editing an existing technical specification
  const handleTechnicalSpecEdit = (specType: TechnicalSpecType, spec: any) => {
    setCurrentSpecType(specType);
    setEditingSpecRecord(spec);
    setIsTechnicalSpecDialogOpen(true);
  };
  
  // Handle saving a technical specification
  const handleTechnicalSpecSave = async (values: any) => {
    if (!currentSpecType) return;
    
    try {
      let error;
      let data;
      
      if (editingSpecRecord) {
        // Update existing spec
        const { data: updatedData, error: updateError } = await (supabase as any)
          .from(currentSpecType.tableName)
          .update({
            ...values,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSpecRecord.id)
          .select();
          
        data = updatedData?.[0];
        error = updateError;
      } else {
        // Create new spec
        const { data: newData, error: insertError } = await (supabase as any)
          .from(currentSpecType.tableName)
          .insert([{
            ...values,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select();
          
        data = newData?.[0];
        error = insertError;
      }
      
      if (error) throw error;
      
      toast({
        title: "บันทึกข้อมูลสำเร็จ",
        description: `บันทึกข้อมูล${currentSpecType.displayName}เรียบร้อยแล้ว`,
      });
      
      // Refresh the specs list
      await loadTechnicalSpecs();
      setIsTechnicalSpecDialogOpen(false);
    } catch (error: Error | unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'ไม่สามารถบันทึกข้อมูลได้',
        variant: "destructive",
      });
    }
  };
  
  // Handle deleting a technical specification
  const handleTechnicalSpecDelete = (specType: TechnicalSpecType, spec: any) => {
    setDeletingItem({ 
      type: 'technicalSpec', 
      item: { 
        ...spec, 
        specType 
      } 
    });
    setIsDeleteDialogOpen(true);
  };
  
  // Handle toggling active status of a technical specification
  const handleToggleTechnicalSpecStatus = async (specType: TechnicalSpecType, spec: any) => {
    try {
      const { error } = await (supabase as any)
        .from(specType.tableName)
        .update({ 
          active: !spec.active,
          updated_at: new Date().toISOString() 
        })
        .eq('id', spec.id);

      if (error) throw error;

      toast({
        title: "อัปเดตสถานะสำเร็จ",
        description: `${spec.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'} ${specType.displayName} เรียบร้อยแล้ว`,
      });

      await loadTechnicalSpecs();
    } catch (error: Error | unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'ไม่สามารถอัปเดตสถานะได้',
        variant: "destructive",
      });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load technical specs first
      await loadTechnicalSpecs();

      // Load departments
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (deptError) throw deptError;
      setDepartments(deptData || []);

      // Load equipment types
      const { data: typeData, error: typeError } = await supabase
        .from('equipment_types')
        .select('*, equipment_type_details(*)')
        .order('name');

      if (typeError) throw typeError;

      const mappedTypes: EquipmentType[] = (typeData || []).map((type: Record<string, unknown>) => {
        const details: EquipmentTypeDetail[] = (type.equipment_type_details as Record<string, unknown>[] || [])
          .map((detail: Record<string, unknown>) => ({
            id: detail.id as string,
            equipment_type_id: detail.equipment_type_id as string,
            name: detail.name as string,
            code: detail.code as string,
            description: detail.description as string | null,
            active: Boolean(detail.active),
          }))
          .sort((a, b) => a.code.localeCompare(b.code, 'th'));

        return {
          id: type.id as string,
          name: type.name as string,
          code: type.code as string,
          description: type.description as string | null,
          active: Boolean(type.active),
          details,
        } satisfies EquipmentType;
      });

      setEquipmentTypes(mappedTypes);

      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .order('name');

      if (vendorError) throw vendorError;

      setVendors(vendorData || []);

      const { data: brandData, error: brandError, status: brandStatus } = await supabase
        .from('equipment_brands')
        .select('*')
        .order('name');

      if (brandError) {
        const message = typeof brandError.message === "string" ? brandError.message.toLowerCase() : "";
        const missingTable =
          brandStatus === 404 ||
          brandError.code === 'PGRST116' ||
          brandError.code === '42P01' ||
          message.includes('not found') ||
          message.includes('does not exist');

        if (missingTable) {
          setBrandsSupported(false);
          setBrands([]);
        } else {
          throw brandError;
        }
      } else {
        setBrandsSupported(true);
        setBrands(brandData || []);
      }
    } catch (error: Error | unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลได้',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFaviconChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!brandingSupported) {
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/x-icon",
      "image/vnd.microsoft.icon",
      "image/png",
      "image/svg+xml",
    ];

    if (file.size > 512 * 1024) {
      toast({
        title: "ไฟล์ใหญ่เกินไป",
        description: "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 512KB",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (file.type && !allowedTypes.includes(file.type)) {
      toast({
        title: "ชนิดไฟล์ไม่รองรับ",
        description: "กรุณาเลือกไฟล์ ICO, PNG หรือ SVG",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setFaviconPreviewObjectUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });

    const objectUrl = URL.createObjectURL(file);
    setFaviconFile(file);
    setFaviconPreview(objectUrl);
    setFaviconPreviewObjectUrl(objectUrl);
    setFaviconCleared(false);
    event.target.value = "";
  };

  const handleClearFavicon = () => {
    if (!brandingSupported) {
      return;
    }

    setFaviconFile(null);
    setFaviconCleared(true);
    setFaviconPreviewObjectUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setFaviconPreview(null);
  };

  const handleSaveOrganization = async () => {
    if (!orgForm.name.trim() || !orgForm.code.trim()) {
      toast({
        title: "กรอกข้อมูลไม่ครบ",
        description: "กรุณาระบุชื่อองค์กรและรหัสองค์กร",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const sanitize = (value: string) => {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      };

      const normalizedSessionTimeout = Math.min(Math.max(orgForm.session_timeout, 5), 480);
      const normalizedName = orgForm.name.trim() || DEFAULT_APP_TITLE;
      const updates: Record<string, string | number | boolean | null | undefined> = {
        name: normalizedName,
        code: orgForm.code.trim(),
        address: sanitize(orgForm.address),
        phone: sanitize(orgForm.phone),
        email: sanitize(orgForm.email),
        email_notifications: orgForm.email_notifications,
        auto_backup: orgForm.auto_backup,
        session_timeout: normalizedSessionTimeout,
      };

      if (brandingSupported) {
        let faviconUrl = orgSettings?.favicon_url ?? null;

        if (faviconCleared && !faviconFile) {
          faviconUrl = null;
        }

        if (faviconFile) {
          const extension = faviconFile.name.split('.').pop()?.toLowerCase() || 'png';
          const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          const basePath = orgSettings?.id ?? 'global';
          const storagePath = `branding/${basePath}/favicon-${uniqueSuffix}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from('branding-assets')
            .upload(storagePath, faviconFile, {
              cacheControl: '3600',
              upsert: true,
              contentType: faviconFile.type,
            });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('branding-assets')
            .getPublicUrl(storagePath);

          faviconUrl = publicUrlData.publicUrl;
        }

        const normalizedTitle = orgForm.app_title.trim() || orgForm.name.trim() || DEFAULT_APP_TITLE;
        updates.app_title = normalizedTitle;
        updates.favicon_url = faviconUrl;
      }

      if (orgSettings?.id) {
        const { error } = await supabase
          .from('organization_settings')
          .update(updates as any)
          .eq('id', orgSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_settings')
          .insert(updates as any);

        if (error) throw error;
      }

      await refreshOrgSettings();

      toast({
        title: "บันทึกสำเร็จ",
        description: "บันทึกข้อมูลองค์กรและการตั้งค่าระบบเรียบร้อยแล้ว",
      });
    } catch (error: Error | unknown) {
      console.error('Failed to save organization settings', error);

      if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST204') {
        setBrandingSupported(false);
      }

      let description = (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST204')
        ? 'ระบบยังไม่พบคอลัมน์ app_title ในฐานข้อมูล จึงไม่สามารถบันทึกการตั้งค่าการแสดงผลได้ กรุณาอัปเดตฐานข้อมูลแล้วลองใหม่อีกครั้ง'
        : (error instanceof Error ? error.message : 'Unknown error occurred');

      toast({
        title: "เกิดข้อผิดพลาด",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setIsDepartmentDialogOpen(true);
  };

  const handleEditEquipmentType = (equipmentType: EquipmentType) => {
    setEditingEquipmentType(equipmentType);
    setIsEquipmentTypeDialogOpen(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsVendorDialogOpen(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setIsBrandDialogOpen(true);
  };

  const handleDeleteDepartment = (department: Department) => {
    setDeletingItem({ type: 'department', item: department });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteEquipmentType = (equipmentType: EquipmentType) => {
    setDeletingItem({ type: 'equipmentType', item: equipmentType });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteVendor = (vendor: Vendor) => {
    setDeletingItem({ type: 'vendor', item: vendor });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteBrand = (brand: Brand) => {
    setDeletingItem({ type: 'brand', item: brand });
    setIsDeleteDialogOpen(true);
  };

  const handleToggleDepartmentStatus = async (department: Department) => {
    try {
      const { error } = await supabase
        .from('departments')
        .update({ active: !department.active })
        .eq('id', department.id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: `${department.active ? 'พักใช้งาน' : 'เปิดใช้งาน'}หน่วยงานเรียบร้อยแล้ว`,
      });

      loadData();
    } catch (error: Error | unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const handleToggleEquipmentTypeStatus = async (equipmentType: EquipmentType) => {
    try {
      const { error } = await supabase
        .from('equipment_types')
        .update({ active: !equipmentType.active })
        .eq('id', equipmentType.id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: `${equipmentType.active ? 'พักใช้งาน' : 'เปิดใช้งาน'}ประเภทครุภัณฑ์เรียบร้อยแล้ว`,
      });

      loadData();
    } catch (error: Error | unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const handleToggleVendorStatus = async (vendor: Vendor) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ active: !vendor.active })
        .eq('id', vendor.id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: `${vendor.active ? 'พักใช้งาน' : 'เปิดใช้งาน'}ข้อมูลผู้ขายเรียบร้อยแล้ว`,
      });

      loadData();
    } catch (error: Error | unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const handleToggleBrandStatus = async (brand: Brand) => {
    try {
      const { error } = await supabase
        .from('equipment_brands')
        .update({ active: !brand.active })
        .eq('id', brand.id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: `${brand.active ? 'พักใช้งาน' : 'เปิดใช้งาน'}ยี่ห้อเรียบร้อยแล้ว`,
      });

      loadData();
    } catch (error: Error | unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const handleAddEquipmentDetail = (equipmentType: EquipmentType) => {
    setDetailDialogState({ equipmentType, detail: null });
    setIsEquipmentDetailDialogOpen(true);
  };

  const handleEditEquipmentDetail = (equipmentType: EquipmentType, detail: EquipmentTypeDetail) => {
    setDetailDialogState({ equipmentType, detail });
    setIsEquipmentDetailDialogOpen(true);
  };

  const handleToggleEquipmentDetailStatus = async (_equipmentType: EquipmentType, detail: EquipmentTypeDetail) => {
    try {
      const { error } = await supabase
        .from('equipment_type_details')
        .update({ active: !detail.active })
        .eq('id', detail.id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: `${detail.active ? 'พักใช้งาน' : 'เปิดใช้งาน'}รายละเอียดครุภัณฑ์เรียบร้อยแล้ว`,
      });

      loadData();
    } catch (error: Error | unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const handleQueueDeleteEquipmentDetail = (equipmentType: EquipmentType, detail: EquipmentTypeDetail) => {
    setDetailDeleteState({ equipmentType, detail });
    setIsDetailDeleteDialogOpen(true);
  };

  const handleConfirmDeleteDetail = async () => {
    if (!detailDeleteState) return;

    try {
      const { error } = await supabase
        .from('equipment_type_details')
        .delete()
        .eq('id', detailDeleteState.detail.id);

      if (error) throw error;

      toast({
        title: "ลบสำเร็จ",
        description: "ลบรายละเอียดครุภัณฑ์เรียบร้อยแล้ว",
      });

      loadData();
    } catch (error: Error | unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsDetailDeleteDialogOpen(false);
      setDetailDeleteState(null);
    }
  };

  const handleConfirmDelete = async (reason: string, password: string) => {
    if (!deletingItem) return;

    try {
      if (deletingItem.type === 'technicalSpec') {
        // Handle technical spec deletion directly since we don't have an edge function for it
        const { error } = await (supabase as any)
          .from((deletingItem.item as any).specType.tableName)
          .delete()
          .eq('id', deletingItem.item.id);

        if (error) throw error;
      } else if (deletingItem.type === 'brand') {
        const { error } = await supabase
          .from('equipment_brands')
          .delete()
          .eq('id', deletingItem.item.id);

        if (error) throw error;
      } else {
        // Call delete edge function based on type for other items
        const functionName = deletingItem.type === 'department'
          ? 'delete-department'
          : deletingItem.type === 'equipmentType'
            ? 'delete-equipment-type'
            : 'delete-vendor';

        const { data, error } = await supabase.functions.invoke(functionName, {
          body: {
            id: deletingItem.item.id,
            reason,
            password,
          },
        });

        if (error) throw error;

        if (!data?.success) {
          throw new Error(data?.error || 'การลบไม่สำเร็จ');
        }
      }

      toast({
        title: "ลบสำเร็จ",
        description: `ลบ${getDeletingLabel(deletingItem.type)}เรียบร้อยแล้ว`,
      });

      loadData();
    } catch (error: Error | unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDialogClose = () => {
    setEditingDepartment(null);
    setEditingEquipmentType(null);
    setEditingVendor(null);
    setEditingBrand(null);
    setDeletingItem(null);
    setDetailDialogState(null);
    setDetailDeleteState(null);
    setIsEquipmentDetailDialogOpen(false);
    setIsDetailDeleteDialogOpen(false);
    setIsVendorDialogOpen(false);
    setIsBrandDialogOpen(false);
  };

  // These functions are already defined earlier in the file

  const getDeletingLabel = (type?: 'department' | 'equipmentType' | 'vendor' | 'brand' | 'technicalSpec') => {
    if (type === 'department') return 'หน่วยงาน';
    if (type === 'equipmentType') return 'ประเภทครุภัณฑ์';
    if (type === 'vendor') return 'ข้อมูลผู้ขาย';
    if (type === 'brand') return 'ยี่ห้อ';
    if (type === 'technicalSpec') return 'ข้อมูลเทคนิค';
    return 'รายการ';
  };

  const handleTechnicalSpecDialogClose = () => {
    setIsTechnicalSpecDialogOpen(false);
    setCurrentSpecType(null);
    setEditingSpecRecord(null);
  };

  if (loading || orgSettingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ตั้งค่าระบบ</h1>
          <p className="text-muted-foreground mt-2">จัดการการตั้งค่าระบบและข้อมูลพื้นฐาน</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="organization">ข้อมูลองค์กร</TabsTrigger>
          <TabsTrigger value="departments">หน่วยงาน</TabsTrigger>
          <TabsTrigger value="equipment-types">ประเภทครุภัณฑ์</TabsTrigger>
          <TabsTrigger value="vendors">ผู้ขาย/ผู้รับจ้าง</TabsTrigger>
          {brandsSupported ? (
            <TabsTrigger value="brands">ยี่ห้อ</TabsTrigger>
          ) : null}
          <TabsTrigger value="technical-specs">ข้อมูลเทคนิค</TabsTrigger>
          <TabsTrigger value="system">ระบบ</TabsTrigger>
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                ข้อมูลองค์กร
              </CardTitle>
              <CardDescription>
                จัดการข้อมูลพื้นฐานขององค์กร
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="orgName">ชื่อองค์กร</Label>
                  <Input 
                    id="orgName"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    placeholder="ชื่อองค์กร" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgCode">รหัสองค์กร</Label>
                  <Input 
                    id="orgCode"
                    value={orgForm.code}
                    onChange={(e) => setOrgForm({ ...orgForm, code: e.target.value })}
                    placeholder="รหัสองค์กร" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgAddress">ที่อยู่</Label>
                <Textarea 
                  id="orgAddress"
                  value={orgForm.address}
                  onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  placeholder="ที่อยู่องค์กร" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">โทรศัพท์</Label>
                  <Input 
                    id="phone"
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                    placeholder="หมายเลขโทรศัพท์" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input 
                    id="email"
                    value={orgForm.email}
                    onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                    placeholder="อีเมลองค์กร" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">โลโก้องค์กร</Label>
                <Input id="logo" type="file" accept="image/*" />
                <p className="text-sm text-muted-foreground">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB</p>
              </div>

              <Button onClick={handleSaveOrganization} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    บันทึกข้อมูล
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Building className="mr-2 h-5 w-5" />
                    จัดการหน่วยงาน
                  </CardTitle>
                  <CardDescription>
                    เพิ่ม แก้ไข หรือลบหน่วยงานในระบบ
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setIsDepartmentDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  เพิ่มหน่วยงาน
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Building className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h3 className="font-medium text-foreground">{dept.name}</h3>
                            <p className="text-sm text-muted-foreground">รหัส: {dept.code}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 ml-8">{dept.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={dept.active ? "default" : "secondary"}>
                          {dept.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleToggleDepartmentStatus(dept)}>
                          {dept.active ? "พักใช้งาน" : "ใช้งาน"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEditDepartment(dept)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteDepartment(dept)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment Types Tab */}
        <TabsContent value="equipment-types">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Tag className="mr-2 h-5 w-5" />
                    จัดการประเภทครุภัณฑ์
                  </CardTitle>
                  <CardDescription>
                    เพิ่ม แก้ไข หรือลบประเภทครุภัณฑ์ในระบบ
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setIsEquipmentTypeDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  เพิ่มประเภท
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {equipmentTypes.map((type) => (
                  <div key={type.id} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Tag className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h3 className="font-medium text-foreground">{type.name}</h3>
                            <p className="text-sm text-muted-foreground">รหัส: {type.code}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 ml-8">{type.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={type.active ? "default" : "secondary"}>
                          {type.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleToggleEquipmentTypeStatus(type)}>
                          {type.active ? "พักใช้งาน" : "ใช้งาน"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEditEquipmentType(type)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteEquipmentType(type)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <ListChecks className="h-4 w-4" />
                          <span className="text-sm font-medium">รายละเอียดครุภัณฑ์</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleAddEquipmentDetail(type)}>
                          <Plus className="mr-2 h-4 w-4" /> เพิ่มรายละเอียด
                        </Button>
                      </div>
                      {type.details.length === 0 ? (
                        <p className="text-sm text-muted-foreground">ยังไม่มีรายละเอียดสำหรับประเภทนี้</p>
                      ) : (
                        <div className="space-y-2">
                          {type.details.map((detail) => (
                            <div
                              key={detail.id}
                              className="flex flex-col gap-3 rounded-md border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-foreground">{detail.name}</span>
                                  <Badge variant={detail.active ? "default" : "secondary"}>
                                    {detail.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">รหัส: {detail.code}</p>
                                {detail.description ? (
                                  <p className="text-sm text-muted-foreground">{detail.description}</p>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleEquipmentDetailStatus(type, detail)}
                                >
                                  {detail.active ? "พักใช้งาน" : "ใช้งาน"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleEditEquipmentDetail(type, detail)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQueueDeleteEquipmentDetail(type, detail)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Store className="mr-2 h-5 w-5" />
                    จัดการผู้ขาย/ผู้รับจ้าง/ผู้บริจาค
                  </CardTitle>
                  <CardDescription>
                    เพิ่ม แก้ไข หรือลบข้อมูลติดต่อของผู้ขาย/ผู้รับจ้าง/ผู้บริจาค
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingVendor(null);
                    setIsVendorDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  เพิ่มผู้ขาย
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vendors.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  ยังไม่มีข้อมูลผู้ขาย/ผู้รับจ้าง/ผู้บริจาคในระบบ
                </div>
              ) : (
                <div className="space-y-4">
                  {vendors.map((vendor) => (
                    <div key={vendor.id} className="rounded-lg border bg-card p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <Store className="mt-1 h-5 w-5 text-muted-foreground" />
                            <div>
                              <h3 className="font-medium text-foreground">{vendor.name}</h3>
                              {vendor.phone ? (
                                <p className="text-sm text-muted-foreground">โทรศัพท์: {vendor.phone}</p>
                              ) : null}
                            </div>
                          </div>
                          {vendor.address ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-line sm:pl-[32px]">
                              {vendor.address}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                          <Badge variant={vendor.active ? "default" : "secondary"}>
                            {vendor.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleToggleVendorStatus(vendor)}>
                              {vendor.active ? "พักใช้งาน" : "ใช้งาน"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditVendor(vendor)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteVendor(vendor)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brands Tab */}
        {brandsSupported ? (
        <TabsContent value="brands">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Tags className="mr-2 h-5 w-5" />
                    จัดการยี่ห้อครุภัณฑ์
                  </CardTitle>
                  <CardDescription>
                    เพิ่ม แก้ไข หรือลบยี่ห้อที่ใช้กับข้อมูลครุภัณฑ์
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingBrand(null);
                    setIsBrandDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  เพิ่มยี่ห้อ
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {brands.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  ยังไม่มียี่ห้อที่บันทึกไว้ในระบบ
                </div>
              ) : (
                <div className="space-y-4">
                  {brands.map((brand) => (
                    <div key={brand.id} className="rounded-lg border bg-card p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <Tags className="mt-1 h-5 w-5 text-muted-foreground" />
                            <div>
                              <h3 className="font-medium text-foreground">{brand.name}</h3>
                              {brand.description ? (
                                <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">
                                  {brand.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                          <Badge variant={brand.active ? "default" : "secondary"}>
                            {brand.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleToggleBrandStatus(brand)}>
                              {brand.active ? "พักใช้งาน" : "ใช้งาน"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditBrand(brand)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteBrand(brand)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        ) : (
          activeTab === "brands" && (
            <TabsContent value="brands">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Tags className="mr-2 h-5 w-5" />
                    จัดการยี่ห้อครุภัณฑ์
                  </CardTitle>
                  <CardDescription>
                    ระบบยังไม่รองรับการจัดการยี่ห้อ กรุณาอัปเดตโครงสร้างฐานข้อมูล (สร้างตาราง equipment_brands) ก่อนใช้งานฟีเจอร์นี้
                  </CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>
          )
        )}

        {/* Technical Specifications Tab */}
        <TabsContent value="technical-specs">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Cpu className="mr-2 h-5 w-5" />
                  จัดการข้อมูลเทคนิค
                </CardTitle>
                <CardDescription>
                  เพิ่ม แก้ไข หรือลบข้อมูลสเปคเทคนิคของอุปกรณ์
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* CPU Specifications */}
                  <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Cpu className="mr-2 h-5 w-5 text-blue-600" />
                        CPU
                      </CardTitle>
                      <CardDescription>จัดการข้อมูลสเปค CPU</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Button className="w-full" variant="outline" onClick={() => handleTechnicalSpecAdd(TECHNICAL_SPEC_TYPES[0])}>
                          <Plus className="mr-2 h-4 w-4" />
                          เพิ่มข้อมูล CPU
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          มีข้อมูล: {technicalSpecs.cpu?.length || 0} รายการ
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* RAM Specifications */}
                  <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <MemoryStick className="mr-2 h-5 w-5 text-green-600" />
                        RAM
                      </CardTitle>
                      <CardDescription>จัดการข้อมูลสเปค RAM</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Button className="w-full" variant="outline" onClick={() => handleTechnicalSpecAdd(TECHNICAL_SPEC_TYPES[1])}>
                          <Plus className="mr-2 h-4 w-4" />
                          เพิ่มข้อมูล RAM
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          มีข้อมูล: {technicalSpecs.ram?.length || 0} รายการ
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Harddisk Specifications */}
                  <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <HardDrive className="mr-2 h-5 w-5 text-purple-600" />
                        Harddisk
                      </CardTitle>
                      <CardDescription>จัดการข้อมูลสเปค Harddisk</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Button className="w-full" variant="outline" onClick={() => handleTechnicalSpecAdd(TECHNICAL_SPEC_TYPES[2])}>
                          <Plus className="mr-2 h-4 w-4" />
                          เพิ่มข้อมูล Harddisk
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          มีข้อมูล: {technicalSpecs.harddisk?.length || 0} รายการ
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* OS Specifications */}
                  <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Monitor className="mr-2 h-5 w-5 text-orange-600" />
                        ระบบปฏิบัติการ
                      </CardTitle>
                      <CardDescription>จัดการข้อมูลสเปค OS</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Button className="w-full" variant="outline" onClick={() => handleTechnicalSpecAdd(TECHNICAL_SPEC_TYPES[3])}>
                          <Plus className="mr-2 h-4 w-4" />
                          เพิ่มข้อมูล OS
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          มีข้อมูล: {technicalSpecs.os?.length || 0} รายการ
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Office Specifications */}
                  <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <FileText className="mr-2 h-5 w-5 text-red-600" />
                        Office
                      </CardTitle>
                      <CardDescription>จัดการข้อมูลสเปค Office</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Button className="w-full" variant="outline" onClick={() => handleTechnicalSpecAdd(TECHNICAL_SPEC_TYPES[4])}>
                          <Plus className="mr-2 h-4 w-4" />
                          เพิ่มข้อมูล Office
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          มีข้อมูล: {technicalSpecs.office?.length || 0} รายการ
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Display existing technical specifications */}
            {Object.entries(technicalSpecs).some(([_, specs]) => specs.length > 0) && (
              <>
                {Object.entries(technicalSpecs).map(([specTypeId, specs]) => {
                  const specType = TECHNICAL_SPEC_TYPES.find(type => type.id === specTypeId);
                  if (!specType || specs.length === 0) return null;

                  return (
                    <Card key={specTypeId}>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <specType.icon className="mr-2 h-5 w-5" />
                          {specType.displayName}
                        </CardTitle>
                        <CardDescription>
                          รายการข้อมูลที่มีอยู่ในระบบ
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3">
                          {specs.map((spec: any) => (
                            <div key={spec.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium">{spec.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {Object.entries(spec)
                                    .filter(([key]) => key !== 'id' && key !== 'name' && key !== 'active' && key !== 'created_at' && key !== 'updated_at')
                                    .slice(0, 3)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(', ')}
                                  {Object.keys(spec).filter(key => key !== 'id' && key !== 'name' && key !== 'active' && key !== 'created_at' && key !== 'updated_at').length > 3 && '...'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={spec.active ? "default" : "secondary"}>
                                  {spec.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                                </Badge>
                                <Button size="sm" variant="outline" onClick={() => handleTechnicalSpecEdit(specType, spec)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleToggleTechnicalSpecStatus(specType, spec)}>
                                  {spec.active ? "พักใช้งาน" : "ใช้งาน"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleTechnicalSpecDelete(specType, spec)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SettingsIcon className="mr-2 h-5 w-5" />
                  การตั้งค่าระบบ
                </CardTitle>
                <CardDescription>
                  จัดการการตั้งค่าทั่วไปของระบบ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>การแจ้งเตือนทางอีเมล</Label>
                    <p className="text-sm text-muted-foreground">
                      ส่งการแจ้งเตือนต่างๆ ทางอีเมล
                    </p>
                  </div>
                  <Switch 
                    checked={orgForm.email_notifications}
                    onCheckedChange={(checked) => setOrgForm({ ...orgForm, email_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>การสำรองข้อมูลอัตโนมัติ</Label>
                    <p className="text-sm text-muted-foreground">
                      สำรองข้อมูลระบบอัตโนมัติทุกวัน
                    </p>
                  </div>
                  <Switch 
                    checked={orgForm.auto_backup}
                    onCheckedChange={(checked) => setOrgForm({ ...orgForm, auto_backup: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">หมดเวลาเซสชัน (นาที)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="5"
                    max="480"
                    value={orgForm.session_timeout}
                    onChange={(e) => setOrgForm({ ...orgForm, session_timeout: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    ระยะเวลาที่ผู้ใช้จะถูกออกจากระบบอัตโนมัติ (5-480 นาที)
                  </p>
                </div>

                {brandingSupported ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="appTitle">ชื่อที่แสดงบน Title Bar</Label>
                      <Input
                        id="appTitle"
                        value={orgForm.app_title}
                        onChange={(e) => setOrgForm({ ...orgForm, app_title: e.target.value })}
                        placeholder="เช่น ระบบครุภัณฑ์หน่วยงานราชการ"
                      />
                      <p className="text-xs text-muted-foreground">
                        ข้อความนี้จะแสดงบนแถบชื่อหน้าต่างและส่วนหัวของระบบ
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="favicon">Favicon</Label>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40">
                          {faviconPreview ? (
                            <img
                              src={faviconPreview}
                              alt="ตัวอย่าง Favicon"
                              className="h-8 w-8 rounded"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            id="favicon"
                            type="file"
                            accept="image/png,image/x-icon,image/svg+xml,image/vnd.microsoft.icon"
                            onChange={handleFaviconChange}
                            disabled={isSaving}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleClearFavicon}
                            disabled={isSaving || (!faviconPreview && !faviconFile)}
                          >
                            ล้าง favicon
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        แนะนำไฟล์ขนาด 32x32 พิกเซล (PNG, ICO หรือ SVG) และมีขนาดไม่เกิน 512KB
                      </p>
                    </div>
                  </>
                ) : (
                  <Alert variant="destructive" className="border-dashed">
                    <AlertTriangle className="h-5 w-5" />
                    <div>
                      <AlertTitle>ต้องการอัปเดตฐานข้อมูล</AlertTitle>
                      <AlertDescription>
                        ระบบยังไม่รองรับการบันทึก favicon และชื่อ Title Bar ในฐานข้อมูล โปรดรันการอัปเดตสคีมาของ Supabase (เช่น `supabase db push`) หรือรอให้ผู้ดูแลฐานข้อมูลเพิ่มคอลัมน์ `app_title` และ `favicon_url` ก่อนใช้งานฟีเจอร์นี้
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                <Button onClick={handleSaveOrganization} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      บันทึกการตั้งค่า
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลระบบ</CardTitle>
                <CardDescription>
                  ข้อมูลสถานะและเวอร์ชันของระบบ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">เวอร์ชันระบบ</Label>
                    <p className="font-medium">1.0.0</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">อัปเดตล่าสุด</Label>
                    <p className="font-medium">{new Date().toLocaleDateString('th-TH')}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">สถานะฐานข้อมูล</Label>
                    <Badge variant="default" className="bg-green-500">ออนไลน์</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Custom Dialog Components */}
      <DepartmentDialog
        open={isDepartmentDialogOpen}
        onOpenChange={(open) => {
          setIsDepartmentDialogOpen(open);
          if (!open) handleDialogClose();
        }}
        department={editingDepartment}
        onSuccess={loadData}
      />

      <EquipmentTypeDialog
        open={isEquipmentTypeDialogOpen}
        onOpenChange={(open) => {
          setIsEquipmentTypeDialogOpen(open);
          if (!open) handleDialogClose();
        }}
        equipmentType={editingEquipmentType}
        onSuccess={loadData}
      />

      <VendorDialog
        open={isVendorDialogOpen}
        onOpenChange={(open) => {
          setIsVendorDialogOpen(open);
          if (!open) handleDialogClose();
        }}
        vendor={editingVendor}
        onSuccess={loadData}
      />

      <BrandDialog
        open={isBrandDialogOpen}
        onOpenChange={(open) => {
          setIsBrandDialogOpen(open);
          if (!open) handleDialogClose();
        }}
        brand={editingBrand}
        onSuccess={loadData}
      />

      <EquipmentTypeDetailDialog
        open={isEquipmentDetailDialogOpen}
        onOpenChange={(open) => {
          setIsEquipmentDetailDialogOpen(open);
          if (!open) {
            setDetailDialogState(null);
          }
        }}
        equipmentType={detailDialogState ? { id: detailDialogState.equipmentType.id, name: detailDialogState.equipmentType.name } : null}
        detail={detailDialogState?.detail ?? null}
        onSuccess={loadData}
      />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) handleDialogClose();
        }}
        title={`ยืนยันการลบ${getDeletingLabel(deletingItem?.type)}`}
        description={`คุณต้องการลบ${getDeletingLabel(deletingItem?.type)}นี้หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้`}
        itemName={deletingItem?.item?.name || ''}
        onConfirm={handleConfirmDelete}
      />

      <AlertDialog
        open={isDetailDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDeleteDialogOpen(open);
          if (!open) {
            setDetailDeleteState(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">ยืนยันการลบรายละเอียดครุภัณฑ์</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบรายละเอียดครุภัณฑ์ "{detailDeleteState?.detail.name ?? ''}" หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteDetail} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ลบรายละเอียด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TechnicalSpecDialog
        open={isTechnicalSpecDialogOpen}
        onOpenChange={(open) => {
          setIsTechnicalSpecDialogOpen(open);
          if (!open) handleTechnicalSpecDialogClose();
        }}
        specType={currentSpecType || TECHNICAL_SPEC_TYPES[0]}
        specRecord={editingSpecRecord}
        onSuccess={() => {
          loadTechnicalSpecs();
        }}
      />
    </div>
  );
};

export default Settings;
