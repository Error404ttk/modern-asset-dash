import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, ArrowLeftRight, Calendar, User, Monitor, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BorrowReturn = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for borrowed equipment
  const borrowedEquipment = [
    {
      id: "EQ001",
      name: "Dell Laptop Inspiron 15",
      serialNumber: "DL123456789",
      borrower: "นาย สมชาย ใจดี",
      department: "กองคลัง",
      borrowDate: "2024-01-15",
      returnDate: "2024-02-15",
      status: "ยืมอยู่"
    },
    {
      id: "EQ002", 
      name: "HP Printer LaserJet",
      serialNumber: "HP987654321",
      borrower: "นาง สมหญิง รักษ์ดี",
      department: "กองช่าง",
      borrowDate: "2024-01-10",
      returnDate: "2024-01-25",
      status: "เกินกำหนด"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "บันทึกสำเร็จ",
      description: "บันทึกการยืม-คืนครุภัณฑ์เรียบร้อยแล้ว",
    });
  };

  const handleReturn = (equipmentId: string) => {
    toast({
      title: "คืนครุภัณฑ์สำเร็จ", 
      description: `คืนครุภัณฑ์ ${equipmentId} เรียบร้อยแล้ว`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">การยืม-คืนครุภัณฑ์</h1>
          <p className="text-muted-foreground mt-2">จัดการการยืม-คืนครุภัณฑ์คอมพิวเตอร์</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          บันทึกการยืมใหม่
        </Button>
      </div>

      <Tabs defaultValue="borrow" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="borrow">บันทึกการยืม</TabsTrigger>
          <TabsTrigger value="return">บันทึกการคืน</TabsTrigger>
          <TabsTrigger value="list">รายการยืม-คืน</TabsTrigger>
        </TabsList>

        {/* Borrow Tab */}
        <TabsContent value="borrow">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowLeftRight className="mr-2 h-5 w-5" />
                บันทึกการยืมครุภัณฑ์
              </CardTitle>
              <CardDescription>
                กรอกข้อมูลการยืมครุภัณฑ์ใหม่
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="equipment">ครุภัณฑ์</Label>
                    <div className="flex space-x-2">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกครุภัณฑ์" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eq1">Dell Laptop Inspiron 15 (EQ001)</SelectItem>
                          <SelectItem value="eq2">HP Desktop Pro (EQ003)</SelectItem>
                          <SelectItem value="eq3">Canon Printer (EQ005)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="borrower">ผู้ยืม</Label>
                    <Input placeholder="ชื่อ-นามสกุล ผู้ยืม" />
                  </div>

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
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact">เบอร์ติดต่อ</Label>
                    <Input placeholder="เบอร์โทรศัพท์" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="borrowDate">วันที่ยืม</Label>
                    <Input type="date" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="returnDate">วันที่กำหนดคืน</Label>
                    <Input type="date" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">วัตถุประสงค์การยืม</Label>
                  <Textarea placeholder="ระบุวัตถุประสงค์ในการยืมครุภัณฑ์" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">หมายเหตุ</Label>
                  <Textarea placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" />
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  บันทึกการยืม
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Return Tab */}
        <TabsContent value="return">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowLeftRight className="mr-2 h-5 w-5" />
                บันทึกการคืนครุภัณฑ์
              </CardTitle>
              <CardDescription>
                กรอกข้อมูลการคืนครุภัณฑ์
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="returnEquipment">ครุภัณฑ์ที่คืน</Label>
                    <div className="flex space-x-2">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกครุภัณฑ์ที่ยืม" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eq1">Dell Laptop Inspiron 15 (EQ001)</SelectItem>
                          <SelectItem value="eq2">HP Printer LaserJet (EQ002)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="returnDate">วันที่คืน</Label>
                    <Input type="date" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">สภาพครุภัณฑ์</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกสภาพครุภัณฑ์" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">ปกติ</SelectItem>
                        <SelectItem value="damaged">ชำรุด</SelectItem>
                        <SelectItem value="lost">สูญหาย</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receiver">ผู้รับคืน</Label>
                    <Input placeholder="ชื่อ-นามสกุล ผู้รับคืน" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnNotes">หมายเหตุการคืน</Label>
                  <Textarea placeholder="หมายเหตุเกี่ยวกับสภาพครุภัณฑ์หรือข้อมูลเพิ่มเติม" />
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  บันทึกการคืน
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="mr-2 h-5 w-5" />
                รายการยืม-คืนครุภัณฑ์
              </CardTitle>
              <CardDescription>
                รายการครุภัณฑ์ที่อยู่ระหว่างการยืม
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาครุภัณฑ์, ผู้ยืม หรือหน่วยงาน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="สถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="borrowed">ยืมอยู่</SelectItem>
                    <SelectItem value="overdue">เกินกำหนด</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {borrowedEquipment.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Monitor className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h3 className="font-medium text-foreground">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">รหัส: {item.id} | S/N: {item.serialNumber}</p>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">ผู้ยืม:</span>
                            <p className="font-medium">{item.borrower}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">หน่วยงาน:</span>
                            <p className="font-medium">{item.department}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">วันที่ยืม:</span>
                            <p className="font-medium">{item.borrowDate}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">กำหนดคืน:</span>
                            <p className="font-medium">{item.returnDate}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Badge variant={item.status === "เกินกำหนด" ? "destructive" : "default"}>
                          {item.status}
                        </Badge>
                        <Button 
                          size="sm" 
                          onClick={() => handleReturn(item.id)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          บันทึกการคืน
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BorrowReturn;