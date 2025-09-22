import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Building, Shield, Calendar, Clock } from "lucide-react";

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  status: string;
  lastLogin: string;
  createdAt: string;
}

interface ViewUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export const ViewUserDialog = ({ open, onOpenChange, user }: ViewUserDialogProps) => {
  if (!user) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            ข้อมูลผู้ใช้งาน
          </DialogTitle>
          <DialogDescription>
            รายละเอียดข้อมูลผู้ใช้งาน {user.fullName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">{user.fullName}</h3>
              <p className="text-muted-foreground">@{user.username}</p>
              <div className="flex items-center mt-2 space-x-2">
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role}
                </Badge>
                <Badge variant={getStatusBadgeVariant(user.status)}>
                  {user.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  อีเมล
                </div>
                <p className="font-medium">{user.email}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Building className="mr-2 h-4 w-4" />
                  หน่วยงาน
                </div>
                <p className="font-medium">{user.department}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  วันที่สร้างบัญชี
                </div>
                <p className="font-medium">{user.createdAt}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4" />
                  เข้าใช้งานล่าสุด
                </div>
                <p className="font-medium">{user.lastLogin}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};