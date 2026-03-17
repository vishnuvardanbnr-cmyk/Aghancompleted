import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  User,
  Search,
  IndianRupee,
  TrendingUp,
} from "lucide-react";

interface Transaction {
  id: number;
  userId: number;
  amount: string;
  type: string;
  status: string;
  description: string;
  sourceUserId: number | null;
  sourceUsername: string | null;
  sourceFullName: string | null;
  createdAt: string;
  username: string;
  fullName: string;
}

const transactionTypes = [
  { value: "all", label: "All Types" },
  { value: "DEPOSIT", label: "Deposits" },
  { value: "WITHDRAWAL", label: "Withdrawals" },
  { value: "REFERRAL_INCOME", label: "Referral Income" },
  { value: "LEVEL_INCOME", label: "Level Income" },
  { value: "BOARD_ENTRY", label: "Board Entry" },
  { value: "BOARD_COMPLETION", label: "Board Completion" },
  { value: "ADMIN_ADJUSTMENT", label: "Admin Adjustment" },
];

const typeColors: Record<string, string> = {
  DEPOSIT: "bg-green-500",
  WITHDRAWAL: "bg-red-500",
  REFERRAL_INCOME: "bg-blue-500",
  LEVEL_INCOME: "bg-purple-500",
  BOARD_ENTRY: "bg-orange-500",
  BOARD_COMPLETION: "bg-emerald-500",
  ADMIN_ADJUSTMENT: "bg-gray-500",
};

const isCredit = (type: string) =>
  ["DEPOSIT", "REFERRAL_INCOME", "LEVEL_INCOME", "BOARD_COMPLETION"].includes(type);

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge className={`${typeColors[type] || "bg-gray-500"} text-white text-xs`}>
      {type.replace(/_/g, " ")}
    </Badge>
  );
}

function AllTransactionsTab() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery<{ transactions: Transaction[]; total: number }>({
    queryKey: ["/api/admin/transactions", page, typeFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/transactions?page=${page}&limit=50&type=${typeFilter}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / 50);

  const filtered = data?.transactions.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.fullName || "").toLowerCase().includes(q) ||
      (t.username || "").toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, description..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
            data-testid="input-search-transactions"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48" data-testid="select-transaction-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {transactionTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
            </div>
          ) : filtered && filtered.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((txn) => (
                    <TableRow key={txn.id} data-testid={`row-transaction-${txn.id}`}>
                      <TableCell className="text-muted-foreground text-xs">{txn.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{txn.fullName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">@{txn.username || `user_${txn.userId}`}</p>
                        </div>
                      </TableCell>
                      <TableCell><TypeBadge type={txn.type} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isCredit(txn.type)
                            ? <ArrowDownRight className="w-4 h-4 text-green-500" />
                            : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                          <span className={`font-bold ${isCredit(txn.type) ? "text-green-600" : "text-red-600"}`}>
                            ₹{Number(txn.amount).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={txn.status === "COMPLETED" ? "default" : txn.status === "PENDING" ? "secondary" : "destructive"}>
                          {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-muted-foreground">
                        <span title={txn.description || ""}>{txn.description || "-"}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {txn.createdAt ? new Date(txn.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 flex items-center justify-between border-t">
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {data?.total || 0} total</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} data-testid="button-prev-page">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} data-testid="button-next-page">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground">No transactions found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminIncomeTab() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ transactions: Transaction[]; total: number }>({
    queryKey: ["/api/admin/my-income", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/my-income?page=${page}&limit=50`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / 50);

  // Compute summary totals from current page (server already filters by admin)
  const summary = data?.transactions.reduce(
    (acc, t) => {
      const amt = Number(t.amount);
      if (isCredit(t.type)) acc.totalReceived += amt;
      else acc.totalDeducted += amt;
      return acc;
    },
    { totalReceived: 0, totalDeducted: 0 }
  ) ?? { totalReceived: 0, totalDeducted: 0 };

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Received (this page)</p>
              <p className="text-lg font-bold text-green-600">₹{summary.totalReceived.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Transactions (this page)</p>
              <p className="text-lg font-bold">{data?.transactions.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}
            </div>
          ) : data && data.transactions.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>From User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.map((txn) => (
                    <TableRow key={txn.id} data-testid={`row-admin-income-${txn.id}`}>
                      <TableCell className="text-muted-foreground text-xs">{txn.id}</TableCell>

                      {/* From User column — the person who triggered the income */}
                      <TableCell>
                        {txn.sourceUserId ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm leading-tight">{txn.sourceFullName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">@{txn.sourceUsername || `user_${txn.sourceUserId}`}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Admin Adjustment</span>
                        )}
                      </TableCell>

                      <TableCell><TypeBadge type={txn.type} /></TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ArrowDownRight className="w-4 h-4 text-green-500" />
                          <span className="font-bold text-green-600 text-base">₹{Number(txn.amount).toLocaleString()}</span>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-xs">
                        <p className="text-xs text-muted-foreground leading-relaxed" title={txn.description || ""}>
                          {txn.description || "-"}
                        </p>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {txn.createdAt
                          ? new Date(txn.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-4 flex items-center justify-between border-t">
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {data.total} total income entries</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} data-testid="button-prev-admin-income">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} data-testid="button-next-admin-income">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground">No admin income transactions yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminTransactions() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground text-sm">Full platform transaction log & admin received income</p>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-transactions">All Transactions</TabsTrigger>
            <TabsTrigger value="admin-income" data-testid="tab-admin-income">Admin Income</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <AllTransactionsTab />
          </TabsContent>

          <TabsContent value="admin-income" className="mt-4">
            <AdminIncomeTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
