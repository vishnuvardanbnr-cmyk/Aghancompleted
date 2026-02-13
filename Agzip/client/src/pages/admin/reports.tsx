import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Users,
  IndianRupee,
  Calendar,
  BarChart3,
} from "lucide-react";

interface FinancialReport {
  revenueByType: { type: string; total: number }[];
  dailyRevenue: { date: string; total: number; count: number }[];
  dailyRegistrations: { date: string; count: number }[];
}

interface BoardStats {
  type: string;
  total: number;
  active: number;
  completed: number;
}

export default function AdminReports() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: financialReport, isLoading: reportLoading } = useQuery<FinancialReport>({
    queryKey: ["/api/admin/reports/financial", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/reports/financial?startDate=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) throw new Error("Failed to fetch report");
      return res.json();
    },
  });

  const { data: boardStats, isLoading: statsLoading } = useQuery<BoardStats[]>({
    queryKey: ["/api/admin/boards/stats"],
  });

  const totalRevenue = financialReport?.revenueByType.reduce(
    (sum, r) => sum + r.total,
    0
  ) || 0;

  const totalRegistrations = financialReport?.dailyRegistrations.reduce(
    (sum, r) => sum + r.count,
    0
  ) || 0;

  const totalBoardEntries = financialReport?.dailyRevenue.reduce(
    (sum, r) => sum + r.count,
    0
  ) || 0;

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DEPOSIT: "Deposits",
      WITHDRAWAL: "Withdrawals",
      REFERRAL_INCOME: "Referral Income",
      LEVEL_INCOME: "Level Income",
      BOARD_ENTRY: "Board Entries",
      BOARD_COMPLETION: "Board Completions",
      ADMIN_ADJUSTMENT: "Admin Adjustments",
    };
    return labels[type] || type;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Financial Reports</h1>
            <p className="text-muted-foreground">Analytics and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <IndianRupee className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">New Registrations</p>
                  <p className="text-2xl font-bold">{totalRegistrations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <BarChart3 className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Board Entries</p>
                  <p className="text-2xl font-bold">{totalBoardEntries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Type</CardTitle>
            </CardHeader>
            <CardContent>
              {reportLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {financialReport?.revenueByType.map((item) => (
                    <div
                      key={item.type}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="font-medium">{getTypeLabel(item.type)}</span>
                      <span
                        className={`font-bold ${
                          ["WITHDRAWAL", "BOARD_ENTRY"].includes(item.type)
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        ₹{item.total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {(!financialReport?.revenueByType ||
                    financialReport.revenueByType.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      No revenue data for this period
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Board Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {boardStats?.map((board) => (
                    <div
                      key={board.type}
                      className="p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{board.type}</Badge>
                        <span className="font-bold">{board.total} total</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-600">
                          Active: {board.active}
                        </span>
                        <span className="text-blue-600">
                          Completed: {board.completed}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!boardStats || boardStats.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      No board data available
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {reportLoading ? (
              <div className="h-64 bg-muted animate-pulse rounded" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-right p-2">Registrations</th>
                      <th className="text-right p-2">Board Entries</th>
                      <th className="text-right p-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialReport?.dailyRevenue.map((day) => {
                      const registration = financialReport.dailyRegistrations.find(
                        (r) => r.date === day.date
                      );
                      return (
                        <tr key={day.date} className="border-b">
                          <td className="p-2">{day.date}</td>
                          <td className="p-2 text-right">{registration?.count || 0}</td>
                          <td className="p-2 text-right">{day.count}</td>
                          <td className="p-2 text-right font-medium">
                            ₹{day.total.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                    {(!financialReport?.dailyRevenue ||
                      financialReport.dailyRevenue.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No daily data for this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
