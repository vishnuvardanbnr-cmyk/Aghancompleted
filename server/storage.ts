
import { users, wallets, boards, matrixPositions, transactions, withdrawals, rebirthAccounts, invoices, kycDocuments, evRewards, smtpSettings, type User, type InsertUser, type Wallet, type Board, type Transaction, type RebirthAccount, type Invoice, type KycDocument, type EvReward, type SmtpSettings } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, count, asc, isNull, desc, or, gte, lte } from "drizzle-orm";

// Board configuration
export const BOARD_CONFIG: Record<string, { entry: number; gst: number; company?: number; directSponsor?: number; levelIncome: number; levels: number }> = {
  EV: { entry: 5900, gst: 900, company: 3900, directSponsor: 500, levelIncome: 150, levels: 4 },
  SILVER: { entry: 5900, gst: 900, levelIncome: 500, levels: 6 },
  GOLD: { entry: 10000, gst: 0, levelIncome: 1000, levels: 5 },
  PLATINUM: { entry: 20000, gst: 0, levelIncome: 2000, levels: 5 },
  DIAMOND: { entry: 50000, gst: 0, levelIncome: 5000, levels: 5 },
  KING: { entry: 100000, gst: 0, levelIncome: 10000, levels: 5 },
};

// Board sequence for progression
export const BOARD_SEQUENCE = ["EV", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "KING"];

function getNextBoard(currentBoard: string): string | null {
  const index = BOARD_SEQUENCE.indexOf(currentBoard);
  if (index === -1 || index === BOARD_SEQUENCE.length - 1) return null;
  return BOARD_SEQUENCE[index + 1];
}

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  getReferrals(userId: number): Promise<User[]>;
  getDirectReferralCount(userId: number): Promise<number>;

  // Wallet
  getWallet(userId: number): Promise<Wallet | undefined>;
  createWallet(userId: number): Promise<Wallet>;
  updateWallet(userId: number, updates: Partial<Wallet>): Promise<Wallet>;
  addToMainWallet(userId: number, amount: number, description: string): Promise<void>;
  addToUpgradeWallet(userId: number, amount: number, description: string): Promise<void>;
  addToRebirthWallet(userId: number, amount: number, description: string): Promise<void>;
  createTransaction(transaction: any): Promise<Transaction>;
  getTransactions(userId: number): Promise<Transaction[]>;
  getBoardTransactions(userId: number, boardType: string, page: number, limit: number, startDate: string | null, endDate: string | null): Promise<{ transactions: Transaction[]; total: number; totalEarnings: string }>;

  // Boards
  getBoard(userId: number, type: string): Promise<Board | undefined>;
  getUserBoards(userId: number): Promise<Board[]>;
  createBoard(userId: number, type: string): Promise<Board>;
  getMatrixPositions(boardId: number): Promise<any[]>;
  getMatrixChildrenCount(parentId: number, boardType: string): Promise<number>;
  getMatrixChildren(parentId: number, boardType: string): Promise<any[]>;
  findPlacementParent(sponsorId: number, boardType: string): Promise<number>;
  findJunglePlacementParent(boardType: string): Promise<number | null>;
  addToMatrix(boardId: number, userId: number, parentId: number | null, position: number, level: number): Promise<void>;
  getUplineChain(userId: number, boardType: string, maxLevels: number): Promise<number[]>;
  
  // Board Operations
  joinBoard(userId: number, boardType: string): Promise<{ success: boolean; message: string }>;
  checkAndPromoteBoard(userId: number, boardType: string): Promise<void>;
  updateBoardStatus(userId: number, boardType: string, status: string): Promise<void>;
  
  // Withdrawal
  createWithdrawal(userId: number, amount: number, bankDetails: string): Promise<any>;
  
  // Rebirth Accounts
  getRebirthAccounts(userId: number): Promise<RebirthAccount[]>;
  getRebirthAccount(userId: number, boardType: string): Promise<RebirthAccount | undefined>;
  getActiveRebirthAccount(userId: number, boardType: string): Promise<RebirthAccount | undefined>;
  createRebirthAccount(userId: number, boardType: string, threshold: number, nextBoardType: string | null, role?: "MOTHER" | "SUB", parentAccountId?: number | null, initialBalance?: number): Promise<RebirthAccount>;
  createSubAccountFromMother(motherAccountId: number, transferAmount?: number): Promise<RebirthAccount>;
  addToRebirthAccount(userId: number, boardType: string, amount: number, description: string): Promise<void>;
}

