import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";

import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Boards from "@/pages/boards";
import Wallet from "@/pages/wallet";
import Team from "@/pages/team";
import Profile from "@/pages/profile";
import InvoicesPage from "@/pages/invoices";
import KycPage from "@/pages/kyc";
import IncomeDetails from "@/pages/income-details";
import RegisterMember from "@/pages/register-member";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin/index";
import AdminUsers from "@/pages/admin/users";
import AdminWithdrawals from "@/pages/admin/withdrawals";
import AdminTransactions from "@/pages/admin/transactions";
import AdminReports from "@/pages/admin/reports";
import AdminKyc from "@/pages/admin/kyc";
import AdminEvRewards from "@/pages/admin/ev-rewards";
import AdminSmtp from "@/pages/admin/smtp";
import AdminGenealogy from "@/pages/admin/genealogy";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <Component />;
}

function AdminRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    } else if (!isLoading && user && !(user as any).isAdmin) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  if (!(user as any).isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return <Component />;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={() => <PublicRoute component={AuthPage} />} />
        <Route path="/auth" component={() => <PublicRoute component={AuthPage} />} />
        <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/boards" component={() => <ProtectedRoute component={Boards} />} />
        <Route path="/wallet" component={() => <ProtectedRoute component={Wallet} />} />
        <Route path="/team" component={() => <ProtectedRoute component={Team} />} />
        <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
        <Route path="/invoices" component={() => <ProtectedRoute component={InvoicesPage} />} />
        <Route path="/kyc" component={() => <ProtectedRoute component={KycPage} />} />
        <Route path="/income-details" component={() => <ProtectedRoute component={IncomeDetails} />} />
        <Route path="/register-member" component={() => <ProtectedRoute component={RegisterMember} />} />
        <Route path="/admin" component={() => <AdminRoute component={AdminDashboard} />} />
        <Route path="/admin/users" component={() => <AdminRoute component={AdminUsers} />} />
        <Route path="/admin/withdrawals" component={() => <AdminRoute component={AdminWithdrawals} />} />
        <Route path="/admin/transactions" component={() => <AdminRoute component={AdminTransactions} />} />
        <Route path="/admin/reports" component={() => <AdminRoute component={AdminReports} />} />
        <Route path="/admin/kyc" component={() => <AdminRoute component={AdminKyc} />} />
        <Route path="/admin/ev-rewards" component={() => <AdminRoute component={AdminEvRewards} />} />
        <Route path="/admin/smtp" component={() => <AdminRoute component={AdminSmtp} />} />
        <Route path="/admin/genealogy" component={() => <AdminRoute component={AdminGenealogy} />} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
