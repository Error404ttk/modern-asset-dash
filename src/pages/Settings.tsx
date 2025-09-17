import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings as SettingsIcon, Building, Tag, Plus, Edit, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { toast } = useToast();
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isEquipmentTypeDialogOpen, setIsEquipmentTypeDialogOpen] = useState(false);

  // Mock data for departments
  const departments = [
    { id: "1", name: "กองคลัง", code: "FIN", description: "หน่วยงานด้านการเงินและบัญชี", active: true },
    { id: "2", name: "กองช่าง", code: "ENG", description: "หน่วยงานด้านวิศวกรรมและซ่อมบำรุง", active: true },
    { id: "3", name: "กองแผน", code: "PLN", description: "หน่วยงานด้านการวางแผนและนโยบาย", active: true },
    { id: "4", name: "ฝ่ายเทคโนโลยีสารสนเทศ", code: "IT", description: "หน่วยงานด้านเทคโนโลยีสารสนเทศ", active: true }
  ];

  // Mock data for equipment types
  const equipmentTypes = [
    { id: "1", name: "คอมพิวเตอร์ตั้งโต๊ะ", code: "DESKTOP", description: "เครื่องคอมพิวเตอร์ประจำโต๊ะ", active: true },
    { id: "2", name: "คอมพิวเตอร์แบบพกพา", code: "LAPTOP", description: "เครื่องคอมพิวเตอร์โน้ตบุ๊ก", active: true },
    { id: "3", name: "จอภาพ", code: "MONITOR", description: "จอแสดงผลคอมพิวเตอร์", active: true },
    { id: "4", name: "เครื่องพิมพ์", code: "PRINTER", description: "เครื่องพิมพ์เอกสาร", active: true },
    { id: "5", name: "เซิร์ฟเวอร์", code: "SERVER", description: "เครื่องแม่ข่าย", active: true }
  ];

  const handleSaveOrganization = () => {
    toast({
      title: "บันทึกสำเร็จ",
      description: "บันทึกข้อมูลองค์กรเรียบร้อยแล้ว",
    });
  };

  const handleAddDepartment = () => {
    toast({
      title: "เพิ่มหน่วยงานสำเร็จ",
      description: "เพิ่มหน่วยงานใหม่เรียบร้อยแล้ว",
    });
    setIsDepartmentDialogOpen(false);
  };

  const handleAddEquipmentType = () => {
    toast({
      title: "เพิ่มประเภทครุภัณฑ์สำเร็จ",
      description: "เพิ่มประเภทครุภัณฑ์ใหม่เรียบร้อยแล้ว",
    });
    setIsEquipmentTypeDialogOpen(false);
  };

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
                  <Input defaultValue="หน่วยงานราชการ" placeholder="ชื่อองค์กร" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgCode">รหัสองค์กร</Label>
                  <Input defaultValue="GOV001" placeholder="รหัสองค์กร" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orgAddress">ที่อยู่</Label>
                <Textarea 
                  defaultValue="123 ถนนราชดำเนิน เขตพระนคร กรุงเทพมหานคร 10200"
                  placeholder="ที่อยู่องค์กร" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">โทรศัพท์</Label>
                  <Input defaultValue="02-123-4567" placeholder="หมายเลขโทรศัพท์" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input defaultValue="contact@department.go.th" placeholder="อีเมลองค์กร" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">โลโก้องค์กร</Label>
                <Input type="file" accept="image/*" />
                <p className="text-sm text-muted-foreground">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB</p>
              </div>

              <Button onClick={handleSaveOrganization} className="bg-primary hover:bg-primary/90">
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
                <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" />
                      เพิ่มหน่วยงาน
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>เพิ่มหน่วยงานใหม่</DialogTitle>
                      <DialogDescription>
                        กรอกข้อมูลหน่วยงานใหม่
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="deptName">ชื่อหน่วยงาน</Label>
                        <Input placeholder="ชื่อหน่วยงาน" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deptCode">รหัสหน่วยงาน</Label>
                        <Input placeholder="รหัสหน่วยงาน" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deptDesc">คำอธิบาย</Label>
                        <Textarea placeholder="คำอธิบายเกี่ยวกับหน่วยงาน" />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsDepartmentDialogOpen(false)}>
                          ยกเลิก
                        </Button>
                        <Button onClick={handleAddDepartment} className="bg-primary hover:bg-primary/90">
                          เพิ่มหน่วยงาน
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
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
                <Dialog open={isEquipmentTypeDialogOpen} onOpenChange={setIsEquipmentTypeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" />
                      เพิ่มประเภท
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>เพิ่มประเภทครุภัณฑ์ใหม่</DialogTitle>
                      <DialogDescription>
                        กรอกข้อมูลประเภทครุภัณฑ์ใหม่
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="typeName">ชื่อประเภท</Label>
                        <Input placeholder="ชื่อประเภทครุภัณฑ์" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="typeCode">รหัสประเภท</Label>
                        <Input placeholder="รหัสประเภท" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="typeDesc">คำอธิบาย</Label>
                        <Textarea placeholder="คำอธิบายเกี่ยวกับประเภทครุภัณฑ์" />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsEquipmentTypeDialogOpen(false)}>
                          ยกเลิก
                        </Button>
                        <Button onClick={handleAddEquipmentType} className="bg-primary hover:bg-primary/90">
                          เพิ่มประเภท
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
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
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>การสำรองข้อมูลอัตโนมัติ</Label>
                    <p className="text-sm text-muted-foreground">
                      สำรองข้อมูลระบบอัตโนมัติทุกวัน
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>การบันทึกประวัติการใช้งาน</Label>
                    <p className="text-sm text-muted-foreground">
                      บันทึกประวัติการเข้าใช้งานระบบ
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">หมดเวลาเซสชัน (นาที)</Label>
                  <Input defaultValue="60" type="number" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">จำนวนครั้งสูงสุดในการเข้าสู่ระบบ</Label>
                  <Input defaultValue="3" type="number" />
                </div>

                <Button className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  บันทึกการตั้งค่า
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลระบบ</CardTitle>
                <CardDescription>
                  ข้อมูลเกี่ยวกับเวอร์ชันและสถานะระบบ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>เวอร์ชันระบบ</Label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">v1.0.0</p>
                  </div>
                  <div>
                    <Label>อัปเดตล่าสุด</Label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">2024-01-20 10:30:00</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>สถานะฐานข้อมูล</Label>
                    <Badge variant="default" className="ml-2">เชื่อมต่อปกติ</Badge>
                  </div>
                  <div>
                    <Label>พื้นที่ใช้งาน</Label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">2.3 GB / 10 GB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;