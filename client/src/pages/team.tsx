import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, Copy, Share2, CheckCircle, Zap, Award, Star, Gem, Diamond, Crown, Mail, Phone, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Link, GitBranch, ChevronRightIcon, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BoardInfo {
  type: string;
  status: string;
}

interface TeamMember {
  id: number;
  username: string;
  fullName: string;
  email: string;
  mobile: string;
  referralCode: string;
  createdAt: string;
  level: number;
  boards: BoardInfo[];
}

interface UserBoard {
  id: number;
  userId: number;
  type: string;
  status: string;
}

interface MatrixChild {
  id: number;
  username: string;
  fullName: string;
  position: number;
  level: number;
}

const BOARD_SEQUENCE = ["EV", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "KING"];

const boardConfig = [
  { type: "EV", icon: Zap, color: "bg-emerald-500", textColor: "text-emerald-600", borderColor: "border-emerald-200", bgLight: "bg-emerald-50" },
  { type: "SILVER", icon: Award, color: "bg-gray-400", textColor: "text-gray-600", borderColor: "border-gray-200", bgLight: "bg-gray-50" },
  { type: "GOLD", icon: Star, color: "bg-yellow-500", textColor: "text-yellow-600", borderColor: "border-yellow-200", bgLight: "bg-yellow-50" },
  { type: "PLATINUM", icon: Gem, color: "bg-blue-400", textColor: "text-blue-600", borderColor: "border-blue-200", bgLight: "bg-blue-50" },
  { type: "DIAMOND", icon: Diamond, color: "bg-purple-400", textColor: "text-purple-600", borderColor: "border-purple-200", bgLight: "bg-purple-50" },
  { type: "KING", icon: Crown, color: "bg-orange-500", textColor: "text-orange-600", borderColor: "border-orange-200", bgLight: "bg-orange-50" },
];

