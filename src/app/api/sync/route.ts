import { NextRequest, NextResponse } from 'next/server';
import { getSyncService } from '@/lib/sync';
import { MasterKeyManager } from '@/lib/encryption';
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

const syncSchema = z.object({
  deviceId: z.string(),
  lastSyncTimestamp: z.string().optional(),
});

export async function POST(request: NextRequest, context: { env: { DB: D1Database } }) {
  try {
    const db = await getDatabase(context.env.DB);
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { deviceId, lastSyncTimestamp } = syncSchema.parse(body);

    const syncService = getSyncService();

    // Verify device belongs to user
    const devices = await db.getDevicesByUserId(user.id);
    const device = devices.find(d => d.id === deviceId);

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Get user's master encryption key from database
    const masterKey = await MasterKeyManager.decryptMasterKey(
      user.encryptionKey,
      user.masterKeySalt
    );

    const lastSync = lastSyncTimestamp ? new Date(lastSyncTimestamp) : undefined;

    const syncResult = await syncService.syncDevice(
      user.id,
      deviceId,
      masterKey,
      lastSync,
      db // Pass the database instance to the sync service
    );

    return NextResponse.json({
      success: true,
      aliases: syncResult.aliases,
      syncTimestamp: syncResult.syncTimestamp.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: { env: { DB: D1Database } }) {
  try {
    const db = await getDatabase(context.env.DB);
    const user = await getAuthenticatedUser(request, db);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const syncService = getSyncService();

    const devices = await db.getDevicesByUserId(user.id);

    return NextResponse.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}