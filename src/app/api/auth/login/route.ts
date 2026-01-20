import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/db';
import { z } from 'zod';

// Define a minimal interface for D1Database for local development and type checking
interface D1Database {
  prepare(query: string): {
    bind(...args: any[]): D1PreparedStatement;
    all(): Promise<{ results: any[] }>;
    first<T>(col?: string): Promise<T | null>;
    run(): Promise<{ success: boolean; results: any[]; meta: any }>;
  };
  exec(query: string): Promise<any>;
}

interface D1PreparedStatement {
  bind(...args: any[]): D1PreparedStatement;
  all(): Promise<{ results: any[] }>;
  first<T>(col?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; results: any[]; meta: any }>;
}

// Force dynamic rendering to prevent static analysis during build
export const dynamic = 'force-dynamic';

// Only allow these two admin emails
const ALLOWED_ADMIN_EMAILS = ['spoass@icloud.com', 'laila.torresanz@hotmail.com'];

const loginSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest, context: { env: { DB: D1Database } }) {
  try {
    const body = await request.json();
    const { email } = loginSchema.parse(body);

    // Check if email is allowed
    if (!ALLOWED_ADMIN_EMAILS.includes(email)) {
      return NextResponse.json(
        { error: 'Access denied. Only authorized users are allowed.' },
        { status: 403 }
      );
    }

    const db = getDatabase(context.env.DB);
    await db.initializeTablesAsync(); // Ensure D1 tables are initialized asynchronously
    const user = await db.getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'Account not found. Please contact the administrator.' },
        { status: 404 }
      );
    }

    // Dynamically load the real verification manager
    const { createRealVerificationManager } = await import('@/lib/verification');
    const VerificationManager = await createRealVerificationManager();

    // Generate and send verification code
    const code = VerificationManager.createCode(email, 'login');
    const emailSent = await VerificationManager.sendCode(email, code, 'login');

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}