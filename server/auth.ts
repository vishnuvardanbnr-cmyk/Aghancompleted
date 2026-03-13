
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import pgSession from "connect-pg-simple";
import { sendRegistrationEmail } from "./email";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export { hashPassword, comparePasswords };

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const PgSession = pgSession(session);
  
  const sessionSettings: session.SessionOptions = {
    store: new PgSession({ pool, tableName: 'session' }),
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: app.get("env") === "production",
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUser(id as number);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      let sponsorId = null;
      const totalUsers = await storage.getTotalUserCount();
      if (req.body.sponsorCode) {
        let code = req.body.sponsorCode.trim();
        if (code.toUpperCase().startsWith("AP")) {
          code = code.substring(2);
        }
        const sponsor = await storage.getUserByReferralCode(code);
        if (sponsor) {
          sponsorId = sponsor.id;
        } else {
          return res.status(400).send("Invalid sponsor code. Please enter a valid referral code.");
        }
      } else if (totalUsers > 0) {
        return res.status(400).send("Sponsor code is required. Please enter a valid referral code to register.");
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        sponsorId,
        referralCode: Math.random().toString(36).substring(7).toUpperCase(), // Simple random code
      });
      
      // Initialize Wallet
      await storage.createWallet(user.id);

      // Send registration email (non-blocking)
      if (user.email) {
        sendRegistrationEmail(user).catch(err => {
          console.error("Failed to send registration email:", err.message);
        });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const isImpersonating = !!(req.session as any).originalAdminId;
    res.json({ ...(req.user as any), isImpersonating });
  });

  // Admin impersonation: log in as another user without their password
  app.post("/api/admin/impersonate/:userId", async (req, res, next) => {
    if (!req.isAuthenticated() || !(req.user as any).isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    if ((req.session as any).originalAdminId) {
      return res.status(400).json({ message: "Already impersonating a user. Exit first." });
    }
    try {
      const targetId = parseInt(req.params.userId);
      const targetUser = await storage.getUser(targetId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.isAdmin) return res.status(400).json({ message: "Cannot impersonate an admin account" });

      const adminId = (req.user as any).id;
      (req.session as any).originalAdminId = adminId;

      req.login(targetUser, (err) => {
        if (err) return next(err);
        res.json({ ...(targetUser as any), isImpersonating: true });
      });
    } catch (err) {
      next(err);
    }
  });

  // Exit impersonation: restore original admin session
  app.post("/api/admin/exit-impersonation", async (req, res, next) => {
    const originalAdminId = (req.session as any).originalAdminId;
    if (!originalAdminId) {
      return res.status(400).json({ message: "Not currently impersonating any user" });
    }
    try {
      const adminUser = await storage.getUser(originalAdminId);
      if (!adminUser) return res.status(404).json({ message: "Original admin not found" });

      delete (req.session as any).originalAdminId;

      req.login(adminUser, (err) => {
        if (err) return next(err);
        res.json({ ...(adminUser as any), isImpersonating: false });
      });
    } catch (err) {
      next(err);
    }
  });
}
