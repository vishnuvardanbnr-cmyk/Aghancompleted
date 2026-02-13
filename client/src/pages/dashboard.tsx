import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet,
  Users,
  Layers,
  TrendingUp,
  Zap,
  ArrowRight,
  Copy,
  CheckCircle,
  AlertTriangle,
  Car,
  ShieldCheck,
  ArrowUpCircle,
  Banknote,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DashboardData {
  wallet: {
    mainBalance: string;
    upgradeBalance: string;
    rebirthBalance: string;
    totalEarnings: string;
  };
  activeBoards: any[];
  referralCount: number;
  level1Placements: number;
  progress: number;
  totalTeamSize: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = "primary",
}: {
  title: string;
  value: string;
  icon: any;
  description?: string;
  trend?: string;
  color?: "primary" | "accent" | "chart-3";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    "chart-3": "bg-chart-3/10 text-chart-3",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && (
              <div className="flex items-center gap-1 text-xs text-primary">
                <TrendingUp className="w-3 h-3" />
                <span>{trend}</span>
              </div>
            )}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BoardProgress({ name, progress, status }: { name: string; progress: number; status: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{name}</span>
        <Badge variant={status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
          {status}
        </Badge>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-muted-foreground">{progress}% complete</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: evRewards } = useQuery<any[]>({
    queryKey: ["/api/ev-rewards"],
  });

  const evRewardStatus = evRewards && evRewards.length > 0 ? evRewards[0].status : null;

  const joinBoardMutation = useMutation({
    mutationFn: async (boardType: string) => {
      const res = await apiRequest("POST", "/api/boards/join", { type: boardType });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Successfully joined EV Board!" });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/boards"] });
      setShowJoinConfirm(false);
      setLocation("/boards");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to join board", 
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setShowJoinConfirm(false);
    }
  });

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(`AP${user.referralCode}`);
      setCopied(true);
      toast({ title: "Referral code copied!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const mainBalance = data?.wallet?.mainBalance || "0";
  const upgradeBalance = data?.wallet?.upgradeBalance || "0";
  const rebirthBalance = data?.wallet?.rebirthBalance || "0";
  const totalEarnings = data?.wallet?.totalEarnings || "0";

  return (
    <Layout>
      <div className="space-y-4">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold" data-testid="text-welcome">
              Welcome back, {user?.fullName?.split(" ")[0]}!
            </h1>
            <p className="text-sm text-muted-foreground">Here's your earnings overview</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground">Your Code:</span>
            <span className="font-mono text-sm font-bold text-primary" data-testid="text-referral-code">
              AP{user?.referralCode}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={copyReferralCode}
              data-testid="button-copy-referral"
            >
              {copied ? (
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Main Wallet"
            value={`Rs.${parseFloat(mainBalance).toLocaleString()}`}
            icon={Wallet}
            description="Available for withdrawal"
            color="primary"
          />
          <StatCard
            title="Upgrade Wallet"
            value={`Rs.${parseFloat(upgradeBalance).toLocaleString()}`}
            icon={ArrowUpCircle}
            description="For next board entry"
            color="chart-3"
          />
          <StatCard
            title="Rebirth Wallet"
            value={`Rs.${parseFloat(rebirthBalance).toLocaleString()}`}
            icon={Zap}
            description="For board auto-entry"
            color="accent"
          />
          <StatCard
            title="Total Earnings"
            value={`Rs.${parseFloat(totalEarnings).toLocaleString()}`}
            icon={TrendingUp}
            description="Lifetime earnings"
            color="chart-3"
          />
          <StatCard
            title="Direct Referrals"
            value={data?.referralCount?.toString() || "0"}
            icon={Users}
            description="Your direct referrals"
            color="primary"
          />
          <StatCard
            title="Total Withdrawal"
            value={`Rs.${parseFloat(data?.totalWithdrawn?.toString() || "0").toLocaleString()}`}
            icon={Banknote}
            description="Withdrawn amount"
            color="accent"
          />
        </div>

        {/* Income Details Link */}
        <div className="mt-4" />
        <Link href="/income-details">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Income Details</p>
                  <p className="text-xs text-muted-foreground">View your earnings across all boards</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        {/* Active Boards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 px-4">
            <div>
              <CardTitle className="text-base">Active Boards</CardTitle>
              <CardDescription className="text-xs">Your progress across boards</CardDescription>
            </div>
            <Link href="/boards">
              <Button variant="ghost" size="sm" data-testid="link-view-boards">
                View <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            {data?.activeBoards && data.activeBoards.length > 0 ? (
              data.activeBoards.map((board: any, index: number) => {
                return (
                  <BoardProgress
                    key={index}
                    name={`${board?.type || "EV"} Board`}
                    progress={board?.progress || 0}
                    status={board?.status || "ACTIVE"}
                  />
                );
              })
            ) : (
              <div className="text-center py-6">
                <Layers className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">You haven't joined any board yet</p>
                <Button 
                  size="sm" 
                  data-testid="button-join-first-board"
                  onClick={() => setShowJoinConfirm(true)}
                >
                  Join EV Board - Rs.5900
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* EV Reward Banner */}
        {evRewardStatus ? (
          <Card className={`border-primary/20 ${evRewardStatus === "DELIVERED" ? "bg-gradient-to-r from-green-500/10 to-green-600/10" : evRewardStatus === "PROCESSING" ? "bg-gradient-to-r from-blue-500/10 to-blue-600/10" : "bg-gradient-to-r from-amber-500/10 to-amber-600/10"}`}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Car className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">
                      {evRewardStatus === "DELIVERED" ? "EV Vehicle Delivered!" : evRewardStatus === "PROCESSING" ? "EV Vehicle Being Processed" : "EV Vehicle Reward Earned!"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {evRewardStatus === "DELIVERED" ? "Congratulations! Your EV vehicle worth Rs.1,00,000 has been delivered." : evRewardStatus === "PROCESSING" ? "Your EV vehicle delivery is being processed." : "You've completed the EV Board! Your free EV vehicle worth Rs.1,00,000 is pending delivery."}
                    </p>
                  </div>
                </div>
                <Badge variant={evRewardStatus === "DELIVERED" ? "default" : "secondary"} className="text-xs">
                  {evRewardStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-chart-3/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Earn Free EV Worth Rs.1,00,000</h3>
                    <p className="text-xs text-muted-foreground">
                      Complete the EV Board by referring 6 direct members
                    </p>
                  </div>
                </div>
                <Link href="/boards">
                  <Button size="sm" data-testid="button-learn-more">Learn More</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/wallet">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-medium">My Wallet</p>
                  <p className="text-[10px] text-muted-foreground">Transactions & invoices</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/profile">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-medium">Profile & KYC</p>
                  <p className="text-[10px] text-muted-foreground">Account & verification</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Join Board Confirmation Dialog */}
      <Dialog open={showJoinConfirm} onOpenChange={setShowJoinConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Board Joining
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to join the EV Board? Rs.5,900 will be deducted from your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entry Fee</span>
                <span className="font-medium">Rs.5,900</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Balance</span>
                <span className="font-medium">Rs.{parseFloat(data?.wallet?.mainBalance || "0").toLocaleString()}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowJoinConfirm(false)}
              data-testid="button-cancel-join"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => joinBoardMutation.mutate("EV")}
              disabled={joinBoardMutation.isPending}
              data-testid="button-confirm-join"
            >
              {joinBoardMutation.isPending ? "Joining..." : "Confirm & Join"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
