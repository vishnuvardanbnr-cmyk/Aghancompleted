import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface KycData {
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

function KycStatusBanner({ status, adminNote }: { status: string; adminNote?: string | null }) {
  if (status === "VERIFIED") {
    return (
      <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <div>
            <p className="font-semibold text-green-700 dark:text-green-400">KYC Verified</p>
            <p className="text-xs text-green-600 dark:text-green-500">Your identity has been verified successfully</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (status === "PENDING") {
    return (
      <Card className="border-amber-500/30 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400">KYC Under Review</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">Your documents are being verified. This usually takes 24-48 hours.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (status === "REJECTED") {
    return (
      <Card className="border-red-500/30 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-4 flex items-center gap-3">
          <XCircle className="w-8 h-8 text-red-500" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">KYC Rejected</p>
            <p className="text-xs text-red-600 dark:text-red-500">
              {adminNote || "Your KYC was rejected. Please resubmit with correct details."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  return null;
}

export default function KycPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullName: "",
    aadhaarNumber: "",
    panNumber: "",
    dateOfBirth: "",
    address: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",
    gpayPhonePeNumber: "",
    upiId: "",
  });

  const { data: kyc, isLoading } = useQuery<KycData | null>({
    queryKey: ["/api/kyc"],
  });

  useEffect(() => {
    if (kyc) {
      setFormData({
        fullName: kyc.fullName || user?.fullName || "",
        aadhaarNumber: kyc.aadhaarNumber || "",
        panNumber: kyc.panNumber || "",
        dateOfBirth: kyc.dateOfBirth || "",
        address: kyc.address || "",
        bankAccountNumber: kyc.bankAccountNumber || "",
        bankIfsc: kyc.bankIfsc || "",
        bankName: kyc.bankName || "",
        gpayPhonePeNumber: kyc.gpayPhonePeNumber || "",
        upiId: kyc.upiId || "",
      });
    } else if (user) {
      setFormData(prev => ({ ...prev, fullName: user.fullName || "" }));
    }
  }, [kyc, user]);

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/kyc", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "KYC submitted successfully!", description: "Your documents will be reviewed within 24-48 hours." });
      queryClient.invalidateQueries({ queryKey: ["/api/kyc"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit KYC", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.aadhaarNumber || !formData.panNumber) {
      toast({ title: "Please fill required fields", description: "Full Name, Aadhaar Number, and PAN Number are required", variant: "destructive" });
      return;
    }
    submitMutation.mutate(formData);
  };

  const isEditable = !kyc || kyc.status === "REJECTED" || kyc.status === "NOT_SUBMITTED";

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 max-w-2xl">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> KYC Verification
          </h1>
          <p className="text-sm text-muted-foreground">Complete your identity verification to enable withdrawals</p>
        </div>

        {kyc && <KycStatusBanner status={kyc.status} adminNote={kyc.adminNote} />}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {kyc?.status === "VERIFIED" ? "Your KYC Details" : kyc?.status === "PENDING" ? "Submitted Details" : "Submit Your Details"}
            </CardTitle>
            <CardDescription className="text-xs">
              {kyc?.status === "VERIFIED" ? "Your verified identity details" : "Fields marked with * are required"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name *</Label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    disabled={!isEditable}
                    placeholder="As per Aadhaar card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    disabled={!isEditable}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Aadhaar Number *</Label>
                  <Input
                    value={formData.aadhaarNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, aadhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }))}
                    disabled={!isEditable}
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">PAN Number *</Label>
                  <Input
                    value={formData.panNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, panNumber: e.target.value.toUpperCase().slice(0, 10) }))}
                    disabled={!isEditable}
                    placeholder="10-character PAN"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  disabled={!isEditable}
                  placeholder="Full residential address"
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Bank Details</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bank Name</Label>
                    <Input
                      value={formData.bankName}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                      disabled={!isEditable}
                      placeholder="Bank name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Account Number</Label>
                    <Input
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value.replace(/\D/g, "") }))}
                      disabled={!isEditable}
                      placeholder="Account number"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">IFSC Code</Label>
                    <Input
                      value={formData.bankIfsc}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankIfsc: e.target.value.toUpperCase().slice(0, 11) }))}
                      disabled={!isEditable}
                      placeholder="IFSC code"
                      maxLength={11}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">UPI / Digital Payment Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">GPay / PhonePe Number</Label>
                    <Input
                      value={formData.gpayPhonePeNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, gpayPhonePeNumber: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                      disabled={!isEditable}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">UPI ID</Label>
                    <Input
                      value={formData.upiId}
                      onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
                      disabled={!isEditable}
                      placeholder="e.g. name@upi or number@ybl"
                    />
                  </div>
                </div>
              </div>

              {isEditable && (
                <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? "Submitting..." : kyc?.status === "REJECTED" ? "Resubmit KYC" : "Submit KYC"}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
