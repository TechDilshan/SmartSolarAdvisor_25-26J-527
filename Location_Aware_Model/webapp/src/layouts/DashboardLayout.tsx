import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, BarChart3, Settings, LogOut, Sun, Users, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const customerLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const adminLinks = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/sites", label: "Sites", icon: Activity },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const links = user?.role === "admin" ? adminLinks : customerLinks;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="w-64 gradient-solar flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="gradient-gold rounded-lg p-2">
            <Sun className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">SolarIQ</h1>
            <p className="text-xs text-primary-foreground/60">Analytics Platform</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full gradient-gold flex items-center justify-center text-sm font-bold text-primary">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full mt-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-foreground">
            {user?.role === "admin" ? "Admin Dashboard" : "Customer Dashboard"}
          </h2>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};
