
import { z } from 'zod';
import { insertUserSchema, users, wallets, boards, transactions, withdrawals } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema.extend({
        sponsorCode: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  user: {
    dashboard: {
      method: 'GET' as const,
      path: '/api/dashboard',
      responses: {
        200: z.object({
          wallet: z.custom<typeof wallets.$inferSelect>(),
          activeBoards: z.array(z.custom<typeof boards.$inferSelect>()),
          referralCount: z.number(),
          totalTeamSize: z.number(),
        }),
      },
    },
    team: {
      method: 'GET' as const,
      path: '/api/team',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect & { level: number }>()),
      },
    },
  },
  wallet: {
    get: {
      method: 'GET' as const,
      path: '/api/wallet',
      responses: {
        200: z.custom<typeof wallets.$inferSelect>(),
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/wallet/history',
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
      },
    },
    withdraw: {
      method: 'POST' as const,
      path: '/api/wallet/withdraw',
      input: z.object({
        amount: z.number().min(100),
        bankDetails: z.string(),
      }),
      responses: {
        201: z.custom<typeof withdrawals.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  boards: {
    list: {
      method: 'GET' as const,
      path: '/api/boards',
      responses: {
        200: z.array(z.custom<typeof boards.$inferSelect>()),
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/boards/join',
      input: z.object({
        type: z.enum(["EV", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "KING"]),
      }),
      responses: {
        200: z.custom<typeof boards.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    details: {
      method: 'GET' as const,
      path: '/api/boards/:type',
      responses: {
        200: z.object({
          board: z.custom<typeof boards.$inferSelect>(),
          matrix: z.array(z.any()), // Simplified for now
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
