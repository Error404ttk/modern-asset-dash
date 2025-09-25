import { Bell, Search, User, Monitor, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { ModeToggle } from "@/components/ModeToggle";

export function Navbar() {
  const { settings } = useOrganizationSettings();
  const appTitle = settings?.app_title?.trim() || settings?.name?.trim() || "ระบบครุภัณฑ์";
  const organizationSubtitle = settings?.code?.trim() || settings?.name?.trim() || "หน่วยงานราชการ";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-gradient-header px-4 shadow-soft sm:px-6">
      {/* Left side */}
      <div className="flex flex-1 items-center gap-3 md:flex-none">
        <SidebarTrigger className="text-primary-foreground hover:bg-white/10" />

        <div className="flex flex-1 items-center justify-between gap-3 md:flex-none md:justify-start">
          <div className="flex items-center gap-2 text-primary-foreground">
            <span className="grid flex-none place-items-center rounded-full bg-white/10 p-1.5">
              <Monitor className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{appTitle}</p>
              <p className="hidden text-xs text-primary-foreground/70 sm:block">{organizationSubtitle}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="ml-auto flex h-9 w-9 items-center justify-center text-primary-foreground hover:bg-white/10 md:hidden"
            aria-label="ค้นหา"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="hidden min-w-[280px] items-center gap-2 rounded-lg bg-white/10 px-3 py-2 md:flex">
          <Search className="h-4 w-4 text-primary-foreground/70" />
          <Input
            placeholder="ค้นหาครุภัณฑ์..."
            className="h-auto flex-1 border-0 bg-transparent text-primary-foreground placeholder:text-primary-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-none items-center gap-4">
        <ModeToggle />
        {/* Scan QR */}
        <Link to="/scan" className="hidden sm:block">
          <Button
            variant="outline"
            size="sm"
            className="text-primary-foreground/90 border-white/30 hover:bg-white/10"
          >
            <QrCode className="h-4 w-4 mr-2" /> สแกน QR
          </Button>
        </Link>
        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="relative text-primary-foreground hover:bg-white/10"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-warning text-[10px] font-medium text-white">
            3
          </span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-white text-primary">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 border-border bg-card shadow-medium"
            align="end"
          >
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">ผู้ดูแลระบบ</p>
                <p className="w-[200px] truncate text-sm text-muted-foreground">
                  admin@government.go.th
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer hover:bg-muted">
              <User className="mr-2 h-4 w-4" />
              โปรไฟล์
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-muted">
              <Bell className="mr-2 h-4 w-4" />
              การแจ้งเตือน
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground">
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
