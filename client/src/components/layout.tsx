import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Layers,
  Wallet,
  Users,
  User,
  LogOut,
  Menu,
  Sun,
  Moon,
  Zap,
  Shield,
  ArrowDownToLine,
  BarChart3,
  ScrollText,
  ShieldCheck,
  Car,
  Mail,
  GitBranch,
  IndianRupee,
  UserCheck,
  ArrowLeftCircle,
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/boards", label: "Boards", icon: Layers },
  { path: "/wallet", label: "Wallet", icon: Wallet },
  { path: "/income-details", label: "Income Details", icon: IndianRupee },
  { path: "/team", label: "Team", icon: Users },
  { path: "/register-member", label: "Register", icon: UserCheck },
  { path: "/profile", label: "Profile", icon: User },
];

const adminNavItems = [
  { path: "/admin", label: "Admin Dashboard", icon: Shield },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
  { path: "/admin/transactions", label: "Transactions", icon: ScrollText },
  { path: "/admin/kyc", label: "KYC Verify", icon: ShieldCheck },
  { path: "/admin/ev-rewards", label: "EV Rewards", icon: Car },
  { path: "/admin/reports", label: "Reports", icon: BarChart3 },
  { path: "/admin/genealogy", label: "Genealogy", icon: GitBranch },
  { path: "/admin/smtp", label: "Email Settings", icon: Mail },
];

function NavLink({ path, label, icon: Icon, isActive }: { path: string; label: string; icon: any; isActive: boolean }) {
  return (
    <Link href={path}>
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${
          isActive
            ? "bg-primary text-primary-foreground glow-primary"
            : "hover-elevate text-muted-foreground hover:text-foreground"
        }`}
        data-testid={`nav-${label.toLowerCase()}`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
      </div>
    </Link>
  );
}

function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = (user as any)?.isAdmin;

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <Link href={isAdmin ? "/admin" : "/dashboard"}>
          <div className="flex items-center gap-3 cursor-pointer" data-testid="logo">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAdmin ? "bg-orange-500" : "bg-primary"} glow-primary`}>
              {isAdmin ? <Shield className="w-6 h-6 text-white" /> : <Zap className="w-6 h-6 text-primary-foreground" />}
            </div>
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">Aghan</h1>
              <p className="text-xs text-muted-foreground">{isAdmin ? "Admin Panel" : "Promoters"}</p>
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {isAdmin ? (
          <>
            {adminNavItems.map((item) => (
              <NavLink
                key={item.path}
                path={item.path}
                label={item.label}
                icon={item.icon}
                isActive={location === item.path}
              />
            ))}
            <div className="pt-4 mt-4 border-t border-sidebar-border">
              <p className="text-xs text-muted-foreground px-4 mb-2">User View</p>
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  path={item.path}
                  label={item.label}
                  icon={item.icon}
                  isActive={location === item.path}
                />
              ))}
            </div>
          </>
        ) : (
          navItems.map((item) => (
            <NavLink
              key={item.path}
              path={item.path}
              label={item.label}
              icon={item.icon}
              isActive={location === item.path}
            />
          ))
        )}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );
}

function MobileFooter() {
  const [location] = useLocation();
  const { user } = useAuth();
  const mobileItems = navItems.filter(item => item.path !== "/income-details" && item.path !== "/register-member");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-14">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex flex-col items-center justify-center px-3 py-1 cursor-pointer ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid={`footer-nav-${item.label.toLowerCase()}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ImpersonationBanner() {
  const { user, exitImpersonation } = useAuth();
  if (!user?.isImpersonating) return null;

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 bg-amber-500 dark:bg-amber-600 px-4 py-2 text-white shadow-md">
      <div className="flex items-center gap-2 text-sm font-medium">
        <UserCheck className="w-4 h-4 shrink-0" />
        <span>
          Viewing as <strong>{user.fullName}</strong> (@{user.username})
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 gap-1.5 bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs font-semibold"
        onClick={exitImpersonation}
        data-testid="button-exit-user-view"
      >
        <ArrowLeftCircle className="w-3.5 h-3.5" />
        Exit User View
      </Button>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location]);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <ImpersonationBanner />
        <header className="sticky top-0 z-50 h-12 border-b border-border bg-background/80 backdrop-blur-sm px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Aghan</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">{children}</main>
      </div>
      <MobileFooter />
    </div>
  );
}
