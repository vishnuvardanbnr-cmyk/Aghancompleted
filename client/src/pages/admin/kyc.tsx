import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, CheckCircle, XCircle, Eye } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface KycItem {
  id: number;
  userId: number;
  fullName: string;
  aadhaarNumber: string | null;
  panNumber: string | null;
  status: string;
  submittedAt: string;
  verifiedAt: string | null;
}

interface KycDetail {
  id: number;
  userId: number;
  aadhaarNumber: string | null;
  panNumber: string | null;
  fullName: string;
  dateOfBirth: string | null;
  address: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  gpayPhonePeNumber: string | null;
  upiId: string | null;
  status: string;
  adminNote: string | null;
  submittedAt: string;
  verifiedAt: string | null;
}

export default function AdminKyc() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [selectedKyc, setSelectedKyc] = useState<KycDetail | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [actionType, setActionType] = useState<"VERIFIED" | "REJECTED" | null>(null);

  const { data, isLoading } = useQuery<{ kycs: KycItem[]; total: number }>({
    queryKey: ["/api/admin/kyc", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/kyc?status=${statusFilter}&limit=50`);
      return res.json();
    },
  });

  const viewKycMutation = useMutation({
    mutationFn: async (kycId: number) => {
      const res = await fetch(`/api/admin/kyc/${kycId}`);
      return res.json();
    },
    onSuccess: (data: KycDetail) => {
      setSelectedKyc(data);
      setAdminNote(data.adminNote || "");
      setShowDetailDialog(true);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ kycId, status, note }: { kycId: number; status: string; note: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/kyc/${kycId}`, { status, adminNote: note });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: `KYC ${actionType === "VERIFIED" ? "approved" : "rejected"} successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      setShowDetailDialog(false);
      setSelectedKyc(null);
      setActionType(null);
    },
    onError: () => {
      toast({ title: "Failed to update KYC status", variant: "destructive" });
    },
  });

  const handleAction = (status: "VERIFIED" | "REJECTED") => {
    if (!selectedKyc) return;
    setActionType(status);
    updateStatusMutation.mutate({ kycId: selectedKyc.id, status, note: adminNote });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case "VERIFIED": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Verified</Badge>;
      case "REJECTED": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> KYC Verification
            </h1>
            <p className="text-sm text-muted-foreground">{data?.total || 0} total KYC submissions</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data?.kycs && data.kycs.length > 0 ? (
          <div className="space-y-3">
            {data.kycs.map((kyc) => (
              <Card key={kyc.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {kyc.fullName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{kyc.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          User #{kyc.userId} | Aadhaar: {kyc.aadhaarNumber ? `****${kyc.aadhaarNumber.slice(-4)}` : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(kyc.status)}
                      <Button size="sm" variant="outline" onClick={() => viewKycMutation.mutate(kyc.id)}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No KYC submissions found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>KYC Details - {selectedKyc?.fullName}</DialogTitle>
            <DialogDescription>Review the submitted KYC documents</DialogDescription>
          </DialogHeader>
          {selectedKyc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedKyc.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{selectedKyc.dateOfBirth || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aadhaar Number</p>
                  <p className="font-medium">{selectedKyc.aadhaarNumber || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PAN Number</p>
                  <p className="font-medium">{selectedKyc.panNumber || "Not provided"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium">{selectedKyc.address || "Not provided"}</p>
                </div>
              </div>

              {(selectedKyc.bankName || selectedKyc.bankAccountNumber) && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Bank Details</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Bank</p>
                      <p className="font-medium">{selectedKyc.bankName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Account</p>
                      <p className="font-medium">{selectedKyc.bankAccountNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">IFSC</p>
                      <p className="font-medium">{selectedKyc.bankIfsc || "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}

              {(selectedKyc.gpayPhonePeNumber || selectedKyc.upiId) && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">UPI / Digital Payment</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">GPay / PhonePe Number</p>
                      <p className="font-medium">{selectedKyc.gpayPhonePeNumber || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">UPI ID</p>
                      <p className="font-medium">{selectedKyc.upiId || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedKyc.status === "PENDING" && (
                <div className="border-t pt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Admin Note</Label>
                    <Textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Optional note for the user"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleAction("VERIFIED")}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleAction("REJECTED")}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              )}

              {selectedKyc.status !== "PENDING" && (
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    {statusBadge(selectedKyc.status)}
                  </div>
                  {selectedKyc.adminNote && (
                    <p className="text-sm text-muted-foreground mt-2">Note: {selectedKyc.adminNote}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
