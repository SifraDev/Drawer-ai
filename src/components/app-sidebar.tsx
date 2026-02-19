import { LayoutDashboard, FileText, MessageSquare, Calendar, Zap, LogOut, User } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import drawerIcon from "@assets/Icon_1771174192260.jpg";
import { useUnread } from "@/lib/unread-context";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Files",
    url: "/files",
    icon: FileText,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { unreadCount, increment } = useUnread();
  const { setOpenMobile } = useSidebar();
  const userName = localStorage.getItem("userName") || "User";

  const ghostMutation = useMutation({
    mutationFn: async () => {
      const name = localStorage.getItem("userName") || "User";
      const res = await fetch(`/api/chat/ghost?name=${encodeURIComponent(name)}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to simulate event");
      return res.json();
    },
    onSuccess: () => {
      increment();
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    setLocation("/");
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" data-testid="link-logo">
          <div className="flex items-center gap-2">
            <img src={drawerIcon} alt="Drawer" className="h-9 w-9 rounded-md object-cover" />
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight">Drawer</span>
              <span className="text-xs text-muted-foreground">Your Personal Data Warehouse.</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} onClick={() => setOpenMobile(false)} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {item.title === "Chat" && unreadCount > 0 && (
                          <span
                            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none px-1"
                            data-testid="badge-unread-chat"
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => ghostMutation.mutate()}
            disabled={ghostMutation.isPending}
            data-testid="button-simulate-ai"
          >
            <Zap className="h-3.5 w-3.5" />
          </Button>
          <p className="text-xs text-muted-foreground">
            AI-Powered Document Intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium flex-1 truncate" data-testid="text-user-name">
            {userName}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
