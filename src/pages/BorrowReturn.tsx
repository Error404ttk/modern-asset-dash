import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, ArrowLeftRight, Calendar, User, Monitor, QrCode, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const BorrowReturn = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [borrowedEquipment, setBorrowedEquipment] = useState<any[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available equipment for borrowing
  const fetchAvailableEquipment = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('equipment')
        .select('*')
        .eq('status', 'available')
        .is('assigned_to', null);

      if (error) throw error;

      setAvailableEquipment(data || []);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดรายการครุภัณฑ์ได้: " + error.message,
        variant: "destructive",
      });
    }
  };

  // Fetch borrowed equipment
  const fetchBorrowedEquipment = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('borrow_transactions')
        .select(`
          *,
          equipment:equipment_id (
            name,
            asset_number,
            serial_number
          )
        `)
        .eq('status', 'borrowed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData = data?.map((record: any) => ({
        id: record.equipment?.asset_number || record.equipment_id,
        name: record.equipment?.name || 'Unknown Equipment',
        serialNumber: record.equipment?.serial_number || 'N/A',
        borrower: record.borrower_name,
        department: 'ไม่ระบุ',
        borrowDate: record.borrowed_at ? new Date(record.borrowed_at).toLocaleDateString('th-TH') : '',
        returnDate: record.expected_return_at ? new Date(record.expected_return_at).toLocaleDateString('th-TH') : '',
        status: isOverdue(record.expected_return_at) ? 'เกินกำหนด' : 'ยืมอยู่',
        recordId: record.id,
        equipmentId: record.equipment_id
      })) || [];

      setBorrowedEquipment(transformedData);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดรายการยืม-คืนได้: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (expectedReturnDate: string) => {
    if (!expectedReturnDate) return false;
    return new Date(expectedReturnDate) < new Date();
  };

  useEffect(() => {
    if (user) {
      fetchAvailableEquipment();
      fetchBorrowedEquipment();
    }
  }, [user]);

  const handleBorrowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    
    const borrowData = {
      equipment_id: formData.get('equipment') as string,
      borrower_name: formData.get('borrower') as string,
      borrower_contact: formData.get('contact') as string,
      borrowed_at: new Date(formData.get('borrowDate') as string).toISOString(),
      expected_return_at: new Date(formData.get('returnDate') as string).toISOString(),
      notes: formData.get('purpose') as string + (formData.get('notes') ? '\n' + formData.get('notes') : ''),
      status: 'borrowed',
      user_id: user?.id || '00000000-0000-0000-0000-000000000000'
    };

    try {
      const { error: borrowError } = await (supabase as any)
        .from('borrow_transactions')
        .insert([borrowData]);

      if (borrowError) throw borrowError;

      // Update equipment status and assigned_to
      const { error: updateError } = await (supabase as any)
        .from('equipment')
        .update({ 
          assigned_to: formData.get('borrower') as string,
          status: 'borrowed'
        })
        .eq('id', formData.get('equipment') as string);

      if (updateError) throw updateError;

      toast({
        title: "บันทึกสำเร็จ",
        description: "บันทึกการยืมครุภัณฑ์เรียบร้อยแล้ว",
      });

      // Reset form and refresh data
      (e.target as HTMLFormElement).reset();
      fetchAvailableEquipment();
      fetchBorrowedEquipment();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการยืมได้: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const borrowRecordId = formData.get('returnEquipment') as string;
    const condition = formData.get('condition') as string;
    const returnNotes = formData.get('returnNotes') as string;

    try {
      // Find the borrow record to get equipment details
      const borrowRecord = borrowedEquipment.find(item => item.recordId === borrowRecordId);
      if (!borrowRecord) {
        throw new Error('ไม่พบข้อมูลการยืม');
      }

      // Get equipment UUID by asset number
      const { data: equipmentData, error: equipmentFindError } = await (supabase as any)
        .from('equipment')
        .select('id, name, asset_number')
        .eq('asset_number', borrowRecord.id)
        .single();

      if (equipmentFindError || !equipmentData) {
        throw new Error('ไม่พบข้อมูลครุภัณฑ์');
      }

      // Prepare return notes with damage information
      let finalNotes = returnNotes || '';
      if (condition === 'damaged' || condition === 'lost') {
        const damageInfo = `สถานะ: ${condition === 'damaged' ? 'ชำรุด' : 'สูญหาย'} | ผู้ยืม: ${borrowRecord.borrower} | วันที่คืน: ${new Date().toLocaleDateString('th-TH')}`;
        finalNotes = finalNotes ? `${damageInfo}\n${finalNotes}` : damageInfo;
      }

      // Update borrow record
      const { error: updateError } = await (supabase as any)
        .from('borrow_transactions')
        .update({ 
          returned_at: new Date(formData.get('returnDate') as string).toISOString(),
          status: 'returned',
          notes: finalNotes
        })
        .eq('id', borrowRecordId);

      if (updateError) throw updateError;

      // Determine equipment status
      let newStatus = 'available';
      let assignedTo = null;
      
      if (condition === 'damaged') {
        newStatus = 'damaged';
        assignedTo = `ชำรุดโดย: ${borrowRecord.borrower} (${new Date().toLocaleDateString('th-TH')})`; 
      } else if (condition === 'lost') {
        newStatus = 'damaged'; // Use 'damaged' status for lost items too
        assignedTo = `สูญหายโดย: ${borrowRecord.borrower} (${new Date().toLocaleDateString('th-TH')})`;
      }

      // Update equipment status
      const { error: equipmentError } = await (supabase as any)
        .from('equipment')
        .update({ 
          assigned_to: assignedTo,
          status: newStatus
        })
        .eq('id', equipmentData.id);

      if (equipmentError) throw equipmentError;

      toast({
        title: "บันทึกสำเร็จ",
        description: "บันทึกการคืนครุภัณฑ์เรียบร้อยแล้ว",
      });

      // Reset form and refresh data
      (e.target as HTMLFormElement).reset();
      fetchAvailableEquipment();
      fetchBorrowedEquipment();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด", 
        description: "ไม่สามารถบันทึกการคืนได้: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async (equipmentId: string) => {
    try {
      // Find the borrow record to update using recordId
      const borrowRecord = borrowedEquipment.find(item => item.recordId === equipmentId);
      if (!borrowRecord) return;

      // Get equipment UUID by asset number
      const { data: equipmentData, error: equipmentFindError } = await (supabase as any)
        .from('equipment')
        .select('id')
        .eq('asset_number', borrowRecord.id)
        .single();

      if (equipmentFindError || !equipmentData) {
        throw new Error('ไม่พบข้อมูลครุภัณฑ์');
      }

      const { error: updateError } = await (supabase as any)
        .from('borrow_transactions')
        .update({ 
          returned_at: new Date().toISOString(),
          status: 'returned'
        })
        .eq('id', borrowRecord.recordId);

      if (updateError) throw updateError;

      // Update equipment to clear assigned_to
      const { error: equipmentError } = await (supabase as any)
        .from('equipment')
        .update({ 
          assigned_to: null,
          status: 'available'
        })
        .eq('id', equipmentData.id);

      if (equipmentError) throw equipmentError;

      toast({
        title: "คืนครุภัณฑ์สำเร็จ", 
        description: `คืนครุภัณฑ์ ${equipmentId} เรียบร้อยแล้ว`,
      });

      fetchBorrowedEquipment();
      fetchAvailableEquipment();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถคืนครุภัณฑ์ได้: " + error.message,
        variant: "destructive",
      });
    }
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
              <form onSubmit={handleBorrowSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="equipment">ครุภัณฑ์</Label>
                    <div className="flex space-x-2">
                      <Select name="equipment" required>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกครุภัณฑ์" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableEquipment.map((eq) => (
                            <SelectItem key={eq.id} value={eq.id}>
                              {eq.name} ({eq.asset_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="borrower">ผู้ยืม</Label>
                    <Input name="borrower" placeholder="ชื่อ-นามสกุล ผู้ยืม" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">หน่วยงาน</Label>
                    <Select name="department">
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
                    <Input name="contact" placeholder="เบอร์โทรศัพท์" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="borrowDate">วันที่ยืม</Label>
                    <Input name="borrowDate" type="date" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="returnDate">วันที่กำหนดคืน</Label>
                    <Input name="returnDate" type="date" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">วัตถุประสงค์การยืม</Label>
                  <Textarea name="purpose" placeholder="ระบุวัตถุประสงค์ในการยืมครุภัณฑ์" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">หมายเหตุ</Label>
                  <Textarea name="notes" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    'บันทึกการยืม'
                  )}
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
              <form onSubmit={handleReturnSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="returnEquipment">ครุภัณฑ์ที่คืน</Label>
                    <div className="flex space-x-2">
                      <Select name="returnEquipment" required>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกครุภัณฑ์ที่ยืม" />
                        </SelectTrigger>
                        <SelectContent>
                          {borrowedEquipment.map((item) => (
                            <SelectItem key={item.recordId} value={item.recordId}>
                              {item.name} ({item.id}) - ยืมโดย: {item.borrower}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="returnDate">วันที่คืน</Label>
                    <Input name="returnDate" type="date" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">สภาพครุภัณฑ์</Label>
                    <Select name="condition" required>
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
                    <Input name="receiver" placeholder="ชื่อ-นามสกุล ผู้รับคืน" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnNotes">หมายเหตุการคืน</Label>
                  <Textarea name="returnNotes" placeholder="หมายเหตุเกี่ยวกับสภาพครุภัณฑ์หรือข้อมูลเพิ่มเติม" />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    'บันทึกการคืน'
                  )}
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
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>กำลังโหลดข้อมูล...</span>
                  </div>
                ) : borrowedEquipment.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">ไม่มีรายการยืม-คืน</p>
                ) : (
                  borrowedEquipment
                    .filter(item => 
                      searchTerm === "" || 
                      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.borrower.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.id.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((item) => (
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
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BorrowReturn;