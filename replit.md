# Aghan Promoters - EV MLM Platform

## Overview

Aghan Promoters is a full-stack MLM (Multi-Level Marketing) web application for the promotion and booking of EV 2-wheelers. The platform uses a 6x matrix board plan with auto-fill mechanics. Users join by paying ₹5,900 (which also serves as a vehicle booking fee) and progress through six boards (EV → Silver → Gold → Platinum → Diamond → King), earning referral income, level income, and eventually a free EV vehicle worth ₹1,00,000 upon completing the EV Board.

The `Agzip/` directory is a backup/archive copy of the main project — the active codebase lives at the repository root.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled using Vite.
- **Routing**: Wouter (lightweight React router).
- **State Management**: TanStack React Query for all server state — no Redux or Zustand. API calls use a custom `apiRequest` helper and `getQueryFn` wrapper in `client/src/lib/queryClient.ts`.
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives. Component config is in `components.json`. UI components live under `client/src/components/ui/`.
- **Styling**: Tailwind CSS with CSS variables for theming. Custom EV-themed color palette (emerald greens, electric blues). Supports light/dark mode via a `ThemeProvider` context that toggles a CSS class on `<html>`.
- **Forms**: React Hook Form with Zod resolvers for validation.
- **Design**: Mobile-first responsive design with a Sheet-based mobile navigation drawer. Scroll-to-top on every route change.
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`.

### Backend Architecture
- **Runtime**: Node.js with Express.
- **Language**: TypeScript. Development uses `tsx` to run directly; production builds use `esbuild` to compile to `dist/index.cjs`.
- **API Pattern**: RESTful endpoints under the `/api` prefix. Route definitions are in `server/routes.ts`, with API shape contracts defined in `shared/routes.ts`.
- **Session Management**: Express sessions stored in PostgreSQL via `connect-pg-simple`. Session table is defined in the schema.
- **Authentication**: Passport.js with a local strategy. Passwords are hashed using Node's built-in `scrypt` (not bcrypt). Auth setup is in `server/auth.ts`.
- **File Uploads**: Multer for profile picture uploads, stored on disk under `uploads/profile-pictures/`.
- **Email**: Nodemailer with SMTP settings stored in the database (admin-configurable). Email logic is in `server/email.ts`.
- **Business Logic**: The `server/storage.ts` file contains the core MLM logic including board configuration, matrix placement algorithms (FCFS for EV Board, "Jungle FCFS" for other boards), income distribution rules, wallet management, and board progression.
- **Dev Server**: In development, Vite runs as middleware via `server/vite.ts` with HMR support. In production, pre-built static files are served from `dist/public/` via `server/static.ts`.

### Data Layer
- **Database**: PostgreSQL (required — `DATABASE_URL` environment variable must be set).
- **ORM**: Drizzle ORM with the `node-postgres` driver. Database connection is in `server/db.ts`.
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` definitions. Includes validation schemas via `drizzle-zod`.
- **Key Tables**: `users`, `wallets`, `boards`, `matrixPositions`, `transactions`, `withdrawals`, `rebirthAccounts`, `invoices`, `kycDocuments`, `evRewards`, `smtpSettings`, `session`.
- **Enums**: PostgreSQL enums for `board_type`, `transaction_type`, `transaction_status`, `rebirth_status`, `account_role`.
- **Schema Push**: Use `npm run db:push` (runs `drizzle-kit push`) to sync schema to the database. No migration files are generated — it pushes directly.

### Key Business Features
- **Board System**: Six boards with escalating entry fees (₹5,900 → ₹1,00,000). Each board has a 6-slot matrix.
- **Matrix Placement**: EV Board uses sponsor-based FCFS; all other boards use "Jungle FCFS" (global fill ignoring sponsor relationships).
- **Wallet System**: Three wallet types — `mainBalance` (withdrawable), `rebirthBalance` (auto-entry for rebirth EV boards), `upgradeBalance` (accumulates for next board).
- **Income Distribution**: Direct sponsor income and multi-level income with board-specific payout structures. A sponsor can receive both direct sponsor income (Rs.500) and level income (Rs.150) from the same referral if that referral is placed under them in the matrix.
- **Auto-Rebirth System**: When ₹5,900 accumulates in a user's Rebirth Wallet, a new EV Board entry (rebirth account) is auto-created. Max 38 rebirth accounts per user. Rebirth boards use labels like `username1`, `username2`. Direct sponsor income from rebirth goes to the original referrer. On rebirth EV Board completion, a company account is placed in Silver Board instead of user promotion. Company account flows continue through Gold, Platinum, Diamond, King.
- **EV Reward Claim**: On EV Board completion (main or rebirth), user earns a reward worth ₹1,00,000. User can choose to claim as EV Vehicle or Cash (₹1,00,000 to main wallet).
- **Company Account**: A special system user (`COMPANY_ACCOUNT`) that fills Silver/Gold/etc. board slots when rebirth boards complete (instead of promoting the user).
- **KYC Verification**: Users submit Aadhaar, PAN, and bank details. Admin approves/rejects. Statuses: NOT_SUBMITTED → PENDING → VERIFIED/REJECTED.
- **EV Vehicle Rewards**: Completing the EV Board (6/6 members filled) earns a free EV vehicle or ₹1,00,000 cash. Admin manages delivery status.
- **Invoice System**: Auto-generated invoices on account activation with print capability.
- **Admin Panel**: Dashboard, user management, withdrawal approval, transaction history, reporting, KYC verification, EV reward management, SMTP email configuration, and genealogy tree view.

### Build System
- **Development**: `npm run dev` — runs `tsx server/index.ts` with Vite middleware for HMR.
- **Production Build**: `npm run build` — runs `script/build.ts` which first builds the React client with Vite (output to `dist/public/`), then bundles the server with esbuild (output to `dist/index.cjs`). Frequently-used server dependencies are bundled; others are externalized.
- **Production Start**: `npm start` — runs `node dist/index.cjs`.
- **Type Checking**: `npm run check` — runs `tsc` with no emit.

### Important Conventions
- Shared code (schema, route contracts, types) lives in the `shared/` directory and is imported by both client and server.
- The client never imports directly from `server/` and vice versa — `shared/` is the bridge.
- All API endpoints are prefixed with `/api`.
- The `Agzip/` directory is a duplicate/backup and should generally be ignored for active development.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store. Required via `DATABASE_URL` environment variable. Used for all application data and session storage.

### Email
- **Nodemailer**: Sends transactional emails (registration, activation, invoices, password OTPs). SMTP configuration is stored in the database and managed via admin panel — no hardcoded email provider.

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit**: ORM and schema management for PostgreSQL.
- **express** + **express-session**: HTTP server and session handling.
- **passport** + **passport-local**: Authentication framework.
- **connect-pg-simple**: PostgreSQL session store for Express.
- **@tanstack/react-query**: Server state management on the frontend.
- **wouter**: Client-side routing.
- **zod** + **drizzle-zod**: Schema validation (shared between client and server).
- **multer**: File upload handling.
- **shadcn/ui** (Radix UI primitives): UI component library.
- **tailwindcss**: Utility-first CSS framework.

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string (required).
- `SESSION_SECRET`: Secret for signing session cookies (falls back to "default_secret" in development).