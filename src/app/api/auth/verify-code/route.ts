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

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: NextRequest, context: { env: { DB: D1Database } }) {
  try {
    const body = await request.json();
    const { email, code } = verifyCodeSchema.parse(body);

    const db = await getDatabase(context.env.DB);

    // Dynamically load the real verification manager
    const { createRealVerificationManager } = await import('@/lib/verification');
    const VerificationManager = await createRealVerificationManager();

    // Verify the code
    const verification = VerificationManager.verifyCode(email, code);

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Only handle login for existing admin users
    if (verification.purpose !== 'login') {
      return NextResponse.json(
        { error: 'Invalid verification purpose' },
        { status: 400 }
      );
    }

    // Get existing admin user
    const user = await db.getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Ensure user is an admin
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 500 }
      );
    }

    // Create session token
    const sessionToken = crypto.randomUUID();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      },
      sessionToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}