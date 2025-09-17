import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, History as HistoryIcon, User, Calendar, FileText, Filter } from "lucide-react";

const History = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Mock data for edit history
  const historyData = [
    {
      id: "1",
      equipmentId: "EQ001",
      equipmentName: "Dell Laptop Inspiron 15",
      action: "อัปเดตข้อมูล",
      field: "ผู้ใช้งาน",
      oldValue: "นาย สมชาย ใจดี",
      newValue: "นาง สมหญิง รักษ์ดี",
      editedBy: "ผู้ดูแลระบบ",
      editedAt: "2024-01-20 14:30:25",
      reason: "โอนย้ายหน่วยงาน"
    },
    {
      id: "2", 
      equipmentId: "EQ002",
      equipmentName: "HP Printer LaserJet",
      action: "เปลี่ยนสถานะ",
      field: "สถานะ",
      oldValue: "ใช้งานปกติ",
      newValue: "ซ่อมบำรุง",
      editedBy: "นาย วิชัย ซ่อมดี",
      editedAt: "2024-01-19 09:15:10",
      reason: "พบปัญหาการพิมพ์"
    },
    {
      id: "3",
      equipmentId: "EQ003",
      equipmentName: "HP Desktop Pro",
      action: "เพิ่มข้อมูล",
      field: "RAM",
      oldValue: "8 GB",
      newValue: "16 GB", 
      editedBy: "นาย ทดสอบ อัปเกรด",
      editedAt: "2024-01-18 16:45:00",
      reason: "อัปเกรดฮาร์ดแวร์"
    },
    {
      id: "4",
      equipmentId: "EQ001",
      equipmentName: "Dell Laptop Inspiron 15",
      action: "อัปเดตข้อมูล",
      field: "สถานที่",
      oldValue: "ห้อง 201 อาคาร A",
      newValue: "ห้อง 305 อาคาร B",
      editedBy: "ผู้ดูแลระบบ",
      editedAt: "2024-01-17 11:20:30",
      reason: "ย้ายสำนักงาน"
    },
    {
      id: "5",
      equipmentId: "EQ004",
      equipmentName: "Canon Scanner",
      action: "สร้างใหม่",
      field: "ทั้งหมด",
      oldValue: "-",
      newValue: "ข้อมูลครุภัณฑ์ใหม่",
      editedBy: "นาง สร้าง ใหม่",
      editedAt: "2024-01-16 08:30:15",
      reason: "รับมอบครุภัณฑ์ใหม่"
    }
  ];

  const getActionColor = (action: string) => {
    switch (action) {
      case "สร้างใหม่":
        return "default";
      case "อัปเดตข้อมูล":
        return "secondary";
      case "เปลี่ยนสถานะ":
        return "outline";
      case "ลบข้อมูล":
        return "destructive";
      default:
        return "default";
    }
  };

  const filteredHistory = historyData.filter(item => {
    const matchesSearch = 
      item.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.editedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.field.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === "all" || item.action === filterType;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ประวัติการแก้ไข</h1>
          <p className="text-muted-foreground mt-2">ประวัติการเปลี่ยนแปลงข้อมูลครุภัณฑ์ทั้งหมด</p>
        </div>
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          ส่งออกรายงาน
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            กรองข้อมูล
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาครุภัณฑ์, ผู้แก้ไข หรือฟิลด์ที่แก้ไข..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="ประเภทการแก้ไข" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="สร้างใหม่">สร้างใหม่</SelectItem>
                <SelectItem value="อัปเดตข้อมูล">อัปเดตข้อมูล</SelectItem>
                <SelectItem value="เปลี่ยนสถานะ">เปลี่ยนสถานะ</SelectItem>
                <SelectItem value="ลบข้อมูล">ลบข้อมูล</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="w-[180px]" placeholder="วันที่เริ่มต้น" />
            <Input type="date" className="w-[180px]" placeholder="วันที่สิ้นสุด" />
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HistoryIcon className="mr-2 h-5 w-5" />
            รายการประวัติการแก้ไข
          </CardTitle>
          <CardDescription>
            แสดง {filteredHistory.length} รายการจากทั้งหมด {historyData.length} รายการ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredHistory.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge variant={getActionColor(item.action)}>
                        {item.action}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        {item.equipmentName} ({item.equipmentId})
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="text-sm text-muted-foreground">ฟิลด์ที่แก้ไข:</span>
                        <p className="font-medium text-sm">{item.field}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">เหตุผล:</span>
                        <p className="font-medium text-sm">{item.reason}</p>
                      </div>
                    </div>

                    {item.action !== "สร้างใหม่" && (
                      <div className="bg-muted/30 rounded p-3 mb-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">ค่าเดิม:</span>
                            <p className="font-mono bg-background p-2 rounded mt-1 border">
                              {item.oldValue}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ค่าใหม่:</span>
                            <p className="font-mono bg-background p-2 rounded mt-1 border">
                              {item.newValue}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <User className="mr-1 h-3 w-3" />
                        {item.editedBy}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        {item.editedAt}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredHistory.length === 0 && (
            <div className="text-center py-12">
              <HistoryIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">ไม่พบประวัติการแก้ไข</h3>
              <p className="text-muted-foreground">ไม่มีประวัติการแก้ไขที่ตรงกับเงื่อนไขการค้นหา</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default History;