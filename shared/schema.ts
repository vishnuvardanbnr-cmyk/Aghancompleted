
import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session table for express-session (managed by connect-pg-simple)
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Enums
export const boardTypeEnum = pgEnum("board_type", ["EV", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "KING"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["DEPOSIT", "WITHDRAWAL", "REFERRAL_INCOME", "LEVEL_INCOME", "BOARD_ENTRY", "BOARD_COMPLETION", "ADMIN_ADJUSTMENT"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["PENDING", "COMPLETED", "REJECTED"]);
export const rebirthStatusEnum = pgEnum("rebirth_status", ["ACTIVE", "PROMOTED", "COMPLETED"]);
export const accountRoleEnum = pgEnum("account_role", ["MOTHER", "SUB"]);

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  mobile: text("mobile").notNull(),
  sponsorId: integer("sponsor_id"),
  referralCode: text("referral_code").notNull().unique(),
  isAdmin: boolean("is_admin").default(false),
  isCompany: boolean("is_company").default(false),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wallets Table
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  mainBalance: decimal("main_balance", { precision: 12, scale: 2 }).default("0").notNull(),
  upgradeBalance: decimal("upgrade_balance", { precision: 12, scale: 2 }).default("0").notNull(),
  rebirthBalance: decimal("rebirth_balance", { precision: 12, scale: 2 }).default("0").notNull(),
  totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 }).default("0").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Boards Table (Tracks user's progress in different boards)
export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: boardTypeEnum("type").notNull(),
  status: text("status").default("ACTIVE"), // ACTIVE, COMPLETED
  isFromSubAccount: boolean("is_from_sub_account").default(false),
  sourceRebirthAccountId: integer("source_rebirth_account_id"),
  isRebirth: boolean("is_rebirth").default(false),
  rebirthIndex: integer("rebirth_index"),
  rebirthLabel: text("rebirth_label"),
  isCompanyPlacement: boolean("is_company_placement").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Matrix Positions (Who is under whom in a specific board context)
export const matrixPositions = pgTable("matrix_positions", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull().references(() => boards.id), // The specific board instance
  userId: integer("user_id").notNull().references(() => users.id),
  parentId: integer("parent_id").references(() => users.id), // Immediate uploader in the matrix
  position: integer("position"), // 1-6 for EV board
  level: integer("level").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions Table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").default("COMPLETED"),
  description: text("description"),
  sourceUserId: integer("source_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Withdrawals Request Table
export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 12, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }),
  status: transactionStatusEnum("status").default("PENDING"),
  bankDetails: text("bank_details"),
  adminNote: text("admin_note"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Rebirth Accounts Table (Per-board rebirth sub-accounts with mother/sub hierarchy)
export const rebirthAccounts = pgTable("rebirth_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  boardType: boardTypeEnum("board_type").notNull(),
  cycle: integer("cycle").default(1).notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0").notNull(),
  threshold: decimal("threshold", { precision: 12, scale: 2 }).notNull(),
  nextBoardType: boardTypeEnum("next_board_type"),
  status: rebirthStatusEnum("status").default("ACTIVE"),
  accountRole: accountRoleEnum("account_role").default("MOTHER"),
  parentAccountId: integer("parent_account_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  promotedAt: timestamp("promoted_at"),
});

// KYC Status Enum
export const kycStatusEnum = pgEnum("kyc_status", ["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED"]);

// EV Reward Status Enum
export const evRewardStatusEnum = pgEnum("ev_reward_status", ["PENDING", "PROCESSING", "DELIVERED", "AWAITING_REFERRALS"]);

// EV Reward Claim Type Enum
export const evRewardClaimTypeEnum = pgEnum("ev_reward_claim_type", ["VEHICLE", "CASH", "UNCLAIMED"]);

// Invoices Table (EV Vehicle Booking Invoice on account activation)
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  invoiceDate: timestamp("invoice_date").defaultNow(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerMobile: text("customer_mobile").notNull(),
  description: text("description").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gst_amount", { precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  gstPercentage: decimal("gst_percentage", { precision: 5, scale: 2 }).default("18"),
  boardType: boardTypeEnum("board_type").notNull(),
  status: text("status").default("PAID"),
  createdAt: timestamp("created_at").defaultNow(),
});

// KYC Documents Table
export const kycDocuments = pgTable("kyc_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  aadhaarNumber: text("aadhaar_number"),
  panNumber: text("pan_number"),
  fullName: text("full_name").notNull(),
  dateOfBirth: text("date_of_birth"),
  address: text("address"),
  bankAccountNumber: text("bank_account_number"),
  bankIfsc: text("bank_ifsc"),
  bankName: text("bank_name"),
  gpayPhonePeNumber: text("gpay_phonepe_number"),
  upiId: text("upi_id"),
  status: kycStatusEnum("status").default("PENDING"),
  adminNote: text("admin_note"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

// EV Vehicle Rewards Table
export const evRewards = pgTable("ev_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  boardType: boardTypeEnum("board_type").notNull(),
  rewardAmount: decimal("reward_amount", { precision: 12, scale: 2 }).default("100000"),
  status: evRewardStatusEnum("status").default("PENDING"),
  claimType: evRewardClaimTypeEnum("claim_type").default("UNCLAIMED"),
  isFromRebirth: boolean("is_from_rebirth").default(false),
  rebirthIndex: integer("rebirth_index"),
  rebirthBoardId: integer("rebirth_board_id"),
  vehicleModel: text("vehicle_model"),
  vehicleDetails: text("vehicle_details"),
  adminNote: text("admin_note"),
  awardedAt: timestamp("awarded_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  referralTimerStartedAt: timestamp("referral_timer_started_at"),
  referralDeadline: timestamp("referral_deadline"),
});

// SMTP Settings Table (singleton - one row)
export const smtpSettings = pgTable("smtp_settings", {
  id: serial("id").primaryKey(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(587),
  secure: boolean("secure").default(false),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull().default("Aghan Promoters"),
  enabled: boolean("enabled").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SmtpSettings = typeof smtpSettings.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  sponsor: one(users, {
    fields: [users.sponsorId],
    references: [users.id],
    relationName: "referrals"
  }),
  referrals: many(users, { relationName: "referrals" }),
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  boards: many(boards),
  transactions: many(transactions),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  user: one(users, {
    fields: [boards.userId],
    references: [users.id],
  }),
  positions: many(matrixPositions),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, updatedAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type Board = typeof boards.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type RebirthAccount = typeof rebirthAccounts.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type EvReward = typeof evRewards.$inferSelect;

// Auth Types
export type LoginRequest = {
  username: string;
  password: string;
};
