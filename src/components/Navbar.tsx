import { Bell, Search, User } from "lucide-react";
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

export function Navbar() {
  return (
    <header className="h-16 bg-gradient-header border-b border-border shadow-soft flex items-center justify-between px-4">
      {/* Left side */}
      <div className="flex items-center space-x-4">
        <SidebarTrigger className="text-primary-foreground hover:bg-white/10" />
        
        <div className="hidden md:flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2 min-w-[300px]">
          <Search className="h-4 w-4 text-primary-foreground/70" />
          <Input 
            placeholder="ค้นหาครุภัณฑ์..." 
            className="border-0 bg-transparent placeholder:text-primary-foreground/70 text-primary-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative text-primary-foreground hover:bg-white/10"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-warning rounded-full text-xs flex items-center justify-center text-white">
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
            className="w-56 bg-card border-border shadow-medium" 
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
            <DropdownMenuItem className="hover:bg-muted cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              โปรไฟล์
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-muted cursor-pointer">
              <Bell className="mr-2 h-4 w-4" />
              การแจ้งเตือน
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="hover:bg-destructive hover:text-destructive-foreground cursor-pointer">
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}