import { useState } from "react";
import { Home, Computer, Plus, FileText, ArrowLeftRight, History, Users, Settings, Monitor, QrCode, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar, SidebarFooter } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
const menuItems = [{
  title: "แดชบอร์ด",
  url: "/",
  icon: Home
}, {
  title: "รายการครุภัณฑ์",
  url: "/equipment",
  icon: Computer
}, {
  title: "เพิ่มครุภัณฑ์",
  url: "/equipment/add",
  icon: Plus
}, {
  title: "รายงาน",
  url: "/reports",
  icon: FileText
}, {
  title: "การยืม-คืน",
  url: "/borrow-return",
  icon: ArrowLeftRight
}, {
  title: "ประวัติการแก้ไข",
  url: "/history",
  icon: History
}, {
  title: "จัดการผู้ใช้งาน",
  url: "/users",
  icon: Users
}, {
  title: "ตั้งค่าระบบ",
  url: "/settings",
  icon: Settings
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? "bg-primary text-primary-foreground font-medium shadow-soft" : "hover:bg-muted/70 text-muted-foreground hover:text-foreground";
  const isCollapsed = state === "collapsed";
  return <Sidebar className={isCollapsed ? "w-14 border-r border-border" : "w-64 border-r border-border bg-card"} collapsible="icon">
      <SidebarContent className="bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border">
          {!isCollapsed && <div className="flex items-center space-x-2">
              <Monitor className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-lg font-bold text-primary">ระบบครุภัณฑ์</h2>
                <p className="text-xs text-muted-foreground">หน่วยงานราชการ</p>
              </div>
            </div>}
          {isCollapsed && <Monitor className="h-8 w-8 text-primary mx-auto" />}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            เมนูหลัก
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className={getNavCls}>
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span className="text-slate-900">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* QR Scanner Section */}
        {!isCollapsed && <div className="p-4 mt-auto">
            <div className="bg-gradient-card p-4 rounded-lg border border-border">
              <div className="flex items-center space-x-2 text-primary">
                <QrCode className="h-5 w-5" />
                <span className="text-sm font-medium">สแกน QR Code</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                สแกนเพื่อดูข้อมูลครุภัณฑ์
              </p>
            </div>
            </div>}
        <SidebarFooter>
          <div className="p-4 space-y-2">
            {profile && (
              <div className="text-sm">
                <div className="font-medium">{profile.full_name}</div>
                <div className="text-muted-foreground text-xs">{profile.email}</div>
                <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded mt-1 inline-block">
                  {profile.role === 'super_admin' ? 'ผู้ดูแลระบบสูงสุด' : 
                   profile.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้'}
                </div>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              ออกจากระบบ
            </Button>
          </div>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>;
}