import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Building, Tag, Plus, Edit, Trash2, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DepartmentDialog } from "@/components/settings/DepartmentDialog";
import { EquipmentTypeDialog } from "@/components/settings/EquipmentTypeDialog";
import { DeleteConfirmDialog } from "@/components/settings/DeleteConfirmDialog";

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
}

interface OrganizationSettings {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  email_notifications: boolean;
  auto_backup: boolean;
  session_timeout: number;
}

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null);
  
  // Dialog states
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isEquipmentTypeDialogOpen, setIsEquipmentTypeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Edit states
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingEquipmentType, setEditingEquipmentType] = useState<EquipmentType | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'department' | 'equipmentType', item: any } | null>(null);

  // Organization form state
  const [orgForm, setOrgForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    email_notifications: true,
    auto_backup: true,
    session_timeout: 30,
  });

  useEffect(() => {
    loadData();
  }, []);

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
        .select('*')
        .order('name');

      if (typeError) throw typeError;
      setEquipmentTypes(typeData || []);

      // Load organization settings
      const { data: orgData, error: orgError } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .single();

      if (orgError && orgError.code !== 'PGRST116') throw orgError;
      
      if (orgData) {
        setOrgSettings(orgData);
        setOrgForm({
          name: orgData.name,
          code: orgData.code,
          address: orgData.address || "",
          phone: orgData.phone || "",
          email: orgData.email || "",
          email_notifications: orgData.email_notifications,
          auto_backup: orgData.auto_backup,
          session_timeout: orgData.session_timeout,
        });
      }
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

  const handleSaveOrganization = async () => {
    try {
      if (orgSettings) {
        // Update existing
        const { error } = await supabase
          .from('organization_settings')
          .update(orgForm)
          .eq('id', orgSettings.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('organization_settings')
          .insert(orgForm);

        if (error) throw error;
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: "บันทึกข้อมูลองค์กรเรียบร้อยแล้ว",
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

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setIsDepartmentDialogOpen(true);
  };

  const handleEditEquipmentType = (equipmentType: EquipmentType) => {
    setEditingEquipmentType(equipmentType);
    setIsEquipmentTypeDialogOpen(true);
  };

  const handleDeleteDepartment = (department: Department) => {
    setDeletingItem({ type: 'department', item: department });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteEquipmentType = (equipmentType: EquipmentType) => {
    setDeletingItem({ type: 'equipmentType', item: equipmentType });
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (reason: string, password: string) => {
    if (!deletingItem) return;

    try {
      // Call delete edge function based on type
      const functionName = deletingItem.type === 'department' ? 'delete-department' : 'delete-equipment-type';
      
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
        description: `ลบ${deletingItem.type === 'department' ? 'หน่วยงาน' : 'ประเภทครุภัณฑ์'}เรียบร้อยแล้ว`,
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
    setDeletingItem(null);
  };

  if (loading) {
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

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organization">ข้อมูลองค์กร</TabsTrigger>
          <TabsTrigger value="departments">หน่วยงาน</TabsTrigger>
          <TabsTrigger value="equipment-types">ประเภทครุภัณฑ์</TabsTrigger>
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
                <Input type="file" accept="image/*" />
                <p className="text-sm text-muted-foreground">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB</p>
              </div>

              <Button onClick={handleSaveOrganization}>
                <Save className="mr-2 h-4 w-4" />
                บันทึกข้อมูล
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
                        <Button size="sm" variant="outline" onClick={() => handleEditEquipmentType(type)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteEquipmentType(type)}>
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

                <Button onClick={handleSaveOrganization}>
                  <Save className="mr-2 h-4 w-4" />
                  บันทึกการตั้งค่า
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

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) handleDialogClose();
        }}
        title={`ยืนยันการลบ${deletingItem?.type === 'department' ? 'หน่วยงาน' : 'ประเภทครุภัณฑ์'}`}
        description={`คุณต้องการลบ${deletingItem?.type === 'department' ? 'หน่วยงาน' : 'ประเภทครุภัณฑ์'}นี้หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้`}
        itemName={deletingItem?.item?.name || ''}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default Settings;