function BoardBadge({ type, status }: { type: string; status: string }) {
  const config = boardConfig.find(b => b.type === type);
  const Icon = config?.icon || Zap;
  const colorClass = config?.color || "bg-primary";

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white ${colorClass} ${status === "COMPLETED" ? "opacity-60" : ""}`}
      title={`${type} Board - ${status}`}
    >
      <Icon className="w-3 h-3" />
      <span>{type}</span>
    </div>
  );
}

function MemberDetailCard({ member }: { member: TeamMember }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="cursor-pointer"
      data-testid={`member-card-${member.id}`}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-3 w-full overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="w-9 h-9 sm:w-10 sm:h-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
              {member.fullName.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{member.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Badge variant="outline" className="font-mono text-[10px] sm:text-xs hidden sm:inline-flex">{member.referralCode}</Badge>
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div className="sm:hidden">
              <Badge variant="outline" className="font-mono text-[10px]">{member.referralCode}</Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-x-4 sm:gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 min-w-0">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 shrink-0" />
                <span>{member.mobile}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>Joined {format(new Date(member.createdAt), "dd MMM yy")}</span>
              </div>
            </div>

            {member.boards && member.boards.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {member.boards.map((board, idx) => (
                  <BoardBadge key={idx} type={board.type} status={board.status} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface BreadcrumbEntry {
  userId: number;
  name: string;
}

function GenealogyView({ userBoards, currentUserId, currentUserName }: {
  userBoards: UserBoard[];
  currentUserId: number;
  currentUserName: string;
}) {
  const availableBoards = BOARD_SEQUENCE.filter(type =>
    userBoards.some(b => b.type === type)
  );

  const [selectedBoard, setSelectedBoard] = useState<string>(availableBoards[0] || "");
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([
    { userId: currentUserId, name: "Me" }
  ]);

  const currentNode = breadcrumb[breadcrumb.length - 1];

  const [children, setChildren] = useState<MatrixChild[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function loadChildren(board: string, userId: number) {
    if (!board) return;
    setIsLoading(true);
    setChildren([]);
    try {
      const url = userId !== currentUserId
        ? `/api/matrix/${board}?memberId=${userId}`
        : `/api/matrix/${board}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      setChildren(await res.json());
    } catch {
      setChildren([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Load on mount and whenever board changes
  useEffect(() => {
    loadChildren(selectedBoard, currentUserId);
    setBreadcrumb([{ userId: currentUserId, name: "Me" }]);
  }, [selectedBoard]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBoardSelect = (boardType: string) => {
    setSelectedBoard(boardType);
    // useEffect will handle the fetch
  };

  const handleMemberClick = (child: MatrixChild) => {
    if (child.id === currentNode.userId) return;
    setBreadcrumb(prev => [...prev, { userId: child.id, name: child.fullName }]);
    // Directly fetch with the child's id — no relay through state
    loadChildren(selectedBoard, child.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === breadcrumb.length - 1) return;
    const targetEntry = breadcrumb[index];
    setBreadcrumb(prev => prev.slice(0, index + 1));
    loadChildren(selectedBoard, targetEntry.userId);
  };

  const selectedConfig = boardConfig.find(b => b.type === selectedBoard);

  if (availableBoards.length === 0) {
    return (
      <div className="text-center py-8">
        <GitBranch className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">You haven't joined any board yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {availableBoards.map(boardType => {
          const cfg = boardConfig.find(b => b.type === boardType);
          const Icon = cfg?.icon || Zap;
          const isSelected = selectedBoard === boardType;
          return (
            <button
              key={boardType}
              onClick={() => handleBoardSelect(boardType)}
              data-testid={`button-board-select-${boardType}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isSelected
                  ? `${cfg?.color} text-white border-transparent shadow`
                  : `bg-background border-border text-muted-foreground hover:border-primary/40`
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {boardType}
            </button>
          );
        })}
      </div>

      {selectedBoard && (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            {breadcrumb.map((entry, index) => {
              const isLast = index === breadcrumb.length - 1;
              return (
                <span key={index} className="flex items-center gap-1.5">
                  {index > 0 && <ChevronRightIcon className="w-3 h-3 text-muted-foreground shrink-0" />}
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    disabled={isLast}
                    data-testid={`breadcrumb-${index}`}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      isLast
                        ? `${selectedConfig?.color || "bg-primary"} text-white border-transparent shadow-sm cursor-default`
                        : "bg-muted/60 text-muted-foreground border-border hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer"
                    }`}
                  >
                    {index === 0 && <Home className="w-3 h-3 shrink-0" />}
                    {entry.name}
                  </button>
                </span>
              );
            })}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : children && children.length > 0 ? (
            <div className="space-y-2">
              {children.map((child) => {
                const initials = child.fullName.split(" ").map(n => n[0]).join("").toUpperCase();
                return (
                  <button
                    key={child.id}
                    onClick={() => handleMemberClick(child)}
                    data-testid={`genealogy-member-${child.id}`}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-all duration-150
                      hover:shadow-sm hover:border-primary/30 active:scale-[0.99]
                      ${selectedConfig?.bgLight || "bg-muted/20"} ${selectedConfig?.borderColor || "border-border"}
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shrink-0 ${selectedConfig?.color || "bg-primary"}`}>
                      {initials.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{child.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{child.username}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${selectedConfig?.bgLight || "bg-muted"} ${selectedConfig?.textColor || "text-primary"} ${selectedConfig?.borderColor || "border-border"}`}>
                        Pos {child.position}
                      </span>
                      <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 rounded-lg border border-dashed space-y-3">
              <Users className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No members under this position yet</p>
              {breadcrumb.length > 1 && (
                <button
                  onClick={() => handleBreadcrumbClick(breadcrumb.length - 2)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-genealogy-back"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Go back
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const ITEMS_PER_PAGE = 5;

export default function Team() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: team, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team"],
  });

  const { data: userBoards } = useQuery<UserBoard[]>({
    queryKey: ["/api/user/boards"],
  });

  const referralCode = user?.referralCode ? `AP${user.referralCode}` : "";
  const referralLink = referralCode ? `${window.location.origin}/auth?ref=${referralCode}` : "";

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast({ title: "Referral code copied!" });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast({ title: "Referral link copied!" });
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const shareViaWhatsApp = () => {
    if (referralLink) {
      const message = `Join Aghan Promoters - EV 2-Wheeler Promotion Platform! Register using my referral link and start earning:\n\n${referralLink}\n\nReferral Code: ${referralCode}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const directTeam = team?.filter(m => m.level === 1) || [];

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold">My Team</h1>
          <p className="text-sm text-muted-foreground">View your direct referrals</p>
        </div>

        <Card>
          <CardHeader className="py-3 px-3 sm:px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary shrink-0" />
              Invite & Earn
            </CardTitle>
            <CardDescription className="text-xs">Share your code or link to invite others and earn Rs.500 per referral!</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Your referral code</p>
                <p className="text-lg sm:text-xl font-mono font-bold text-primary truncate" data-testid="text-referral-code">
                  {referralCode}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={copyReferralCode} className="shrink-0" data-testid="button-copy-code">
                {copiedCode ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                Copy
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
              <p className="text-xs text-muted-foreground">Your referral link</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 p-2 rounded bg-background border text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                  {referralLink}
                </div>
                <Button variant="outline" size="sm" onClick={copyReferralLink} className="shrink-0" data-testid="button-copy-link">
                  {copiedLink ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : <Link className="w-3.5 h-3.5 mr-1" />}
                  Copy
                </Button>
              </div>
            </div>

            <Button
              onClick={shareViaWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#1da851] text-white"
              size="sm"
              data-testid="button-share-whatsapp"
            >
              <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Share via WhatsApp
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-2 sm:gap-3 grid-cols-2">
          <Card>
            <CardContent className="p-2 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary" data-testid="text-direct-count">
                {directTeam.length}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Direct Referrals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-chart-3">6</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">For EV Reward</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              Genealogy View
            </CardTitle>
            <CardDescription className="text-xs">
              Browse your matrix tree by board. Click a member to see their downline.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-4">
            <GenealogyView
              userBoards={userBoards || []}
              currentUserId={user?.id || 0}
              currentUserName={user?.fullName || "Me"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Direct Team Members</CardTitle>
            <CardDescription className="text-xs">Your personally referred members</CardDescription>
          </CardHeader>
          <CardContent>
            {directTeam.length > 0 ? (
              <>
                <div className="space-y-3">
                  {directTeam
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((member) => (
                      <MemberDetailCard key={member.id} member={member} />
                    ))}
                </div>
                {directTeam.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, directTeam.length)} of {directTeam.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-team-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm px-2">
                        {currentPage} / {Math.ceil(directTeam.length / ITEMS_PER_PAGE)}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(directTeam.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={currentPage >= Math.ceil(directTeam.length / ITEMS_PER_PAGE)}
                        data-testid="button-next-team-page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-sm font-medium mb-2">No team members yet</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Share your referral code to start building your team
                </p>
                <Button size="sm" onClick={shareViaWhatsApp} data-testid="button-start-sharing">
                  <Share2 className="w-3.5 h-3.5 mr-1" />
                  Start Sharing
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
