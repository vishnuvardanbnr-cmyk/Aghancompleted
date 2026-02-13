
import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { insertUserSchema, transactions } from "@shared/schema";
import { sql, and, eq } from "drizzle-orm";
import { db } from "./db";
import { sendRegistrationEmail, sendActivationEmail, sendActivationInvoiceEmail, sendTestEmail, isSmtpEnabled, sendPasswordOtpEmail } from "./email";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";

const passwordOtpStore = new Map<number, { otp: string; expiresAt: number }>();

const uploadDir = path.join(process.cwd(), "uploads", "profile-pictures");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const profilePicStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, _file, cb) => {
    const userId = (req.user as any)?.id;
    const ext = path.extname(_file.originalname).toLowerCase() || ".jpg";
    cb(null, `user-${userId}${ext}`);
  },
});

const profilePicUpload = multer({
  storage: profilePicStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP images are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.get("/api/registration-info", async (_req, res) => {
    try {
      const userCount = await storage.getTotalUserCount();
      res.json({ sponsorRequired: userCount > 0 });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch registration info" });
    }
  });

  // Dashboard
  app.get(api.user.dashboard.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    
    const wallet = await storage.getWallet(userId);
    const finalWallet = wallet || await storage.createWallet(userId);
    
    // Get direct referrals count (only ACTIVE direct referrals with EV board)
    const directReferralCount = await storage.getActiveDirectReferralCount(userId);
    
    // Get user's boards with individual progress
    const userBoards = await storage.getUserBoards(userId);
    
    // Calculate per-board progress
    const boardsWithProgress = await Promise.all(
      userBoards.map(async (board) => {
        let progress = 0;
        let filled = 0;
        
        if (board.type === "EV") {
          // EV Board: progress based on active direct referrals
          filled = directReferralCount;
        } else {
          // Other boards: progress based on level 1 matrix positions filled
          filled = await storage.getMatrixChildrenCount(userId, board.type);
        }
        
        progress = Math.min(100, Math.round((filled / 6) * 100));
        
        return { ...board, progress, filled };
      })
    );
    
    // Get placements under user for EV board (to calculate level completion)
    const level1Count = await storage.getMatrixChildrenCount(userId, "EV");
    
    // Overall progress: based on 6 direct referrals needed
    const progress = Math.min(100, Math.round((directReferralCount / 6) * 100));

    const totalWithdrawn = await storage.getUserTotalWithdrawals(userId);

    res.json({
      wallet: finalWallet,
      activeBoards: boardsWithProgress,
      referralCount: directReferralCount,
      level1Placements: level1Count,
      progress: progress,
      totalTeamSize: level1Count,
      totalWithdrawn,
    });
  });

  // Team
  app.get(api.user.team.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Check if specific member ID is requested
    const memberId = req.query.memberId ? parseInt(req.query.memberId as string) : null;
    const targetId = memberId || (req.user as any).id;
    
    const referrals = await storage.getReferrals(targetId);
    
    // Get boards for each referral
    const teamWithBoards = await Promise.all(
      referrals.map(async (r) => {
        const userBoards = await storage.getUserBoards(r.id);
        return { 
          ...r, 
          level: 1,
          boards: userBoards.map(b => ({ type: b.type, status: b.status }))
        };
      })
    );
    
    res.json(teamWithBoards);
  });

  // Wallet Routes
  app.get(api.wallet.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const wallet = await storage.getWallet((req.user as any).id);
    res.json(wallet);
  });

  app.get(api.wallet.history.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const txns = await storage.getTransactions((req.user as any).id);
    res.json(txns);
  });

  app.post(api.wallet.withdraw.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { amount, bankDetails } = api.wallet.withdraw.input.parse(req.body);
      const wallet = await storage.getWallet((req.user as any).id);
      
      if (!wallet || Number(wallet.mainBalance) < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Deduct balance
      await storage.updateWallet(wallet.userId, { 
        mainBalance: (Number(wallet.mainBalance) - amount).toString() 
      });

      // Create record
      const withdrawal = await storage.createWithdrawal(wallet.userId, amount, bankDetails);
      
      // Create transaction
      await storage.createTransaction({
        userId: wallet.userId,
        amount: amount.toString(),
        type: "WITHDRAWAL",
        description: "Withdrawal Request",
        status: "PENDING"
      });

      res.status(201).json(withdrawal);
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Boards
  app.get(api.boards.list.path, async (req, res) => {
    // Return static list for now or fetch from DB
    res.json([]);
  });

  // Get current user's boards
  app.get("/api/user/boards", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const userBoards = await storage.getUserBoards(userId);
    res.json(userBoards);
  });

  // Get board-specific transactions with pagination and date filtering
  app.get("/api/board-transactions/:boardType", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const boardType = req.params.boardType;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startDate = req.query.startDate as string || null;
    const endDate = req.query.endDate as string || null;

    try {
      const result = await storage.getBoardTransactions(userId, boardType, page, limit, startDate, endDate);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch board transactions" });
    }
  });

  app.get("/api/income-details", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;

    try {
      const boardTypes = ["EV", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "KING"];
      const results: Record<string, { directSponsor: string; levelIncome: string; upgradeAccumulated: string; total: string }> = {};

      for (const boardType of boardTypes) {
        const boardDescFilter = sql`(
          ${transactions.description} ILIKE ${'%(' + boardType + ' Board)%'}
          OR ${transactions.description} ILIKE ${'%(' + boardType + ')%'}
        )`;

        if (boardType === "EV") {
          const [directSponsor] = await db
            .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
            .from(transactions)
            .where(and(
              eq(transactions.userId, userId),
              eq(transactions.type, "REFERRAL_INCOME"),
              sql`${transactions.description} ILIKE '%Direct sponsor income%'`,
              sql`${transactions.description} NOT ILIKE '%(%)%'`,
              eq(transactions.status, "COMPLETED")
            ));

          const [upgradeAccumulated] = await db
            .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
            .from(transactions)
            .where(and(
              eq(transactions.userId, userId),
              eq(transactions.type, "LEVEL_INCOME"),
              boardDescFilter,
              eq(transactions.status, "COMPLETED")
            ));

          const ds = parseFloat(directSponsor?.total || "0");
          const ua = parseFloat(upgradeAccumulated?.total || "0");

          results[boardType] = {
            directSponsor: ds.toFixed(2),
            levelIncome: "0.00",
            upgradeAccumulated: ua.toFixed(2),
            total: ds.toFixed(2),
          };
        } else {
          const [levelIncomeMainWallet] = await db
            .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
            .from(transactions)
            .where(and(
              eq(transactions.userId, userId),
              eq(transactions.type, "REFERRAL_INCOME"),
              sql`${transactions.description} ILIKE '%Level%income%'`,
              boardDescFilter,
              eq(transactions.status, "COMPLETED")
            ));

          const [levelIncomeUpgradeAndRebirth] = await db
            .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
            .from(transactions)
            .where(and(
              eq(transactions.userId, userId),
              eq(transactions.type, "LEVEL_INCOME"),
              boardDescFilter,
              eq(transactions.status, "COMPLETED")
            ));

          const [upgradeOnly] = await db
            .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
            .from(transactions)
            .where(and(
              eq(transactions.userId, userId),
              eq(transactions.type, "LEVEL_INCOME"),
              sql`${transactions.description} ILIKE '%[Upgrade]%'`,
              boardDescFilter,
              eq(transactions.status, "COMPLETED")
            ));

          const liMain = parseFloat(levelIncomeMainWallet?.total || "0");
          const liUpgradeRebirth = parseFloat(levelIncomeUpgradeAndRebirth?.total || "0");
          const ua = parseFloat(upgradeOnly?.total || "0");
          const totalLevelIncome = liMain + liUpgradeRebirth;

          results[boardType] = {
            directSponsor: "0.00",
            levelIncome: totalLevelIncome.toFixed(2),
            upgradeAccumulated: ua.toFixed(2),
            total: totalLevelIncome.toFixed(2),
          };
        }
      }

      const totalDirectSponsor = parseFloat(results["EV"].directSponsor);
      const totalLevelIncome = boardTypes.filter(b => b !== "EV").reduce((sum, b) => sum + parseFloat(results[b].levelIncome), 0);
      const totalUpgradeAccumulated = Object.values(results).reduce((sum, r) => sum + parseFloat(r.upgradeAccumulated), 0);

      res.json({
        boards: results,
        totals: {
          directSponsor: totalDirectSponsor.toFixed(2),
          levelIncome: totalLevelIncome.toFixed(2),
          upgradeAccumulated: totalUpgradeAccumulated.toFixed(2),
          grandTotal: (totalDirectSponsor + totalLevelIncome).toFixed(2),
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch income details" });
    }
  });

  // Get matrix positions for user in a specific board type
  app.get("/api/matrix/:boardType", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const memberId = req.query.memberId ? parseInt(req.query.memberId as string) : null;
    const targetId = memberId || (req.user as any).id;
    const boardType = req.params.boardType;
    const matrixChildren = await storage.getMatrixChildren(targetId, boardType);
    res.json(matrixChildren);
  });

  // Get count of matrix children for a member
  app.get("/api/matrix/:boardType/count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const memberId = req.query.memberId ? parseInt(req.query.memberId as string) : null;
    const targetId = memberId || (req.user as any).id;
    const boardType = req.params.boardType;
    const count = await storage.getMatrixChildrenCount(targetId, boardType);
    res.json({ count });
  });

  // Rebirth Accounts
  app.get("/api/rebirth-accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const accounts = await storage.getRebirthAccounts(userId);
    res.json(accounts);
  });

  app.post(api.boards.join.path, async (req, res) => {
     if (!req.isAuthenticated()) return res.sendStatus(401);
     const { type } = api.boards.join.input.parse(req.body);
     const userId = (req.user as any).id;

     // Use the new joinBoard method with income distribution
     const result = await storage.joinBoard(userId, type);
     
     if (!result.success) {
       return res.status(400).json({ message: result.message });
     }

     // Send activation email for EV board (non-blocking)
     if (type === "EV") {
       const user = await storage.getUser(userId);
       if (user && user.email) {
         sendActivationEmail(user).catch(err => {
           console.error("Failed to send activation email:", err.message);
         });
         // Also send invoice email
         const userInvoices = await storage.getUserInvoices(userId);
         if (userInvoices.length > 0) {
           sendActivationInvoiceEmail(user, userInvoices[0]).catch(err => {
             console.error("Failed to send invoice email:", err.message);
           });
         }
       }
     }

     const board = await storage.getBoard(userId, type);
     res.json(board);
  });

  // =========== USER INVOICE ROUTES ===========

  app.get("/api/invoices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = (req.user as any).id;
      let userInvoices = await storage.getUserInvoices(userId);

      if (userInvoices.length === 0) {
        const userBoards = await storage.getUserBoards(userId);
        const hasEvBoard = userBoards.some(b => b.type === "EV");
        if (hasEvBoard) {
          await storage.generateInvoice(userId, "EV");
          userInvoices = await storage.getUserInvoices(userId);
        }
      }

      res.json(userInvoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.userId !== (req.user as any).id && !(req.user as any).isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // =========== USER KYC ROUTES ===========

  app.get("/api/kyc", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = (req.user as any).id;
      const kyc = await storage.getKyc(userId);
      res.json(kyc || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch KYC" });
    }
  });

  app.post("/api/kyc", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = (req.user as any).id;
      const { aadhaarNumber, panNumber, fullName, dateOfBirth, address, bankAccountNumber, bankIfsc, bankName, gpayPhonePeNumber, upiId } = req.body;
      const kyc = await storage.submitKyc(userId, { aadhaarNumber, panNumber, fullName, dateOfBirth, address, bankAccountNumber, bankIfsc, bankName, gpayPhonePeNumber, upiId });
      res.json(kyc);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to submit KYC" });
    }
  });

  // =========== PROFILE PICTURE ROUTES ===========

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.post("/api/profile-picture", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    next();
  }, profilePicUpload.single("profilePicture"), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const filePath = `/uploads/profile-pictures/${req.file.filename}`;
      await storage.updateProfilePicture(userId, filePath);
      res.json({ profilePicture: filePath });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to upload profile picture" });
    }
  });

  // =========== CHANGE PASSWORD ROUTES ===========

  app.get("/api/password-change-options", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const smtpEnabled = await isSmtpEnabled();
      const user = await storage.getUser((req.user as any).id);
      const hasEmail = !!(user?.email);
      res.json({ otpAvailable: smtpEnabled && hasEmail });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch options" });
    }
  });

  app.post("/api/password-change-otp/send", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user || !user.email) {
        return res.status(400).json({ message: "No email address on file" });
      }
      const otp = crypto.randomInt(100000, 999999).toString();
      passwordOtpStore.set(userId, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
      const sent = await sendPasswordOtpEmail({ fullName: user.fullName, email: user.email }, otp);
      if (!sent) {
        return res.status(500).json({ message: "Failed to send OTP email. Check SMTP settings." });
      }
      const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
      res.json({ message: `OTP sent to ${maskedEmail}` });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to send OTP" });
    }
  });

  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = (req.user as any).id;
      const { currentPassword, otp, newPassword, method } = req.body;
      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (method === "otp") {
        if (!otp) {
          return res.status(400).json({ message: "OTP is required" });
        }
        const stored = passwordOtpStore.get(userId);
        if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
          return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        passwordOtpStore.delete(userId);
      } else {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }
        const valid = await comparePasswords(currentPassword, user.password);
        if (!valid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      const hashed = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashed });
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to change password" });
    }
  });

  // =========== USER EV REWARDS ROUTES ===========

  app.get("/api/ev-rewards", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userId = (req.user as any).id;
      const rewards = await storage.getUserEvRewards(userId);
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rewards" });
    }
  });

  // =========== ADMIN ROUTES ===========
  
  // Admin middleware helper
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!(req.user as any).isAdmin) return res.status(403).json({ message: "Admin access required" });
    next();
  };

  // Admin Dashboard Stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin: Get all users with pagination
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string || "";
      const users = await storage.getAllUsers(page, limit, search);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Get user details
  app.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const wallet = await storage.getWallet(userId);
      const boards = await storage.getUserBoards(userId);
      const rebirthAccounts = await storage.getRebirthAccounts(userId);
      const referralCount = await storage.getActiveDirectReferralCount(userId);
      const kyc = await storage.getKyc(userId);
      
      res.json({ user, wallet, boards, rebirthAccounts, referralCount, kyc: kyc || null });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });

  app.get("/api/admin/users/:id/password", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ password: user.password });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch password" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { fullName, email, mobile, username } = req.body;
      const updates: any = {};
      if (fullName !== undefined) updates.fullName = fullName;
      if (email !== undefined) updates.email = email;
      if (mobile !== undefined) updates.mobile = mobile;
      if (username !== undefined) updates.username = username;
      await storage.updateUser(userId, updates);
      const updatedUser = await storage.getUserById(userId);
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const hashed = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashed });
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin: Adjust wallet balance
  app.post("/api/admin/users/:id/adjust-wallet", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { amount, type, description } = req.body;
      await storage.adminAdjustWallet(userId, parseFloat(amount), type, description);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to adjust wallet" });
    }
  });

  // Admin: Get all withdrawals
  app.get("/api/admin/withdrawals", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as string || "all";
      const withdrawals = await storage.getAllWithdrawals(status);
      res.json(withdrawals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });

  // Admin: Approve/Reject withdrawal
  app.patch("/api/admin/withdrawals/:id", requireAdmin, async (req, res) => {
    try {
      const withdrawalId = parseInt(req.params.id);
      const { status, adminNote } = req.body;
      await storage.updateWithdrawalStatus(withdrawalId, status, adminNote);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update withdrawal" });
    }
  });

  // Admin: Get all transactions with filters
  app.get("/api/admin/transactions", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string || "all";
      const transactions = await storage.getAllTransactions(page, limit, type);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Admin: Get board statistics
  app.get("/api/admin/boards/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getBoardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch board stats" });
    }
  });

  // Admin: Get financial reports
  app.get("/api/admin/reports/financial", requireAdmin, async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const report = await storage.getFinancialReport(startDate, endDate);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch financial report" });
    }
  });

  // Admin: Get referral tree for any user
  app.get("/api/admin/users/:id/referral-tree", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const referrals = await storage.getReferrals(userId);
      res.json(referrals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral tree" });
    }
  });

  // Admin: Get matrix for any user
  app.get("/api/admin/users/:id/matrix/:boardType", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const boardType = req.params.boardType;
      const matrixChildren = await storage.getMatrixChildren(userId, boardType);
      res.json(matrixChildren);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch matrix" });
    }
  });

  // Admin: Get all KYC documents
  app.get("/api/admin/kyc", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string || "all";
      const kycs = await storage.getAllKyc(page, limit, status);
      res.json(kycs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch KYC documents" });
    }
  });

  // Admin: Get KYC details
  app.get("/api/admin/kyc/:id", requireAdmin, async (req, res) => {
    try {
      const kycId = parseInt(req.params.id);
      const kyc = await storage.getKycById(kycId);
      if (!kyc) return res.status(404).json({ message: "KYC not found" });
      res.json(kyc);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch KYC details" });
    }
  });

  // Admin: Approve/Reject KYC
  app.patch("/api/admin/kyc/:id", requireAdmin, async (req, res) => {
    try {
      const kycId = parseInt(req.params.id);
      const { status, adminNote } = req.body;
      await storage.updateKycStatus(kycId, status, adminNote || "");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update KYC status" });
    }
  });

  // Admin: Get all EV rewards
  app.get("/api/admin/ev-rewards", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string || "all";
      const rewards = await storage.getAllEvRewards(page, limit, status);
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch EV rewards" });
    }
  });

  // Admin: Update EV reward status
  app.patch("/api/admin/ev-rewards/:id", requireAdmin, async (req, res) => {
    try {
      const rewardId = parseInt(req.params.id);
      const { status, vehicleModel, vehicleDetails, adminNote } = req.body;
      await storage.updateEvRewardStatus(rewardId, status, { vehicleModel, vehicleDetails, adminNote });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update reward status" });
    }
  });

  // Admin: Get all invoices
  app.get("/api/admin/invoices", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const allInvoices = await storage.getAllInvoices(page, limit);
      res.json(allInvoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Admin: Genealogy tree data
  app.get("/api/admin/genealogy", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsersForGenealogy();
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch genealogy data" });
    }
  });

  // Admin: Get SMTP settings
  app.get("/api/admin/smtp", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSmtpSettings();
      if (settings) {
        res.json({ ...settings, password: "••••••••" });
      } else {
        res.json(null);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch SMTP settings" });
    }
  });

  // Admin: Save SMTP settings
  app.post("/api/admin/smtp", requireAdmin, async (req, res) => {
    try {
      const { host, port, secure, username, password, fromEmail, fromName, enabled } = req.body;

      const existing = await storage.getSmtpSettings();
      const finalPassword = password === "••••••••" && existing ? existing.password : password;

      const settings = await storage.saveSmtpSettings({
        host,
        port: parseInt(port),
        secure: !!secure,
        username,
        password: finalPassword,
        fromEmail,
        fromName: fromName || "Aghan Promoters",
        enabled: !!enabled,
      });
      res.json({ ...settings, password: "••••••••" });
    } catch (error) {
      res.status(500).json({ message: "Failed to save SMTP settings" });
    }
  });

  // Admin: Test SMTP
  app.post("/api/admin/smtp/test", requireAdmin, async (req, res) => {
    try {
      const { host, port, secure, username, password, fromEmail, fromName, testEmail } = req.body;

      const existing = await storage.getSmtpSettings();
      const finalPassword = password === "••••••••" && existing ? existing.password : password;

      await sendTestEmail(testEmail, {
        host,
        port: parseInt(port),
        secure: !!secure,
        username,
        password: finalPassword,
        fromEmail,
        fromName: fromName || "Aghan Promoters",
      });
      res.json({ success: true, message: "Test email sent successfully" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to send test email" });
    }
  });

  // =========== END ADMIN ROUTES ===========

  // Seeding Logic
  const existingUsers = await storage.getUserByUsername("admin");
  if (!existingUsers) {
    const hashedPassword = await import("./auth").then(m => (m as any).hashPassword("admin123").catch(() => "hashed_secret"));
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      fullName: "Admin User",
      email: "admin@aghan.com",
      mobile: "9999999999",
      referralCode: "ADMIN01",
      isAdmin: true,
      sponsorId: null
    });
  }

  // Auto-promote admin by email
  const adminEmail = "aghanpromoters@gmail.com";
  const adminByEmail = await storage.getUserByEmail(adminEmail);
  if (adminByEmail && !adminByEmail.isAdmin) {
    await storage.promoteToAdmin(adminByEmail.id);
    console.log(`Promoted ${adminEmail} to admin`);
  }

  return httpServer;
}
