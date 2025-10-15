import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Home, Plus, LogOut, User, Shield, FolderOpen, BarChart3 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

interface LayoutProps {
  children: ReactNode;
}

function AppSidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .eq("role", "admin")
        .maybeSingle();
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const navItems = [
    { icon: Home, label: "Tableau de bord", path: "/" },
    { icon: BarChart3, label: "Analyse Financière", path: "/analytics" },
    { icon: Plus, label: "Nouveau bon", path: "/new-mission" },
    { icon: FolderOpen, label: "Projets", path: "/projects" },
    { icon: User, label: "Profil", path: "/profile" },
    ...(isAdmin ? [{ icon: Shield, label: "Administration", path: "/admin" }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="none" className="w-64">
      <SidebarHeader>
        <div className="flex items-center gap-3 p-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-xl">Bons de Mission</h1>
            <p className="text-xs text-sidebar-foreground/70">Gestion & Validation</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActive(item.path)} className="h-12 text-base">
                    <NavLink to={item.path}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <SidebarMenu className="space-y-2">
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-sidebar-accent/50">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">{user?.email}</p>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="h-12 text-base">
              <LogOut className="h-5 w-5" />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
