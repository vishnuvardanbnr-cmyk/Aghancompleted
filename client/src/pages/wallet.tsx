import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Calendar,
  FileText,
  CreditCard,
  Download,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  description: string;
  subtotal: string;
  gstAmount: string;
  totalAmount: string;
  gstPercentage: string;
  boardType: string;
  status: string;
  createdAt: string;
}

const PAYMENT_MODES = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "GPAY", label: "GPay" },
  { value: "PHONEPE", label: "PhonePe" },
  { value: "UPI", label: "UPI" },
] as const;

type PaymentMode = typeof PAYMENT_MODES[number]["value"];

const withdrawSchema = z.object({
  amount: z.number().min(100, "Minimum withdrawal is Rs.100"),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  gpayNumber: z.string().optional(),
  phonePeNumber: z.string().optional(),
  upiId: z.string().optional(),
});

type WithdrawFormData = z.infer<typeof withdrawSchema>;

interface KycData {
  fullName: string;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  gpayPhonePeNumber: string | null;
  upiId: string | null;
  status: string;
}

interface WalletData {
  mainBalance: string;
  rebirthBalance: string;
  totalEarnings: string;
}

interface Transaction {
  id: number;
  amount: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
}

function TransactionIcon({ type }: { type: string }) {
  const icons: Record<string, { icon: any; color: string }> = {
    DEPOSIT: { icon: ArrowDownLeft, color: "text-primary" },
    WITHDRAWAL: { icon: ArrowUpRight, color: "text-destructive" },
    REFERRAL_INCOME: { icon: Zap, color: "text-primary" },
    LEVEL_INCOME: { icon: TrendingUp, color: "text-accent" },
    BOARD_ENTRY: { icon: ArrowUpRight, color: "text-muted-foreground" },
    BOARD_COMPLETION: { icon: CheckCircle, color: "text-primary" },
  };
  const config = icons[type] || { icon: Clock, color: "text-muted-foreground" };
  const Icon = config.icon;
  return <Icon className={`w-4 h-4 ${config.color}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    COMPLETED: "default",
    PENDING: "secondary",
    REJECTED: "destructive",
  };
  return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
}

const ITEMS_PER_PAGE = 5;

function printInvoice(invoice: Invoice) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #10b981; margin: 0; font-size: 28px; }
          .header p { color: #666; margin: 5px 0; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .invoice-info div { flex: 1; }
          .label { font-weight: bold; color: #555; font-size: 12px; text-transform: uppercase; }
          .value { font-size: 14px; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f0fdf4; padding: 12px; text-align: left; border-bottom: 2px solid #10b981; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .totals { text-align: right; margin-top: 20px; }
          .totals .row { display: flex; justify-content: flex-end; gap: 40px; padding: 8px 0; }
          .totals .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #10b981; padding-top: 12px; color: #10b981; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #999; font-size: 12px; }
          .badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Aghan Promoters</h1>
          <p>EV 2-Wheeler Promotion & Booking Platform</p>
        </div>
        <div class="invoice-info">
          <div>
            <p class="label">Invoice Number</p>
            <p class="value">${invoice.invoiceNumber}</p>
            <p class="label" style="margin-top:12px">Date</p>
            <p class="value">${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <div>
            <p class="label">Bill To</p>
            <p class="value">${invoice.customerName}</p>
            <p class="value">${invoice.customerEmail}</p>
            <p class="value">${invoice.customerMobile}</p>
          </div>
          <div style="text-align:right">
            <span class="badge">${invoice.status}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Board</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${invoice.description}</td>
              <td>${invoice.boardType}</td>
              <td style="text-align:right">Rs.${parseFloat(invoice.subtotal).toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>
        <div class="totals">
          <div class="row"><span>Subtotal:</span><span>Rs.${parseFloat(invoice.subtotal).toLocaleString("en-IN")}</span></div>
          <div class="row"><span>GST (${parseFloat(invoice.gstPercentage).toFixed(0)}%):</span><span>Rs.${parseFloat(invoice.gstAmount).toLocaleString("en-IN")}</span></div>
          <div class="row total-row"><span>Total:</span><span>Rs.${parseFloat(invoice.totalAmount).toLocaleString("en-IN")}</span></div>
        </div>
        <div class="footer">
          <p>This is a computer-generated invoice and does not require a signature.</p>
          <p>Aghan Promoters - EV 2-Wheeler Booking Platform</p>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

export default function Wallet() {
  const { toast } = useToast();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [pendingWithdraw, setPendingWithdraw] = useState<{ data: WithdrawFormData; bankDetails: string; fee: number; net: number } | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PLATFORM_FEE_RATE = 0.10;

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ["/api/wallet"],
  });

  const { data: transactions, isLoading: txnLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/wallet/history"],
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: kycData } = useQuery<KycData>({
    queryKey: ["/api/kyc"],
  });

  const kycBankAvailable = kycData && kycData.bankAccountNumber && kycData.bankIfsc && kycData.bankName;
  const kycUpiAvailable = kycData && (kycData.gpayPhonePeNumber || kycData.upiId);
  const [useKycDetails, setUseKycDetails] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("BANK_TRANSFER");

  const withdrawForm = useForm<WithdrawFormData>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { amount: undefined as unknown as number, accountNumber: "", ifscCode: "", bankName: "", accountHolderName: "", gpayNumber: "", phonePeNumber: "", upiId: "" },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: WithdrawFormData) => {
      let bankDetails = `Payment Mode: ${PAYMENT_MODES.find(m => m.value === paymentMode)?.label || paymentMode}\n`;
      if (paymentMode === "BANK_TRANSFER") {
        if (!data.accountHolderName || !data.bankName || !data.accountNumber || !data.ifscCode) {
          throw new Error("Please fill all bank details");
        }
        bankDetails += `Account Holder: ${data.accountHolderName}\nBank: ${data.bankName}\nAccount No: ${data.accountNumber}\nIFSC: ${data.ifscCode}`;
      } else if (paymentMode === "GPAY") {
        if (!data.gpayNumber) throw new Error("Please enter GPay number");
        bankDetails += `GPay Number: ${data.gpayNumber}`;
      } else if (paymentMode === "PHONEPE") {
        if (!data.phonePeNumber) throw new Error("Please enter PhonePe number");
        bankDetails += `PhonePe Number: ${data.phonePeNumber}`;
      } else if (paymentMode === "UPI") {
        if (!data.upiId) throw new Error("Please enter UPI ID");
        bankDetails += `UPI ID: ${data.upiId}`;
      }
      const payload = { amount: data.amount, bankDetails };
      const res = await apiRequest("POST", "/api/wallet/withdraw", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/history"] });
      toast({ title: "Withdrawal request submitted!" });
      setWithdrawOpen(false);
      setShowConfirmStep(false);
      setPendingWithdraw(null);
      withdrawForm.reset();
      setPaymentMode("BANK_TRANSFER");
      setUseKycDetails(false);
    },
    onError: (error: any) => {
      toast({ title: "Withdrawal failed", description: error.message, variant: "destructive" });
    },
  });

  const mainBalance = parseFloat(wallet?.mainBalance || "0");
  const rebirthBalance = parseFloat(wallet?.rebirthBalance || "0");
  const totalEarnings = parseFloat(wallet?.totalEarnings || "0");

  if (walletLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">Wallet</h1>
            <p className="text-sm text-muted-foreground">Manage your earnings and withdrawals</p>
          </div>
          <Dialog open={withdrawOpen} onOpenChange={(open) => {
            setWithdrawOpen(open);
            if (!open) {
              setShowConfirmStep(false);
              setPendingWithdraw(null);
              withdrawForm.reset();
              setPaymentMode("BANK_TRANSFER");
              setUseKycDetails(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-withdraw">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{showConfirmStep ? "Confirm Withdrawal" : "Request Withdrawal"}</DialogTitle>
                <DialogDescription>
                  {showConfirmStep
                    ? "Review the fee breakdown before confirming your withdrawal."
                    : "Choose your preferred payment mode and enter the details. Minimum Rs.100."}
                </DialogDescription>
              </DialogHeader>

              {/* ── CONFIRMATION STEP ── */}
              {showConfirmStep && pendingWithdraw && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Withdrawal Amount</span>
                      <span className="font-medium">₹{pendingWithdraw.data.amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>Platform Fee (10%)</span>
                      <span>− ₹{pendingWithdraw.fee.toLocaleString("en-IN")}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>You Will Receive</span>
                      <span className="text-primary">₹{pendingWithdraw.net.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>A 10% platform fee is applied to all withdrawals. The net amount will be transferred to your payment account.</span>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground text-sm">Payment Details</p>
                    <p className="whitespace-pre-line">{pendingWithdraw.bankDetails}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setShowConfirmStep(false)}>
                      <ArrowLeft className="w-4 h-4" /> Edit
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={withdrawMutation.isPending}
                      onClick={() => withdrawMutation.mutate(pendingWithdraw.data)}
                      data-testid="button-confirm-withdraw"
                    >
                      {withdrawMutation.isPending ? "Processing..." : "Confirm Withdrawal"}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── FORM STEP ── */}
              {!showConfirmStep && (
              <Form {...withdrawForm}>
                <form onSubmit={withdrawForm.handleSubmit((data) => {
                  // Compute bank details string (same logic as mutationFn)
                  let bankDetails = `Payment Mode: ${PAYMENT_MODES.find(m => m.value === paymentMode)?.label || paymentMode}\n`;
                  if (paymentMode === "BANK_TRANSFER") {
                    if (!data.accountHolderName || !data.bankName || !data.accountNumber || !data.ifscCode) {
                      toast({ title: "Please fill all bank details", variant: "destructive" });
                      return;
                    }
                    bankDetails += `Account Holder: ${data.accountHolderName}\nBank: ${data.bankName}\nAccount No: ${data.accountNumber}\nIFSC: ${data.ifscCode}`;
                  } else if (paymentMode === "GPAY") {
                    if (!data.gpayNumber) { toast({ title: "Please enter GPay number", variant: "destructive" }); return; }
                    bankDetails += `GPay Number: ${data.gpayNumber}`;
                  } else if (paymentMode === "PHONEPE") {
                    if (!data.phonePeNumber) { toast({ title: "Please enter PhonePe number", variant: "destructive" }); return; }
                    bankDetails += `PhonePe Number: ${data.phonePeNumber}`;
                  } else if (paymentMode === "UPI") {
                    if (!data.upiId) { toast({ title: "Please enter UPI ID", variant: "destructive" }); return; }
                    bankDetails += `UPI ID: ${data.upiId}`;
                  }
                  const fee = Math.round(data.amount * PLATFORM_FEE_RATE * 100) / 100;
                  const net = Math.round((data.amount - fee) * 100) / 100;
                  setPendingWithdraw({ data, bankDetails, fee, net });
                  setShowConfirmStep(true);
                })} className="space-y-4">
                  <FormField
                    control={withdrawForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (Rs.)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter amount"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            data-testid="input-withdraw-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Payment Mode</p>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_MODES.map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => {
                            setPaymentMode(mode.value);
                            setUseKycDetails(false);
                            withdrawForm.setValue("accountHolderName", "");
                            withdrawForm.setValue("bankName", "");
                            withdrawForm.setValue("accountNumber", "");
                            withdrawForm.setValue("ifscCode", "");
                            withdrawForm.setValue("gpayNumber", "");
                            withdrawForm.setValue("phonePeNumber", "");
                            withdrawForm.setValue("upiId", "");
                          }}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            paymentMode === mode.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {paymentMode === "BANK_TRANSFER" ? "Bank Details" :
                         paymentMode === "GPAY" ? "GPay Details" :
                         paymentMode === "PHONEPE" ? "PhonePe Details" : "UPI Details"}
                      </p>
                      {((paymentMode === "BANK_TRANSFER" && kycBankAvailable) ||
                        (paymentMode === "GPAY" && kycData?.gpayPhonePeNumber) ||
                        (paymentMode === "PHONEPE" && kycData?.gpayPhonePeNumber) ||
                        (paymentMode === "UPI" && kycData?.upiId)) && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={useKycDetails}
                            onCheckedChange={(checked) => {
                              const val = !!checked;
                              setUseKycDetails(val);
                              if (val && kycData) {
                                if (paymentMode === "BANK_TRANSFER") {
                                  withdrawForm.setValue("accountHolderName", kycData.fullName || "");
                                  withdrawForm.setValue("bankName", kycData.bankName || "");
                                  withdrawForm.setValue("accountNumber", kycData.bankAccountNumber || "");
                                  withdrawForm.setValue("ifscCode", kycData.bankIfsc || "");
                                } else if (paymentMode === "GPAY") {
                                  withdrawForm.setValue("gpayNumber", kycData.gpayPhonePeNumber || "");
                                } else if (paymentMode === "PHONEPE") {
                                  withdrawForm.setValue("phonePeNumber", kycData.gpayPhonePeNumber || "");
                                } else if (paymentMode === "UPI") {
                                  withdrawForm.setValue("upiId", kycData.upiId || "");
                                }
                              } else {
                                withdrawForm.setValue("accountHolderName", "");
                                withdrawForm.setValue("bankName", "");
                                withdrawForm.setValue("accountNumber", "");
                                withdrawForm.setValue("ifscCode", "");
                                withdrawForm.setValue("gpayNumber", "");
                                withdrawForm.setValue("phonePeNumber", "");
                                withdrawForm.setValue("upiId", "");
                              }
                            }}
                          />
                          <span className="text-xs text-muted-foreground">Use KYC details</span>
                        </label>
                      )}
                    </div>

                    {paymentMode === "BANK_TRANSFER" && (
                      <>
                        <FormField
                          control={withdrawForm.control}
                          name="accountHolderName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Holder Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter account holder name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={withdrawForm.control}
                          name="bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bank Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter bank name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={withdrawForm.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter account number" {...field} data-testid="input-withdraw-bank" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={withdrawForm.control}
                          name="ifscCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IFSC Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter IFSC code" {...field} className="uppercase" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {paymentMode === "GPAY" && (
                      <FormField
                        control={withdrawForm.control}
                        name="gpayNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GPay Mobile Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter 10-digit mobile number"
                                maxLength={10}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {paymentMode === "PHONEPE" && (
                      <FormField
                        control={withdrawForm.control}
                        name="phonePeNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PhonePe Mobile Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter 10-digit mobile number"
                                maxLength={10}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {paymentMode === "UPI" && (
                      <FormField
                        control={withdrawForm.control}
                        name="upiId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UPI ID</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. name@upi or number@ybl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Live fee preview */}
                  {(withdrawForm.watch("amount") || 0) > 0 && (() => {
                    const amt = withdrawForm.watch("amount") || 0;
                    const fee = Math.round(amt * PLATFORM_FEE_RATE * 100) / 100;
                    const net = Math.round((amt - fee) * 100) / 100;
                    return (
                      <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Withdrawal Amount</span>
                          <span>₹{amt.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-destructive">
                          <span>Platform Fee (10%)</span>
                          <span>− ₹{fee.toLocaleString("en-IN")}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>You Will Receive</span>
                          <span className="text-primary">₹{net.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setWithdrawOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={withdrawMutation.isPending} data-testid="button-submit-withdraw">
                      Review &amp; Confirm
                    </Button>
                  </div>
                </form>
              </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <WalletIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Main Balance</p>
                  <p className="text-xl font-bold" data-testid="text-main-balance">
                    Rs.{mainBalance.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Available for withdrawal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rebirth Balance</p>
                  <p className="text-xl font-bold" data-testid="text-rebirth-balance">
                    Rs.{rebirthBalance.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Auto-entry to Silver at Rs.5900</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                  <p className="text-xl font-bold" data-testid="text-total-earnings">
                    Rs.{totalEarnings.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Transaction History</CardTitle>
            <CardDescription className="text-xs">Tap on any transaction to view details</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {txnLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : transactions && transactions.length > 0 ? (
              <>
                <div className="divide-y">
                  {transactions
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((txn) => {
                      const isCredit = txn.type.includes("INCOME") || txn.type === "DEPOSIT";
                      return (
                        <div
                          key={txn.id}
                          className="flex items-center justify-between gap-3 p-4 hover-elevate cursor-pointer"
                          onClick={() => setSelectedTxn(txn)}
                          data-testid={`transaction-row-${txn.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCredit ? 'bg-primary/10' : 'bg-muted'}`}>
                              <TransactionIcon type={txn.type} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{txn.type.replace(/_/g, " ")}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(txn.createdAt), "dd MMM yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isCredit ? 'text-primary' : 'text-destructive'}`}>
                              {isCredit ? '+' : '-'}Rs.{parseFloat(txn.amount).toLocaleString()}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                </div>
                {transactions.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between gap-2 p-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, transactions.length)} of {transactions.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm px-2">
                        {currentPage} / {Math.ceil(transactions.length / ITEMS_PER_PAGE)}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(transactions.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={currentPage >= Math.ceil(transactions.length / ITEMS_PER_PAGE)}
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <WalletIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Detail Dialog */}
        <Dialog open={!!selectedTxn} onOpenChange={(open) => !open && setSelectedTxn(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription>Complete information about this transaction</DialogDescription>
            </DialogHeader>
            {selectedTxn && (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    selectedTxn.type.includes("INCOME") || selectedTxn.type === "DEPOSIT" 
                      ? 'bg-primary/10' 
                      : 'bg-muted'
                  }`}>
                    <TransactionIcon type={selectedTxn.type} />
                  </div>
                </div>
                
                <div className="text-center">
                  <p className={`text-2xl font-bold ${
                    selectedTxn.type.includes("INCOME") || selectedTxn.type === "DEPOSIT"
                      ? 'text-primary'
                      : 'text-destructive'
                  }`}>
                    {selectedTxn.type.includes("INCOME") || selectedTxn.type === "DEPOSIT" ? '+' : '-'}
                    Rs.{parseFloat(selectedTxn.amount).toLocaleString()}
                  </p>
                  <StatusBadge status={selectedTxn.status} />
                </div>

                <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm font-medium">{selectedTxn.type.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm">{selectedTxn.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date & Time</p>
                      <p className="text-sm">{format(new Date(selectedTxn.createdAt), "dd MMM yyyy, hh:mm a")}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Transaction ID</p>
                      <p className="text-sm font-mono">TXN{selectedTxn.id.toString().padStart(8, '0')}</p>
                    </div>
                  </div>
                </div>

                {(() => {
                  const isEvBoardEntry = selectedTxn.type === "BOARD_ENTRY" && 
                    selectedTxn.description?.toLowerCase().includes("ev board");
                  const matchingInvoice = isEvBoardEntry && invoices?.find(inv => inv.boardType === "EV");
                  return matchingInvoice ? (
                    <Button 
                      className="w-full"
                      onClick={() => printInvoice(matchingInvoice)}
                    >
                      <Download className="w-4 h-4 mr-2" /> Download Invoice
                    </Button>
                  ) : null;
                })()}

                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setSelectedTxn(null)}
                  data-testid="button-close-txn-detail"
                >
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
