import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, History as HistoryIcon, User, Calendar, FileText, Filter, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
  equipment?: {
    name: string;
    asset_number: string;
  } | null;
}

const History = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [historyData, setHistoryData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch audit logs from database
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'equipment')
        .order('changed_at', { ascending: false })
        .limit(100);

      if (startDate) {
        query = query.gte('changed_at', startDate);
      }
      
      if (endDate) {
        query = query.lte('changed_at', endDate + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch equipment details separately to avoid join issues
      const auditLogs = data || [];
      const equipmentIds = [...new Set(auditLogs.map(log => log.record_id))];
      
      const { data: equipmentData } = await supabase
        .from('equipment')
        .select('id, name, asset_number')
        .in('id', equipmentIds);

      const equipmentMap = new Map(
        equipmentData?.map(eq => [eq.id, eq]) || []
      );

      const enrichedLogs = auditLogs.map(log => ({
        ...log,
        equipment: equipmentMap.get(log.record_id) || null
      }));

      setHistoryData(enrichedLogs);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลประวัติได้: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [startDate, endDate]);

  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT":
        return "default";
      case "UPDATE":
        return "secondary";
      case "DELETE":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "INSERT":
        return "สร้างใหม่";
      case "UPDATE":
        return "อัปเดตข้อมูล";
      case "DELETE":
        return "ลบข้อมูล";
      default:
        return action;
    }
  };

  const getFieldLabel = (fieldName: string) => {
    const fieldLabels: { [key: string]: string } = {
      'name': 'ชื่อครุภัณฑ์',
      'type': 'ประเภท',
      'brand': 'ยี่ห้อ',
      'model': 'รุ่น',
      'serial_number': 'Serial Number',
      'asset_number': 'เลขครุภัณฑ์',
      'status': 'สถานะ',
      'location': 'สถานที่',
      'assigned_to': 'ผู้ใช้งาน',
      'purchase_date': 'วันที่ได้มา',
      'warranty_end': 'หมดประกัน',
      'specs': 'ข้อมูลเทคนิค',
      'entire_record': 'ข้อมูลทั้งหมด'
    };
    return fieldLabels[fieldName] || fieldName;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredHistory = historyData.filter(item => {
    const equipmentName = item.equipment?.name || '';
    const assetNumber = item.equipment?.asset_number || '';
    const fieldName = getFieldLabel(item.field_name || '');
    
    const matchesSearch = 
      equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.old_value && item.old_value.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.new_value && item.new_value.toLowerCase().includes(searchTerm.toLowerCase()));

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
        <Button variant="outline" onClick={fetchAuditLogs}>
          <FileText className="mr-2 h-4 w-4" />
          รีเฟรชข้อมูล
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
                placeholder="ค้นหาครุภัณฑ์, เลขครุภัณฑ์ หรือฟิลด์ที่แก้ไข..."
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
                <SelectItem value="INSERT">สร้างใหม่</SelectItem>
                <SelectItem value="UPDATE">อัปเดตข้อมูล</SelectItem>
                <SelectItem value="DELETE">ลบข้อมูล</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              type="date" 
              className="w-[180px]" 
              placeholder="วันที่เริ่มต้น"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input 
              type="date" 
              className="w-[180px]" 
              placeholder="วันที่สิ้นสุด"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>กำลังโหลดข้อมูล...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge variant={getActionColor(item.action)}>
                          {getActionLabel(item.action)}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {item.equipment?.name || 'ครุภัณฑ์ที่ถูกลบ'} ({item.equipment?.asset_number || item.record_id})
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <span className="text-sm text-muted-foreground">ฟิลด์ที่แก้ไข:</span>
                          <p className="font-medium text-sm">{getFieldLabel(item.field_name || '')}</p>
                        </div>
                        {item.reason && (
                          <div>
                            <span className="text-sm text-muted-foreground">เหตุผล:</span>
                            <p className="font-medium text-sm">{item.reason}</p>
                          </div>
                        )}
                      </div>

                      {item.action === "UPDATE" && item.field_name !== "entire_record" && (
                        <div className="bg-muted/30 rounded p-3 mb-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">ค่าเดิม:</span>
                              <p className="font-mono bg-background p-2 rounded mt-1 border text-xs">
                                {item.old_value || '-'}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">ค่าใหม่:</span>
                              <p className="font-mono bg-background p-2 rounded mt-1 border text-xs">
                                {item.new_value || '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {item.changed_by && (
                          <div className="flex items-center">
                            <User className="mr-1 h-3 w-3" />
                            {item.changed_by}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDateTime(item.changed_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredHistory.length === 0 && (
            <div className="text-center py-12">
              <HistoryIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">ไม่พบประวัติการแก้ไข</h3>
              <p className="text-muted-foreground">
                {historyData.length === 0 
                  ? "ยังไม่มีประวัติการแก้ไขข้อมูลครุภัณฑ์" 
                  : "ไม่มีประวัติการแก้ไขที่ตรงกับเงื่อนไขการค้นหา"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default History;