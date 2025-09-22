import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Computer, AlertTriangle, CheckCircle, Clock, TrendingUp, Monitor, Printer, Server, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
export default function Dashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    total: 0,
    working: 0,
    broken: 0,
    maintenance: 0,
    expired: 0
  });
  const [recentEquipment, setRecentEquipment] = useState<any[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all equipment for stats
      const { data: equipmentData, error: equipmentError } = await (supabase as any)
        .from('equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (equipmentError) throw equipmentError;

      // Calculate stats
      const total = equipmentData?.length || 0;
      const working = equipmentData?.filter((e: any) => e.status === 'working').length || 0;
      const broken = equipmentData?.filter((e: any) => e.status === 'broken').length || 0;
      const maintenance = equipmentData?.filter((e: any) => e.status === 'maintenance').length || 0;
      
      // Calculate expired warranties (next 3 months)
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      const expired = equipmentData?.filter((e: any) => {
        if (!e.warranty_end) return false;
        const warrantyDate = new Date(e.warranty_end);
        return warrantyDate <= threeMonthsFromNow;
      }).length || 0;

      setStats({ total, working, broken, maintenance, expired });

      // Set recent equipment (latest 4)
      const recent = equipmentData?.slice(0, 4).map((item: any) => ({
        id: item.asset_number,
        name: item.name,
        type: item.type,
        status: item.status,
        location: item.location || 'ไม่ระบุ'
      })) || [];
      setRecentEquipment(recent);

      // Calculate type distribution
      const typeCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        typeCount[item.type] = (typeCount[item.type] || 0) + 1;
      });

      const distribution = Object.entries(typeCount).map(([type, count]) => ({
        type,
        count: count as number,
        icon: getTypeIcon(type),
        color: getTypeColor(type)
      }));

      setTypeDistribution(distribution);

    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูล Dashboard ได้: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('คอมพิวเตอร์') || lowerType.includes('desktop') || lowerType.includes('laptop')) return Computer;
    if (lowerType.includes('จอ') || lowerType.includes('monitor')) return Monitor;
    if (lowerType.includes('เครื่องพิมพ์') || lowerType.includes('printer')) return Printer;
    if (lowerType.includes('เซิร์ฟเวอร์') || lowerType.includes('server')) return Server;
    return Computer;
  };

  const getTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('คอมพิวเตอร์') || lowerType.includes('desktop')) return "bg-primary";
    if (lowerType.includes('laptop')) return "bg-accent";
    if (lowerType.includes('จอ') || lowerType.includes('monitor')) return "bg-warning";
    if (lowerType.includes('เครื่องพิมพ์') || lowerType.includes('printer')) return "bg-secondary";
    if (lowerType.includes('เซิร์ฟเวอร์') || lowerType.includes('server')) return "bg-muted-foreground";
    return "bg-primary";
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);
  const getStatusBadge = (status: string) => {
    const variants = {
      available: {
        variant: "default" as const,
        color: "bg-success text-success-foreground",
        label: "พร้อมใช้งาน"
      },
      borrowed: {
        variant: "secondary" as const,
        color: "bg-primary text-primary-foreground", 
        label: "ถูกยืม"
      },
      maintenance: {
        variant: "secondary" as const,
        color: "bg-warning text-warning-foreground",
        label: "ซ่อมบำรุง"
      },
      damaged: {
        variant: "destructive" as const,
        color: "bg-destructive text-destructive-foreground",
        label: "ชำรุด"
      }
    };
    const config = variants[status as keyof typeof variants] || {
      variant: "outline" as const,
      color: "bg-muted text-muted-foreground",
      label: status
    };
    return <Badge className={config.color}>{config.label}</Badge>;
  };
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        </div>
      </div>
    );
  }

  return <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">แดชบอร์ดระบบครุภัณฑ์</h1>
        <p className="text-muted-foreground">ภาพรวมการจัดการครุภัณฑ์คอมพิวเตอร์</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ครุภัณฑ์ทั้งหมด
            </CardTitle>
            <Computer className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              +12 จากเดือนที่แล้ว
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ใช้งานปกติ
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.working}</div>
            <p className="text-xs text-muted-foreground">
              {(stats.working / stats.total * 100).toFixed(1)}% ของทั้งหมด
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ชำรุด
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.broken}</div>
            <p className="text-xs text-muted-foreground">
              ต้องซ่อมแซม
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ซ่อมบำรุง
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.maintenance}</div>
            <p className="text-xs text-muted-foreground">
              อยู่ระหว่างดำเนินการ
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ประกันหมดอายุ
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.expired}</div>
            <p className="text-xs text-muted-foreground">
              ใน 3 เดือนข้างหน้า
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Equipment */}
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Computer className="h-5 w-5 text-primary" />
              ครุภัณฑ์ล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEquipment.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">ไม่มีข้อมูลครุภัณฑ์</p>
              ) : (
                recentEquipment.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {(item.type.includes("Desktop") || item.type.includes("คอมพิวเตอร์")) && <Computer className="h-4 w-4 text-primary" />}
                        {(item.type.includes("Printer") || item.type.includes("เครื่องพิมพ์")) && <Printer className="h-4 w-4 text-primary" />}
                        {(item.type.includes("Laptop") || item.type.includes("แล็ป")) && <Computer className="h-4 w-4 text-primary" />}
                        {(item.type.includes("Monitor") || item.type.includes("จอ")) && <Monitor className="h-4 w-4 text-primary" />}
                        {!(item.type.includes("Desktop") || item.type.includes("คอมพิวเตอร์") || item.type.includes("Printer") || item.type.includes("เครื่องพิมพ์") || item.type.includes("Laptop") || item.type.includes("แล็ป") || item.type.includes("Monitor") || item.type.includes("จอ")) && <Computer className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.id} • {item.location}</p>
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Equipment Types Distribution */}
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              การกระจายประเภทครุภัณฑ์
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {typeDistribution.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">ไม่มีข้อมูล</p>
              ) : (
                typeDistribution.map(item => (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 ${item.color}/10 rounded-lg`}>
                        <item.icon className={`h-4 w-4 ${item.color === 'bg-muted-foreground' ? 'text-muted-foreground' : item.color.replace('bg-', 'text-')}`} />
                      </div>
                      <span className="text-sm font-medium">{item.type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold">{item.count}</span>
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className={`${item.color} h-2 rounded-full`} 
                          style={{
                            width: `${Math.max((item.count / Math.max(...typeDistribution.map(d => d.count)) * 100), 10)}%`
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}