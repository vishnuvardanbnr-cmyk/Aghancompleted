import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Users,
  Wallet,
  ArrowDownToLine,
  TrendingUp,
  Layers,
  IndianRupee,
  AlertCircle,
  BarChart3,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalGST: number;
  companyRevenue: number;
  boardWiseRevenue: Record<string, number>;
  boardCounts: Record<string, number>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Active Users",
      value: stats?.activeUsers || 0,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pending Withdrawals",
      value: stats?.pendingWithdrawals || 0,
      icon: AlertCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      link: "/admin/withdrawals",
    },
    {
      title: "Total Withdrawals",
      value: `₹${(stats?.totalWithdrawals || 0).toLocaleString()}`,
      icon: ArrowDownToLine,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "GST Collected",
      value: `₹${(stats?.totalGST || 0).toLocaleString()}`,
      icon: IndianRupee,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  const boardTypes = ["EV", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "KING"];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform overview and management</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statCards.map((stat, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  {stat.link ? (
                    <Link href={stat.link}>
                      <CardContent className="p-6 cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  ) : (
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.title}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Board Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {boardTypes.map((type) => (
                    <div
                      key={type}
                      className="p-4 rounded-lg bg-muted/50 text-center"
                    >
                      <p className="text-sm font-medium text-muted-foreground">{type}</p>
                      <p className="text-2xl font-bold mt-1">
                        {stats?.boardCounts?.[type] || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">members</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Company Revenue (Board-wise)
                  <span className="ml-auto text-lg font-bold text-emerald-600">
                    Total: ₹{(stats?.companyRevenue || 0).toLocaleString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {boardTypes.map((type) => (
                    <div
                      key={type}
                      className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center"
                    >
                      <p className="text-sm font-medium text-muted-foreground">{type}</p>
                      <p className="text-xl font-bold mt-1 text-emerald-600">
                        ₹{(stats?.boardWiseRevenue?.[type] || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stats?.boardCounts?.[type] || 0} entries
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/users">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">User Management</p>
                      <p className="text-sm text-muted-foreground">View and manage users</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/withdrawals">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-orange-500/10">
                      <ArrowDownToLine className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium">Withdrawals</p>
                      <p className="text-sm text-muted-foreground">Approve or reject requests</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/transactions">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <Wallet className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Transactions</p>
                      <p className="text-sm text-muted-foreground">View all transactions</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/reports">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <BarChart3 className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">Reports</p>
                      <p className="text-sm text-muted-foreground">Financial analytics</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
