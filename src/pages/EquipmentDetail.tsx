import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  HardDrive, 
  Cpu, 
  Monitor, 
  Zap, 
  Image,
  ZoomIn,
  QrCode,
  Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import QRCodeDialog from "@/components/equipment/QRCodeDialog";
import { normalizeAssetNumber } from "@/lib/asset-number";

interface Equipment {
  id: string;
  name: string;
  type: string;
  brand: string | null;
  model: string | null;
  serialNumber: string;
  assetNumber: string;
  status: string;
  location: string;
  user: string;
  purchaseDate: string;
  warrantyEnd: string;
  quantity: string;
  images?: string[];
  specs: any;
}

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEquipment();
    }
  }, [id]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const assetInfo = normalizeAssetNumber(data.asset_number, data.quantity);

        const transformedData: Equipment = {
          id: data.id,
          name: data.name,
          type: data.type,
          brand: data.brand || "",
          model: data.model || "",
          serialNumber: data.serial_number || "",
          assetNumber: assetInfo.formatted,
          status: data.status,
          location: data.location || "",
          user: data.assigned_to || "",
          purchaseDate: data.purchase_date || "",
          warrantyEnd: data.warranty_end || "",
          quantity: assetInfo.sequence,
          images: data.images || [],
          specs: (typeof data.specs === 'object' && data.specs !== null) ? data.specs : {}
        };
        setEquipment(transformedData);
      }
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลครุภัณฑ์ได้: " + error.message,
        variant: "destructive",
      });
      navigate('/equipment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      available: { color: "bg-success text-success-foreground", label: "พร้อมใช้งาน" },
      borrowed: { color: "bg-primary text-primary-foreground", label: "ถูกยืม" },
      maintenance: { color: "bg-warning text-warning-foreground", label: "ซ่อมบำรุง" },
      damaged: { color: "bg-destructive text-destructive-foreground", label: "ชำรุด" },
      pending_disposal: { color: "bg-secondary text-secondary-foreground", label: "รอจำหน่าย" },
      disposed: { color: "bg-disposed text-disposed-foreground", label: "จำหน่าย" },
      lost: { color: "bg-destructive text-destructive-foreground", label: "สูญหาย" }
    };
    
    const config = variants[status as keyof typeof variants] || {
      color: "bg-muted text-muted-foreground", 
      label: status
    };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">ไม่พบข้อมูลครุภัณฑ์</p>
        <Button onClick={() => navigate('/equipment')} className="mt-4">
          กลับไปหน้ารายการ
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/equipment')}
            className="hover:bg-muted w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </Button>
          <div className="sm:flex-1">
            <h1 className="text-3xl font-bold text-foreground">{equipment.name}</h1>
            <p className="text-muted-foreground">เลขครุภัณฑ์: {equipment.assetNumber}</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Button 
            variant="outline" 
            onClick={() => setQrDialogOpen(true)}
            className="hover:bg-muted w-full sm:w-auto"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </Button>
          <Link to={`/equipment/edit/${equipment.id}`} className="w-full sm:w-auto">
            <Button variant="outline" className="hover:bg-muted w-full">
              <Edit className="h-4 w-4 mr-2" />
              แก้ไข
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ข้อมูลหลัก */}
        <div className="lg:col-span-2 space-y-6">
          {/* ข้อมูลพื้นฐาน */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ชื่อครุภัณฑ์</label>
                  <p className="text-sm font-medium">{equipment.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ประเภท</label>
                  <Badge variant="outline">{equipment.type}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ยี่ห้อ</label>
                  <p className="text-sm">{equipment.brand}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">รุ่น</label>
                  <p className="text-sm">{equipment.model}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
                  <p className="text-sm font-mono">{equipment.serialNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">สถานะ</label>
                  <div>{getStatusBadge(equipment.status)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* รูปภาพครุภัณฑ์ */}
          {equipment.images && equipment.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Image className="h-5 w-5 text-primary" />
                  <span>รูปภาพครุภัณฑ์</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {equipment.images.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden border cursor-pointer">
                        <img
                          src={imageUrl}
                          alt={`${equipment.name} - รูปที่ ${index + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onClick={() => setSelectedImageIndex(index)}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ข้อมูลทางเทคนิค */}
          {equipment.specs && Object.keys(equipment.specs).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <span>ข้อมูลทางเทคนิค</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(equipment.specs).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-sm font-medium text-muted-foreground capitalize">
                        {key === 'cpu' && <Cpu className="inline h-3 w-3 mr-1" />}
                        {key === 'ram' && <HardDrive className="inline h-3 w-3 mr-1" />}
                        {key === 'storage' && <HardDrive className="inline h-3 w-3 mr-1" />}
                        {key === 'display' && <Monitor className="inline h-3 w-3 mr-1" />}
                        {key === 'power' && <Zap className="inline h-3 w-3 mr-1" />}
                        {key}
                      </label>
                      <p className="text-sm">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* ข้อมูลสถานะและตำแหน่ง */}
          <Card>
            <CardHeader>
              <CardTitle>สถานะปัจจุบัน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">สถานที่</p>
                  <p className="text-sm text-muted-foreground">{equipment.location}</p>
                </div>
              </div>
              
              {equipment.user && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">ผู้ใช้งาน</p>
                    <p className="text-sm text-muted-foreground">{equipment.user}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ข้อมูลการจัดซื้อและรับประกัน */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลการจัดซื้อ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {equipment.purchaseDate && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">วันที่จัดซื้อ</p>
                    <p className="text-sm text-muted-foreground">{equipment.purchaseDate}</p>
                  </div>
                </div>
              )}
              
              {equipment.warrantyEnd && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">หมดประกัน</p>
                    <p className="text-sm text-muted-foreground">{equipment.warrantyEnd}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ปุ่มการดำเนินการ */}
          <Card>
            <CardHeader>
              <CardTitle>การดำเนินการ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/borrow-return" className="w-full">
                <Button variant="outline" className="w-full justify-start">
                  ยืม/คืนครุภัณฑ์
                </Button>
              </Link>
              <Link to="/history" className="w-full">
                <Button variant="outline" className="w-full justify-start">
                  ประวัติการใช้งาน
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && equipment.images && (
        <Dialog open={selectedImageIndex !== null} onOpenChange={() => setSelectedImageIndex(null)}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>รูปภาพครุภัณฑ์ - {equipment.name}</DialogTitle>
              <DialogDescription>
                รูปที่ {selectedImageIndex + 1} จาก {equipment.images.length} รูป
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              <img
                src={equipment.images[selectedImageIndex]}
                alt={`${equipment.name} - รูปที่ ${selectedImageIndex + 1}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                disabled={selectedImageIndex === 0}
              >
                รูปก่อนหน้า
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedImageIndex + 1} / {equipment.images.length}
              </span>
              <Button
                variant="outline"
                onClick={() => setSelectedImageIndex(Math.min(equipment.images!.length - 1, selectedImageIndex + 1))}
                disabled={selectedImageIndex === equipment.images.length - 1}
              >
                รูปถัดไป
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Code Dialog */}
      {equipment && (
        <QRCodeDialog
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          equipment={equipment}
        />
      )}
    </div>
  );
}
