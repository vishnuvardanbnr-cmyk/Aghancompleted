import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Check, X, Eye, Clock, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Withdrawal {
  id: number;
  userId: number;
  amount: string;
  status: string;
  bankDetails: string;
  requestedAt: string;
  processedAt: string | null;
  adminNote: string | null;
  username: string;
  fullName: string;
}

export default function AdminWithdrawals() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: withdrawals, isLoading } = useQuery<Withdrawal[]>({
    queryKey: ["/api/admin/withdrawals", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/withdrawals?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to fetch withdrawals");
      return res.json();
    },
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: number; status: string; adminNote: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/withdrawals/${id}`, {
        status,
        adminNote,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Withdrawal updated successfully" });
      setSelectedWithdrawal(null);
      setAdminNote("");
      setActionType(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
    },
    onError: () => {
      toast({ title: "Failed to update withdrawal", variant: "destructive" });
    },
  });

  const handleAction = (withdrawal: Withdrawal, action: "approve" | "reject") => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setAdminNote("");
  };

  const confirmAction = () => {
    if (selectedWithdrawal && actionType) {
      updateWithdrawalMutation.mutate({
        id: selectedWithdrawal.id,
        status: actionType === "approve" ? "COMPLETED" : "REJECTED",
        adminNote,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "COMPLETED":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "REJECTED":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = withdrawals?.filter((w) => w.status === "PENDING").length || 0;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Withdrawal Management</h1>
            <p className="text-muted-foreground">
              {pendingCount > 0 && (
                <span className="text-orange-500 font-medium">{pendingCount} pending requests</span>
              )}
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : withdrawals && withdrawals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Details</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>{withdrawal.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.fullName}</p>
                          <p className="text-sm text-muted-foreground">@{withdrawal.username}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-lg">
                        ₹{Number(withdrawal.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell className="max-w-xs truncate" title={withdrawal.bankDetails || ""}>
                        {withdrawal.bankDetails || "-"}
                      </TableCell>
                      <TableCell>
                        {withdrawal.requestedAt
                          ? new Date(withdrawal.requestedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {withdrawal.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() => handleAction(withdrawal, "approve")}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(withdrawal, "reject")}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setActionType(null);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                No withdrawals found
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedWithdrawal} onOpenChange={() => {
          setSelectedWithdrawal(null);
          setActionType(null);
          setAdminNote("");
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve"
                  ? "Approve Withdrawal"
                  : actionType === "reject"
                  ? "Reject Withdrawal"
                  : "Withdrawal Details"}
              </DialogTitle>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">{selectedWithdrawal.fullName}</p>
                    <p className="text-sm text-muted-foreground">@{selectedWithdrawal.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{Number(selectedWithdrawal.amount).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payment Details</p>
                  <p className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                    {selectedWithdrawal.bankDetails || "No payment details provided"}
                  </p>
                </div>

                {selectedWithdrawal.adminNote && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Admin Note</p>
                    <p className="p-3 bg-muted rounded-lg text-sm">
                      {selectedWithdrawal.adminNote}
                    </p>
                  </div>
                )}

                {actionType && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Admin Note {actionType === "reject" ? "(required)" : "(optional)"}
                    </p>
                    <Textarea
                      placeholder={
                        actionType === "approve"
                          ? "Transaction reference, payment method, etc."
                          : "Reason for rejection..."
                      }
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {actionType ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedWithdrawal(null);
                      setActionType(null);
                      setAdminNote("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={actionType === "approve" ? "default" : "destructive"}
                    onClick={confirmAction}
                    disabled={
                      updateWithdrawalMutation.isPending ||
                      (actionType === "reject" && !adminNote)
                    }
                  >
                    {updateWithdrawalMutation.isPending
                      ? "Processing..."
                      : actionType === "approve"
                      ? "Approve"
                      : "Reject"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setSelectedWithdrawal(null)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
