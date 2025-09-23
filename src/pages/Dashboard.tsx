import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Computer, AlertTriangle, CheckCircle, Clock, TrendingUp, Monitor, Printer, Server, Loader2, Building2, HardDrive, Cpu, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
  const [departmentDistribution, setDepartmentDistribution] = useState<any[]>([]);
  const [brandDistribution, setBrandDistribution] = useState<any[]>([]);
  const [cpuDistribution, setCpuDistribution] = useState<any[]>([]);
  const [ramDistribution, setRamDistribution] = useState<any[]>([]);
  const [osDistribution, setOsDistribution] = useState<any[]>([]);
  const [yearDistribution, setYearDistribution] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [additionalStats, setAdditionalStats] = useState({
    avgAge: 0,
    warrantyExpiring: 0,
    totalValue: 0,
    utilizationRate: 85
  });
  const [loading, setLoading] = useState(true);

  // Color palette for charts
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'];

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

      // Fetch departments
      const { data: departmentsData, error: deptError } = await (supabase as any)
        .from('departments')
        .select('*')
        .eq('active', true);

      if (deptError) console.warn('Could not fetch departments:', deptError);

      // Fetch recent activities
      const { data: activitiesData, error: activitiesError } = await (supabase as any)
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(10);

      if (activitiesError) console.warn('Could not fetch activities:', activitiesError);

      // Calculate basic stats
      const total = equipmentData?.length || 0;
      const working = equipmentData?.filter((e: any) => e.status === 'available').length || 0;
      const broken = equipmentData?.filter((e: any) => e.status === 'damaged').length || 0;
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
        color: getTypeColor(type),
        name: type,
        value: count as number
      }));

      setTypeDistribution(distribution);

      // Calculate department distribution
      const deptCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        // Use location or assigned_to to determine department/organization
        let department = 'ไม่ระบุหน่วยงาน';
        
        if (item.location) {
          // Check if location matches any department
          const matchingDept = departmentsData?.find((d: any) => 
            item.location.toLowerCase().includes(d.name.toLowerCase()) ||
            d.name.toLowerCase().includes(item.location.toLowerCase())
          );
          department = matchingDept ? matchingDept.name : item.location;
        } else if (item.assigned_to) {
          // Check if assigned_to matches any department
          const matchingDept = departmentsData?.find((d: any) => 
            item.assigned_to.toLowerCase().includes(d.name.toLowerCase()) ||
            d.name.toLowerCase().includes(item.assigned_to.toLowerCase())
          );
          department = matchingDept ? matchingDept.name : item.assigned_to;
        }
        
        deptCount[department] = (deptCount[department] || 0) + 1;
      });

      const deptDistribution = Object.entries(deptCount).map(([name, value]) => ({
        name,
        value: value as number
      }));

      setDepartmentDistribution(deptDistribution);

      // Calculate brand distribution (Top 10)
      const brandCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        if (item.brand) {
          brandCount[item.brand] = (brandCount[item.brand] || 0) + 1;
        }
      });

      const brandDistribution = Object.entries(brandCount)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      setBrandDistribution(brandDistribution);

      // Calculate CPU distribution (Top 8)
      const cpuCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        if (item.specs?.cpu) {
          const cpu = item.specs.cpu;
          cpuCount[cpu] = (cpuCount[cpu] || 0) + 1;
        }
      });

      const cpuDistribution = Object.entries(cpuCount)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      setCpuDistribution(cpuDistribution);

      // Calculate RAM distribution
      const ramCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        if (item.specs?.ram) {
          const ram = item.specs.ram;
          ramCount[ram] = (ramCount[ram] || 0) + 1;
        }
      });

      const ramDistribution = Object.entries(ramCount)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value);

      setRamDistribution(ramDistribution);

      // Calculate OS distribution
      const osCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        if (item.specs?.os) {
          const os = item.specs.os;
          osCount[os] = (osCount[os] || 0) + 1;
        }
      });

      const osDistribution = Object.entries(osCount)
        .map(([name, value]) => ({ name, value: value as number }));

      setOsDistribution(osDistribution);

      // Calculate year distribution
      const yearCount: { [key: string]: number } = {};
      equipmentData?.forEach((item: any) => {
        if (item.purchase_date) {
          const year = new Date(item.purchase_date).getFullYear().toString();
          yearCount[year] = (yearCount[year] || 0) + 1;
        }
      });

      const yearDistribution = Object.entries(yearCount)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => parseInt(a.name) - parseInt(b.name));

      setYearDistribution(yearDistribution);

      // Format recent activities
      const activities = activitiesData?.map((item: any) => ({
        id: item.id,
        action: item.action,
        tableName: item.table_name,
        recordId: item.record_id,
        changedBy: item.changed_by || 'ระบบ',
        changedAt: new Date(item.changed_at).toLocaleString('th-TH'),
        description: getActivityDescription(item)
      })) || [];

      setRecentActivities(activities);

      // Calculate additional stats
      const currentYear = new Date().getFullYear();
      const ages = equipmentData
        ?.filter((item: any) => item.purchase_date)
        .map((item: any) => currentYear - new Date(item.purchase_date).getFullYear()) || [];
      
      const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

      setAdditionalStats({
        avgAge,
        warrantyExpiring: expired,
        totalValue: equipmentData?.length * 50000 || 0, // Estimated value
        utilizationRate: Math.round((working / total) * 100) || 0
      });

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

  const getActivityDescription = (activity: any) => {
    const actions = {
      'INSERT': 'เพิ่มข้อมูล',
      'UPDATE': 'แก้ไขข้อมูล',
      'DELETE': 'ลบข้อมูล'
    };
    
    const tables = {
      'equipment': 'ครุภัณฑ์',
      'profiles': 'ผู้ใช้',
      'departments': 'แผนก',
      'equipment_types': 'ประเภทครุภัณฑ์'
    };

    return `${actions[activity.action as keyof typeof actions] || activity.action} ${tables[activity.table_name as keyof typeof tables] || activity.table_name}`;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">แดชบอร์ดระบบครุภัณฑ์</h1>
          <p className="text-sm sm:text-base text-muted-foreground">ภาพรวมการจัดการครุภัณฑ์คอมพิวเตอร์</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-6">
        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              ครุภัณฑ์ทั้งหมด
            </CardTitle>
            <Computer className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              จำนวนครุภัณฑ์ทั้งหมด
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              ใช้งานปกติ
            </CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-success">{stats.working}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? (stats.working / stats.total * 100).toFixed(1) : 0}% ของทั้งหมด
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              ชำรุด
            </CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-destructive">{stats.broken}</div>
            <p className="text-xs text-muted-foreground">
              ต้องซ่อมแซม
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              ซ่อมบำรุง
            </CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-warning">{stats.maintenance}</div>
            <p className="text-xs text-muted-foreground">
              อยู่ระหว่างดำเนินการ
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              ประกันหมดอายุ
            </CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-muted-foreground">{stats.expired}</div>
            <p className="text-xs text-muted-foreground">
              ใน 3 เดือนข้างหน้า
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              อายุเฉลี่ย
            </CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-info" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-info">{additionalStats.avgAge}</div>
            <p className="text-xs text-muted-foreground">ปี</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              อัตราการใช้งาน
            </CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-success">{additionalStats.utilizationRate}%</div>
            <p className="text-xs text-muted-foreground">ของทั้งหมด</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              มูลค่าประมาณ
            </CardTitle>
            <Computer className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-accent">{(additionalStats.totalValue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">บาท</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              หน่วยงาน
            </CardTitle>
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-secondary" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl sm:text-2xl font-bold text-secondary">{departmentDistribution.length}</div>
            <p className="text-xs text-muted-foreground">หน่วยงาน</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Equipment by Type - Pie Chart */}
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              จำนวนครุภัณฑ์ตามประเภท
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Equipment by Department - Pie Chart */}
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              จำนวนครุภัณฑ์ตามแผนก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Equipment by Brand - Bar Chart */}
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              ครุภัณฑ์ตามยี่ห้อ (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={brandDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CPU Distribution - Bar Chart */}
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              CPU ที่ใช้ (Top 8)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cpuDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* RAM Distribution - Pie Chart */}
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary" />
              RAM ที่ใช้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ramDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ramDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* OS Distribution - Pie Chart */}
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Computer className="h-5 w-5 text-primary" />
              ระบบปฏิบัติการ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={osDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {osDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Equipment by Purchase Year - Bar Chart */}
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              ครุภัณฑ์ตามปีที่ซื้อ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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

        {/* Recent Activities */}
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              กิจกรรมล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">ไม่มีกิจกรรมล่าสุด</p>
              ) : (
                recentActivities.map(activity => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <Activity className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        โดย {activity.changedBy} • {activity.changedAt}
                      </p>
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