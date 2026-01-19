// Cloudflare-specific utilities and helpers

// Runtime detection for Cloudflare environments
export const isCloudflarePages = () => {
  return typeof globalThis !== 'undefined' &&
         'caches' in globalThis &&
         'KVNamespace' in globalThis;
}

export const isCloudflareWorkers = () => {
  return typeof globalThis !== 'undefined' &&
         'WebSocketPair' in globalThis &&
         'fetch' in globalThis;
}

export const isProduction = () => {
  return process.env.NODE_ENV === 'production' ||
         process.env.CF_PAGES === '1' ||
         typeof globalThis !== 'undefined' && 'caches' in globalThis;
}

export const getRuntimeInfo = () => {
  return {
    isPages: isCloudflarePages(),
    isWorkers: isCloudflareWorkers(),
    isProduction: isProduction(),
    environment: process.env.NODE_ENV || 'development',
    cfPages: process.env.CF_PAGES,
  };
}

export interface CloudflareEnv {
  DB?: D1Database;
  RESEND_API_KEY?: string;
  NODE_ENV?: string;
  CF_PAGES?: string;
}

// Enhanced D1Database interface for Cloudflare Workers/Pages
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
  batch(statements: D1PreparedStatement[]): Promise<D1BatchResult>;
  dump(): Promise<ArrayBuffer>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Response>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[][]>;
}

export interface D1Response {
  success: boolean;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    changed_db: boolean;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
  results?: any[];
}

export interface D1Result<T = unknown> {
  results: T[];
  meta: D1Response['meta'];
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1BatchResult {
  success: boolean;
  results?: D1Response[];
}

// Cloudflare Pages function context type
export interface PagesFunctionContext<Env = CloudflareEnv> {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string) => Response;
  data: Record<string, unknown>;
}

// Utility to get Cloudflare environment variables safely
export function getCloudflareEnv(env?: CloudflareEnv): CloudflareEnv {
  const runtime = getRuntimeInfo();

  if (runtime.isPages || runtime.isWorkers) {
    return env || {};
  }

  // Fallback for local development
  return {
    DB: undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    CF_PAGES: process.env.CF_PAGES,
  };
}

// Check if we're running in Cloudflare environment
export function isCloudflareEnvironment(): boolean {
  const runtime = getRuntimeInfo();
  return runtime.isPages || runtime.isWorkers || runtime.isProduction;
}

// Safe database access for both environments
export function getDatabaseFromEnv(env?: CloudflareEnv) {
  const cfEnv = getCloudflareEnv(env);

  if (isCloudflareEnvironment() && cfEnv.DB) {
    return cfEnv.DB;
  }

  return null;
}

// Error handling for Cloudflare-specific errors
export class CloudflareError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'CloudflareError';
  }
}

// Response helpers for Cloudflare Pages
export const createJsonResponse = (data: any, status = 200, headers = {}) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
};

export const createErrorResponse = (error: CloudflareError | Error, status = 500) => {
  const isCloudflareError = error instanceof CloudflareError;
  const statusCode = isCloudflareError ? (error as CloudflareError).statusCode : status;

  return createJsonResponse({
    error: error.message,
    code: isCloudflareError ? (error as CloudflareError).code : undefined,
  }, statusCode);
};

// CORS preflight handler for Cloudflare Pages
export const handleCorsPreflight = () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
};

// Logging utility for Cloudflare
export const logToCloudflare = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

  if (data) {
    console[level](logMessage, data);
  } else {
    console[level](logMessage);
  }
};

// Rate limiting helper (basic implementation)
export class RateLimiter {
  private requests = new Map<string, number[]>();

  constructor(private maxRequests = 100, private windowMs = 15 * 60 * 1000) {} // 100 requests per 15 minutes

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    const userRequests = this.requests.get(identifier) || [];

    // Filter out old requests
    const recentRequests = userRequests.filter(time => time > windowStart);

    // Check if over limit
    if (recentRequests.length >= this.maxRequests) {
      return true;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    return false;
  }

  getRemainingRequests(identifier: string): number {
    const userRequests = this.requests.get(identifier) || [];
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const recentRequests = userRequests.filter(time => time > windowStart);

    return Math.max(0, this.maxRequests - recentRequests.length);
  }
}

// Export singleton rate limiter
export const rateLimiter = new RateLimiter();