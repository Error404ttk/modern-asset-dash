import { useState, useEffect, useCallback } from "react";
import { 
  Computer, 
  Plus, 
  Eye, 
  Edit, 
  QrCode,
  Calendar,
  MapPin,
  Loader2,
  Trash2,
  Building2,
  ArrowLeftRight
} from "lucide-react";
import QRCodeDialog from "@/components/equipment/QRCodeDialog";
import EquipmentViewDialog from "@/components/equipment/EquipmentViewDialog";
import EquipmentEditDialog from "@/components/equipment/EquipmentEditDialog";
import DeleteEquipmentDialog from "@/components/equipment/DeleteEquipmentDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Json, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { getWarrantyStatusInfo } from "@/lib/warranty";
import { cn } from "@/lib/utils";

type DbEquipment = Tables<'equipment'>;

interface EquipmentItem {
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
  images?: string[];
  specs: { [key: string]: string };
}

// Normalize specs (Json) to a string map for UI safety
const normalizeSpecs = (specs: unknown): { [key: string]: string } => {
  const out: { [key: string]: string } = {};
  if (specs && typeof specs === 'object' && !Array.isArray(specs)) {
    for (const [k, v] of Object.entries(specs as Record<string, unknown>)) {
      out[k] = v === null || v === undefined ? "" : String(v);
    }
  }
  if (out.reason && !out.notes) out.notes = out.reason;
  if (!out.reason && out.notes) out.reason = out.notes;
  return out;
};

const transformEquipment = (dbEquipment: DbEquipment): EquipmentItem => ({
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
  quantity: (dbEquipment.quantity ?? 1).toString(),
  images: dbEquipment.images || [],
  specs: normalizeSpecs(dbEquipment.specs)
});

export default function Equipment() {
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Fetch equipment data from Supabase
  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database data to component format
      const transformedData = (data || []).map(transformEquipment);
      setEquipmentList(transformedData);
    } catch (error: unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลครุภัณฑ์ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load data on component mount
  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const handleQrCode = (item: EquipmentItem) => {
    console.log('QR Code button clicked for item:', item);
    setSelectedEquipment(item);
    setQrDialogOpen(true);
    console.log('QR Dialog should be opening...');
  };

  const handleView = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setViewDialogOpen(true);
  };

  const handleEdit = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setEditDialogOpen(true);
  };

  const handleDelete = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setDeleteDialogOpen(true);
  };

  const handleEquipmentDeleted = () => {
    fetchEquipment();
  };

  const handleBorrow = (item: EquipmentItem) => {
    if (item.status !== 'available') {
      toast({
        title: "ไม่สามารถยืมครุภัณฑ์ได้",
        description: "สามารถยืมได้เฉพาะครุภัณฑ์ที่อยู่ในสถานะพร้อมใช้งานเท่านั้น",
        variant: "destructive",
      });
      return;
    }

    navigate('/borrow-return', { state: { equipmentId: item.id } });
  };

  // Accept the dialog's Equipment shape (structurally compatible with EquipmentItem)
  const handleSaveEdit = (updatedEquipment: EquipmentItem) => {
    (async () => {
      try {
        // Transform back to database format
        const dbUpdate: TablesUpdate<'equipment'> = {
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
          images: updatedEquipment.images ?? [],
          specs: (updatedEquipment.specs as unknown as Json)
        };

        const { error } = await supabase
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
      } catch (error: unknown) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถอัพเดทข้อมูลได้",
          variant: "destructive",
        });
      }
    })();
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      available: { color: "bg-success text-success-foreground", label: "พร้อมใช้งาน" },
      borrowed: { color: "bg-primary text-primary-foreground", label: "ถูกยืม" },
      maintenance: { color: "bg-warning text-warning-foreground", label: "ซ่อมบำรุง" },
      damaged: { color: "bg-destructive text-destructive-foreground", label: "ชำรุด" },
      pending_disposal: { color: "bg-secondary text-secondary-foreground", label: "รอจำหน่าย" },
      disposed: { color: "bg-muted text-muted-foreground", label: "จำหน่าย" },
      lost: { color: "bg-destructive text-destructive-foreground", label: "สูญหาย" }
    };
    
    const config = variants[status as keyof typeof variants] || {
      color: "bg-muted text-muted-foreground", 
      label: status
    };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredEquipment = equipmentList;

  // Pagination calculations
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredEquipment.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedEquipment = filteredEquipment.slice(startIndex, endIndex);

  // Reset to first page if data changes or current page exceeds total pages
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredEquipment.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">รายการครุภัณฑ์</h1>
          <p className="text-sm sm:text-base text-muted-foreground">จัดการและติดตามครุภัณฑ์คอมพิวเตอร์</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link to="/scan" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <QrCode className="h-4 w-4 mr-2" /> สแกน QR
            </Button>
          </Link>
          <Link to="/equipment/add" className="w-full sm:w-auto">
            <Button className="bg-gradient-primary hover:opacity-90 shadow-soft w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มครุภัณฑ์ใหม่
            </Button>
          </Link>
        </div>
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

      {/* Equipment Table */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">รายการครุภัณฑ์ ({filteredEquipment.length} รายการ)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[900px]"> {/* Add min-width for better mobile scrolling */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">เลขครุภัณฑ์</TableHead>
                    <TableHead className="min-w-[180px]">ชื่อครุภัณฑ์</TableHead>
                    <TableHead className="min-w-[100px]">ประเภท</TableHead>
                    <TableHead className="min-w-[100px]">สถานะ</TableHead>
                    <TableHead className="min-w-[140px]">หน่วยงาน</TableHead>
                    <TableHead className="min-w-[120px]">สถานที่</TableHead>
                    <TableHead className="min-w-[120px]">ผู้ใช้งาน</TableHead>
                    <TableHead className="min-w-[100px]">ประกัน</TableHead>
                    <TableHead className="text-right min-w-[140px]">การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>กำลังโหลดข้อมูล...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEquipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {equipmentList.length === 0 ? "ไม่มีข้อมูลครุภัณฑ์" : "ไม่พบข้อมูลที่ค้นหา"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedEquipment.map((item) => (
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
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[160px]" title={item.specs?.department || "-"}>
                            {item.specs?.department || "-"}
                          </span>
                        </div>
                      </TableCell>
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
                          {(() => {
                            const info = getWarrantyStatusInfo(item.warrantyEnd);
                            if (!info) {
                              return <span className="text-sm text-muted-foreground">-</span>;
                            }

                            const detailText = info.detail ? `(${info.detail})` : "";
                            return (
                              <span className={cn("text-sm font-medium", info.textClass)}>
                                {info.label}
                                {detailText ? ` ${detailText}` : ""}
                              </span>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="grid grid-cols-2 gap-1 justify-items-end">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-muted h-8 w-8 p-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleBorrow(item);
                            }}
                            title="ยืมครุภัณฑ์"
                            disabled={item.status !== 'available'}
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </Button>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
              <p className="text-sm text-muted-foreground">
                แสดง {filteredEquipment.length === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, filteredEquipment.length)} จาก {filteredEquipment.length} รายการ
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={currentPage === i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
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
