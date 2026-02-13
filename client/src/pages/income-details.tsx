import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap,
  TrendingUp,
  IndianRupee,
  Layers,
  Crown,
  Gem,
  Award,
  Star,
  Shield,
  ArrowUpCircle,
} from "lucide-react";

interface BoardIncome {
  directSponsor: string;
  levelIncome: string;
  upgradeAccumulated: string;
  total: string;
}

interface IncomeData {
  boards: Record<string, BoardIncome>;
  totals: {
    directSponsor: string;
    levelIncome: string;
    upgradeAccumulated: string;
    grandTotal: string;
  };
}

const boardConfig: Record<string, { label: string; icon: any; color: string; bg: string; nextBoard?: string }> = {
  EV: { label: "EV Board", icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", nextBoard: "Silver" },
  SILVER: { label: "Silver Board", icon: Shield, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-950/30", nextBoard: "Gold" },
  GOLD: { label: "Gold Board", icon: Star, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30", nextBoard: "Platinum" },
  PLATINUM: { label: "Platinum Board", icon: Award, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30", nextBoard: "Diamond" },
  DIAMOND: { label: "Diamond Board", icon: Gem, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", nextBoard: "King" },
  KING: { label: "King Board", icon: Crown, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
};

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `Rs.${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function IncomeDetails() {
  const { data, isLoading } = useQuery<IncomeData>({
    queryKey: ["/api/income-details"],
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-56" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const totals = data?.totals;
  const boards = data?.boards;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-bold">Income Details</h1>
          <p className="text-sm text-muted-foreground">
            View your earnings across all boards
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <Zap className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Direct Sponsor Income (EV Board)</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatCurrency(totals?.directSponsor || "0")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Level Income (All Boards)</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(totals?.levelIncome || "0")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                  <IndianRupee className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Grand Total Income</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(totals?.grandTotal || "0")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Board-wise Income Breakdown
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(boardConfig).map(([key, config]) => {
              const boardData = boards?.[key];
              const Icon = config.icon;
              const isEV = key === "EV";
              const isKing = key === "KING";

              const ds = parseFloat(boardData?.directSponsor || "0");
              const li = parseFloat(boardData?.levelIncome || "0");
              const ua = parseFloat(boardData?.upgradeAccumulated || "0");
              const total = parseFloat(boardData?.total || "0");

              return (
                <Card key={key} className="overflow-hidden">
                  <CardHeader className={`pb-3 ${config.bg}`}>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Icon className={`w-5 h-5 ${config.color}`} />
                      <span className={config.color}>{config.label}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {isEV ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Direct Sponsor Income</span>
                          <span className="font-semibold text-sm">{formatCurrency(ds)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <ArrowUpCircle className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-sm text-muted-foreground">Accumulated for Silver</span>
                          </div>
                          <span className="font-semibold text-sm text-orange-600">{formatCurrency(ua)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between items-center">
                          <span className="text-sm font-medium">Earned Income</span>
                          <span className={`font-bold ${config.color}`}>{formatCurrency(total)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Level Income</span>
                          <span className="font-semibold text-sm">{formatCurrency(li)}</span>
                        </div>
                        {!isKing && config.nextBoard && (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <ArrowUpCircle className="w-3.5 h-3.5 text-orange-500" />
                              <span className="text-sm text-muted-foreground">Accumulated for {config.nextBoard}</span>
                            </div>
                            <span className="font-semibold text-sm text-orange-600">{formatCurrency(ua)}</span>
                          </div>
                        )}
                        <div className="border-t pt-2 flex justify-between items-center">
                          <span className="text-sm font-medium">Total Income</span>
                          <span className={`font-bold ${config.color}`}>{formatCurrency(total)}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
