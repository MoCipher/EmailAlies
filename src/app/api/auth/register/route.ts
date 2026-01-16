import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/db';
import { z } from 'zod';

// Force dynamic rendering to prevent static analysis during build
export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = registerSchema.parse(body);

    const db = getDatabase();

    // Check if user already exists
    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists. Try signing in instead.' },
        { status: 409 }
      );
    }

    // Dynamically load the real verification manager
    const { createRealVerificationManager } = await import('@/lib/verification');
    const VerificationManager = await createRealVerificationManager();

    // Generate and send verification code
    const code = VerificationManager.createCode(email, 'register');
    const emailSent = await VerificationManager.sendCode(email, code, 'register');

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

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}