import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  User,
  Users,
  Minus,
  Plus,
  Filter,
  Network,
  Share2,
} from "lucide-react";
import { useState, useRef, useCallback, useMemo } from "react";
import { apiRequest } from "@/lib/queryClient";

interface MatrixEntry {
  userId: number;
  parentId: number | null;
  position: number | null;
  level: number | null;
  fullName: string;
  username: string;
  referralCode: string;
  isAdmin: boolean;
  boards: { type: string; status: string | null }[];
}

interface GenealogyUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  mobile: string;
  sponsorId: number | null;
  referralCode: string;
  isAdmin: boolean;
  createdAt: string;
  boards: { type: string; status: string | null }[];
}

interface TreeNode {
  user: GenealogyUser;
  children: TreeNode[];
  collapsed: boolean;
}

function buildTree(users: GenealogyUser[]): TreeNode[] {
  const userMap = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  for (const u of users) {
    userMap.set(u.id, { user: u, children: [], collapsed: false });
  }

  for (const u of users) {
    const node = userMap.get(u.id)!;
    if (u.sponsorId !== null && u.sponsorId !== undefined && userMap.has(u.sponsorId) && u.sponsorId !== u.id) {
      userMap.get(u.sponsorId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function buildMatrixTree(entries: MatrixEntry[]): TreeNode[] {
  const nodeMap = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  for (const e of entries) {
    const user: GenealogyUser = {
      id: e.userId,
      username: e.username,
      fullName: e.fullName,
      email: "",
      mobile: "",
      sponsorId: e.parentId,
      referralCode: e.referralCode,
      isAdmin: e.isAdmin,
      createdAt: "",
      boards: e.boards,
    };
    nodeMap.set(e.userId, { user, children: [], collapsed: false });
  }

  for (const e of entries) {
    const node = nodeMap.get(e.userId)!;
    if (e.parentId !== null && nodeMap.has(e.parentId)) {
      nodeMap.get(e.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by their position in the board
  function sortChildren(nodes: TreeNode[]) {
    for (const n of nodes) {
      const entry = entries.find(e => e.userId === n.user.id);
      n.children.sort((a, b) => {
        const aPos = entries.find(e => e.userId === a.user.id)?.position ?? 99;
        const bPos = entries.find(e => e.userId === b.user.id)?.position ?? 99;
        return aPos - bPos;
      });
      sortChildren(n.children);
    }
  }
  sortChildren(roots);

  return roots;
}

function getBoardBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    EV: "bg-emerald-100 text-emerald-700 border-emerald-200",
    SILVER: "bg-slate-100 text-slate-700 border-slate-200",
    GOLD: "bg-amber-100 text-amber-700 border-amber-200",
    PLATINUM: "bg-cyan-100 text-cyan-700 border-cyan-200",
    DIAMOND: "bg-violet-100 text-violet-700 border-violet-200",
    KING: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return colors[type] || "bg-gray-100 text-gray-700 border-gray-200";
}

const MAX_TREE_DEPTH = 20;

function TreeNodeCard({
  node,
  onToggle,
  searchTerm,
  highlightedId,
  depth = 0,
  isOnly = false,
}: {
  node: TreeNode;
  onToggle: (id: number) => void;
  searchTerm: string;
  highlightedId: number | null;
  depth?: number;
  isOnly?: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isHighlighted = highlightedId === node.user.id;
  const matchesSearch =
    searchTerm &&
    (node.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.user.referralCode.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col items-center relative">
      <div
        className={`relative bg-white dark:bg-card rounded-xl shadow-md border-2 w-[200px] transition-all duration-200 ${
          isHighlighted
            ? "border-emerald-500 ring-2 ring-emerald-400 ring-offset-2 shadow-emerald-100 shadow-lg"
            : matchesSearch
            ? "border-amber-400 shadow-amber-100 shadow-lg"
            : "border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-emerald-200"
        }`}
      >
        <div className="p-3.5">
          <div className="flex items-start gap-2.5 mb-2">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                node.user.isAdmin
                  ? "bg-emerald-500 text-white"
                  : node.user.boards.length > 0
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">
                {node.user.fullName}
              </p>
              <p className="text-xs text-gray-400 truncate">@{node.user.username}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
              {node.user.referralCode}
            </span>
            {node.children.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Users className="w-3 h-3" />
                {node.children.length}
              </span>
            )}
          </div>

          {node.user.boards.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {node.user.boards.map((b, i) => (
                <span
                  key={i}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getBoardBadgeColor(b.type)}`}
                >
                  {b.type}
                </span>
              ))}
            </div>
          )}
        </div>

        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.user.id);
            }}
            className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-10 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 hover:scale-110 transition-all duration-150 border-2 border-white dark:border-gray-800"
          >
            {node.collapsed ? (
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            ) : (
              <Minus className="w-3.5 h-3.5" strokeWidth={3} />
            )}
          </button>
        )}
      </div>

      {hasChildren && !node.collapsed && depth < MAX_TREE_DEPTH && (
        <div className="flex flex-col items-center w-full">
          <div className="w-[2px] h-8 bg-emerald-300 dark:bg-emerald-600" />

          <div className="relative">
            {node.children.length > 1 && (
              <div className="absolute top-0 left-0 right-0 flex">
                <div className="flex-1" />
                {node.children.map((_, idx) => (
                  <div key={idx} className="flex-1" />
                ))}
                <div className="flex-1" />
              </div>
            )}

            <div className="relative flex">
              {node.children.length > 1 && (
                <svg
                  className="absolute top-0 left-0 w-full overflow-visible"
                  height="2"
                  style={{ zIndex: 1 }}
                >
                  <line
                    x1="50%"
                    y1="0"
                    x2="50%"
                    y2="0"
                    stroke="transparent"
                  />
                </svg>
              )}

              {node.children.map((child, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === node.children.length - 1;
                const isSingle = node.children.length === 1;

                return (
                  <div key={child.user.id} className="flex flex-col items-center relative" style={{ minWidth: "220px" }}>
                    {!isSingle && (
                      <div className="relative w-full h-[2px]">
                        <div
                          className="absolute top-0 h-[2px] bg-emerald-300 dark:bg-emerald-600"
                          style={{
                            left: isFirst ? "50%" : "0",
                            right: isLast ? "50%" : "0",
                          }}
                        />
                      </div>
                    )}

                    <div className="w-[2px] h-6 bg-emerald-300 dark:bg-emerald-600" />

                    <TreeNodeCard
                      node={child}
                      onToggle={onToggle}
                      searchTerm={searchTerm}
                      highlightedId={highlightedId}
                      depth={depth + 1}
                      isOnly={isSingle}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const BOARD_OPTIONS = ["EV", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "KING"];

export default function AdminGenealogy() {
  const [scale, setScale] = useState(0.7);
  const [position, setPosition] = useState({ x: 40, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  const [treeMode, setTreeMode] = useState<"matrix" | "sponsor">("matrix");
  const [matrixBoard, setMatrixBoard] = useState("EV");
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: sponsorUsers, isLoading: sponsorLoading } = useQuery<GenealogyUser[]>({
    queryKey: ["/api/admin/genealogy"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/genealogy");
      return res.json();
    },
    enabled: treeMode === "sponsor",
  });

  const { data: matrixEntries, isLoading: matrixLoading } = useQuery<MatrixEntry[]>({
    queryKey: [`/api/admin/matrix-tree/${matrixBoard}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/matrix-tree/${matrixBoard}`);
      return res.json();
    },
    enabled: treeMode === "matrix",
  });

  const isLoading = treeMode === "matrix" ? matrixLoading : sponsorLoading;

  const allUsers = treeMode === "sponsor" ? (sponsorUsers || []) : [];

  const tree = useMemo(() => {
    let built: TreeNode[];
    if (treeMode === "matrix") {
      if (!matrixEntries?.length) return [];
      built = buildMatrixTree(matrixEntries);
    } else {
      if (!allUsers.length) return [];
      built = buildTree(allUsers);
    }
    const applyCollapsed = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        n.collapsed = collapsedNodes.has(n.user.id);
        applyCollapsed(n.children);
      }
    };
    applyCollapsed(built);
    return built;
  }, [treeMode, matrixEntries, allUsers, collapsedNodes]);

  const toggleNode = useCallback((id: number) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    const ids = treeMode === "matrix"
      ? (matrixEntries || []).map((e) => e.userId)
      : (sponsorUsers || []).map((u) => u.id);
    setCollapsedNodes(new Set(ids));
  }, [treeMode, matrixEntries, sponsorUsers]);

  const expandAll = useCallback(() => {
    setCollapsedNodes(new Set());
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale((prev) => Math.min(Math.max(prev + delta, 0.1), 2));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    },
    [position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    },
    [position]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setScale(0.7);
    setPosition({ x: 40, y: 20 });
  }, []);

  // Unified search across whichever data is active
  const allNodes: { id: number; fullName: string; username: string; referralCode: string }[] = useMemo(() => {
    if (treeMode === "matrix") {
      return (matrixEntries || []).map(e => ({ id: e.userId, fullName: e.fullName, username: e.username, referralCode: e.referralCode }));
    }
    return (sponsorUsers || []).map(u => ({ id: u.id, fullName: u.fullName, username: u.username, referralCode: u.referralCode }));
  }, [treeMode, matrixEntries, sponsorUsers]);

  const searchResults = useMemo(() => {
    if (!searchTerm || !allNodes.length) return [];
    const q = searchTerm.toLowerCase();
    return allNodes.filter(u =>
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.referralCode.toLowerCase().includes(q)
    );
  }, [searchTerm, allNodes]);

  const totalNodes = allNodes.length;

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-[600px] bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
            <GitBranch className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Genealogy Tree</h1>
            <p className="text-sm text-muted-foreground">
              {treeMode === "matrix" ? `Matrix placement tree — ${matrixBoard} Board` : "Sponsor referral hierarchy"}
            </p>
          </div>
        </div>

        {/* Tree mode + board selector */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => { setTreeMode("matrix"); setCollapsedNodes(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                treeMode === "matrix" ? "bg-emerald-500 text-white" : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Matrix Tree
            </button>
            <button
              onClick={() => { setTreeMode("sponsor"); setCollapsedNodes(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                treeMode === "sponsor" ? "bg-emerald-500 text-white" : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Sponsor Tree
            </button>
          </div>

          {treeMode === "matrix" && (
            <Select value={matrixBoard} onValueChange={(v) => { setMatrixBoard(v); setCollapsedNodes(new Set()); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOARD_OPTIONS.map(b => (
                  <SelectItem key={b} value={b}>{b} Board</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{totalNodes}</span> members
            &middot;
            <span className="font-semibold text-foreground">{Math.round(scale * 100)}%</span> zoom
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, username, or referral code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedId(null);
              }}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll} className="text-xs">
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs">
              Collapse All
            </Button>
            <div className="w-px bg-border" />
            <Button variant="outline" size="icon" onClick={() => setScale((s) => Math.min(s + 0.1, 2))} title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setScale((s) => Math.max(s - 0.1, 0.1))} title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={resetView} title="Reset View">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {searchTerm && searchResults.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground self-center">Results:</span>
            {searchResults.slice(0, 10).map((u) => (
              <button
                key={u.id}
                onClick={() => setHighlightedId(u.id)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  highlightedId === u.id
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-card border-border hover:bg-accent"
                }`}
              >
                {u.fullName} (@{u.username})
              </button>
            ))}
            {searchResults.length > 10 && (
              <span className="text-xs text-muted-foreground self-center">
                +{searchResults.length - 10} more
              </span>
            )}
          </div>
        )}

        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-0">
            <div
              ref={containerRef}
              className="relative overflow-hidden"
              style={{
                height: "calc(100vh - 380px)",
                minHeight: "450px",
                cursor: isDragging ? "grabbing" : "grab",
                background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 25%, #f0f9ff 50%, #f5f3ff 75%, #fdf4ff 100%)",
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: "radial-gradient(circle, #10b981 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }} />

              <div
                ref={contentRef}
                className="absolute select-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: "0 0",
                  padding: "30px",
                }}
              >
                {tree.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Users className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-xl font-semibold">No users found</p>
                    <p className="text-sm mt-1">The genealogy tree will appear here once users register.</p>
                  </div>
                ) : (
                  <div className="flex gap-12">
                    {tree.map((root) => (
                      <TreeNodeCard
                        key={root.user.id}
                        node={root}
                        onToggle={toggleNode}
                        searchTerm={searchTerm}
                        highlightedId={highlightedId}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="absolute bottom-3 right-3 text-[11px] text-muted-foreground bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
                Scroll to zoom &middot; Drag to pan
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
