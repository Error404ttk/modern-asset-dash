import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Users as UsersIcon, Edit, Trash2, Shield, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Users = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Mock data for users
  const usersData = [
    {
      id: "1",
      username: "admin",
      fullName: "ผู้ดูแลระบบ",
      email: "admin@department.go.th",
      department: "ฝ่ายเทคโนโลยีสารสนเทศ",
      role: "ผู้ดูแลระบบ",
      status: "ใช้งาน",
      lastLogin: "2024-01-20 14:30:25",
      createdAt: "2024-01-01"
    },
    {
      id: "2",
      username: "somchai.j",
      fullName: "นาย สมชาย ใจดี",
      email: "somchai.j@department.go.th", 
      department: "กองคลัง",
      role: "ผู้ใช้งานทั่วไป",
      status: "ใช้งาน",
      lastLogin: "2024-01-19 16:45:10",
      createdAt: "2024-01-05"
    },
    {
      id: "3",
      username: "somying.r",
      fullName: "นาง สมหญิง รักษ์ดี",
      email: "somying.r@department.go.th",
      department: "กองช่าง", 
      role: "ผู้จัดการ",
      status: "ใช้งาน",
      lastLogin: "2024-01-18 09:20:45",
      createdAt: "2024-01-03"
    },
    {
      id: "4",
      username: "wichai.s",
      fullName: "นาย วิชัย ซ่อมดี",
      email: "wichai.s@department.go.th",
      department: "กองช่าง",
      role: "ช่างเทคนิค", 
      status: "พักการใช้งาน",
      lastLogin: "2024-01-10 11:30:20",
      createdAt: "2024-01-02"
    }
  ];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ผู้ดูแลระบบ":
        return "destructive";
      case "ผู้จัดการ":
        return "default";
      case "ช่างเทคนิค":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === "ใช้งาน" ? "default" : "secondary";
  };

  const handleAddUser = () => {
    toast({
      title: "เพิ่มผู้ใช้งานสำเร็จ",
      description: "เพิ่มผู้ใช้งานใหม่เรียบร้อยแล้ว",
    });
    setIsAddDialogOpen(false);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    toast({
      title: "ลบผู้ใช้งานสำเร็จ",
      description: `ลบผู้ใช้งาน ${userName} เรียบร้อยแล้ว`,
    });
  };

  const handleToggleStatus = (userId: string, userName: string, currentStatus: string) => {
    const newStatus = currentStatus === "ใช้งาน" ? "พักการใช้งาน" : "ใช้งาน";
    toast({
      title: "เปลี่ยนสถานะสำเร็จ",
      description: `เปลี่ยนสถานะผู้ใช้งาน ${userName} เป็น ${newStatus} แล้ว`,
    });
  };

  const filteredUsers = usersData.filter(user =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">จัดการผู้ใช้งาน</h1>
          <p className="text-muted-foreground mt-2">จัดการบัญชีผู้ใช้งานและสิทธิ์การเข้าถึงระบบ</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มผู้ใช้งาน
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>เพิ่มผู้ใช้งานใหม่</DialogTitle>
              <DialogDescription>
                กรอกข้อมูลผู้ใช้งานใหม่และกำหนดสิทธิ์การเข้าถึง
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">ชื่อผู้ใช้</Label>
                  <Input placeholder="username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <Input type="password" placeholder="password" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
                <Input placeholder="ชื่อ-นามสกุล" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input type="email" placeholder="email@department.go.th" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">หน่วยงาน</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกหน่วยงาน" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finance">กองคลัง</SelectItem>
                      <SelectItem value="engineering">กองช่าง</SelectItem>
                      <SelectItem value="planning">กองแผน</SelectItem>
                      <SelectItem value="it">ฝ่ายเทคโนโลยีสารสนเทศ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">บทบาท</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกบทบาท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                      <SelectItem value="manager">ผู้จัดการ</SelectItem>
                      <SelectItem value="user">ผู้ใช้งานทั่วไป</SelectItem>
                      <SelectItem value="technician">ช่างเทคนิค</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleAddUser} className="bg-primary hover:bg-primary/90">
                  เพิ่มผู้ใช้งาน
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาผู้ใช้งาน, อีเมล หรือหน่วยงาน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-primary" />
              <div className="ml-3">
                <p className="text-sm text-muted-foreground">ผู้ใช้งานทั้งหมด</p>
                <p className="text-2xl font-bold">{usersData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-muted-foreground">ใช้งานปกติ</p>
                <p className="text-2xl font-bold">
                  {usersData.filter(user => user.status === "ใช้งาน").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UsersIcon className="mr-2 h-5 w-5" />
            รายการผู้ใช้งาน
          </CardTitle>
          <CardDescription>
            แสดง {filteredUsers.length} ผู้ใช้งานจากทั้งหมด {usersData.length} คน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <UsersIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{user.fullName}</h3>
                        <p className="text-sm text-muted-foreground">@{user.username} • {user.email}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">หน่วยงาน:</span>
                        <p className="font-medium">{user.department}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">บทบาท:</span>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="ml-1">
                          {user.role}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">สถานะ:</span>
                        <Badge variant={getStatusBadgeVariant(user.status)} className="ml-1">
                          {user.status}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">เข้าใช้ล่าสุด:</span>
                        <p className="font-medium">{user.lastLogin}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleToggleStatus(user.id, user.fullName, user.status)}
                    >
                      {user.status === "ใช้งาน" ? "พักใช้งาน" : "เปิดใช้งาน"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteUser(user.id, user.fullName)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">ไม่พบผู้ใช้งาน</h3>
              <p className="text-muted-foreground">ไม่มีผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;