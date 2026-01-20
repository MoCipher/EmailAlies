import { NextRequest, NextResponse } from 'next/server';
import { getSyncService } from '@/lib/sync';
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

const registerDeviceSchema = z.object({
  deviceName: z.string().min(1),
});

export async function POST(request: NextRequest, context: { env: { DB: D1Database } }) {
  try {
    const db = await getDatabase(context.env.DB);
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { deviceName } = registerDeviceSchema.parse(body);

    const syncService = getSyncService();
    const deviceId = await syncService.registerDevice(user.id, deviceName, db);

    return NextResponse.json({
      success: true,
      deviceId,
      deviceName,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Register device error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}