import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Transaction {
  id: number;
  userId: number;
  amount: string;
  type: string;
  status: string;
  description: string;
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

export default function AdminTransactions() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ transactions: Transaction[]; total: number }>({
    queryKey: ["/api/admin/transactions", page, typeFilter],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/transactions?page=${page}&limit=50&type=${typeFilter}`
      );
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / 50);

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      DEPOSIT: "bg-green-500",
      WITHDRAWAL: "bg-red-500",
      REFERRAL_INCOME: "bg-blue-500",
      LEVEL_INCOME: "bg-purple-500",
      BOARD_ENTRY: "bg-orange-500",
      BOARD_COMPLETION: "bg-emerald-500",
      ADMIN_ADJUSTMENT: "bg-gray-500",
    };
    return (
      <Badge className={colors[type] || "bg-gray-500"}>
        {type.replace(/_/g, " ")}
      </Badge>
    );
  };

  const isCredit = (type: string) => {
    return ["DEPOSIT", "REFERRAL_INCOME", "LEVEL_INCOME", "BOARD_COMPLETION"].includes(type);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Transaction History</h1>
            <p className="text-muted-foreground">
              {data?.total || 0} total transactions
            </p>
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {transactionTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : data && data.transactions.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>{txn.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{txn.fullName || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">
                              @{txn.username || `user_${txn.userId}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(txn.type)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isCredit(txn.type) ? (
                              <ArrowDownRight className="w-4 h-4 text-green-500" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-red-500" />
                            )}
                            <span
                              className={`font-bold ${
                                isCredit(txn.type) ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              ₹{Number(txn.amount).toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              txn.status === "COMPLETED"
                                ? "default"
                                : txn.status === "PENDING"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {txn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={txn.description || ""}>
                          {txn.description || "-"}
                        </TableCell>
                        <TableCell>
                          {txn.createdAt
                            ? new Date(txn.createdAt).toLocaleString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="p-4 flex items-center justify-between border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                No transactions found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
