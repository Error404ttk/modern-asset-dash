import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Computer, AlertTriangle, CheckCircle, Clock, TrendingUp, Monitor, Printer, Server } from "lucide-react";
export default function Dashboard() {
  // Mock data
  const stats = {
    total: 245,
    working: 198,
    broken: 12,
    maintenance: 8,
    expired: 27
  };
  const recentEquipment = [{
    id: "EQ001",
    name: "Dell OptiPlex 7090",
    type: "Desktop",
    status: "working",
    location: "ห้อง IT-101"
  }, {
    id: "EQ002",
    name: "HP LaserJet Pro",
    type: "Printer",
    status: "maintenance",
    location: "ห้องธุรการ"
  }, {
    id: "EQ003",
    name: "Lenovo ThinkPad",
    type: "Laptop",
    status: "broken",
    location: "ห้องผู้อำนวยการ"
  }, {
    id: "EQ004",
    name: "ASUS Monitor",
    type: "Monitor",
    status: "working",
    location: "ห้องประชุม"
  }];
  const getStatusBadge = (status: string) => {
    const variants = {
      working: {
        variant: "default" as const,
        color: "bg-success text-success-foreground",
        label: "ใช้งานปกติ"
      },
      broken: {
        variant: "destructive" as const,
        color: "bg-destructive text-destructive-foreground",
        label: "ชำรุด"
      },
      maintenance: {
        variant: "secondary" as const,
        color: "bg-warning text-warning-foreground",
        label: "ซ่อมบำรุง"
      }
    };
    const config = variants[status as keyof typeof variants];
    return <Badge className={config.color}>{config.label}</Badge>;
  };
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
              {recentEquipment.map(item => <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {item.type === "Desktop" && <Computer className="h-4 w-4 text-primary" />}
                      {item.type === "Printer" && <Printer className="h-4 w-4 text-primary" />}
                      {item.type === "Laptop" && <Computer className="h-4 w-4 text-primary" />}
                      {item.type === "Monitor" && <Monitor className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.id} • {item.location}</p>
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>)}
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
              {[{
              type: "คอมพิวเตอร์ตั้งโต๊ะ",
              count: 89,
              icon: Computer,
              color: "bg-primary"
            }, {
              type: "แล็ปท็อป",
              count: 45,
              icon: Computer,
              color: "bg-accent"
            }, {
              type: "จอภาพ",
              count: 67,
              icon: Monitor,
              color: "bg-warning"
            }, {
              type: "เครื่องพิมพ์",
              count: 23,
              icon: Printer,
              color: "bg-secondary"
            }, {
              type: "เซิร์ฟเวอร์",
              count: 21,
              icon: Server,
              color: "bg-muted-foreground"
            }].map(item => <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 ${item.color}/10 rounded-lg`}>
                      <item.icon className={`h-4 w-4 ${item.color === 'bg-muted-foreground' ? 'text-muted-foreground' : item.color.replace('bg-', 'text-')}`} />
                    </div>
                    <span className="text-sm font-medium">{item.type}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">{item.count}</span>
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div className={`${item.color} h-2 rounded-full`} style={{
                    width: `${item.count / 89 * 100}%`
                  }} />
                    </div>
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}