import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, Shield, CheckCircle, LogOut, Wallet, TrendingUp, RefreshCw, ShieldCheck, Clock, XCircle, AlertCircle, Camera, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RebirthAccount } from "@shared/schema";

const BOARD_LABELS: Record<string, { name: string; color: string }> = {
  EV: { name: "EV Board", color: "bg-emerald-500" },
  SILVER: { name: "Silver Board", color: "bg-slate-400" },
  GOLD: { name: "Gold Board", color: "bg-amber-500" },
  PLATINUM: { name: "Platinum Board", color: "bg-cyan-400" },
  DIAMOND: { name: "Diamond Board", color: "bg-purple-500" },
  KING: { name: "King Board", color: "bg-red-500" },
};

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

function RebirthAccountCard({ account }: { account: RebirthAccount }) {
  const boardInfo = BOARD_LABELS[account.boardType] || { name: account.boardType, color: "bg-gray-500" };
  const progress = Math.min(100, (Number(account.balance) / Number(account.threshold)) * 100);
  
  return (
    <div
      className={`p-3 rounded-lg space-y-2 ${account.isActive ? "bg-muted/30" : "bg-muted/10 opacity-70"}`}
      data-testid={`rebirth-account-${account.id}`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`w-2.5 h-2.5 rounded-full ${boardInfo.color}`} />
          <span className="font-medium text-sm">{boardInfo.name}</span>
          <Badge 
            variant={account.accountRole === "MOTHER" ? "default" : "outline"}
            className="text-xs"
          >
            {account.accountRole}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Cycle {account.cycle}
          </Badge>
          <Badge 
            variant={account.status === "ACTIVE" ? "default" : "secondary"}
            className="text-xs"
          >
            {account.status}
          </Badge>
          {account.isActive && (
            <Badge variant="default" className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
              Active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-primary">
          <Wallet className="w-3.5 h-3.5" />
          <span className="font-bold text-sm">
            {Number(account.balance).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress to {account.nextBoardType || "Completion"}</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Balance</span>
          <span>
            Threshold: {Number(account.threshold).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      
      {account.parentAccountId && (
        <div className="text-xs text-muted-foreground pt-1 border-t border-muted/50">
          Parent Account ID: #{account.parentAccountId}
        </div>
      )}
    </div>
  );
}

function KycSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);

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
      setShowForm(false);
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
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse h-12 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (kyc?.status === "VERIFIED") {
    return (
      <Card className="border-green-500/30">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            KYC Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-green-700 dark:text-green-400">Completed</p>
              <p className="text-xs text-green-600 dark:text-green-500">Your identity has been verified successfully</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (kyc?.status === "PENDING" && !showForm) {
    return (
      <Card className="border-amber-500/30">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            KYC Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
            <Clock className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-amber-700 dark:text-amber-400">Under Review</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">Your documents are being verified. This usually takes 24-48 hours.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (kyc?.status === "REJECTED" && !showForm) {
    return (
      <Card className="border-red-500/30">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-500" />
            KYC Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
            <XCircle className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-red-700 dark:text-red-400">Rejected</p>
              <p className="text-xs text-red-600 dark:text-red-500">
                {kyc.adminNote || "Your KYC was rejected. Please resubmit with correct details."}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => setShowForm(true)}>
            Resubmit KYC
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!showForm && !kyc) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            KYC Verification
          </CardTitle>
          <CardDescription className="text-xs">Complete identity verification to enable withdrawals</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 mb-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">KYC not submitted yet. Submit your identity details to enable withdrawals.</p>
          </div>
          <Button size="sm" className="w-full" onClick={() => setShowForm(true)}>
            Submit KYC
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          {kyc?.status === "REJECTED" ? "Resubmit KYC" : "Submit KYC"}
        </CardTitle>
        <CardDescription className="text-xs">Fields marked with * are required</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                disabled={!isEditable}
                placeholder="As per Aadhaar card"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date of Birth</Label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                disabled={!isEditable}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Aadhaar Number *</Label>
              <Input
                value={formData.aadhaarNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, aadhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12) }))}
                disabled={!isEditable}
                placeholder="12-digit Aadhaar number"
                maxLength={12}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">PAN Number *</Label>
              <Input
                value={formData.panNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, panNumber: e.target.value.toUpperCase().slice(0, 10) }))}
                disabled={!isEditable}
                placeholder="10-character PAN"
                maxLength={10}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Address</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              disabled={!isEditable}
              placeholder="Full residential address"
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-medium mb-2">Bank Details</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Bank Name</Label>
                <Input
                  value={formData.bankName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  disabled={!isEditable}
                  placeholder="Bank name"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Account Number</Label>
                <Input
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value.replace(/\D/g, "") }))}
                  disabled={!isEditable}
                  placeholder="Account number"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">IFSC Code</Label>
                <Input
                  value={formData.bankIfsc}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankIfsc: e.target.value.toUpperCase().slice(0, 11) }))}
                  disabled={!isEditable}
                  placeholder="IFSC code"
                  maxLength={11}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-medium mb-2">UPI / Digital Payment Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">GPay / PhonePe Number</Label>
                <Input
                  value={formData.gpayPhonePeNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, gpayPhonePeNumber: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  disabled={!isEditable}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">UPI ID</Label>
                <Input
                  value={formData.upiId}
                  onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
                  disabled={!isEditable}
                  placeholder="e.g. name@upi or number@ybl"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="flex-1" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : kyc?.status === "REJECTED" ? "Resubmit KYC" : "Submit KYC"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ChangePasswordSection({ logout }: { logout: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"password" | "otp">("password");
  const [currentPassword, setCurrentPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: options } = useQuery<{ otpAvailable: boolean }>({
    queryKey: ["/api/password-change-options"],
  });
  const otpAvailable = options?.otpAvailable ?? false;

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/password-change-otp/send", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      setOtpSent(true);
      toast({ title: "OTP Sent", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Failed to send OTP", description: error.message, variant: "destructive" });
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: { currentPassword?: string; otp?: string; newPassword: string; method: string }) => {
      const res = await apiRequest("POST", "/api/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully!" });
      resetAndClose();
    },
    onError: (error: any) => {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" });
    },
  });

  const resetAndClose = () => {
    setOpen(false);
    setMethod("password");
    setCurrentPassword("");
    setOtp("");
    setOtpSent(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (method === "otp") {
      mutation.mutate({ otp, newPassword, method: "otp" });
    } else {
      mutation.mutate({ currentPassword, newPassword, method: "password" });
    }
  };

  const isSubmitDisabled = mutation.isPending || !newPassword || !confirmPassword ||
    (method === "password" && !currentPassword) ||
    (method === "otp" && !otp);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">Security</CardTitle>
        <CardDescription className="text-xs">Manage your account security</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Change your account password</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Change</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>Verify your identity to set a new password</DialogDescription>
              </DialogHeader>

              {otpAvailable && (
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => { setMethod("password"); setOtp(""); setOtpSent(false); }}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      method === "password" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Current Password
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMethod("otp"); setCurrentPassword(""); }}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      method === "otp" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Email OTP
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {method === "password" ? (
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => sendOtpMutation.mutate()}
                        disabled={sendOtpMutation.isPending || otpSent}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {sendOtpMutation.isPending ? "Sending..." : otpSent ? "OTP Sent" : "Send OTP to Email"}
                      </Button>
                      {otpSent && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setOtpSent(false); sendOtpMutation.mutate(); }}
                          disabled={sendOtpMutation.isPending}
                        >
                          Resend
                        </Button>
                      )}
                    </div>
                    {otpSent && (
                      <div className="space-y-2">
                        <Label htmlFor="otp">Enter OTP</Label>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        />
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitDisabled}
                >
                  {mutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        <Button
          variant="destructive"
          className="w-full"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: rebirthAccounts = [], isLoading: accountsLoading } = useQuery<RebirthAccount[]>({
    queryKey: ["/api/rebirth-accounts"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("profilePicture", file);
      const res = await fetch("/api/profile-picture", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile picture updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum size is 2MB", variant: "destructive" });
        return;
      }
      uploadMutation.mutate(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const profilePicUrl = (user as any)?.profilePicture
    ? `${(user as any).profilePicture}?t=${Date.now()}`
    : null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-lg font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group">
                <Avatar className="w-16 h-16">
                  {profilePicUrl && <AvatarImage src={profilePicUrl} alt={user?.fullName || "Profile"} />}
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-lg font-bold" data-testid="text-fullname">{user?.fullName}</h2>
                <p className="text-sm text-muted-foreground" data-testid="text-username">@{user?.username}</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <Badge variant={user?.isAdmin ? "default" : "secondary"}>
                    {user?.isAdmin ? "Admin" : "Member"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Account Details</CardTitle>
            <CardDescription className="text-xs">Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium" data-testid="detail-fullname">{user?.fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium" data-testid="detail-email">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Phone className="w-4 h-4 text-chart-3" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Mobile</p>
                <p className="text-sm font-medium" data-testid="detail-mobile">{user?.mobile}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KYC Verification */}
        <KycSection />

        {/* Rebirth Accounts - Profile Switch */}
        {rebirthAccounts.length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                Rebirth Accounts
              </CardTitle>
              <CardDescription className="text-xs">Switch between your mother and sub accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              {accountsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : (
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all" data-testid="tab-all-accounts">All</TabsTrigger>
                    <TabsTrigger value="mother" data-testid="tab-mother-accounts">Mother</TabsTrigger>
                    <TabsTrigger value="sub" data-testid="tab-sub-accounts">Sub</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="space-y-3 mt-3">
                    {rebirthAccounts.map((account) => (
                      <RebirthAccountCard key={account.id} account={account} />
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="mother" className="space-y-3 mt-3">
                    {rebirthAccounts.filter(a => a.accountRole === "MOTHER").length > 0 ? (
                      rebirthAccounts
                        .filter(a => a.accountRole === "MOTHER")
                        .map((account) => (
                          <RebirthAccountCard key={account.id} account={account} />
                        ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No mother accounts yet</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="sub" className="space-y-3 mt-3">
                    {rebirthAccounts.filter(a => a.accountRole === "SUB").length > 0 ? (
                      rebirthAccounts
                        .filter(a => a.accountRole === "SUB")
                        .map((account) => (
                          <RebirthAccountCard key={account.id} account={account} />
                        ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No sub accounts yet. Sub accounts are created when you get promoted to the next board.</p>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}

        {/* Security */}
        <ChangePasswordSection logout={logout} />
      </div>
    </Layout>
  );
}
