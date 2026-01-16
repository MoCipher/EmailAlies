import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/db';
import { MasterKeyManager } from '@/lib/encryption';
import { z } from 'zod';

// Force dynamic rendering to prevent static analysis during build
export const dynamic = 'force-dynamic';

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifyCodeSchema.parse(body);

    const db = getDatabase();

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

    let user;

    if (verification.purpose === 'register') {
      // Check if user already exists (shouldn't happen but safety check)
      const existingUser = db.getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists' },
          { status: 409 }
        );
      }

      // Create new user with generated master key
      const { masterKey, salt } = await MasterKeyManager.generateMasterKey();
      const encryptedMasterKey = await MasterKeyManager.encryptMasterKey(masterKey, salt);

      const userId = crypto.randomUUID();
      db.createUser({
        id: userId,
        email,
        encryptionKey: encryptedMasterKey,
        masterKeySalt: salt,
      });

      user = db.getUserById(userId);
    } else if (verification.purpose === 'login') {
      // Get existing user
      user = db.getUserByEmail(email);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
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
      },
      sessionToken,
      isNewUser: verification.purpose === 'register',
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