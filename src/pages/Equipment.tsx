import { useState } from "react";
import { 
  Computer, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  QrCode,
  Calendar,
  MapPin
} from "lucide-react";
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

export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock data
  const equipment = [
    {
      id: "EQ001",
      name: "Dell OptiPlex 7090",
      type: "Desktop PC",
      brand: "Dell",
      model: "OptiPlex 7090",
      serialNumber: "DELL7090001",
      assetNumber: "AST001",
      status: "working",
      location: "ห้อง IT-101",
      user: "นายสมชาย ใจดี",
      purchaseDate: "2023-01-15",
      warrantyEnd: "2026-01-14",
      specs: {
        cpu: "Intel Core i5-11500",
        ram: "8GB DDR4",
        storage: "256GB SSD"
      }
    },
    {
      id: "EQ002", 
      name: "HP LaserJet Pro M404n",
      type: "Printer",
      brand: "HP",
      model: "LaserJet Pro M404n",
      serialNumber: "HP404001",
      assetNumber: "AST002",
      status: "maintenance",
      location: "ห้องธุรการ",
      user: "นางสาวสุดา จริงใจ",
      purchaseDate: "2022-06-20",
      warrantyEnd: "2025-06-19",
      specs: {
        type: "Laser Printer",
        speed: "38 ppm",
        resolution: "4800 x 600 dpi"
      }
    },
    {
      id: "EQ003",
      name: "Lenovo ThinkPad E14",
      type: "Laptop", 
      brand: "Lenovo",
      model: "ThinkPad E14",
      serialNumber: "LEN14001",
      assetNumber: "AST003",
      status: "broken",
      location: "ห้องผู้อำนวยการ",
      user: "นายประเสริฐ ศิลป์สวย",
      purchaseDate: "2023-03-10",
      warrantyEnd: "2026-03-09",
      specs: {
        cpu: "AMD Ryzen 5 5500U",
        ram: "16GB DDR4", 
        storage: "512GB SSD"
      }
    },
    {
      id: "EQ004",
      name: "ASUS ProArt Display PA248QV",
      type: "Monitor",
      brand: "ASUS", 
      model: "ProArt Display PA248QV",
      serialNumber: "ASUS248001",
      assetNumber: "AST004", 
      status: "working",
      location: "ห้องออกแบบ",
      user: "นางสาววิมล สีสวย",
      purchaseDate: "2023-05-22",
      warrantyEnd: "2026-05-21",
      specs: {
        size: "24.1 inch",
        resolution: "1920x1200",
        panel: "IPS"
      }
    },
    {
      id: "EQ005",
      name: "Apple iMac 24-inch",
      type: "Desktop PC",
      brand: "Apple",
      model: "iMac 24-inch",
      serialNumber: "IMAC24001",
      assetNumber: "AST005",
      status: "working", 
      location: "ห้องกราฟิก",
      user: "นายอดิศร ออกแบบ",
      purchaseDate: "2023-08-15",
      warrantyEnd: "2026-08-14",
      specs: {
        cpu: "Apple M1",
        ram: "16GB",
        storage: "512GB SSD"
      }
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      working: { color: "bg-success text-success-foreground", label: "ใช้งานปกติ" },
      broken: { color: "bg-destructive text-destructive-foreground", label: "ชำรุด" },
      maintenance: { color: "bg-warning text-warning-foreground", label: "ซ่อมบำรุง" },
      retired: { color: "bg-muted text-muted-foreground", label: "จำหน่ายแล้ว" }
    };
    
    const config = variants[status as keyof typeof variants];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.assetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">รายการครุภัณฑ์</h1>
          <p className="text-muted-foreground">จัดการและติดตามครุภัณฑ์คอมพิวเตอร์</p>
        </div>
        
        <Link to="/equipment/add">
          <Button className="bg-gradient-primary hover:opacity-90 shadow-soft">
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มครุภัณฑ์ใหม่
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Computer className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{equipment.length}</p>
                <p className="text-sm text-muted-foreground">รายการทั้งหมด</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-success/10 rounded-lg flex items-center justify-center">
                <Computer className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {equipment.filter(e => e.status === 'working').length}
                </p>
                <p className="text-sm text-muted-foreground">ใช้งานปกติ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-warning/10 rounded-lg flex items-center justify-center">
                <Computer className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">
                  {equipment.filter(e => e.status === 'maintenance').length}
                </p>
                <p className="text-sm text-muted-foreground">ซ่อมบำรุง</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                <Computer className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {equipment.filter(e => e.status === 'broken').length}
                </p>
                <p className="text-sm text-muted-foreground">ชำรุด</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>ค้นหาและกรองข้อมูล</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
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
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="กรองตามสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="working">ใช้งานปกติ</SelectItem>
                <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                <SelectItem value="broken">ชำรุด</SelectItem>
                <SelectItem value="retired">จำหน่ายแล้ว</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>รายการครุภัณฑ์ ({filteredEquipment.length} รายการ)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขครุภัณฑ์</TableHead>
                  <TableHead>ชื่อครุภัณฑ์</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>สถานที่</TableHead>
                  <TableHead>ผู้ใช้งาน</TableHead>
                  <TableHead>ประกัน</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{item.assetNumber}</TableCell>
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
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" className="hover:bg-muted">
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="hover:bg-muted">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="hover:bg-muted">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}