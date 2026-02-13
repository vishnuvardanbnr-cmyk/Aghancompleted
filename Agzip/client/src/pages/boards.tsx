import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap,
  Award,
  Crown,
  Diamond,
  Star,
  Gem,
  UserPlus,
  Users,
  ChevronRight,
  TrendingUp,
  Target,
  CheckCircle,
  IndianRupee,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  Wallet,
} from "lucide-react";

interface BoardInfo {
  type: string;
  status: string;
}

interface TeamMember {
  id: number;
  username: string;
  fullName: string;
  level: number;
  boards: BoardInfo[];
  directCount?: number;
}

interface MatrixPosition {
  id: number;
  username: string;
  fullName: string;
  position: number;
  level: number;
}

const boardsConfig = [
  { type: "EV", name: "EV Board", icon: Zap, gradient: "from-emerald-500 to-green-600", color: "bg-emerald-500", entry: 5900 },
  { type: "SILVER", name: "Silver Board", icon: Award, gradient: "from-gray-400 to-gray-500", color: "bg-gray-400", entry: 5900 },
  { type: "GOLD", name: "Gold Board", icon: Star, gradient: "from-yellow-400 to-amber-500", color: "bg-yellow-500", entry: 10000 },
  { type: "PLATINUM", name: "Platinum Board", icon: Gem, gradient: "from-blue-400 to-indigo-500", color: "bg-blue-400", entry: 20000 },
  { type: "DIAMOND", name: "Diamond Board", icon: Diamond, gradient: "from-purple-400 to-pink-500", color: "bg-purple-400", entry: 50000 },
  { type: "KING", name: "King Board", icon: Crown, gradient: "from-orange-400 to-red-500", color: "bg-orange-500", entry: 100000 },
];

