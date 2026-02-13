import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, Copy, Share2, CheckCircle, Zap, Award, Star, Gem, Diamond, Crown, Mail, Phone, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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

const boardConfig = [
  { type: "EV", icon: Zap, color: "bg-emerald-500" },
  { type: "SILVER", icon: Award, color: "bg-gray-400" },
  { type: "GOLD", icon: Star, color: "bg-yellow-500" },
  { type: "PLATINUM", icon: Gem, color: "bg-blue-400" },
  { type: "DIAMOND", icon: Diamond, color: "bg-purple-400" },
  { type: "KING", icon: Crown, color: "bg-orange-500" },
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
