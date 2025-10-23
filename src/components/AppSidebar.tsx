import { Home, Computer, Plus, ArrowLeftRight, History, Users, Settings, Monitor, QrCode, LogOut, Printer, Droplet } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarFooter } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
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
  title: "สแกน QR",
  url: "/scan",
  icon: QrCode
}, {
  title: "พิมพ์สติ๊กเกอร์",
  url: "/sticker-print",
  icon: Printer
}, {
  title: "Stock ink/toner",
  url: "/stock-ink-toner",
  icon: Droplet
}, {
  title: "เพิ่มครุภัณฑ์",
  url: "/equipment/add",
  icon: Plus
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
    state,
    isMobile,
    setOpenMobile
  } = useSidebar();
  const { profile, signOut } = useAuth();
  const { settings } = useOrganizationSettings();
  const appTitle = settings?.app_title?.trim() || settings?.name?.trim() || "ระบบครุภัณฑ์";
  const organizationSubtitle = settings?.code?.trim() || settings?.name?.trim() || "หน่วยงานราชการ";
  const location = useLocation();
  const currentPath = location.pathname;
  const isPathActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => {
    const base = isActive ? "bg-primary text-primary-foreground font-medium shadow-soft" : "hover:bg-muted/70 text-muted-foreground hover:text-foreground";
    const collapsedCls = isCollapsed
      ? "justify-center px-3"
      : "justify-start gap-3";

    return `${base} ${collapsedCls} group`;
  };
  const isCollapsed = state === "collapsed";
  return <Sidebar className={isCollapsed ? "w-16 border-r border-border" : "w-64 border-r border-border bg-card"} collapsible="icon">
      <SidebarContent className="bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Monitor className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-lg font-bold text-primary">{appTitle}</h2>
                <p className="text-xs text-muted-foreground">{organizationSubtitle}</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center" aria-label={appTitle}>
              <Monitor className="h-9 w-9 text-primary" aria-hidden="true" />
              <span className="sr-only">{appTitle}</span>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            เมนูหลัก
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => {
                const active = isPathActive(item.url);
                const iconCollapsedCls = isCollapsed
                  ? `${active ? "text-primary" : "text-muted-foreground"} group-hover:text-primary`
                  : "";
                return <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={getNavCls}
                      onClick={() => {
                        if (isMobile) {
                          setOpenMobile(false);
                        }
                      }}
                    >
                      <item.icon className={`h-5 w-5 transition-colors ${iconCollapsedCls}`} />
                      {!isCollapsed && <span className="text-slate-900">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>;
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* QR Scanner Section (clickable) */}
        {!isCollapsed && (
          <div className="p-4 mt-auto">
            <NavLink to="/scan">
              {({ isActive }) => (
                <div className={`bg-gradient-card p-4 rounded-lg border border-border transition hover:bg-muted/60 cursor-pointer ${isActive ? "ring-2 ring-primary" : ""}`}>
                  <div className="flex items-center space-x-2 text-primary">
                    <QrCode className="h-5 w-5" />
                    <span className="text-sm font-medium">สแกน QR Code</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    สแกนเพื่อดูข้อมูลครุภัณฑ์
                  </p>
                </div>
              )}
            </NavLink>
          </div>
        )}
        <SidebarFooter>
          <div className={isCollapsed ? "flex flex-col items-center gap-2 p-2" : "p-4 space-y-2"}>
            {profile && !isCollapsed && (
              <div className="text-sm">
                <div className="font-medium">{profile.full_name}</div>
                <div className="text-muted-foreground text-xs">{profile.email}</div>
                <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded mt-1 inline-block">
                  {profile.role === "super_admin"
                    ? "ผู้ดูแลระบบสูงสุด"
                    : profile.role === "admin"
                      ? "ผู้ดูแลระบบ"
                      : "ผู้ใช้"}
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size={isCollapsed ? "icon" : "sm"}
              onClick={signOut}
              className={isCollapsed ? "" : "w-full"}
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
            >
              <LogOut className={`h-4 w-4 ${isCollapsed ? "" : "mr-2"}`} />
              {!isCollapsed && "ออกจากระบบ"}
            </Button>
          </div>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>;
}
