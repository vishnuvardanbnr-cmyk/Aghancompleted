import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download, Eye } from "lucide-react";
import { useState, useRef } from "react";

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

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
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
  };

  return (
    <div ref={printRef}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-primary">Aghan Promoters</h3>
            <p className="text-xs text-muted-foreground">EV 2-Wheeler Promotion & Booking</p>
          </div>
          <Badge variant={invoice.status === "PAID" ? "default" : "secondary"}>
            {invoice.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Invoice Number</p>
            <p className="font-semibold">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Date</p>
            <p>{new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Customer</p>
            <p>{invoice.customerName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Mobile</p>
            <p>{invoice.customerMobile}</p>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-primary/5 px-4 py-2 grid grid-cols-3 text-xs font-medium text-muted-foreground">
            <span>Description</span>
            <span>Board</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 text-sm">
            <span>{invoice.description}</span>
            <span>{invoice.boardType}</span>
            <span className="text-right font-medium">Rs.{parseFloat(invoice.subtotal).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>Rs.{parseFloat(invoice.subtotal).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST ({parseFloat(invoice.gstPercentage).toFixed(0)}%)</span>
            <span>Rs.{parseFloat(invoice.gstAmount).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total</span>
            <span className="text-primary">Rs.{parseFloat(invoice.totalAmount).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <Button onClick={handlePrint} className="w-full">
          <Download className="w-4 h-4 mr-2" /> Download / Print Invoice
        </Button>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: invoicesList, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          {[1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold">My Invoices</h1>
          <p className="text-sm text-muted-foreground">EV Vehicle booking invoices</p>
        </div>

        {invoicesList && invoicesList.length > 0 ? (
          <div className="space-y-3">
            {invoicesList.map((invoice) => (
              <Card key={invoice.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedInvoice(invoice)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{invoice.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">Rs.{parseFloat(invoice.totalAmount).toLocaleString("en-IN")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No invoices yet</p>
              <p className="text-xs text-muted-foreground mt-1">Your EV Vehicle booking invoice will appear here after account activation</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Invoice Details
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && <InvoiceDetail invoice={selectedInvoice} />}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
