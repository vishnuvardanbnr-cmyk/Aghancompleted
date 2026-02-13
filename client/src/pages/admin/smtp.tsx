import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail, Send, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SmtpForm {
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

const defaultForm: SmtpForm = {
  host: "",
  port: "587",
  secure: false,
  username: "",
  password: "",
  fromEmail: "",
  fromName: "Aghan Promoters",
  enabled: false,
};

export default function AdminSmtp() {
  const { toast } = useToast();
  const [form, setForm] = useState<SmtpForm>(defaultForm);
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/smtp"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/smtp");
      return res.json();
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        host: settings.host || "",
        port: String(settings.port || 587),
        secure: settings.secure || false,
        username: settings.username || "",
        password: settings.password || "",
        fromEmail: settings.fromEmail || "",
        fromName: settings.fromName || "Aghan Promoters",
        enabled: settings.enabled || false,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/smtp", form);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SMTP settings saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    },
  });

  const handleTest = async () => {
    if (!testEmail) {
      toast({ title: "Please enter a test email address", variant: "destructive" });
      return;
    }
    setIsTesting(true);
    try {
      const res = await apiRequest("POST", "/api/admin/smtp/test", { ...form, testEmail });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Test email sent!", description: `Check ${testEmail} for the test message.` });
      } else {
        toast({ title: "Test failed", description: data.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  const updateField = (field: keyof SmtpForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Email (SMTP) Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure email notifications for user registration, activation, and invoices
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>SMTP Configuration</span>
              <div className="flex items-center gap-2">
                <Label htmlFor="smtp-enabled" className="text-sm font-normal text-muted-foreground">
                  {form.enabled ? "Enabled" : "Disabled"}
                </Label>
                <Switch
                  id="smtp-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => updateField("enabled", checked)}
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">SMTP Host</Label>
                <Input
                  id="host"
                  placeholder="smtp.gmail.com"
                  value={form.host}
                  onChange={(e) => updateField("host", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  placeholder="587"
                  value={form.port}
                  onChange={(e) => updateField("port", e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="secure"
                checked={form.secure}
                onCheckedChange={(checked) => updateField("secure", checked)}
              />
              <Label htmlFor="secure" className="text-sm">
                Use SSL/TLS (enable for port 465, disable for 587 with STARTTLS)
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username / Email</Label>
                <Input
                  id="username"
                  placeholder="your-email@gmail.com"
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password / App Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  placeholder="noreply@aghanpromoters.com"
                  value={form.fromEmail}
                  onChange={(e) => updateField("fromEmail", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  placeholder="Aghan Promoters"
                  value={form.fromName}
                  onChange={(e) => updateField("fromName", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Test Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Send a test email to verify your SMTP settings are working correctly.
            </p>
            <div className="flex gap-3">
              <Input
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={handleTest} disabled={isTesting} variant="outline">
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Test
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              When SMTP is enabled, the following emails are sent automatically:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Registration Email</p>
                  <p className="text-xs text-muted-foreground">Sent when a new user creates an account. Includes username, referral code, and instructions to activate.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Activation Email</p>
                  <p className="text-xs text-muted-foreground">Sent when a user pays Rs.5,900 and joins the EV Board. Confirms activation status.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Invoice Email</p>
                  <p className="text-xs text-muted-foreground">Sent along with activation email. Contains the EV Vehicle Booking invoice details (Rs.5,900 including GST).</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