const MAX_REBIRTH_ACCOUNTS = 38;

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async promoteToAdmin(userId: number): Promise<void> {
    await db.update(users).set({ isAdmin: true }).where(eq(users.id, userId));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user;
  }

  async getTotalUserCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
    return result[0]?.count ?? 0;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateProfilePicture(userId: number, filePath: string): Promise<void> {
    await db.update(users).set({ profilePicture: filePath }).where(eq(users.id, userId));
  }

  async getReferrals(userId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.sponsorId, userId));
  }

  async getDirectReferralCount(userId: number): Promise<number> {
    const result = await db.select({ count: count() }).from(users).where(eq(users.sponsorId, userId));
    return result[0]?.count || 0;
  }

  async getActiveDirectReferralCount(userId: number): Promise<number> {
    // Count direct referrals who have joined the EV board (active members)
    const result = await db
      .select({ count: count() })
      .from(users)
      .innerJoin(boards, eq(users.id, boards.userId))
      .where(and(
        eq(users.sponsorId, userId),
        eq(boards.type, "EV")
      ));
    return result[0]?.count || 0;
  }

  async getWallet(userId: number): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet;
  }

  async createWallet(userId: number): Promise<Wallet> {
    // Give Rs.5900 initial balance for testing
    const [wallet] = await db.insert(wallets).values({ 
      userId,
      mainBalance: "5900"
    }).returning();
    return wallet;
  }

  async updateWallet(userId: number, updates: Partial<Wallet>): Promise<Wallet> {
    const [wallet] = await db.update(wallets).set(updates).where(eq(wallets.userId, userId)).returning();
    return wallet;
  }

  async addToMainWallet(userId: number, amount: number, description: string): Promise<void> {
    const wallet = await this.getWallet(userId);
    if (!wallet) return;
    
    const newBalance = Number(wallet.mainBalance) + amount;
    const newTotal = Number(wallet.totalEarnings) + amount;
    
    await this.updateWallet(userId, { 
      mainBalance: newBalance.toString(),
      totalEarnings: newTotal.toString()
    });
    
    await this.createTransaction({
      userId,
      amount: amount.toString(),
      type: "REFERRAL_INCOME",
      description,
      status: "COMPLETED"
    });
  }

  async addToUpgradeWallet(userId: number, amount: number, description: string): Promise<void> {
    const wallet = await this.getWallet(userId);
    if (!wallet) return;
    
    const newBalance = Number(wallet.upgradeBalance) + amount;
    
    await this.updateWallet(userId, { 
      upgradeBalance: newBalance.toString(),
    });

    const boardMatch = description.match(/\((\w+)\s*Board\)/i) || description.match(/\((\w+)\)/i);
    if (boardMatch) {
      const boardType = boardMatch[1].toUpperCase();
      const account = await this.getActiveRebirthAccount(userId, boardType);
      if (account) {
        const newAccountBalance = Number(account.balance) + amount;
        await db.update(rebirthAccounts)
          .set({ balance: newAccountBalance.toString() })
          .where(eq(rebirthAccounts.id, account.id));
      }
    }
    
    await this.createTransaction({
      userId,
      amount: amount.toString(),
      type: "LEVEL_INCOME",
      description: `[Upgrade] ${description}`,
      status: "COMPLETED"
    });
  }

  async addToRebirthWallet(userId: number, amount: number, description: string): Promise<void> {
    const wallet = await this.getWallet(userId);
    if (!wallet) return;
    
    const newBalance = Number(wallet.rebirthBalance) + amount;
    
    await this.updateWallet(userId, { 
      rebirthBalance: newBalance.toString(),
    });
    
    await this.createTransaction({
      userId,
      amount: amount.toString(),
      type: "LEVEL_INCOME",
      description,
      status: "COMPLETED"
    });

    if (newBalance >= 5900) {
      await this.triggerAutoRebirth(userId);
    }
  }

  async createTransaction(transaction: any): Promise<Transaction> {
    const [txn] = await db.insert(transactions).values(transaction).returning();
    return txn;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(sql`${transactions.createdAt} DESC`);
  }

  async getBoardTransactions(userId: number, boardType: string, page: number, limit: number, startDate: string | null, endDate: string | null): Promise<{ transactions: Transaction[]; total: number; totalEarnings: string }> {
    const offset = (page - 1) * limit;

    const boardDescFilter = sql`(
      ${transactions.description} ILIKE ${'%(' + boardType + ' Board)%'}
      OR ${transactions.description} ILIKE ${'%(' + boardType + ')%'}
      OR ${transactions.description} ILIKE ${'%' + boardType + ' Board entry%'}
      OR ${transactions.description} ILIKE ${'%' + boardType + ' Board Entry%'}
    )`;

    const conditions = [
      eq(transactions.userId, userId),
      boardDescFilter,
    ];

    if (startDate) {
      conditions.push(sql`${transactions.createdAt} >= ${new Date(startDate)}`);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(sql`${transactions.createdAt} <= ${end}`);
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(whereClause);

    const txns = await db
      .select()
      .from(transactions)
      .where(whereClause)
      .orderBy(sql`${transactions.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    const incomeFilter = sql`(
      ${transactions.description} ILIKE ${'%(' + boardType + ' Board)%'}
      OR ${transactions.description} ILIKE ${'%(' + boardType + ')%'}
    )`;

    const [earningsResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        incomeFilter,
        sql`${transactions.type} IN ('DIRECT_SPONSOR', 'LEVEL_INCOME', 'REFERRAL_INCOME')`
      ));

    return {
      transactions: txns,
      total: countResult?.count || 0,
      totalEarnings: earningsResult?.total || "0",
    };
  }

  async getBoard(userId: number, type: string): Promise<Board | undefined> {
    const [board] = await db.select().from(boards).where(and(eq(boards.userId, userId), eq(boards.type, type as any)));
    return board;
  }
  
  async isBoardFromSubAccount(userId: number, boardType: string): Promise<boolean> {
    const board = await this.getBoard(userId, boardType);
    return board?.isFromSubAccount === true;
  }

  async getUserBoards(userId: number): Promise<Board[]> {
    return await db.select().from(boards).where(eq(boards.userId, userId));
  }

  async createBoard(userId: number, type: string, isFromSubAccount: boolean = false, sourceRebirthAccountId: number | null = null): Promise<Board> {
    const [board] = await db.insert(boards).values({ 
      userId, 
      type: type as any,
      isFromSubAccount,
      sourceRebirthAccountId
    }).returning();
    return board;
  }

  async getMatrixPositions(boardId: number): Promise<any[]> {
    // This needs to fetch the positions for a specific board type context
    // For simplicity, we just return all positions linked to this board instance
    return await db.select().from(matrixPositions).where(eq(matrixPositions.boardId, boardId));
  }

  async getMatrixChildrenCount(parentId: number, boardType: string): Promise<number> {
    // Count how many direct children this parent has in the given board type
    const result = await db
      .select({ count: count() })
      .from(matrixPositions)
      .innerJoin(boards, eq(matrixPositions.boardId, boards.id))
      .where(and(
        eq(matrixPositions.parentId, parentId),
        eq(boards.type, boardType as any)
      ));
    return result[0]?.count || 0;
  }

  async getMatrixChildren(parentId: number, boardType: string): Promise<any[]> {
    // Get all direct children in the matrix with their user details
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        position: matrixPositions.position,
        level: matrixPositions.level,
      })
      .from(matrixPositions)
      .innerJoin(boards, eq(matrixPositions.boardId, boards.id))
      .innerJoin(users, eq(matrixPositions.userId, users.id))
      .where(and(
        eq(matrixPositions.parentId, parentId),
        eq(boards.type, boardType as any)
      ))
      .orderBy(asc(matrixPositions.position));
    return result;
  }

  async findPlacementParent(sponsorId: number, boardType: string): Promise<number> {
    // First Come First Fill: Find where to place new user
    // 1. Check if sponsor has less than 6 children - place under sponsor
    // 2. Otherwise, BFS to find first person with available slot
    
    const sponsorChildCount = await this.getMatrixChildrenCount(sponsorId, boardType);
    if (sponsorChildCount < 6) {
      return sponsorId;
    }
    
    // BFS to find first available slot
    const queue: number[] = [sponsorId];
    const visited = new Set<number>();
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      // Get children of current user in this board
      const children = await db
        .select({ userId: matrixPositions.userId })
        .from(matrixPositions)
        .innerJoin(boards, eq(matrixPositions.boardId, boards.id))
        .where(and(
          eq(matrixPositions.parentId, currentId),
          eq(boards.type, boardType as any)
        ))
        .orderBy(asc(matrixPositions.position));
      
      if (children.length < 6) {
        return currentId;
      }
      
      // Add children to queue for next level search
      for (const child of children) {
        if (!visited.has(child.userId)) {
          queue.push(child.userId);
        }
      }
    }
    
    // Fallback to sponsor if nothing found
    return sponsorId;
  }

  async findJunglePlacementParent(boardType: string): Promise<number | null> {
    // Jungle FCFS: Global level-order placement that SPREADS across parents
    // Pattern: A gets 1, B gets 1, C gets 1... then A gets 2, B gets 2...
    // This ensures fair distribution across all parents at each level before going deeper
    
    // Get ALL users in this board type with their matrix info
    const allPositions = await db
      .select({ 
        id: matrixPositions.id,
        userId: matrixPositions.userId,
        parentId: matrixPositions.parentId,
        position: matrixPositions.position
      })
      .from(matrixPositions)
      .innerJoin(boards, eq(matrixPositions.boardId, boards.id))
      .where(eq(boards.type, boardType as any))
      .orderBy(asc(matrixPositions.id));
    
    if (allPositions.length === 0) {
      // No one in this board yet - new user becomes root
      return null;
    }
    
    // Build a map of userId -> children count
    const childrenCount = new Map<number, number>();
    for (const pos of allPositions) {
      childrenCount.set(pos.userId, 0);
    }
    for (const pos of allPositions) {
      if (pos.parentId !== null) {
        childrenCount.set(pos.parentId, (childrenCount.get(pos.parentId) || 0) + 1);
      }
    }
    
    // Find root users (those with no parent) - ordered by insertion
    const roots: number[] = [];
    for (const pos of allPositions) {
      if (pos.parentId === null) {
        roots.push(pos.userId);
      }
    }
    
    // BFS level-by-level: process ALL nodes at current level before going deeper
    // At each level, find the parent with FEWEST children (to spread placement)
    let currentLevel: number[] = [...roots];
    
    while (currentLevel.length > 0) {
      // Find the parent in current level with fewest children (and < 6)
      let bestParent: number | null = null;
      let minChildren = 7;
      
      for (const parentId of currentLevel) {
        const count = childrenCount.get(parentId) || 0;
        if (count < 6 && count < minChildren) {
          minChildren = count;
          bestParent = parentId;
        }
      }
      
      if (bestParent !== null) {
        return bestParent;
      }
      
      // All parents at current level are full - move to next level
      const nextLevel: number[] = [];
      for (const parentId of currentLevel) {
        // Get children of this parent, ordered by position
        const children = allPositions
          .filter(p => p.parentId === parentId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        
        for (const child of children) {
          nextLevel.push(child.userId);
        }
      }
      
      currentLevel = nextLevel;
    }
    
    // Fallback: return first root if all are full
    return roots[0] || null;
  }

  async addToMatrix(boardId: number, userId: number, parentId: number | null, position: number, level: number): Promise<void> {
    await db.insert(matrixPositions).values({
      boardId,
      userId,
      parentId: parentId,
      position,
      level
    });
  }

  async getUplineChain(userId: number, boardType: string, maxLevels: number): Promise<number[]> {
    // Get the upline chain (parent, grandparent, etc.) for level income distribution
    const upline: number[] = [];
    let currentUserId = userId;
    
    for (let i = 0; i < maxLevels; i++) {
      // Find parent in matrix for this board type
      const result = await db
        .select({ parentId: matrixPositions.parentId })
        .from(matrixPositions)
        .innerJoin(boards, eq(matrixPositions.boardId, boards.id))
        .where(and(
          eq(matrixPositions.userId, currentUserId),
          eq(boards.type, boardType as any)
        ))
        .limit(1);
      
      if (result.length === 0 || !result[0].parentId) break;
      
      upline.push(result[0].parentId);
      currentUserId = result[0].parentId;
    }
    
    return upline;
  }

  async joinBoard(userId: number, boardType: string): Promise<{ success: boolean; message: string }> {
    const config = BOARD_CONFIG[boardType as keyof typeof BOARD_CONFIG];
    if (!config) {
      return { success: false, message: "Invalid board type" };
    }

    // Check if user already in this board
    const existing = await this.getBoard(userId, boardType);
    if (existing) {
      return { success: false, message: "Already in this board" };
    }

    // Get user and their sponsor
    const user = await this.getUser(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Check wallet balance (for non-EV boards or if not auto-entry)
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      return { success: false, message: "Wallet not found" };
    }

    if (boardType === "EV") {
      // EV Board: Deduct from main wallet
      if (Number(wallet.mainBalance) < config.entry) {
        return { success: false, message: "Insufficient balance" };
      }
      
      // Deduct entry fee
      await this.updateWallet(userId, {
        mainBalance: (Number(wallet.mainBalance) - config.entry).toString()
      });
      
      await this.createTransaction({
        userId,
        amount: config.entry.toString(),
        type: "BOARD_ENTRY",
        description: `EV Board entry fee`,
        status: "COMPLETED"
      });

      await this.generateInvoice(userId, "EV");
    }

    // Create board entry
    const board = await this.createBoard(userId, boardType);

    // Find placement parent
    // All boards use global FCFS - place under earliest person with open slots
    let placementParentId: number | null = null;
    placementParentId = await this.findJunglePlacementParent(boardType);

    // Get position under parent
    const siblingCount = placementParentId ? await this.getMatrixChildrenCount(placementParentId, boardType) : 0;
    const position = siblingCount + 1;

    let level = 1;

    // Add to matrix (parentId can be null for root users)
    await this.addToMatrix(board.id, userId, placementParentId, position, level);

    // Check if parent's board is now complete (6/6) and promote them
    if (placementParentId) {
      await this.checkAndPromoteBoard(placementParentId, boardType);
    }

    // Distribute income for EV Board
    if (boardType === "EV") {
      const [adminUser] = await db.select().from(users).where(eq(users.isAdmin, true)).limit(1);

      if (user.sponsorId) {
        await this.addToMainWallet(
          user.sponsorId, 
          config.directSponsor || 500, 
          `Direct sponsor income from ${user.fullName}`
        );
      } else if (adminUser) {
        await this.addToMainWallet(
          adminUser.id,
          config.directSponsor || 500,
          `Direct sponsor income from ${user.fullName} (no sponsor - routed to admin)`
        );
      }

      const upline = await this.getUplineChain(userId, boardType, config.levels);
      for (let i = 0; i < upline.length && i < config.levels; i++) {
        const nextBoard = getNextBoard(boardType);
        const existingNextBoard = nextBoard ? await this.getBoard(upline[i], nextBoard) : null;
        
        if (existingNextBoard) {
          await this.addToRebirthWallet(
            upline[i],
            config.levelIncome,
            `Level ${i + 1} income from ${user.fullName} (EV Board)`
          );
        } else {
          await this.addToUpgradeWallet(
            upline[i],
            config.levelIncome,
            `Level ${i + 1} income from ${user.fullName} (EV Board)`
          );
          
          const uplineWallet = await this.getWallet(upline[i]);
          if (uplineWallet && Number(uplineWallet.upgradeBalance) >= 5900) {
            const existingSilver = await this.getBoard(upline[i], "SILVER");
            if (!existingSilver) {
              await this.updateWallet(upline[i], {
                upgradeBalance: (Number(uplineWallet.upgradeBalance) - 5900).toString()
              });
              const evAccount = await this.getActiveRebirthAccount(upline[i], "EV");
              if (evAccount) {
                await db.update(rebirthAccounts)
                  .set({ balance: Math.max(0, Number(evAccount.balance) - 5900).toString() })
                  .where(eq(rebirthAccounts.id, evAccount.id));
              }
              
              const silverBoard = await this.createBoard(upline[i], "SILVER");
              const silverPlacementParent = await this.findJunglePlacementParent("SILVER");
              const silverSiblingCount = silverPlacementParent ? await this.getMatrixChildrenCount(silverPlacementParent, "SILVER") : 0;
              await this.addToMatrix(silverBoard.id, upline[i], silverPlacementParent, silverSiblingCount + 1, 1);
              
              await this.createTransaction({
                userId: upline[i],
                amount: "5900",
                type: "BOARD_ENTRY",
                description: "Auto-entry to Silver Board from Upgrade Wallet",
                status: "COMPLETED"
              });
            }
          }
        }
      }

      if (adminUser && upline.length < config.levels) {
        const missedLevels = config.levels - upline.length;
        const missedAmount = missedLevels * config.levelIncome;
        await this.addToMainWallet(
          adminUser.id,
          missedAmount,
          `Level income (${missedLevels} levels) from ${user.fullName} (EV Board - no upline, routed to admin)`
        );
      }
    }

    if (boardType !== "EV") {
      const [adminUser] = await db.select().from(users).where(eq(users.isAdmin, true)).limit(1);
      const isJoinerFromSubAccount = await this.isBoardFromSubAccount(userId, boardType);
      
      if (isJoinerFromSubAccount && config.directSponsor) {
        if (adminUser) {
          await this.addToMainWallet(
            adminUser.id,
            config.directSponsor,
            `Direct sponsor income from ${user.fullName} (${boardType}) - Sub-account entry, routed to admin`
          );
        }
      } else if (user.sponsorId && config.directSponsor) {
        await this.addToMainWallet(
          user.sponsorId,
          config.directSponsor,
          `Direct sponsor income from ${user.fullName} (${boardType})`
        );
      } else if (!user.sponsorId && config.directSponsor && adminUser) {
        await this.addToMainWallet(
          adminUser.id,
          config.directSponsor,
          `Direct sponsor income from ${user.fullName} (${boardType} - no sponsor, routed to admin)`
        );
      }
      
      const upline = await this.getUplineChain(userId, boardType, config.levels);
      for (let i = 0; i < upline.length && i < config.levels; i++) {
        const nextBoard = getNextBoard(boardType);
        const existingNextBoard = nextBoard ? await this.getBoard(upline[i], nextBoard) : null;
        
        if (existingNextBoard) {
          await this.addToMainWallet(
            upline[i],
            config.levelIncome,
            `Level ${i + 1} income from ${user.fullName} (${boardType} Board)`
          );
        } else if (nextBoard) {
          await this.addToUpgradeWallet(
            upline[i],
            config.levelIncome,
            `Level ${i + 1} income from ${user.fullName} (${boardType} Board)`
          );
          
          const nextConfig = BOARD_CONFIG[nextBoard];
          const uplineWallet = await this.getWallet(upline[i]);
          if (uplineWallet && Number(uplineWallet.upgradeBalance) >= nextConfig.entry) {
            const existingNext = await this.getBoard(upline[i], nextBoard);
            if (!existingNext) {
              await this.updateWallet(upline[i], {
                upgradeBalance: (Number(uplineWallet.upgradeBalance) - nextConfig.entry).toString()
              });
              const currentBoardAccount = await this.getActiveRebirthAccount(upline[i], boardType);
              if (currentBoardAccount) {
                await db.update(rebirthAccounts)
                  .set({ balance: Math.max(0, Number(currentBoardAccount.balance) - nextConfig.entry).toString() })
                  .where(eq(rebirthAccounts.id, currentBoardAccount.id));
              }
              
              const newBoard = await this.createBoard(upline[i], nextBoard);
              const placementParent = await this.findJunglePlacementParent(nextBoard);
              const siblingCount = placementParent ? await this.getMatrixChildrenCount(placementParent, nextBoard) : 0;
              await this.addToMatrix(newBoard.id, upline[i], placementParent, siblingCount + 1, 1);
              
              await this.createTransaction({
                userId: upline[i],
                amount: nextConfig.entry.toString(),
                type: "BOARD_ENTRY",
                description: `Auto-entry to ${nextBoard} Board from Upgrade Wallet`,
                status: "COMPLETED"
              });
            }
          }
        } else {
          await this.addToMainWallet(
            upline[i],
            config.levelIncome,
            `Level ${i + 1} income from ${user.fullName} (${boardType} Board)`
          );
        }
      }

      if (adminUser && upline.length < config.levels) {
        const missedLevels = config.levels - upline.length;
        const missedAmount = missedLevels * config.levelIncome;
        await this.addToMainWallet(
          adminUser.id,
          missedAmount,
          `Level income (${missedLevels} levels) from ${user.fullName} (${boardType} Board - no upline, routed to admin)`
        );
      }
    }

    return { success: true, message: `Successfully joined ${boardType} Board` };
  }

  async createWithdrawal(userId: number, amount: number, bankDetails: string): Promise<any> {
    const [w] = await db.insert(withdrawals).values({ userId, amount: amount as any, bankDetails }).returning();
    return w;
  }

  async updateBoardStatus(userId: number, boardType: string, status: string): Promise<void> {
    await db.update(boards)
      .set({ status: status as any })
      .where(and(
        eq(boards.userId, userId),
        eq(boards.type, boardType as any)
      ));
  }

  async checkAndPromoteBoard(userId: number, boardType: string): Promise<void> {
    const childCount = await this.getMatrixChildrenCount(userId, boardType);
    
    if (childCount >= 6) {
      const activeBoard = await db.select().from(boards)
        .where(and(
          eq(boards.userId, userId),
          eq(boards.type, boardType as any),
          eq(boards.status, "ACTIVE" as any)
        ))
        .orderBy(desc(boards.joinedAt))
        .limit(1);

      if (activeBoard.length === 0) return;
      const completingBoard = activeBoard[0];

      await db.update(boards)
        .set({ status: "COMPLETED", completedAt: new Date() })
        .where(eq(boards.id, completingBoard.id));

      if (boardType === "EV") {
        if (completingBoard.isRebirth) {
          await this.createEvReward(userId, true, completingBoard.rebirthIndex || undefined, completingBoard.id);

          const wallet = await this.getWallet(userId);
          if (wallet && Number(wallet.upgradeBalance) > 0) {
            const upgradeAmount = Number(wallet.upgradeBalance);
            const [adminUser] = await db.select().from(users).where(eq(users.isAdmin, true)).limit(1);
            if (adminUser) {
              await this.updateWallet(userId, { upgradeBalance: "0" });
              await this.addToMainWallet(adminUser.id, upgradeAmount, `Upgrade balance transfer from rebirth board completion (User #${userId}, Rebirth #${completingBoard.rebirthIndex})`);
              await this.createTransaction({
                userId,
                amount: upgradeAmount.toString(),
                type: "BOARD_ENTRY",
                description: `Upgrade balance Rs.${upgradeAmount.toLocaleString('en-IN')} transferred to admin on rebirth board completion`,
                status: "COMPLETED"
              });
            }
          }

          await this.placeCompanyInBoard("SILVER");
        } else {
          await this.createEvReward(userId);
          const nextBoard = getNextBoard(boardType);
          if (nextBoard) {
            const existingNext = await this.getBoard(userId, nextBoard);
            if (!existingNext) {
              const nextConfig = BOARD_CONFIG[nextBoard];
              const wallet = await this.getWallet(userId);
              
              if (wallet && Number(wallet.upgradeBalance) >= nextConfig.entry) {
                await this.updateWallet(userId, {
                  upgradeBalance: (Number(wallet.upgradeBalance) - nextConfig.entry).toString()
                });
                const currentBoardAccount = await this.getActiveRebirthAccount(userId, boardType);
                if (currentBoardAccount) {
                  await db.update(rebirthAccounts)
                    .set({ balance: Math.max(0, Number(currentBoardAccount.balance) - nextConfig.entry).toString() })
                    .where(eq(rebirthAccounts.id, currentBoardAccount.id));
                }
                
                const newBoard = await this.createBoard(userId, nextBoard);
                const placementParent = await this.findJunglePlacementParent(nextBoard);
                const siblingCount = placementParent ? await this.getMatrixChildrenCount(placementParent, nextBoard) : 0;
                await this.addToMatrix(newBoard.id, userId, placementParent, siblingCount + 1, 1);
                
                await this.createTransaction({
                  userId,
                  amount: nextConfig.entry.toString(),
                  type: "BOARD_ENTRY",
                  description: `Auto-promotion to ${nextBoard} Board from Upgrade Wallet`,
                  status: "COMPLETED"
                });
              }
            }
          }
        }
      } else {
        if (completingBoard.isCompanyPlacement) {
          const nextBoard = getNextBoard(boardType);
          if (nextBoard) {
            await this.placeCompanyInBoard(nextBoard);
          }
        } else {
          const nextBoard = getNextBoard(boardType);
          if (nextBoard) {
            const existingNext = await this.getBoard(userId, nextBoard);
            if (!existingNext) {
              const nextConfig = BOARD_CONFIG[nextBoard];
              const wallet = await this.getWallet(userId);
              
              if (wallet && Number(wallet.upgradeBalance) >= nextConfig.entry) {
                await this.updateWallet(userId, {
                  upgradeBalance: (Number(wallet.upgradeBalance) - nextConfig.entry).toString()
                });
                const currentBoardAccount = await this.getActiveRebirthAccount(userId, boardType);
                if (currentBoardAccount) {
                  await db.update(rebirthAccounts)
                    .set({ balance: Math.max(0, Number(currentBoardAccount.balance) - nextConfig.entry).toString() })
                    .where(eq(rebirthAccounts.id, currentBoardAccount.id));
                }
                
                const newBoard = await this.createBoard(userId, nextBoard);
                const placementParent = await this.findJunglePlacementParent(nextBoard);
                const siblingCount = placementParent ? await this.getMatrixChildrenCount(placementParent, nextBoard) : 0;
                await this.addToMatrix(newBoard.id, userId, placementParent, siblingCount + 1, 1);
                
                await this.createTransaction({
                  userId,
                  amount: nextConfig.entry.toString(),
                  type: "BOARD_ENTRY",
                  description: `Auto-promotion to ${nextBoard} Board from Upgrade Wallet`,
                  status: "COMPLETED"
                });
              }
            }
          }
        }
      }
    }
  }

  // Rebirth Account Methods
  async getRebirthAccounts(userId: number): Promise<RebirthAccount[]> {
    return await db.select().from(rebirthAccounts)
      .where(eq(rebirthAccounts.userId, userId))
      .orderBy(desc(rebirthAccounts.createdAt));
  }

  async getRebirthAccount(userId: number, boardType: string): Promise<RebirthAccount | undefined> {
    // Get the ACTIVE account (preferably SUB account if exists, otherwise MOTHER)
    const [account] = await db.select().from(rebirthAccounts)
      .where(and(
        eq(rebirthAccounts.userId, userId),
        eq(rebirthAccounts.boardType, boardType as any),
        eq(rebirthAccounts.status, "ACTIVE"),
        eq(rebirthAccounts.isActive, true)
      ));
    return account;
  }
  
  async getActiveRebirthAccount(userId: number, boardType: string): Promise<RebirthAccount | undefined> {
    // Get the currently active account for receiving income
    const [subAccount] = await db.select().from(rebirthAccounts)
      .where(and(
        eq(rebirthAccounts.userId, userId),
        eq(rebirthAccounts.boardType, boardType as any),
        eq(rebirthAccounts.accountRole, "SUB"),
        eq(rebirthAccounts.isActive, true)
      ));
    if (subAccount) return subAccount;
    
    // Fallback to MOTHER account if no active SUB
    const [motherAccount] = await db.select().from(rebirthAccounts)
      .where(and(
        eq(rebirthAccounts.userId, userId),
        eq(rebirthAccounts.boardType, boardType as any),
        eq(rebirthAccounts.accountRole, "MOTHER"),
        eq(rebirthAccounts.isActive, true)
      ));
    return motherAccount;
  }

  async createRebirthAccount(userId: number, boardType: string, threshold: number, nextBoardType: string | null, role: "MOTHER" | "SUB" = "MOTHER", parentAccountId: number | null = null, initialBalance: number = 0): Promise<RebirthAccount> {
    // Check if there's an existing account to determine cycle number
    const existingAccounts = await db.select().from(rebirthAccounts)
      .where(and(
        eq(rebirthAccounts.userId, userId),
        eq(rebirthAccounts.boardType, boardType as any)
      ))
      .orderBy(desc(rebirthAccounts.cycle));
    
    const nextCycle = existingAccounts.length > 0 ? existingAccounts[0].cycle + 1 : 1;
    
    const [account] = await db.insert(rebirthAccounts).values({
      userId,
      boardType: boardType as any,
      cycle: nextCycle,
      balance: initialBalance.toString(),
      threshold: threshold.toString(),
      nextBoardType: nextBoardType as any,
      status: "ACTIVE",
      accountRole: role,
      parentAccountId: parentAccountId,
      isActive: true
    }).returning();
    
    return account;
  }
  
  async createSubAccountFromMother(motherAccountId: number, transferAmount: number = 5900): Promise<RebirthAccount> {
    // Get the mother account
    const [mother] = await db.select().from(rebirthAccounts)
      .where(eq(rebirthAccounts.id, motherAccountId));
    
    if (!mother) {
      throw new Error("Mother account not found");
    }
    
    // Mark mother as no longer active (but not PROMOTED, just inactive)
    await db.update(rebirthAccounts)
      .set({ isActive: false })
      .where(eq(rebirthAccounts.id, motherAccountId));
    
    // Create a new SUB account with the transfer amount
    const nextNextBoard = getNextBoard(mother.nextBoardType || mother.boardType);
    const threshold = nextNextBoard ? BOARD_CONFIG[nextNextBoard].entry : 100000;
    
    const subAccount = await this.createRebirthAccount(
      mother.userId,
      mother.boardType,
      threshold,
      nextNextBoard,
      "SUB",
      motherAccountId,
      transferAmount
    );
    
    // Create transaction for the transfer
    await this.createTransaction({
      userId: mother.userId,
      amount: transferAmount.toString(),
      type: "BOARD_ENTRY",
      description: `Rs.${transferAmount} transferred to ${mother.boardType} Sub-Account`,
      status: "COMPLETED"
    });
    
    return subAccount;
  }

  async addToRebirthAccount(userId: number, boardType: string, amount: number, description: string): Promise<void> {
    // Get the currently active account for this board type
    const account = await this.getActiveRebirthAccount(userId, boardType);
    if (!account) return;
    
    const newBalance = Number(account.balance) + amount;
    await db.update(rebirthAccounts)
      .set({ balance: newBalance.toString() })
      .where(eq(rebirthAccounts.id, account.id));
    
    // Update total earnings in wallet
    const wallet = await this.getWallet(userId);
    if (wallet) {
      await this.updateWallet(userId, {
        totalEarnings: (Number(wallet.totalEarnings) + amount).toString()
      });
    }
    
    // Create transaction
    await this.createTransaction({
      userId,
      amount: amount.toString(),
      type: "LEVEL_INCOME",
      description: `${description} (${boardType} ${account.accountRole} Account)`,
      status: "COMPLETED"
    });
    
    // Check if threshold reached for auto-promotion to next board
    if (newBalance >= Number(account.threshold) && account.nextBoardType) {
      const existingNext = await this.getBoard(userId, account.nextBoardType);
      if (!existingNext) {
        const nextConfig = BOARD_CONFIG[account.nextBoardType];
        const remainingBalance = newBalance - nextConfig.entry;
        
        // If this is a SUB account, mark the new board entry as from a sub-account
        // This means: direct sponsor income goes to company, level income placement-based
        const isFromSub = account.accountRole === "SUB";
        
        // Create new board entry for next level FIRST
        const newBoard = await this.createBoard(userId, account.nextBoardType, isFromSub, account.id);
        
        // Use JUNGLE FCFS for non-EV boards (global first-available)
        const placementParent = await this.findJunglePlacementParent(account.nextBoardType);
        
        const siblingCount = placementParent ? await this.getMatrixChildrenCount(placementParent, account.nextBoardType) : 0;
        await this.addToMatrix(newBoard.id, userId, placementParent, siblingCount + 1, 1);
        
        await this.createTransaction({
          userId,
          amount: nextConfig.entry.toString(),
          type: "BOARD_ENTRY",
          description: `Auto-promotion to ${account.nextBoardType} Board from ${boardType} Account`,
          status: "COMPLETED"
        });
        
        // NOW CREATE A NEW SUB-ACCOUNT
        // Entry cost was deducted (conceptually spent on board entry)
        // Fresh Rs.5900 bonus is granted to the new SUB account for continued level income accumulation
        // Any remaining balance above entry fee is also transferred to SUB
        const nextNextBoard = getNextBoard(account.nextBoardType);
        const nextThreshold = nextNextBoard ? BOARD_CONFIG[nextNextBoard].entry : 100000;
        
        // Count existing sub accounts under this parent to determine sub-cycle
        const existingSubAccounts = await db.select().from(rebirthAccounts)
          .where(and(
            eq(rebirthAccounts.userId, userId),
            eq(rebirthAccounts.boardType, boardType as any),
            eq(rebirthAccounts.accountRole, "SUB")
          ));
        const subCycle = existingSubAccounts.length + 1;
        
        // Fresh bonus only applies to EV board (Rs.5900)
        // For other boards, only carry over the remainder (no fresh bonus)
        const freshBonus = boardType === "EV" ? 5900 : 0;
        const subAccountInitialBalance = freshBonus + Math.max(0, remainingBalance);
        
        // Create new SUB account with fresh bonus + carried-over remainder
        const [newSubAccount] = await db.insert(rebirthAccounts).values({
          userId,
          boardType: boardType as any,
          cycle: subCycle, // SUB accounts track their own sequence
          balance: subAccountInitialBalance.toString(),
          threshold: nextThreshold.toString(),
          nextBoardType: nextNextBoard as any,
          status: "ACTIVE",
          accountRole: "SUB",
          parentAccountId: account.id,
          isActive: true
        }).returning();
        
        // NOW mark current account as PROMOTED and inactive (after SUB is created)
        // Set balance to 0 since it was spent on the board entry (entry cost deducted)
        await db.update(rebirthAccounts)
          .set({ 
            balance: "0", // Entry cost deducted, remainder transferred to SUB
            status: "PROMOTED",
            isActive: false,
            promotedAt: new Date()
          })
          .where(eq(rebirthAccounts.id, account.id));
        
        // Record the entry cost deduction from the rebirth account
        await this.createTransaction({
          userId,
          amount: nextConfig.entry.toString(),
          type: "BOARD_ENTRY",
          description: `Entry fee Rs.${nextConfig.entry.toLocaleString()} deducted from ${boardType} ${account.accountRole} Account for ${account.nextBoardType} Board`,
          status: "COMPLETED"
        });
        
        // If fresh bonus is granted, track it in wallet (it's new income)
        if (freshBonus > 0 && wallet) {
          await this.updateWallet(userId, {
            totalEarnings: (Number(wallet.totalEarnings) + freshBonus).toString()
          });
        }
        
        const bonusDescription = freshBonus > 0 
          ? `Rs.${freshBonus.toLocaleString()} bonus + Rs.${Math.max(0, remainingBalance).toLocaleString()} remainder = Rs.${subAccountInitialBalance.toLocaleString()}`
          : `Rs.${subAccountInitialBalance.toLocaleString()} (carried over)`;
        
        await this.createTransaction({
          userId,
          amount: subAccountInitialBalance.toString(),
          type: "BOARD_ENTRY",
          description: `${bonusDescription} to new ${boardType} SUB Account (Cycle ${subCycle}) after promotion to ${account.nextBoardType}`,
          status: "COMPLETED"
        });
      }
    }
  }

  async getUserTotalWithdrawals(userId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`coalesce(sum(cast(amount as numeric)), 0)` })
      .from(withdrawals)
      .where(and(eq(withdrawals.userId, userId), eq(withdrawals.status, "COMPLETED")));
    return Number(result[0]?.total || 0);
  }

  // =========== ADMIN METHODS ===========

  async getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalDeposits: number;
    totalWithdrawals: number;
    pendingWithdrawals: number;
    totalGST: number;
    companyRevenue: number;
    boardCounts: Record<string, number>;
  }> {
    // Total users (excluding admin)
    const usersResult = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isAdmin, false));
    const totalUsers = Number(usersResult[0]?.count || 0);

    // Users with at least one board = active
    const activeResult = await db.select({ count: sql<number>`count(distinct ${boards.userId})` }).from(boards);
    const activeUsers = Number(activeResult[0]?.count || 0);

    // Total deposits (DEPOSIT transactions)
    const depositsResult = await db
      .select({ total: sql<number>`coalesce(sum(cast(amount as numeric)), 0)` })
      .from(transactions)
      .where(and(eq(transactions.type, "DEPOSIT"), eq(transactions.status, "COMPLETED")));
    const totalDeposits = Number(depositsResult[0]?.total || 0);

    // Total withdrawals completed
    const withdrawalsResult = await db
      .select({ total: sql<number>`coalesce(sum(cast(amount as numeric)), 0)` })
      .from(withdrawals)
      .where(eq(withdrawals.status, "COMPLETED"));
    const totalWithdrawals = Number(withdrawalsResult[0]?.total || 0);

    // Pending withdrawals count
    const pendingResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(withdrawals)
      .where(eq(withdrawals.status, "PENDING"));
    const pendingWithdrawals = Number(pendingResult[0]?.count || 0);

    // GST collected (from board entries)
    const evBoardCount = await db.select({ count: sql<number>`count(*)` }).from(boards).where(eq(boards.type, "EV"));
    const silverBoardCount = await db.select({ count: sql<number>`count(*)` }).from(boards).where(eq(boards.type, "SILVER"));
    const totalGST = (Number(evBoardCount[0]?.count || 0) * 900) + (Number(silverBoardCount[0]?.count || 0) * 900);

    // Board counts by type
    const boardCountsResult = await db
      .select({ type: boards.type, count: sql<number>`count(*)` })
      .from(boards)
      .groupBy(boards.type);
    
    const boardCounts: Record<string, number> = {};
    for (const row of boardCountsResult) {
      boardCounts[row.type] = Number(row.count);
    }

    const boardRevenueConfig: Record<string, number> = {
      EV: 3900,
      SILVER: 5900 - 900 - (500 * 6),
      GOLD: 10000 - (1000 * 5),
      PLATINUM: 20000 - (2000 * 5),
      DIAMOND: 50000 - (5000 * 5),
      KING: 100000 - (10000 * 5),
    };

    const boardWiseRevenue: Record<string, number> = {};
    let totalCompanyRevenue = 0;
    for (const type of Object.keys(boardRevenueConfig)) {
      const count = boardCounts[type] || 0;
      const revenue = count * boardRevenueConfig[type];
      boardWiseRevenue[type] = revenue;
      totalCompanyRevenue += revenue;
    }

    return {
      totalUsers,
      activeUsers,
      totalDeposits,
      totalWithdrawals,
      pendingWithdrawals,
      totalGST,
      companyRevenue: totalCompanyRevenue,
      boardWiseRevenue,
      boardCounts
    };
  }

  async getAllUsers(page: number, limit: number, search: string): Promise<{ users: any[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const selectFields = {
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      mobile: users.mobile,
      referralCode: users.referralCode,
      sponsorId: users.sponsorId,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt
    };

    let usersList: any[];
    let total: number;

    if (search) {
      const searchFilter = and(
        eq(users.isAdmin, false),
        or(
          sql`${users.username} ILIKE ${'%' + search + '%'}`,
          sql`${users.fullName} ILIKE ${'%' + search + '%'}`,
          sql`${users.email} ILIKE ${'%' + search + '%'}`,
          sql`${users.mobile} ILIKE ${'%' + search + '%'}`,
          sql`${users.referralCode} ILIKE ${'%' + search + '%'}`
        )
      );

      usersList = await db.select(selectFields).from(users)
        .where(searchFilter)
        .orderBy(desc(users.createdAt))
        .limit(limit).offset(offset);

      const countResult = await db.select({ count: sql<number>`count(*)` }).from(users).where(searchFilter);
      total = Number(countResult[0]?.count || 0);
    } else {
      usersList = await db.select(selectFields).from(users)
        .where(eq(users.isAdmin, false))
        .orderBy(desc(users.createdAt))
        .limit(limit).offset(offset);

      const countResult = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isAdmin, false));
      total = Number(countResult[0]?.count || 0);
    }

    const sponsorIds = Array.from(new Set(usersList.map(u => u.sponsorId).filter(Boolean)));
    let sponsorMap: Record<number, { username: string; fullName: string }> = {};
    if (sponsorIds.length > 0) {
      const sponsors = await db.select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
      }).from(users).where(sql`${users.id} IN (${sql.join(sponsorIds.map(id => sql`${id}`), sql`, `)})`);
      for (const s of sponsors) {
        sponsorMap[s.id] = { username: s.username, fullName: s.fullName };
      }
    }

    const usersWithSponsor = usersList.map(u => ({
      ...u,
      sponsorName: u.sponsorId ? sponsorMap[u.sponsorId]?.fullName || null : null,
      sponsorUsername: u.sponsorId ? sponsorMap[u.sponsorId]?.username || null : null,
    }));

    return { users: usersWithSponsor, total };
  }

  async getUserById(userId: number): Promise<any> {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (result.length === 0) return null;
    const { password, ...userWithoutPassword } = result[0];
    return userWithoutPassword;
  }

  async updateUser(userId: number, updates: Partial<typeof users.$inferInsert>): Promise<void> {
    await db.update(users).set(updates).where(eq(users.id, userId));
  }

  async adminAdjustWallet(userId: number, amount: number, type: "add" | "deduct", description: string): Promise<void> {
    const wallet = await this.getWallet(userId);
    if (!wallet) throw new Error("Wallet not found");

    const currentBalance = Number(wallet.mainBalance);
    const newBalance = type === "add" ? currentBalance + amount : currentBalance - amount;

    if (newBalance < 0) throw new Error("Cannot deduct more than available balance");

    await this.updateWallet(userId, { mainBalance: newBalance.toString() });

    await this.createTransaction({
      userId,
      amount: amount.toString(),
      type: "ADMIN_ADJUSTMENT",
      description: `Admin ${type === "add" ? "credit" : "debit"}: ${description}`,
      status: "COMPLETED"
    });
  }

  async getAllWithdrawals(status: string): Promise<any[]> {
    let query;
    if (status === "all") {
      query = db
        .select({
          id: withdrawals.id,
          userId: withdrawals.userId,
          amount: withdrawals.amount,
          status: withdrawals.status,
          bankDetails: withdrawals.bankDetails,
          requestedAt: withdrawals.requestedAt,
          processedAt: withdrawals.processedAt,
          adminNote: withdrawals.adminNote,
          username: users.username,
          fullName: users.fullName
        })
        .from(withdrawals)
        .leftJoin(users, eq(withdrawals.userId, users.id))
        .orderBy(desc(withdrawals.requestedAt));
    } else {
      query = db
        .select({
          id: withdrawals.id,
          userId: withdrawals.userId,
          amount: withdrawals.amount,
          status: withdrawals.status,
          bankDetails: withdrawals.bankDetails,
          requestedAt: withdrawals.requestedAt,
          processedAt: withdrawals.processedAt,
          adminNote: withdrawals.adminNote,
          username: users.username,
          fullName: users.fullName
        })
        .from(withdrawals)
        .leftJoin(users, eq(withdrawals.userId, users.id))
        .where(eq(withdrawals.status, status as any))
        .orderBy(desc(withdrawals.requestedAt));
    }
    return await query;
  }

  async updateWithdrawalStatus(withdrawalId: number, status: string, adminNote: string): Promise<void> {
    const withdrawal = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId)).limit(1);
    if (withdrawal.length === 0) throw new Error("Withdrawal not found");

    await db.update(withdrawals).set({
      status: status as any,
      adminNote,
      processedAt: new Date()
    }).where(eq(withdrawals.id, withdrawalId));

    // Update the corresponding transaction
    await db.update(transactions).set({
      status: status === "COMPLETED" ? "COMPLETED" : "REJECTED"
    }).where(and(
      eq(transactions.userId, withdrawal[0].userId),
      eq(transactions.type, "WITHDRAWAL"),
      eq(transactions.amount, withdrawal[0].amount)
    ));

    if (status === "REJECTED") {
      await db.update(transactions).set({
        description: adminNote 
          ? `Withdrawal rejected - Reason: ${adminNote}` 
          : "Withdrawal rejected"
      }).where(and(
        eq(transactions.userId, withdrawal[0].userId),
        eq(transactions.type, "WITHDRAWAL"),
        eq(transactions.amount, withdrawal[0].amount),
        eq(transactions.status, "REJECTED")
      ));

      const wallet = await this.getWallet(withdrawal[0].userId);
      if (wallet) {
        await this.updateWallet(withdrawal[0].userId, {
          mainBalance: (Number(wallet.mainBalance) + Number(withdrawal[0].amount)).toString()
        });

        await this.createTransaction({
          userId: withdrawal[0].userId,
          amount: withdrawal[0].amount,
          type: "ADMIN_ADJUSTMENT",
          description: adminNote
            ? `Withdrawal rejected - amount refunded. Reason: ${adminNote}`
            : "Withdrawal rejected - amount refunded",
          status: "COMPLETED"
        });
      }
    }
  }

  async getAllTransactions(page: number, limit: number, type: string): Promise<{ transactions: any[]; total: number }> {
    const offset = (page - 1) * limit;

    let txns;
    let countResult;

    if (type === "all") {
      txns = await db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          amount: transactions.amount,
          type: transactions.type,
          status: transactions.status,
          description: transactions.description,
          createdAt: transactions.createdAt,
          username: users.username,
          fullName: users.fullName
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset);

      countResult = await db.select({ count: sql<number>`count(*)` }).from(transactions);
    } else {
      txns = await db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          amount: transactions.amount,
          type: transactions.type,
          status: transactions.status,
          description: transactions.description,
          createdAt: transactions.createdAt,
          username: users.username,
          fullName: users.fullName
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .where(eq(transactions.type, type as any))
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset);

      countResult = await db.select({ count: sql<number>`count(*)` }).from(transactions).where(eq(transactions.type, type as any));
    }

    return { transactions: txns, total: Number(countResult[0]?.count || 0) };
  }

  async getBoardStats(): Promise<any[]> {
    const stats = await db
      .select({
        type: boards.type,
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${boards.status} = 'ACTIVE')`,
        completed: sql<number>`count(*) filter (where ${boards.status} = 'COMPLETED')`
      })
      .from(boards)
      .groupBy(boards.type);

    return stats.map(s => ({
      type: s.type,
      total: Number(s.total),
      active: Number(s.active),
      completed: Number(s.completed)
    }));
  }

  async getFinancialReport(startDate?: string, endDate?: string): Promise<any> {
    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Total revenue by type
    const revenueByType = await db
      .select({
        type: transactions.type,
        total: sql<number>`coalesce(sum(cast(amount as numeric)), 0)`
      })
      .from(transactions)
      .where(and(
        eq(transactions.status, "COMPLETED"),
        sql`${transactions.createdAt} >= ${start}`,
        sql`${transactions.createdAt} <= ${end}`
      ))
      .groupBy(transactions.type);

    // Daily revenue for the period
    const dailyRevenue = await db
      .select({
        date: sql<string>`date(${transactions.createdAt})`,
        total: sql<number>`coalesce(sum(cast(amount as numeric)), 0)`,
        count: sql<number>`count(*)`
      })
      .from(transactions)
      .where(and(
        eq(transactions.status, "COMPLETED"),
        eq(transactions.type, "BOARD_ENTRY"),
        sql`${transactions.createdAt} >= ${start}`,
        sql`${transactions.createdAt} <= ${end}`
      ))
      .groupBy(sql`date(${transactions.createdAt})`)
      .orderBy(sql`date(${transactions.createdAt})`);

    // User registrations by day
    const dailyRegistrations = await db
      .select({
        date: sql<string>`date(${users.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(users)
      .where(and(
        eq(users.isAdmin, false),
        sql`${users.createdAt} >= ${start}`,
        sql`${users.createdAt} <= ${end}`
      ))
      .groupBy(sql`date(${users.createdAt})`)
      .orderBy(sql`date(${users.createdAt})`);

    return {
      revenueByType: revenueByType.map(r => ({ type: r.type, total: Number(r.total) })),
      dailyRevenue: dailyRevenue.map(d => ({ date: d.date, total: Number(d.total), count: Number(d.count) })),
      dailyRegistrations: dailyRegistrations.map(d => ({ date: d.date, count: Number(d.count) }))
    };
  }
  // =========== INVOICE METHODS ===========

  async generateInvoice(userId: number, boardType: string): Promise<Invoice> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const config = BOARD_CONFIG[boardType as keyof typeof BOARD_CONFIG];
    if (!config) throw new Error("Invalid board type");

    const gstAmount = config.gst;
    const subtotal = config.entry - gstAmount;
    const totalAmount = config.entry;

    const invoiceCount = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    const seq = (Number(invoiceCount[0]?.count || 0) + 1).toString().padStart(5, "0");
    const year = new Date().getFullYear();
    const invoiceNumber = `AGP-${year}-${seq}`;

    const description = boardType === "EV"
      ? "EV 2-Wheeler Vehicle Booking - Account Activation"
      : `${boardType} Board Entry Fee`;

    const [invoice] = await db.insert(invoices).values({
      userId,
      invoiceNumber,
      customerName: user.fullName,
      customerEmail: user.email,
      customerMobile: user.mobile,
      description,
      subtotal: subtotal.toString(),
      gstAmount: gstAmount.toString(),
      totalAmount: totalAmount.toString(),
      gstPercentage: gstAmount > 0 ? ((gstAmount / subtotal) * 100).toFixed(2) : "0",
      boardType: boardType as any,
      status: "PAID",
    }).returning();

    return invoice;
  }

  async getUserInvoices(userId: number): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoiceById(invoiceId: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices)
      .where(eq(invoices.id, invoiceId));
    return invoice;
  }

  async getAllInvoices(page: number, limit: number): Promise<{ invoices: any[]; total: number }> {
    const offset = (page - 1) * limit;
    const result = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        userId: invoices.userId,
        customerName: invoices.customerName,
        totalAmount: invoices.totalAmount,
        boardType: invoices.boardType,
        status: invoices.status,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    return { invoices: result, total: Number(countResult[0]?.count || 0) };
  }

  // =========== KYC METHODS ===========

  async submitKyc(userId: number, data: {
    aadhaarNumber?: string;
    panNumber?: string;
    fullName: string;
    dateOfBirth?: string;
    address?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    bankName?: string;
    gpayPhonePeNumber?: string;
    upiId?: string;
  }): Promise<KycDocument> {
    const existing = await this.getKyc(userId);
    if (existing && existing.status === "VERIFIED") {
      throw new Error("KYC already verified");
    }

    if (existing) {
      const [updated] = await db.update(kycDocuments)
        .set({
          ...data,
          status: "PENDING" as any,
          adminNote: null,
          submittedAt: new Date(),
          verifiedAt: null,
        })
        .where(eq(kycDocuments.userId, userId))
        .returning();
      return updated;
    }

    const [kyc] = await db.insert(kycDocuments).values({
      userId,
      ...data,
      status: "PENDING" as any,
    }).returning();
    return kyc;
  }

  async getKyc(userId: number): Promise<KycDocument | undefined> {
    const [kyc] = await db.select().from(kycDocuments)
      .where(eq(kycDocuments.userId, userId));
    return kyc;
  }

  async getAllKyc(page: number, limit: number, status: string): Promise<{ kycs: any[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let query;
    let countQuery;

    if (status === "all") {
      query = db.select({
        id: kycDocuments.id,
        userId: kycDocuments.userId,
        fullName: kycDocuments.fullName,
        aadhaarNumber: kycDocuments.aadhaarNumber,
        panNumber: kycDocuments.panNumber,
        status: kycDocuments.status,
        submittedAt: kycDocuments.submittedAt,
        verifiedAt: kycDocuments.verifiedAt,
      }).from(kycDocuments)
        .orderBy(desc(kycDocuments.submittedAt))
        .limit(limit)
        .offset(offset);

      countQuery = db.select({ count: sql<number>`count(*)` }).from(kycDocuments);
    } else {
      query = db.select({
        id: kycDocuments.id,
        userId: kycDocuments.userId,
        fullName: kycDocuments.fullName,
        aadhaarNumber: kycDocuments.aadhaarNumber,
        panNumber: kycDocuments.panNumber,
        status: kycDocuments.status,
        submittedAt: kycDocuments.submittedAt,
        verifiedAt: kycDocuments.verifiedAt,
      }).from(kycDocuments)
        .where(eq(kycDocuments.status, status as any))
        .orderBy(desc(kycDocuments.submittedAt))
        .limit(limit)
        .offset(offset);

      countQuery = db.select({ count: sql<number>`count(*)` }).from(kycDocuments)
        .where(eq(kycDocuments.status, status as any));
    }

    const result = await query;
    const countResult = await countQuery;
    return { kycs: result, total: Number(countResult[0]?.count || 0) };
  }

  async getKycById(kycId: number): Promise<KycDocument | undefined> {
    const [kyc] = await db.select().from(kycDocuments)
      .where(eq(kycDocuments.id, kycId));
    return kyc;
  }

  async updateKycStatus(kycId: number, status: string, adminNote: string): Promise<void> {
    await db.update(kycDocuments).set({
      status: status as any,
      adminNote,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
    }).where(eq(kycDocuments.id, kycId));
  }

  // =========== COMPANY USER METHODS ===========

  async getOrCreateCompanyUser(): Promise<User> {
    const [existing] = await db.select().from(users).where(eq(users.isCompany, true));
    if (existing) return existing;

    const { scryptSync, randomBytes } = await import("crypto");
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync("CompanySecure@2024", salt, 64).toString("hex");
    const hashedPassword = `${hash}.${salt}`;

    const [company] = await db.insert(users).values({
      username: "COMPANY_ACCOUNT",
      password: hashedPassword,
      fullName: "Aghan Promoters (Company)",
      email: "company@aghanpromoters.com",
      mobile: "0000000000",
      referralCode: "COMPANY",
      isAdmin: false,
      isCompany: true,
    }).returning();

    await db.insert(wallets).values({ userId: company.id });
    return company;
  }

  // =========== AUTO-REBIRTH METHODS ===========

  async getUserRebirthBoardCount(userId: number): Promise<number> {
    const result = await db.select({ count: count() }).from(boards)
      .where(and(
        eq(boards.userId, userId),
        eq(boards.type, "EV" as any),
        eq(boards.isRebirth, true)
      ));
    return result[0]?.count || 0;
  }

  async triggerAutoRebirth(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    let currentWallet = await this.getWallet(userId);
    if (!currentWallet || Number(currentWallet.rebirthBalance) < 5900) return;

    let rebirthCount = await this.getUserRebirthBoardCount(userId);
    let currentBalance = Number(currentWallet.rebirthBalance);

    while (currentBalance >= 5900 && rebirthCount < MAX_REBIRTH_ACCOUNTS) {
      rebirthCount++;
      const rebirthIndex = rebirthCount;
      const rebirthLabel = `${user.username}${rebirthIndex}`;

      currentBalance -= 5900;
      await this.updateWallet(userId, {
        rebirthBalance: currentBalance.toString()
      });

      await this.createTransaction({
        userId,
        amount: "5900",
        type: "BOARD_ENTRY",
        description: `Auto-Rebirth EV Board entry (${rebirthLabel}) from Rebirth Wallet`,
        status: "COMPLETED"
      });

      const board = await this.createRebirthBoard(userId, rebirthIndex, rebirthLabel);

      let placementParentId: number | null = null;
      placementParentId = await this.findJunglePlacementParent("EV");

      const siblingCount = placementParentId ? await this.getMatrixChildrenCount(placementParentId, "EV") : 0;
      await this.addToMatrix(board.id, userId, placementParentId, siblingCount + 1, 1);

      if (placementParentId) {
        await this.checkAndPromoteBoard(placementParentId, "EV");
      }

      const config = BOARD_CONFIG["EV"];
      const [adminUser] = await db.select().from(users).where(eq(users.isAdmin, true)).limit(1);

      if (user.sponsorId) {
        await this.addToMainWallet(
          user.sponsorId,
          config.directSponsor || 500,
          `Direct sponsor income from ${rebirthLabel} (Rebirth)`
        );
      } else if (adminUser) {
        await this.addToMainWallet(
          adminUser.id,
          config.directSponsor || 500,
          `Direct sponsor income from ${rebirthLabel} (Rebirth - no sponsor, routed to admin)`
        );
      }

      const upline = await this.getUplineChain(userId, "EV", config.levels);
      for (let i = 0; i < upline.length && i < config.levels; i++) {
        const nextBoard = getNextBoard("EV");
        const existingNextBoard = nextBoard ? await this.getBoard(upline[i], nextBoard) : null;

        if (existingNextBoard) {
          await this.addToRebirthWallet(
            upline[i],
            config.levelIncome,
            `Level ${i + 1} income from ${rebirthLabel} (EV Board Rebirth)`
          );
        } else {
          await this.addToUpgradeWallet(
            upline[i],
            config.levelIncome,
            `Level ${i + 1} income from ${rebirthLabel} (EV Board)`
          );

          const uplineWallet = await this.getWallet(upline[i]);
          if (uplineWallet && Number(uplineWallet.upgradeBalance) >= 5900) {
            const existingSilver = await this.getBoard(upline[i], "SILVER");
            if (!existingSilver) {
              await this.updateWallet(upline[i], {
                upgradeBalance: (Number(uplineWallet.upgradeBalance) - 5900).toString()
              });
              const evAccount = await this.getActiveRebirthAccount(upline[i], "EV");
              if (evAccount) {
                await db.update(rebirthAccounts)
                  .set({ balance: Math.max(0, Number(evAccount.balance) - 5900).toString() })
                  .where(eq(rebirthAccounts.id, evAccount.id));
              }
              const silverBoard = await this.createBoard(upline[i], "SILVER");
              const silverPlacementParent = await this.findJunglePlacementParent("SILVER");
              const silverSiblingCount = silverPlacementParent ? await this.getMatrixChildrenCount(silverPlacementParent, "SILVER") : 0;
              await this.addToMatrix(silverBoard.id, upline[i], silverPlacementParent, silverSiblingCount + 1, 1);
              await this.createTransaction({
                userId: upline[i],
                amount: "5900",
                type: "BOARD_ENTRY",
                description: "Auto-entry to Silver Board from Upgrade Wallet",
                status: "COMPLETED"
              });
            }
          }
        }
      }

      if (adminUser && upline.length < config.levels) {
        const missedLevels = config.levels - upline.length;
        const missedAmount = missedLevels * config.levelIncome;
        await this.addToMainWallet(
          adminUser.id,
          missedAmount,
          `Level income (${missedLevels} levels) from ${rebirthLabel} (EV Rebirth - no upline, routed to admin)`
        );
      }

    }
  }

  async createRebirthBoard(userId: number, rebirthIndex: number, rebirthLabel: string): Promise<Board> {
    const [board] = await db.insert(boards).values({
      userId,
      type: "EV" as any,
      isRebirth: true,
      rebirthIndex,
      rebirthLabel,
    }).returning();
    return board;
  }

  async getUserRebirthBoards(userId: number): Promise<Board[]> {
    return await db.select().from(boards)
      .where(and(
        eq(boards.userId, userId),
        eq(boards.type, "EV" as any),
        eq(boards.isRebirth, true)
      ))
      .orderBy(asc(boards.joinedAt));
  }

  async placeCompanyInBoard(boardType: string): Promise<void> {
    const company = await this.getOrCreateCompanyUser();

    const companyBoard = await db.insert(boards).values({
      userId: company.id,
      type: boardType as any,
      isCompanyPlacement: true,
    }).returning();

    const placementParent = await this.findJunglePlacementParent(boardType);
    const siblingCount = placementParent ? await this.getMatrixChildrenCount(placementParent, boardType) : 0;
    await this.addToMatrix(companyBoard[0].id, company.id, placementParent, siblingCount + 1, 1);

    if (placementParent) {
      await this.checkAndPromoteBoard(placementParent, boardType);
    }
  }

  // =========== EV REWARD METHODS ===========

  async createEvReward(userId: number, isFromRebirth: boolean = false, rebirthIndex?: number, rebirthBoardId?: number): Promise<EvReward> {
    const claimType = isFromRebirth ? "UNCLAIMED" : "VEHICLE";

    const [reward] = await db.insert(evRewards).values({
      userId,
      boardType: "EV" as any,
      rewardAmount: "100000",
      status: isFromRebirth ? "PENDING" as any : "APPROVED" as any,
      claimType: claimType as any,
      isFromRebirth,
      rebirthIndex: rebirthIndex || null,
      rebirthBoardId: rebirthBoardId || null,
    }).returning();

    await this.createTransaction({
      userId,
      amount: "100000",
      type: "BOARD_COMPLETION",
      description: isFromRebirth
        ? `Rebirth EV Board #${rebirthIndex} completed - Choose EV Vehicle or Rs.1,00,000 cash!`
        : "EV Board completed - EV Vehicle reward earned (worth Rs.1,00,000)!",
      status: "COMPLETED"
    });

    return reward;
  }

  async claimEvReward(rewardId: number, userId: number, claimType: "VEHICLE" | "CASH"): Promise<EvReward | null> {
    const [reward] = await db.select().from(evRewards)
      .where(and(eq(evRewards.id, rewardId), eq(evRewards.userId, userId)));
    
    if (!reward || reward.claimType !== "UNCLAIMED") return null;

    const [updated] = await db.update(evRewards)
      .set({ claimType: claimType as any })
      .where(eq(evRewards.id, rewardId))
      .returning();

    if (claimType === "CASH") {
      await this.addToMainWallet(userId, 100000, `EV Reward claimed as cash - Rs.1,00,000 (Reward #${rewardId})`);
    }

    return updated;
  }

  async getUserEvRewards(userId: number): Promise<EvReward[]> {
    return await db.select().from(evRewards)
      .where(eq(evRewards.userId, userId))
      .orderBy(desc(evRewards.awardedAt));
  }

  async getAllEvRewards(page: number, limit: number, status: string): Promise<{ rewards: any[]; total: number }> {
    const offset = (page - 1) * limit;

    let result;
    let countResult;

    if (status === "all") {
      result = await db.select({
        id: evRewards.id,
        userId: evRewards.userId,
        boardType: evRewards.boardType,
        rewardAmount: evRewards.rewardAmount,
        status: evRewards.status,
        vehicleModel: evRewards.vehicleModel,
        vehicleDetails: evRewards.vehicleDetails,
        adminNote: evRewards.adminNote,
        awardedAt: evRewards.awardedAt,
        deliveredAt: evRewards.deliveredAt,
        userName: users.fullName,
        userMobile: users.mobile,
      }).from(evRewards)
        .leftJoin(users, eq(evRewards.userId, users.id))
        .orderBy(desc(evRewards.awardedAt))
        .limit(limit)
        .offset(offset);

      countResult = await db.select({ count: sql<number>`count(*)` }).from(evRewards);
    } else {
      result = await db.select({
        id: evRewards.id,
        userId: evRewards.userId,
        boardType: evRewards.boardType,
        rewardAmount: evRewards.rewardAmount,
        status: evRewards.status,
        vehicleModel: evRewards.vehicleModel,
        vehicleDetails: evRewards.vehicleDetails,
        adminNote: evRewards.adminNote,
        awardedAt: evRewards.awardedAt,
        deliveredAt: evRewards.deliveredAt,
        userName: users.fullName,
        userMobile: users.mobile,
      }).from(evRewards)
        .leftJoin(users, eq(evRewards.userId, users.id))
        .where(eq(evRewards.status, status as any))
        .orderBy(desc(evRewards.awardedAt))
        .limit(limit)
        .offset(offset);

      countResult = await db.select({ count: sql<number>`count(*)` }).from(evRewards)
        .where(eq(evRewards.status, status as any));
    }

    return { rewards: result, total: Number(countResult[0]?.count || 0) };
  }

  async updateEvRewardStatus(rewardId: number, status: string, data: { vehicleModel?: string; vehicleDetails?: string; adminNote?: string }): Promise<void> {
    await db.update(evRewards).set({
      status: status as any,
      ...data,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
    }).where(eq(evRewards.id, rewardId));
  }

  // =========== GENEALOGY METHODS ===========

  async getAllUsersForGenealogy(): Promise<any[]> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        mobile: users.mobile,
        sponsorId: users.sponsorId,
        referralCode: users.referralCode,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.id));

    const boardData = await db
      .select({
        userId: boards.userId,
        type: boards.type,
        status: boards.status,
      })
      .from(boards);

    const boardsByUser = new Map<number, { type: string; status: string | null }[]>();
    for (const b of boardData) {
      if (!boardsByUser.has(b.userId)) boardsByUser.set(b.userId, []);
      boardsByUser.get(b.userId)!.push({ type: b.type, status: b.status });
    }

    return result.map(u => ({
      ...u,
      boards: boardsByUser.get(u.id) || [],
    }));
  }

  // =========== SMTP SETTINGS METHODS ===========

  async getSmtpSettings(): Promise<SmtpSettings | null> {
    const [settings] = await db.select().from(smtpSettings).limit(1);
    return settings || null;
  }

  async saveSmtpSettings(data: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromEmail: string;
    fromName: string;
    enabled: boolean;
  }): Promise<SmtpSettings> {
    const existing = await this.getSmtpSettings();

    if (existing) {
      const [updated] = await db.update(smtpSettings).set({
        ...data,
        updatedAt: new Date(),
      }).where(eq(smtpSettings.id, existing.id)).returning();
      return updated;
    }

    const [created] = await db.insert(smtpSettings).values(data).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
