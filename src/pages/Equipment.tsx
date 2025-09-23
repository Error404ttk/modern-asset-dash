import { useState, useEffect } from "react";
import { 
  Computer, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  QrCode,
  Calendar,
  MapPin,
  Loader2,
  Trash2
} from "lucide-react";
import QRCodeDialog from "@/components/equipment/QRCodeDialog";
import EquipmentViewDialog from "@/components/equipment/EquipmentViewDialog";
import EquipmentEditDialog from "@/components/equipment/EquipmentEditDialog";
import DeleteEquipmentDialog from "@/components/equipment/DeleteEquipmentDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Equipment interface matching database schema
interface Equipment {
  id: string;
  name: string;
  type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  asset_number: string;
  status: string;
  location: string | null;
  assigned_to: string | null;
  purchase_date: string | null;
  warranty_end: string | null;
  quantity: string | null;
  specs: any;
  created_at: string;
  updated_at: string;
}

// Transform database equipment to component format
const transformEquipment = (dbEquipment: Equipment) => ({
  id: dbEquipment.id,
  name: dbEquipment.name,
  type: dbEquipment.type,
  brand: dbEquipment.brand || "",
  model: dbEquipment.model || "",
  serialNumber: dbEquipment.serial_number || "",
  assetNumber: dbEquipment.asset_number,
  status: dbEquipment.status,
  location: dbEquipment.location || "",
  user: dbEquipment.assigned_to || "",
  purchaseDate: dbEquipment.purchase_date || "",
  warrantyEnd: dbEquipment.warranty_end || "",
  quantity: dbEquipment.quantity || "1",
  specs: dbEquipment.specs || {}
});

