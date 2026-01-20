import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DatabaseManager } from '@/database/db';
import { EmailEncryption } from '@/lib/encryption';
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

// Middleware to check authentication (simplified)
async function getAuthenticatedUser(request: NextRequest, db: DatabaseManager) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  // In a real app, you'd validate the session token here
  // For now, we'll extract user ID from header
  const userId = authHeader.replace('Bearer ', '');
  return await db.getUserById(userId);
}

const createAliasSchema = z.object({
  description: z.string().optional(),
  forwardingEmail: z.string().email(),
});

export async function GET(request: NextRequest, context: { env: { DB: D1Database } }) {
  try {
    const db = await getDatabase(context.env.DB);
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aliases = await db.getAliasesByUserId(user.id);

    return NextResponse.json({ aliases });
  } catch (error) {
    console.error('Get aliases error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: { env: { DB: D1Database } }) {
  try {
    const db = await getDatabase(context.env.DB);
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description, forwardingEmail } = createAliasSchema.parse(body);

    // Generate a unique alias
    let alias: string;
    let attempts = 0;
    do {
      alias = EmailEncryption.generateAlias();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json(
          { error: 'Could not generate unique alias' },
          { status: 500 }
        );
      }
    } while ((await db.getAliasesByUserId(user.id)).some(a => a.alias === alias));

    // Create the alias
    const aliasId = crypto.randomUUID();
    await db.createAlias({
      id: aliasId,
      userId: user.id,
      alias,
      description,
      forwardingEmail,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      alias: {
        id: aliasId,
        alias,
        description,
        forwardingEmail,
        isActive: true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Create alias error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}