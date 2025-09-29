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
import { Settings as SettingsIcon, Building, Tag, Store, Plus, Edit, Trash2, Save, Loader2, Image as ImageIcon, AlertTriangle, ListChecks } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DepartmentDialog } from "@/components/settings/DepartmentDialog";
import { EquipmentTypeDialog } from "@/components/settings/EquipmentTypeDialog";
import { EquipmentTypeDetailDialog, EquipmentTypeDetail } from "@/components/settings/EquipmentTypeDetailDialog";
import { DeleteConfirmDialog } from "@/components/settings/DeleteConfirmDialog";
import { VendorDialog } from "@/components/settings/VendorDialog";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { DEFAULT_STICKER_WIDTH_MM, DEFAULT_STICKER_HEIGHT_MM, clampStickerWidth, clampStickerHeight } from "@/lib/sticker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  sticker_width_mm: number;
  sticker_height_mm: number;
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
  sticker_width_mm: DEFAULT_STICKER_WIDTH_MM,
  sticker_height_mm: DEFAULT_STICKER_HEIGHT_MM,
});

const Settings = () => {
  const { toast } = useToast();
  const { settings: orgSettings, loading: orgSettingsLoading, refresh: refreshOrgSettings } = useOrganizationSettings();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("organization");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
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

  // Dialog states
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isEquipmentTypeDialogOpen, setIsEquipmentTypeDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEquipmentDetailDialogOpen, setIsEquipmentDetailDialogOpen] = useState(false);
  const [isDetailDeleteDialogOpen, setIsDetailDeleteDialogOpen] = useState(false);
  
  // Edit states
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingEquipmentType, setEditingEquipmentType] = useState<EquipmentType | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'department' | 'equipmentType' | 'vendor', item: any } | null>(null);
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
        }
      } catch (error) {
        console.error('Branding support check threw', error);
      }
    };

    checkBrandingSupport();
  }, []);

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
      const rawStickerWidth = Number((orgSettings as Record<string, unknown> | null)?.['sticker_width_mm']);
      const rawStickerHeight = Number((orgSettings as Record<string, unknown> | null)?.['sticker_height_mm']);

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
        sticker_width_mm: clampStickerWidth(rawStickerWidth),
        sticker_height_mm: clampStickerHeight(rawStickerHeight),
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

  const loadData = async () => {
    setLoading(true);
    try {
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

      const mappedTypes: EquipmentType[] = (typeData || []).map((type: any) => {
        const details: EquipmentTypeDetail[] = (type.equipment_type_details || [])
          .map((detail: any) => ({
            id: detail.id as string,
            equipment_type_id: detail.equipment_type_id as string,
            name: detail.name as string,
            code: detail.code as string,
            description: detail.description as string | null,
            active: Boolean(detail.active),
          }))
          .sort((a, b) => a.code.localeCompare(b.code, 'th'));

        return {
          id: type.id,
          name: type.name,
          code: type.code,
          description: type.description,
          active: type.active,
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
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
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
      const normalizedStickerWidth = clampStickerWidth(orgForm.sticker_width_mm);
      const normalizedStickerHeight = clampStickerHeight(orgForm.sticker_height_mm);
      const updates: Record<string, any> = {
        name: normalizedName,
        code: orgForm.code.trim(),
        address: sanitize(orgForm.address),
        phone: sanitize(orgForm.phone),
        email: sanitize(orgForm.email),
        email_notifications: orgForm.email_notifications,
        auto_backup: orgForm.auto_backup,
        session_timeout: normalizedSessionTimeout,
        sticker_width_mm: normalizedStickerWidth,
        sticker_height_mm: normalizedStickerHeight,
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
          .update(updates)
          .eq('id', orgSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_settings')
          .insert(updates);

        if (error) throw error;
      }

      await refreshOrgSettings();

      toast({
        title: "บันทึกสำเร็จ",
        description: "บันทึกข้อมูลองค์กรและการตั้งค่าระบบเรียบร้อยแล้ว",
      });
    } catch (error: any) {
      console.error('Failed to save organization settings', error);

      if (error?.code === 'PGRST204') {
        setBrandingSupported(false);
      }

      let description = error?.code === 'PGRST204'
        ? 'ระบบยังไม่พบคอลัมน์ app_title ในฐานข้อมูล จึงไม่สามารถบันทึกการตั้งค่าการแสดงผลได้ กรุณาอัปเดตฐานข้อมูลแล้วลองใหม่อีกครั้ง'
        : error.message;

      if (typeof error?.message === 'string' && error.message.includes('sticker_')) {
        description = 'ระบบยังไม่พบคอลัมน์ sticker_width_mm/sticker_height_mm ในฐานข้อมูล กรุณาอัปเดตสคีมาของ Supabase ก่อนใช้งานฟีเจอร์กำหนดขนาดสติ๊กเกอร์';
      }

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
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
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
      // Call delete edge function based on type
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

      toast({
        title: "ลบสำเร็จ",
        description: `ลบ${deletingItem.type === 'department' ? 'หน่วยงาน' : deletingItem.type === 'equipmentType' ? 'ประเภทครุภัณฑ์' : 'ข้อมูลผู้ขาย'}เรียบร้อยแล้ว`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDialogClose = () => {
    setEditingDepartment(null);
    setEditingEquipmentType(null);
    setEditingVendor(null);
    setDeletingItem(null);
    setDetailDialogState(null);
    setDetailDeleteState(null);
    setIsEquipmentDetailDialogOpen(false);
    setIsDetailDeleteDialogOpen(false);
    setIsVendorDialogOpen(false);
  };

  const getDeletingLabel = (type?: 'department' | 'equipmentType' | 'vendor') => {
    if (type === 'department') return 'หน่วยงาน';
    if (type === 'equipmentType') return 'ประเภทครุภัณฑ์';
    if (type === 'vendor') return 'ข้อมูลผู้ขาย';
    return 'รายการ';
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="organization">ข้อมูลองค์กร</TabsTrigger>
          <TabsTrigger value="departments">หน่วยงาน</TabsTrigger>
          <TabsTrigger value="equipment-types">ประเภทครุภัณฑ์</TabsTrigger>
          <TabsTrigger value="vendors">ผู้ขาย/ผู้รับจ้าง</TabsTrigger>
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

                <div className="space-y-3">
                  <div>
                    <Label>ขนาดสติ๊กเกอร์ (มิลลิเมตร)</Label>
                    <p className="text-sm text-muted-foreground">
                      ใช้กับหน้าพิมพ์สติ๊กเกอร์ QR Code เพื่อให้แสดงตามขนาดจริง
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="stickerWidth">ความกว้าง</Label>
                      <Input
                        id="stickerWidth"
                        type="number"
                        min="20"
                        max="200"
                        step="0.1"
                        value={orgForm.sticker_width_mm}
                        onChange={(e) => setOrgForm({ ...orgForm, sticker_width_mm: parseFloat(e.target.value) || DEFAULT_STICKER_WIDTH_MM })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="stickerHeight">ความสูง</Label>
                      <Input
                        id="stickerHeight"
                        type="number"
                        min="10"
                        max="120"
                        step="0.1"
                        value={orgForm.sticker_height_mm}
                        onChange={(e) => setOrgForm({ ...orgForm, sticker_height_mm: parseFloat(e.target.value) || DEFAULT_STICKER_HEIGHT_MM })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ค่าเริ่มต้นคือ 70 x 25 มม. สามารถกำหนดทศนิยมได้ เพื่อให้พอดีกับกระดาษสติ๊กเกอร์ของคุณ
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
    </div>
  );
};

export default Settings;
