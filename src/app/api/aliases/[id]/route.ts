import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DatabaseManager } from '@/database/db';
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

  const userId = authHeader.replace('Bearer ', '');
  return await db.getUserById(userId);
}

const updateAliasSchema = z.object({
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
  context: { env: { DB: D1Database } }
) {
  try {
    const db = await getDatabase(context.env.DB);
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = params;
    const body = await request.json();
    const updates = updateAliasSchema.parse(body);

    const aliases = await db.getAliasesByUserId(user.id);
    const alias = aliases.find(a => a.id === resolvedParams.id);

    if (!alias) {
      return NextResponse.json({ error: 'Alias not found' }, { status: 404 });
    }

    await db.updateAlias(resolvedParams.id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Update alias error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
  context: { env: { DB: D1Database } }
) {
  try {
    const db = await getDatabase(context.env.DB);
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = params;
    const aliases = await db.getAliasesByUserId(user.id);
    const alias = aliases.find(a => a.id === resolvedParams.id);

    if (!alias) {
      return NextResponse.json({ error: 'Alias not found' }, { status: 404 });
    }

    await db.deleteAlias(resolvedParams.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete alias error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}