export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();

  // Fetch equipment data from Supabase
  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database data to component format
      const transformedData = data?.map(transformEquipment) || [];
      setEquipmentList(transformedData);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลครุภัณฑ์ได้: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleQrCode = (item: any) => {
    console.log('QR Code button clicked for item:', item);
    setSelectedEquipment(item);
    setQrDialogOpen(true);
    console.log('QR Dialog should be opening...');
  };

  const handleView = (item: any) => {
    setSelectedEquipment(item);
    setViewDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setSelectedEquipment(item);
    setEditDialogOpen(true);
  };

  const handleDelete = (item: any) => {
    setSelectedEquipment(item);
    setDeleteDialogOpen(true);
  };

  const handleEquipmentDeleted = () => {
    fetchEquipment();
  };

  const handleSaveEdit = async (updatedEquipment: any) => {
    try {
      // Transform back to database format
      const dbUpdate = {
        name: updatedEquipment.name,
        type: updatedEquipment.type,
        brand: updatedEquipment.brand,
        model: updatedEquipment.model,
        serial_number: updatedEquipment.serialNumber,
        asset_number: updatedEquipment.assetNumber,
        status: updatedEquipment.status,
        location: updatedEquipment.location,
        assigned_to: updatedEquipment.user,
        purchase_date: updatedEquipment.purchaseDate,
        warranty_end: updatedEquipment.warrantyEnd,
        specs: updatedEquipment.specs
      };

      const { error } = await (supabase as any)
        .from('equipment')
        .update(dbUpdate)
        .eq('id', updatedEquipment.id);

      if (error) throw error;

      // Update local state
      setEquipmentList(prev => 
        prev.map(item => 
          item.id === updatedEquipment.id ? updatedEquipment : item
        )
      );

      toast({
        title: "สำเร็จ",
        description: "อัพเดทข้อมูลครุภัณฑ์เรียบร้อยแล้ว",
      });
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพเดทข้อมูลได้: " + error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      available: { color: "bg-success text-success-foreground", label: "พร้อมใช้งาน" },
      borrowed: { color: "bg-primary text-primary-foreground", label: "ถูกยืม" },
      maintenance: { color: "bg-warning text-warning-foreground", label: "ซ่อมบำรุง" },
      damaged: { color: "bg-destructive text-destructive-foreground", label: "ชำรุด" }
    };
    
    const config = variants[status as keyof typeof variants] || {
      color: "bg-muted text-muted-foreground", 
      label: status
    };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredEquipment = equipmentList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.assetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">รายการครุภัณฑ์</h1>
          <p className="text-sm sm:text-base text-muted-foreground">จัดการและติดตามครุภัณฑ์คอมพิวเตอร์</p>
        </div>
        
        <Link to="/equipment/add">
          <Button className="bg-gradient-primary hover:opacity-90 shadow-soft w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มครุภัณฑ์ใหม่
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Computer className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-primary">{equipmentList.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">รายการทั้งหมด</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-success/10 rounded-lg flex items-center justify-center">
                <Computer className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-success">
                  {equipmentList.filter(e => e.status === 'available').length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">พร้อมใช้งาน</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-warning/10 rounded-lg flex items-center justify-center">
                <Computer className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-warning">
                  {equipmentList.filter(e => e.status === 'maintenance').length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">ซ่อมบำรุง</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                <Computer className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-destructive">
                  {equipmentList.filter(e => e.status === 'damaged').length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">ชำรุด</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">ค้นหาและกรองข้อมูล</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาด้วยชื่อ, เลขครุภัณฑ์, หรือ Serial Number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="กรองตามสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="available">พร้อมใช้งาน</SelectItem>
                <SelectItem value="borrowed">ถูกยืม</SelectItem>
                <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                <SelectItem value="damaged">ชำรุด</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">รายการครุภัณฑ์ ({filteredEquipment.length} รายการ)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]"> {/* Add min-width for better mobile scrolling */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">เลขครุภัณฑ์</TableHead>
                    <TableHead className="min-w-[180px]">ชื่อครุภัณฑ์</TableHead>
                    <TableHead className="min-w-[100px]">ประเภท</TableHead>
                    <TableHead className="min-w-[100px]">สถานะ</TableHead>
                    <TableHead className="min-w-[120px]">สถานที่</TableHead>
                    <TableHead className="min-w-[120px]">ผู้ใช้งาน</TableHead>
                    <TableHead className="min-w-[100px]">ประกัน</TableHead>
                    <TableHead className="text-right min-w-[140px]">การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>กำลังโหลดข้อมูล...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEquipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {equipmentList.length === 0 ? "ไม่มีข้อมูลครุภัณฑ์" : "ไม่พบข้อมูลที่ค้นหา"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipment.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium min-w-0">
                        <div className="whitespace-nowrap">{item.assetNumber}/{item.quantity}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.brand} {item.model}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.type}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{item.location}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.user}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{item.warrantyEnd}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-muted h-8 w-8 p-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('QR button clicked!', item);
                              handleQrCode(item);
                            }}
                            title="สร้าง QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-muted h-8 w-8 p-0"
                            onClick={() => handleView(item)}
                            title="ดูรายละเอียด"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="hover:bg-muted h-8 w-8 p-0"
                             onClick={() => handleEdit(item)}
                             title="แก้ไขข้อมูล"
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                           
                           {/* Delete button - only for super admin */}
                           {profile?.role === 'super_admin' && (
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                               onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 handleDelete(item);
                               }}
                               title="ลบครุภัณฑ์"
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div> {/* Close min-width div */}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {(() => {
        console.log('Rendering dialogs. selectedEquipment:', !!selectedEquipment, 'qrDialogOpen:', qrDialogOpen);
        return null;
      })()}
      {selectedEquipment && (
        <>
          <QRCodeDialog
            open={qrDialogOpen}
            onOpenChange={(open) => {
              console.log('QR Dialog onOpenChange:', open);
              setQrDialogOpen(open);
            }}
            equipment={selectedEquipment}
          />
          <EquipmentViewDialog
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            equipment={selectedEquipment}
          />
          <EquipmentEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            equipment={selectedEquipment}
            onSave={handleSaveEdit}
          />
          <DeleteEquipmentDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            equipment={selectedEquipment}
            onDeleted={handleEquipmentDeleted}
          />
        </>
      )}
    </div>
  );
}