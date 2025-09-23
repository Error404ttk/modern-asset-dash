import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Users as UsersIcon, Edit, Trash2, Shield, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ViewUserDialog } from "@/components/users/ViewUserDialog";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";
import { supabase } from "@/integrations/supabase/client";

const ROLE_OPTIONS = [
  { value: "admin", label: "ผู้ดูแลระบบ" },
  { value: "user", label: "ผู้ใช้งานทั่วไป" },
];

const NO_DEPARTMENT_VALUE = "__none__";

const Users = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [departmentLoadError, setDepartmentLoadError] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    password: "",
    fullName: "",
    department: NO_DEPARTMENT_VALUE,
    role: 'user',
  });

  // Fetch users from Supabase
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match UI format
      const transformedUsers = data.map(user => {
        const email = user.email ?? '';
        const username = email ? email.split('@')[0] : '-';

        return {
          id: user.user_id,
          username,
          fullName: user.full_name || 'ไม่ระบุชื่อ',
          email,
          department: user.department || 'ไม่ระบุหน่วยงาน',
          role: getRoleDisplayName(user.role),
          roleCode: user.role,
          status: 'ใช้งาน',
          lastLogin: 'ไม่ระบุ',
          createdAt: new Date(user.created_at).toLocaleDateString('th-TH'),
        };
      });

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้ใช้งานได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setDepartmentLoadError(null);
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setDepartmentOptions(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartmentLoadError('ไม่สามารถโหลดรายชื่อหน่วยงานได้');
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'ผู้ดูแลระบบสูงสุด';
      case 'admin':
        return 'ผู้ดูแลระบบ';
      case 'user':
        return 'ผู้ใช้งานทั่วไป';
      default:
        return 'ผู้ใช้งานทั่วไป';
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ผู้ดูแลระบบสูงสุด":
        return "destructive";
      case "ผู้ดูแลระบบ":
        return "default";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === "ใช้งาน" ? "default" : "secondary";
  };

  const resetAddUserForm = () => {
    setNewUserForm({
      email: '',
      password: '',
      fullName: '',
      department: NO_DEPARTMENT_VALUE,
      role: 'user',
    });
    setAddError(null);
  };

  const handleAddUserSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddError(null);

    const email = newUserForm.email.trim();
    const password = newUserForm.password.trim();
    const fullName = newUserForm.fullName.trim();

    if (!email || !password || !fullName) {
      setAddError('กรุณากรอกอีเมล รหัสผ่าน และชื่อ-นามสกุล');
      return;
    }

    if (password.length < 6) {
      setAddError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setAddLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('ไม่พบ token สำหรับยืนยันตัวตน');
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          fullName,
          department: newUserForm.department === NO_DEPARTMENT_VALUE ? null : newUserForm.department || null,
          role: newUserForm.role,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'ไม่สามารถเพิ่มผู้ใช้งานได้');
      }

      toast({
        title: 'เพิ่มผู้ใช้งานสำเร็จ',
        description: 'เพิ่มผู้ใช้งานใหม่เรียบร้อยแล้ว',
      });

      resetAddUserForm();
      setIsAddDialogOpen(false);
      await fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้งาน';
      setAddError(message);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setAddLoading(false);
    }
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: any) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleToggleStatus = (userId: string, userName: string, currentStatus: string) => {
    const newStatus = currentStatus === "ใช้งาน" ? "พักการใช้งาน" : "ใช้งาน";
    toast({
      title: "เปลี่ยนสถานะสำเร็จ",
      description: `เปลี่ยนสถานะผู้ใช้งาน ${userName} เป็น ${newStatus} แล้ว`,
    });
  };

  const handleUserUpdated = () => {
    fetchUsers();
  };

  const handleUserDeleted = () => {
    fetchUsers();
  };

  const filteredUsers = users.filter(user =>
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
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) { resetAddUserForm(); } else { setAddError(null); } }}>
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
            <form className="grid gap-4 py-4" onSubmit={handleAddUserSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="email@department.go.th"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">รหัสผ่าน *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">ชื่อ-นามสกุล *</Label>
                <Input
                  id="fullName"
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="ชื่อ-นามสกุล"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">หน่วยงาน</Label>
                  <Select
                    value={newUserForm.department}
                    onValueChange={(value) => setNewUserForm((prev) => ({ ...prev, department: value }))}
                    disabled={departmentOptions.length === 0 && !departmentLoadError}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="เลือกหน่วยงาน" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_DEPARTMENT_VALUE}>ไม่ระบุ</SelectItem>
                      {departmentOptions.map((option) => (
                        <SelectItem key={option.id} value={option.name}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {departmentLoadError && (
                    <p className="text-xs text-destructive">{departmentLoadError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">บทบาท</Label>
                  <Select
                    value={newUserForm.role}
                    onValueChange={(value) => setNewUserForm((prev) => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="เลือกบทบาท" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {addError && (
                <p className="text-sm text-destructive">{addError}</p>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsAddDialogOpen(false); resetAddUserForm(); }}
                  disabled={addLoading}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={addLoading}
                >
                  {addLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  เพิ่มผู้ใช้งาน
                </Button>
              </div>
            </form>
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
                <p className="text-2xl font-bold">{users.length}</p>
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
                  {users.filter(user => user.status === "ใช้งาน").length}
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
            แสดง {filteredUsers.length} ผู้ใช้งานจากทั้งหมด {users.length} คน
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
                    <Button size="sm" variant="outline" onClick={() => handleViewUser(user)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditUser(user)}>
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
                      onClick={() => handleDeleteUser(user)}
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

      {/* Dialogs */}
      <ViewUserDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        user={selectedUser}
      />
      
      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
        departmentOptions={departmentOptions}
        departmentLoadError={departmentLoadError}
        roleOptions={ROLE_OPTIONS}
        noDepartmentValue={NO_DEPARTMENT_VALUE}
      />
      
      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
        onUserDeleted={handleUserDeleted}
      />
    </div>
  );
};

export default Users;
