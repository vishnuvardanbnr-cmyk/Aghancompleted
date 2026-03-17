import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Search, Eye, Wallet, ArrowLeft, ArrowRight, Pencil, Key, EyeOff, LogIn } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  mobile: string;
  referralCode: string;
  sponsorId: number | null;
  sponsorName: string | null;
  sponsorUsername: string | null;
  createdAt: string;
  isActive: boolean;
}

interface KycInfo {
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
}

interface UserDetails {
  user: User;
  wallet: { mainBalance: string; rebirthBalance: string; totalEarnings: string };
  boards: { type: string; status: string }[];
  rebirthAccounts: any[];
  referralCount: number;
  kyc: KycInfo | null;
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
  const [adjustDescription, setAdjustDescription] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", mobile: "", username: "" });
  const [editUserId, setEditUserId] = useState<number | null>(null);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [passwordHash, setPasswordHash] = useState("");
  const [showPasswordHash, setShowPasswordHash] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { impersonate } = useAuth();

  const { data: usersData, isLoading } = useQuery<{ users: User[]; total: number }>({
    queryKey: ["/api/admin/users", page, search],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: userDetails, isLoading: detailsLoading } = useQuery<UserDetails>({
    queryKey: ["/api/admin/users", selectedUserId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${selectedUserId}`);
      if (!res.ok) throw new Error("Failed to fetch user details");
      return res.json();
    },
    enabled: !!selectedUserId,
  });

  const adjustWalletMutation = useMutation({
    mutationFn: async ({ userId, amount, type, description }: any) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/adjust-wallet`, {
        amount,
        type,
        description,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Wallet adjusted successfully" });
      setAdjustDialogOpen(false);
      setAdjustAmount("");
      setAdjustDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", selectedUserId] });
    },
    onError: () => {
      toast({ title: "Failed to adjust wallet", variant: "destructive" });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users", selectedUserId] });
      }
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/reset-password`, { newPassword });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully" });
      setNewPassword("");
      fetchPasswordHash(passwordUserId!);
    },
    onError: () => {
      toast({ title: "Failed to reset password", variant: "destructive" });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const openEditDialog = (user: User) => {
    setEditUserId(user.id);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      username: user.username,
    });
    setEditDialogOpen(true);
  };

  const fetchPasswordHash = async (userId: number) => {
    setPasswordLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`);
      if (res.ok) {
        const data = await res.json();
        setPasswordHash(data.password || "");
      }
    } catch {
      toast({ title: "Failed to fetch password", variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const openPasswordDialog = (user: User) => {
    setPasswordUserId(user.id);
    setPasswordHash("");
    setShowPasswordHash(false);
    setNewPassword("");
    setPasswordDialogOpen(true);
    fetchPasswordHash(user.id);
  };

  const totalPages = Math.ceil((usersData?.total || 0) / 20);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
              {usersData?.total || 0} total users
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username, name, email, mobile, or referral code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Referral Code</TableHead>
                      <TableHead>Referred By</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.fullName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                            className={user.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400"}
                            data-testid={`badge-status-${user.id}`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.mobile}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.referralCode}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.sponsorName ? (
                            <div>
                              <p className="text-sm font-medium">{user.sponsorName}</p>
                              <p className="text-xs text-muted-foreground">@{user.sponsorUsername}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedUserId(user.id)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(user)}
                              title="Edit User"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openPasswordDialog(user)}
                              title="View/Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                              onClick={() => impersonate(user.id)}
                              title="Login as this user"
                              data-testid={`button-impersonate-${user.id}`}
                            >
                              <LogIn className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4">
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
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {detailsLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : userDetails ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium">{userDetails.user.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{userDetails.user.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{userDetails.user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mobile</p>
                    <p className="font-medium">{userDetails.user.mobile}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Referral Code</p>
                    <Badge variant="outline">{userDetails.user.referralCode}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Direct Referrals</p>
                    <p className="font-medium">{userDetails.referralCount}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Wallet</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Main Balance</p>
                      <p className="text-lg font-bold text-green-600">
                        ₹{Number(userDetails.wallet?.mainBalance || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Rebirth Balance</p>
                      <p className="text-lg font-bold text-blue-600">
                        ₹{Number(userDetails.wallet?.rebirthBalance || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Earnings</p>
                      <p className="text-lg font-bold text-purple-600">
                        ₹{Number(userDetails.wallet?.totalEarnings || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="mt-3"
                    variant="outline"
                    onClick={() => setAdjustDialogOpen(true)}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Adjust Wallet
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">KYC & Bank Details</h3>
                  {userDetails.kyc ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={
                          userDetails.kyc.status === "VERIFIED" ? "default" :
                          userDetails.kyc.status === "PENDING" ? "secondary" :
                          "destructive"
                        }>
                          KYC: {userDetails.kyc.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Aadhaar Number</p>
                          <p className="font-medium">{userDetails.kyc.aadhaarNumber || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">PAN Number</p>
                          <p className="font-medium">{userDetails.kyc.panNumber || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Bank Name</p>
                          <p className="font-medium">{userDetails.kyc.bankName || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Account Number</p>
                          <p className="font-medium">{userDetails.kyc.bankAccountNumber || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">IFSC Code</p>
                          <p className="font-medium">{userDetails.kyc.bankIfsc || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">UPI ID</p>
                          <p className="font-medium">{userDetails.kyc.upiId || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">GPay/PhonePe Number</p>
                          <p className="font-medium">{userDetails.kyc.gpayPhonePeNumber || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Date of Birth</p>
                          <p className="font-medium">{userDetails.kyc.dateOfBirth || "-"}</p>
                        </div>
                      </div>
                      {userDetails.kyc.address && (
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="font-medium">{userDetails.kyc.address}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">KYC not submitted yet</p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Boards</h3>
                  <div className="flex flex-wrap gap-2">
                    {userDetails.boards.length > 0 ? (
                      userDetails.boards.map((board, i) => (
                        <Badge
                          key={i}
                          variant={board.status === "COMPLETED" ? "default" : "secondary"}
                        >
                          {board.type} - {board.status}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No boards joined</p>
                    )}
                  </div>
                </div>

                {userDetails.rebirthAccounts.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-3">Rebirth Accounts</h3>
                    <div className="space-y-2">
                      {userDetails.rebirthAccounts.map((account, i) => (
                        <div key={i} className="p-3 bg-muted rounded-lg flex justify-between">
                          <div>
                            <Badge variant="outline">{account.boardType}</Badge>
                            <span className="ml-2 text-sm">
                              {account.accountRole} - Cycle {account.cycle}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{Number(account.balance).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              of ₹{Number(account.threshold).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Wallet Balance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={adjustType === "add" ? "default" : "outline"}
                  onClick={() => setAdjustType("add")}
                  className="flex-1"
                >
                  Add
                </Button>
                <Button
                  variant={adjustType === "deduct" ? "default" : "outline"}
                  onClick={() => setAdjustType("deduct")}
                  className="flex-1"
                >
                  Deduct
                </Button>
              </div>
              <Input
                type="number"
                placeholder="Amount"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
              <Input
                placeholder="Description / Reason"
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedUserId && adjustAmount && adjustDescription) {
                    adjustWalletMutation.mutate({
                      userId: selectedUserId,
                      amount: adjustAmount,
                      type: adjustType,
                      description: adjustDescription,
                    });
                  }
                }}
                disabled={!adjustAmount || !adjustDescription || adjustWalletMutation.isPending}
              >
                {adjustWalletMutation.isPending ? "Processing..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={editForm.username}
                  onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input
                  id="edit-fullName"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-mobile">Mobile</Label>
                <Input
                  id="edit-mobile"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm((f) => ({ ...f, mobile: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editUserId) {
                    editUserMutation.mutate({ userId: editUserId, data: editForm });
                  }
                }}
                disabled={editUserMutation.isPending}
              >
                {editUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Password Management</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium">Current Password (Hashed)</Label>
                {passwordLoading ? (
                  <div className="h-10 bg-muted animate-pulse rounded mt-1" />
                ) : (
                  <div className="mt-1">
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={showPasswordHash ? passwordHash : "••••••••••••••••••••"}
                        className="font-mono text-xs bg-muted"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPasswordHash(!showPasswordHash)}
                        title={showPasswordHash ? "Hide" : "Show"}
                      >
                        {showPasswordHash ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Passwords are securely hashed and cannot be viewed in plain text
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <Label htmlFor="new-password" className="text-sm font-medium">Reset Password</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="new-password"
                    type="text"
                    placeholder="Enter new password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      if (passwordUserId && newPassword.length >= 6) {
                        resetPasswordMutation.mutate({ userId: passwordUserId, newPassword });
                      } else if (newPassword.length < 6) {
                        toast({ title: "Password must be at least 6 characters", variant: "destructive" });
                      }
                    }}
                    disabled={resetPasswordMutation.isPending || newPassword.length < 6}
                  >
                    {resetPasswordMutation.isPending ? "Resetting..." : "Reset"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
