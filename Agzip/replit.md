# Aghan Promoters - EV MLM Platform

## Overview

Aghan Promoters is a full-stack MLM (Multi-Level Marketing) web application for the promotion and booking of EV 2-wheelers. The platform utilizes a 6x matrix board plan with an auto-fill mechanism. Users pay a ₹5900 joining fee to enter the initial EV Board and then progress through a total of six boards (EV, Silver, Gold, Platinum, Diamond, King). Each subsequent board has increasing entry fees and rewards, culminating in users receiving a free EV vehicle worth ₹1,00,000 upon completion of the King board. The project aims to capitalize on the growing EV market by integrating an MLM business model.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, bundled using Vite.
- **Routing**: Wouter.
- **State Management**: TanStack React Query for server state.
- **UI Components**: shadcn/ui library built on Radix UI primitives.
- **Styling**: Tailwind CSS with a custom EV-themed color palette (emerald greens, electric blues).
- **Theme**: Supports light/dark mode using CSS variables.
- **Design Philosophy**: Mobile-first responsive design, including a mobile navigation drawer.

### Backend Architecture
- **Runtime**: Node.js with Express.
- **Language**: TypeScript, compiled via `tsx` for development and `esbuild` for production.
- **API Pattern**: RESTful endpoints under the `/api` prefix.
- **Session Management**: Express sessions with PostgreSQL for session storage (`connect-pg-simple`).
- **Authentication**: Passport.js with a local strategy, using scrypt for password hashing.
- **Core Logic**: `storage.ts` contains the majority of the business logic, including board configuration, placement algorithms (FCFS for EV, "Jungle FCFS" for others), and income distribution rules.

### Data Layer
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation.
- **Schema**: Defined in `shared/schema.ts`, including tables for `users`, `wallets`, `boards`, `matrixPositions`, `transactions`, `withdrawals`, `rebirthAccounts`, `invoices`, `kycDocuments`, and `evRewards`. Enums define board types, transaction types/statuses, account roles, KYC statuses, and EV reward statuses.
- **Migrations**: Handled via `drizzle-kit push`.

### Key Features and Implementations
- **User Management**: Registration, login, profile management, referral tracking (`sponsorId`).
- **Wallet System**: `mainBalance` (withdrawable), `rebirthBalance` (for auto-entry into higher boards), `totalEarnings`.
- **Board System**: Users progress through six distinct boards with specific entry fees and income distribution rules.
- **Matrix Placement**:
    - **EV Board**: First-Come-First-Serve (FCFS) placement under the sponsor, with spillover within the sponsor's downline.
    - **Non-EV Boards**: "Jungle FCFS" algorithm for global distribution, ignoring sponsor relationships to ensure fair spread and filling levels sequentially.
- **Income Distribution**: Defined payout structures for direct sponsors and level income (into rebirth wallets). Special rules apply if board entry is from a sub-account.
- **Transaction & Withdrawal Management**: Comprehensive tracking of financial movements and a system for user withdrawal requests, including admin approval/rejection.
- **Admin Panel**: Features an admin dashboard, user management, withdrawal approval, transaction history, reporting, KYC verification, and EV vehicle reward management.
- **Invoice System**: Automatic EV Vehicle Booking invoice generation on account activation (₹5,900 payment). Users can view and print invoices.
- **KYC Verification**: Users submit identity documents (Aadhaar, PAN, bank details). Admin reviews and approves/rejects. Status: NOT_SUBMITTED -> PENDING -> VERIFIED/REJECTED.
- **EV Vehicle Rewards**: When a user completes the EV Board (6/6 members), they earn a free EV vehicle worth ₹1,00,000. Admin manages reward delivery status (PENDING -> PROCESSING -> DELIVERED).

### Build System
- **Development**: Vite dev server with Hot Module Replacement (HMR), proxied through Express.
- **Production**: Client built with Vite, server bundled with esbuild.

## External Dependencies

### Database
- **PostgreSQL**: Used for all persistent data storage and Express session management.

### UI Libraries
- **Radix UI**: Provides accessible and unstyled components for UI.
- **Embla Carousel**: For implementing carousel functionalities.
- **React Hook Form**: Manages form state and validation, integrated with Zod.
- **date-fns**: Utility library for date parsing, formatting, and manipulation.

### Authentication & Security
- **Passport.js**: Authentication middleware for Node.js.
- **scrypt**: Cryptographic key derivation function for secure password hashing.
- **express-session**: Middleware for managing user sessions.

### Development Tools
- **@replit/vite-plugin-runtime-error-modal**: Provides error modals during development on Replit.
- **@replit/vite-plugin-cartographer**: Development tooling for project visualization.
- **@replit/vite-plugin-dev-banner**: Displays a development environment banner.