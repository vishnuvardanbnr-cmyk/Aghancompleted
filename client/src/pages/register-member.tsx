import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Wallet, UserPlus, CheckCircle2, IndianRupee, Eye, EyeOff, AlertCircle } from "lucide-react";

interface WalletData {
  mainBalance: string;
}

const REGISTRATION_FEE = 5900;

export default function RegisterMember() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    mobile: "",
    password: "",
  });
  const [lastRegistered, setLastRegistered] = useState<{ username: string; fullName: string } | null>(null);

  const { data: wallet } = useQuery<WalletData>({
    queryKey: ["/api/wallet"],
  });

  const mainBalance = Number(wallet?.mainBalance || 0);
  const hasEnoughBalance = mainBalance >= REGISTRATION_FEE;

  const registerMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/user/register-member", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setLastRegistered({ username: data.user.username, fullName: data.user.fullName });
      setForm({ username: "", fullName: "", email: "", mobile: "", password: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/boards"] });
      toast({
        title: "Member Registered!",
        description: data.message,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Registration Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.fullName || !form.email || !form.mobile || !form.password) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    if (form.mobile.length !== 10 || !/^\d+$/.test(form.mobile)) {
      toast({ title: "Enter a valid 10-digit mobile number", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    registerMutation.mutate(form);
  };

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Register a Member</h1>
          <p className="text-muted-foreground mt-1">
            Register a new member under your sponsorship. The ₹5,900 EV Board entry fee will be deducted from your wallet.
          </p>
        </div>

        {/* Wallet Balance Card */}
        <Card className={`border-2 ${hasEnoughBalance ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasEnoughBalance ? "bg-primary/10" : "bg-destructive/10"}`}>
                  <Wallet className={`w-5 h-5 ${hasEnoughBalance ? "text-primary" : "text-destructive"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Wallet Balance</p>
                  <p className={`text-xl font-bold ${hasEnoughBalance ? "text-primary" : "text-destructive"}`}>
                    ₹{mainBalance.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Registration Fee</p>
                <p className="text-xl font-bold">₹{REGISTRATION_FEE.toLocaleString("en-IN")}</p>
              </div>
            </div>
            {!hasEnoughBalance && (
              <div className="mt-3 flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You need at least ₹{REGISTRATION_FEE.toLocaleString("en-IN")} in your wallet to register a member.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success Banner */}
        {lastRegistered && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-400">Registration Successful!</p>
                  <p className="text-sm text-green-700 dark:text-green-500">
                    <strong>{lastRegistered.fullName}</strong> (@{lastRegistered.username}) has been registered and placed in the EV Board.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              New Member Details
            </CardTitle>
            <CardDescription>
              You (<strong>@{user?.username}</strong>) will be set as the sponsor automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter full name"
                    value={form.fullName}
                    onChange={handleChange("fullName")}
                    data-testid="input-fullName"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Choose a username"
                    value={form.username}
                    onChange={handleChange("username")}
                    data-testid="input-username"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email"
                    value={form.email}
                    onChange={handleChange("email")}
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={form.mobile}
                    onChange={handleChange("mobile")}
                    data-testid="input-mobile"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Set a password (min. 6 characters)"
                    value={form.password}
                    onChange={handleChange("password")}
                    data-testid="input-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Separator />

              {/* Fee breakdown */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                <p className="font-medium text-foreground">Payment Breakdown</p>
                <div className="flex justify-between text-muted-foreground">
                  <span>EV Board Entry Fee</span>
                  <span>₹5,900</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Includes GST</span>
                  <span>₹900</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Deducted from your wallet</span>
                  <span className="text-primary">₹5,900</span>
                </div>
                {hasEnoughBalance && (
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Balance after registration</span>
                    <span>₹{(mainBalance - REGISTRATION_FEE).toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={!hasEnoughBalance || registerMutation.isPending}
                data-testid="button-register-member"
              >
                {registerMutation.isPending ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" />
                    Registering...
                  </>
                ) : (
                  <>
                    <IndianRupee className="w-4 h-4" />
                    Pay ₹5,900 &amp; Register Member
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