function BoardSelector({ 
  selectedBoard, 
  onSelect,
  userBoards 
}: { 
  selectedBoard: string; 
  onSelect: (type: string) => void;
  userBoards: BoardInfo[];
}) {
  // Find the FIRST (lowest) active board - that's the current board
  // User progresses EV -> Silver -> Gold etc, so we take the first active one
  const boardOrder = ["EV", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "KING"];
  
  let currentBoardType: string | null = null;
  for (const type of boardOrder) {
    const userBoard = userBoards.find(ub => ub.type === type);
    if (userBoard?.status === "ACTIVE") {
      currentBoardType = type;
      break;
    }
  }
  
  // If no active board found, default to EV
  if (!currentBoardType) {
    currentBoardType = "EV";
  }
  
  // Only show: current board + completed boards before it
  const currentBoardIndex = boardOrder.indexOf(currentBoardType);
  
  const visibleBoards = boardsConfig.filter((board, index) => {
    const userBoard = userBoards.find(ub => ub.type === board.type);
    // Show completed boards that are before current
    if (userBoard?.status === "COMPLETED" && index < currentBoardIndex) return true;
    // Show current board only
    if (board.type === currentBoardType) return true;
    return false;
  });

  const getStatus = (boardType: string) => {
    if (boardType === currentBoardType) return "current";
    const userBoard = userBoards.find(ub => ub.type === boardType);
    if (userBoard?.status === "COMPLETED") return "completed";
    return "current";
  };

  return (
    <div className="flex flex-wrap gap-2">
      {visibleBoards.map((board) => {
        const status = getStatus(board.type);
        const Icon = board.icon;
        const isSelected = selectedBoard === board.type;
        const isCurrent = status === "current";
        const isCompleted = status === "completed";
        
        return (
          <Card 
            key={board.type}
            className={`
              cursor-pointer transition-all
              ${isSelected 
                ? 'ring-2 ring-primary' 
                : 'hover-elevate'
              }
              ${isCompleted ? 'bg-muted/50' : ''}
            `}
            onClick={() => onSelect(board.type)}
            data-testid={`board-select-${board.type.toLowerCase()}`}
          >
            <CardContent className="p-2 px-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${board.gradient} flex items-center justify-center text-white relative`}>
                  <Icon className="w-4 h-4" />
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium">{board.type}</span>
                {isCurrent && (
                  <Badge variant="default" className="text-xs py-0 px-1.5 h-5">Current</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MemberSlot({ 
  member, 
  position, 
  onClick 
}: { 
  member?: TeamMember; 
  position: number;
  onClick?: () => void;
}) {
  if (!member) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-2 px-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-dashed border-muted-foreground/20">
              <UserPlus className="w-3.5 h-3.5 text-muted-foreground/50" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Position {position}</p>
            </div>
            <span className="text-xs text-muted-foreground/50">#{position}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover-elevate border-primary/10"
      onClick={onClick}
      data-testid={`member-slot-${member.id}`}
    >
      <CardContent className="py-2 px-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
              {member.fullName.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{member.fullName}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs py-0 h-5">#{position}</Badge>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MemberSlotWithProgress({ 
  slot, 
  position, 
  boardType 
}: { 
  slot: MatrixPosition | null; 
  position: number;
  boardType: string;
}) {
  const { data: childCount } = useQuery<number>({
    queryKey: ["/api/matrix/count", boardType, slot?.id],
    queryFn: async () => {
      const res = await fetch(`/api/matrix/${boardType}/count?memberId=${slot?.id}`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: !!slot,
  });

  const filled = childCount || 0;

  if (!slot) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-dashed">
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
          <UserPlus className="w-3 h-3 text-muted-foreground/50" />
        </div>
        <p className="text-xs text-muted-foreground flex-1">Empty</p>
        <span className="text-xs text-muted-foreground/50">#{position}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
      <Avatar className="w-6 h-6">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {slot.fullName.split(" ").map((n) => n[0]).join("").toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{slot.fullName}</p>
      </div>
      <Badge variant="outline" className="text-xs py-0 h-4 px-1.5 font-medium">
        {filled}/6
      </Badge>
      <Badge variant="secondary" className="text-xs py-0 h-4 px-1.5">#{position}</Badge>
    </div>
  );
}

function MemberDialog({ 
  member, 
  open, 
  onClose,
  boardType = "EV"
}: { 
  member: TeamMember | null; 
  open: boolean; 
  onClose: () => void;
  boardType?: string;
}) {
  const { data: matrixChildren, isLoading } = useQuery<MatrixPosition[]>({
    queryKey: ["/api/matrix", boardType, "member", member?.id],
    queryFn: async () => {
      const res = await fetch(`/api/matrix/${boardType}?memberId=${member?.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!member && open,
  });

  if (!member) return null;

  const positions = matrixChildren || [];
  const directCount = isLoading ? 0 : positions.length;
  const progressPercent = (directCount / 6) * 100;
  
  const slots = Array.from({ length: 6 }, (_, i) => {
    return positions.find(p => p.position === i + 1) || null;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {member.fullName.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base">{member.fullName}</DialogTitle>
              <p className="text-xs text-muted-foreground">@{member.username}</p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm">Matrix Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">{directCount}/6</span>
              <Progress value={progressPercent} className="h-1.5 w-12" />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Active Boards</p>
            <div className="flex flex-wrap gap-1.5">
              {member.boards && member.boards.length > 0 ? (
                member.boards.map((board, idx) => {
                  const config = boardsConfig.find(b => b.type === board.type);
                  const Icon = config?.icon || Zap;
                  return (
                    <Badge 
                      key={idx}
                      className={`text-xs px-2 py-0.5 text-white bg-gradient-to-r ${config?.gradient} border-0`}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {board.type}
                    </Badge>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground">No boards</p>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground mb-2">Matrix Positions ({directCount}/6)</p>
            <div className="space-y-1.5">
              {slots.map((slot, idx) => (
                <MemberSlotWithProgress 
                  key={idx} 
                  slot={slot} 
                  position={idx + 1} 
                  boardType={boardType}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BoardPositions({ boardType }: { boardType: string }) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const config = boardsConfig.find(b => b.type === boardType);

  const { data: matrixPositions } = useQuery<MatrixPosition[]>({
    queryKey: ["/api/matrix", boardType],
    queryFn: async () => {
      const res = await fetch(`/api/matrix/${boardType}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const positions = matrixPositions || [];
  const slots = Array.from({ length: 6 }, (_, i) => {
    const pos = positions.find(p => p.position === i + 1);
    return pos ? { 
      id: pos.id, 
      username: pos.username, 
      fullName: pos.fullName, 
      level: pos.level,
      boards: [{ type: boardType, status: "ACTIVE" }]
    } as TeamMember : null;
  });
  const filledCount = positions.length;
  const progressPercent = (filledCount / 6) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config?.gradient} flex items-center justify-center text-white`}>
            {config && <config.icon className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold">{config?.name}</h3>
            <p className="text-xs text-muted-foreground">Matrix Positions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{filledCount}/6</p>
          </div>
          <Progress value={progressPercent} className="h-2 w-16" />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {slots.map((member, idx) => (
          <MemberSlot 
            key={idx} 
            member={member || undefined} 
            position={idx + 1}
            onClick={member ? () => setSelectedMember(member) : undefined}
          />
        ))}
      </div>

      <MemberDialog 
        member={selectedMember} 
        open={!!selectedMember} 
        onClose={() => setSelectedMember(null)}
        boardType={boardType}
      />
    </div>
  );
}

interface BoardTransaction {
  id: number;
  userId: number;
  amount: string;
  type: string;
  status: string;
  description: string | null;
  createdAt: string;
}

function BoardTransactions({ boardType }: { boardType: string }) {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const limit = 10;
  const config = boardsConfig.find(b => b.type === boardType);

  const { data, isLoading } = useQuery<{
    transactions: BoardTransaction[];
    total: number;
    totalEarnings: string;
  }>({
    queryKey: ["/api/board-transactions", boardType, page, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/board-transactions/${boardType}?${params}`);
      if (!res.ok) return { transactions: [], total: 0, totalEarnings: "0" };
      return res.json();
    },
  });

  const txns = data?.transactions || [];
  const total = data?.total || 0;
  const totalEarnings = parseFloat(data?.totalEarnings || "0");
  const totalPages = Math.ceil(total / limit);

  const getWalletBadge = (desc: string | null, type: string) => {
    if (!desc) return null;
    if (type === "BOARD_ENTRY") return null;
    if (desc.startsWith("[Upgrade]")) {
      return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">Upgrade Wallet</Badge>;
    }
    if (desc.startsWith("[Rebirth]") || desc.toLowerCase().includes("rebirth") || desc.toLowerCase().includes("sub-account")) {
      return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">Rebirth Wallet</Badge>;
    }
    return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">Main Wallet</Badge>;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "DIRECT_SPONSOR": return "Direct Sponsor";
      case "LEVEL_INCOME": return "Level Income";
      case "BOARD_ENTRY": return "Board Entry";
      default: return type.replace(/_/g, " ");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-3">
      <Separator />

      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Board Earnings & Transactions</h3>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Earnings ({config?.name})</span>
            </div>
            <div className="flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-primary" />
              <span className="text-lg font-bold text-primary">{totalEarnings.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">From</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">To</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="h-8 text-xs"
          />
        </div>
        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : txns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No transactions found for this board</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {txns.map((txn) => {
            const isIncome = txn.type === "DIRECT_SPONSOR" || txn.type === "LEVEL_INCOME";
            return (
              <Card key={txn.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isIncome ? "bg-green-100 dark:bg-green-950" : "bg-red-100 dark:bg-red-950"}`}>
                        {isIncome ? (
                          <ArrowDownRight className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{txn.description || getTypeLabel(txn.type)}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs py-0 h-4 px-1.5">{getTypeLabel(txn.type)}</Badge>
                          {getWalletBadge(txn.description, txn.type)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(txn.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-sm font-bold ${isIncome ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {isIncome ? "+" : "-"}₹{parseFloat(txn.amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-3 h-3 mr-1" />
            Prev
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Boards() {
  const { user } = useAuth();
  const [selectedBoard, setSelectedBoard] = useState("EV");

  const { data: team, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team"],
  });

  const { data: userBoards } = useQuery<any[]>({
    queryKey: ["/api/user/boards"],
    queryFn: async () => {
      const res = await fetch("/api/user/boards");
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32" />
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const directTeam = team?.filter(m => m.level === 1) || [];
  const boardsList = userBoards?.map(b => ({ type: b.type, status: b.status })) || [];

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold">My Boards</h1>
          <p className="text-sm text-muted-foreground">Track your matrix positions</p>
        </div>

        <BoardSelector 
          selectedBoard={selectedBoard} 
          onSelect={setSelectedBoard}
          userBoards={boardsList}
        />

        <BoardPositions boardType={selectedBoard} />

        <BoardTransactions boardType={selectedBoard} />
      </div>
    </Layout>
  );
}
