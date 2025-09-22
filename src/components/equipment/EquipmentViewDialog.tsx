import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, User, HardDrive, Cpu, Monitor, Zap } from "lucide-react";

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
  specs: {
    [key: string]: string;
  };
}

interface EquipmentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment;
}

export default function EquipmentViewDialog({ open, onOpenChange, equipment }: EquipmentViewDialogProps) {
  const getStatusBadge = (status: string) => {
    const variants = {
      available: { color: "bg-success text-success-foreground", label: "พร้อมใช้งาน" },
      borrowed: { color: "bg-primary text-primary-foreground", label: "ถูกยืม" },
      maintenance: { color: "bg-warning text-warning-foreground", label: "ซ่อมบำรุง" },
      damaged: { color: "bg-destructive text-destructive-foreground", label: "ชำรุด" }
    };
    
    const config = variants[status as keyof typeof variants] || { color: "bg-muted text-muted-foreground", label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getSpecIcon = (key: string) => {
    const iconMap: { [key: string]: any } = {
      cpu: Cpu,
      ram: Monitor,
      storage: HardDrive,
      size: Monitor,
      resolution: Monitor,
      panel: Monitor,
      type: HardDrive,
      speed: Zap,
    };
    
    const IconComponent = iconMap[key.toLowerCase()] || HardDrive;
    return <IconComponent className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>รายละเอียดครุภัณฑ์</DialogTitle>
          <DialogDescription>
            ข้อมูลครุภัณฑ์ {equipment.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* ข้อมูลหลัก */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลทั่วไป</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ชื่อครุภัณฑ์</label>
                  <p className="font-semibold">{equipment.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ประเภท</label>
                  <div><Badge variant="outline">{equipment.type}</Badge></div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ยี่ห้อ</label>
                  <p>{equipment.brand}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">รุ่น</label>
                  <p>{equipment.model}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
                  <p className="font-mono text-sm">{equipment.serialNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">เลขครุภัณฑ์</label>
                  <p className="font-mono text-sm font-semibold text-primary">{equipment.assetNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">จำนวน</label>
                  <p className="font-semibold">{equipment.quantity} ชิ้น</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">สถานะ</label>
                <div className="mt-1">{getStatusBadge(equipment.status)}</div>
              </div>
            </CardContent>
          </Card>

          {/* ข้อมูลการใช้งาน */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลการใช้งาน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">สถานที่</label>
                    <p>{equipment.location}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ผู้ใช้งาน</label>
                    <p>{equipment.user}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">วันที่ได้มา</label>
                    <p>{equipment.purchaseDate}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">หมดประกัน</label>
                    <p>{equipment.warrantyEnd}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ข้อมูลสเปค */}
          {Object.keys(equipment.specs).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลเทคนิค</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(equipment.specs).map(([key, value]) => (
                    <div key={key} className="flex items-start space-x-2">
                      {getSpecIcon(key)}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground capitalize">
                          {key === 'cpu' ? 'CPU' : 
                           key === 'ram' ? 'RAM' :
                           key === 'storage' ? 'Storage' :
                           key === 'size' ? 'ขนาด' :
                           key === 'resolution' ? 'ความละเอียด' :
                           key === 'panel' ? 'Panel' :
                           key === 'type' ? 'ประเภท' :
                           key === 'speed' ? 'ความเร็ว' :
                           key}
                        </label>
                        <p>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}