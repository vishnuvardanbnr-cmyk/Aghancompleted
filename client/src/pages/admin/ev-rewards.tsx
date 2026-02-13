import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
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
import { Car, Truck, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface EvRewardItem {
  id: number;
  userId: number;
  boardType: string;
  rewardAmount: string;
  status: string;
  vehicleModel: string | null;
  vehicleDetails: string | null;
  adminNote: string | null;
  awardedAt: string;
  deliveredAt: string | null;
  userName: string;
  userMobile: string;
}

export default function AdminEvRewards() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReward, setSelectedReward] = useState<EvRewardItem | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: "",
    vehicleModel: "",
    vehicleDetails: "",
    adminNote: "",
  });

  const { data, isLoading } = useQuery<{ rewards: EvRewardItem[]; total: number }>({
    queryKey: ["/api/admin/ev-rewards", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ev-rewards?status=${statusFilter}&limit=50`);
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ rewardId, ...body }: { rewardId: number; status: string; vehicleModel: string; vehicleDetails: string; adminNote: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/ev-rewards/${rewardId}`, body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Reward status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ev-rewards"] });
      setShowUpdateDialog(false);
      setSelectedReward(null);
    },
    onError: () => {
      toast({ title: "Failed to update reward", variant: "destructive" });
    },
  });

  const openUpdate = (reward: EvRewardItem) => {
    setSelectedReward(reward);
    setUpdateForm({
      status: reward.status,
      vehicleModel: reward.vehicleModel || "",
      vehicleDetails: reward.vehicleDetails || "",
      adminNote: reward.adminNote || "",
    });
    setShowUpdateDialog(true);
  };

  const handleUpdate = () => {
    if (!selectedReward) return;
    updateMutation.mutate({ rewardId: selectedReward.id, ...updateForm });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case "PROCESSING": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
      case "DELIVERED": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
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
              <Car className="w-5 h-5" /> EV Vehicle Rewards
            </h1>
            <p className="text-sm text-muted-foreground">{data?.total || 0} total rewards</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data?.rewards && data.rewards.length > 0 ? (
          <div className="space-y-3">
            {data.rewards.map((reward) => (
              <Card key={reward.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{reward.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          User #{reward.userId} | Rs.{parseFloat(reward.rewardAmount).toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Awarded: {new Date(reward.awardedAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(reward.status)}
                      <Button size="sm" variant="outline" onClick={() => openUpdate(reward)}>
                        Manage
                      </Button>
                    </div>
                  </div>
                  {reward.vehicleModel && (
                    <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5">
                      Vehicle: {reward.vehicleModel} {reward.vehicleDetails ? `- ${reward.vehicleDetails}` : ""}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Car className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No EV rewards found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update EV Reward</DialogTitle>
            <DialogDescription>
              {selectedReward && `Manage reward for ${selectedReward.userName} (User #${selectedReward.userId})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={updateForm.status} onValueChange={(v) => setUpdateForm(prev => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vehicle Model</Label>
              <Input
                value={updateForm.vehicleModel}
                onChange={(e) => setUpdateForm(prev => ({ ...prev, vehicleModel: e.target.value }))}
                placeholder="e.g., Ola S1 Pro, Ather 450X"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vehicle Details</Label>
              <Input
                value={updateForm.vehicleDetails}
                onChange={(e) => setUpdateForm(prev => ({ ...prev, vehicleDetails: e.target.value }))}
                placeholder="Color, chassis number, etc."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Admin Note</Label>
              <Textarea
                value={updateForm.adminNote}
                onChange={(e) => setUpdateForm(prev => ({ ...prev, adminNote: e.target.value }))}
                placeholder="Internal notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
