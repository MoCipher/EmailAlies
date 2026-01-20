import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { User, EmailAlias, Email, Device, SyncData } from './schema';

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

export class DatabaseManager {
  private localDb: Database.Database | null = null;
  private d1Db: D1Database | null = null;
  private isCloudflare: boolean;

  constructor(d1Instance?: D1Database) {
    this.isCloudflare = !!d1Instance;

    if (this.isCloudflare) {
      this.d1Db = d1Instance!;
      // D1 needs to be initialized asynchronously, so we don't call initializeTables here.
      // It will be called via an async function in the API routes.
    } else {
      const dbPath = path.join(process.cwd(), 'data', 'emailalies.db');
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.localDb = new Database(dbPath);
      this.initializeTables();
    }
  }

  // Generic execute method for D1 or better-sqlite3
  private async _execute<T>(sql: string, params: any[] = [], method: 'run' | 'get' | 'all' = 'run'): Promise<T | T[] | { changes: number } | null> {
    if (this.isCloudflare && this.d1Db) {
      const stmt = this.d1Db.prepare(sql).bind(...params);
      switch (method) {
        case 'run':
          const result = await stmt.run();
          return { changes: result.meta.changes || 0 };
        case 'get':
          return (await stmt.first<T>()) || null;
        case 'all':
          const { results } = await stmt.all();
          return results as T[];
        default:
          throw new Error(`Unsupported method for D1: ${method}`);
      }
    } else if (this.localDb) {
      const stmt = this.localDb.prepare(sql);
      switch (method) {
        case 'run':
          const result = stmt.run(...params);
          return { changes: result.changes };
        case 'get':
          return stmt.get(...params) as T || null;
        case 'all':
          return stmt.all(...params) as T[];
        default:
          throw new Error(`Unsupported method for localDb: ${method}`);
      }
    } else {
      throw new Error('No database instance available.');
    }
  }

  // Separate async initialization for D1 when called from API routes
  async initializeTablesAsync(): Promise<void> {
    if (!this.isCloudflare || !this.d1Db) {
      // This should only be called for Cloudflare D1
      return;
    }

    const schemas = [
      `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        encryption_key TEXT NOT NULL,
        master_key_salt TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      // Migration: Add master_key_salt column if it doesn't exist (for existing databases)
      `ALTER TABLE users ADD COLUMN master_key_salt TEXT;`,
      // Migration: Add is_admin column if it doesn't exist (for existing databases)
      `ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;`,
      `
      CREATE TABLE IF NOT EXISTS email_aliases (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        alias TEXT UNIQUE NOT NULL,
        description TEXT,
        forwarding_email TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `,
      `
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        alias_id TEXT NOT NULL,
        from_email TEXT NOT NULL,
        to_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (alias_id) REFERENCES email_aliases (id)
      )
    `,
      `
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        device_key TEXT NOT NULL,
        last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `,
      `
      CREATE TABLE IF NOT EXISTS sync_data (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        dat-id TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        operation TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (device_id) REFERENCES devices (id)
      )
    `,
      `
      CREATE INDEX IF NOT EXISTS idx_email_aliases_user_id ON email_aliases(user_id);
      CREATE INDEX IF NOT EXISTS idx_emails_alias_id ON emails(alias_id);
      CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_sync_data_user_id ON sync_data(user_id);
    `,
    ];

    for (const schema of schemas) {
      try {
        await this.d1Db.exec(schema);
      } catch (error) {
        // Ignore errors for "ALTER TABLE" if column already exists
        if (!schema.includes('ALTER TABLE') || !(error as Error).message.includes('duplicate column')) {
          console.error('Error initializing table with schema (D1):', schema, error);
        }
      }
    }
  }


  // For local development, synchronous table initialization
  private initializeTables(): void {
    if (this.isCloudflare) return; // D1 is initialized asynchronously

    const schemas = [
      `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        encryption_key TEXT NOT NULL,
        master_key_salt TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      // Migration: Add master_key_salt column if it doesn't exist (for existing databases)
      `ALTER TABLE users ADD COLUMN master_key_salt TEXT;`,
      // Migration: Add is_admin column if it doesn't exist (for existing databases)
      `ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;`,
      `
      CREATE TABLE IF NOT EXISTS email_aliases (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        alias TEXT UNIQUE NOT NULL,
        description TEXT,
        forwarding_email TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `,
      `
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        alias_id TEXT NOT NULL,
        from_email TEXT NOT NULL,
        to_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (alias_id) REFERENCES email_aliases (id)
      )
    `,
      `
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        device_key TEXT NOT NULL,
        last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `,
      `
      CREATE TABLE IF NOT EXISTS sync_data (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        dat-id TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        operation TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (device_id) REFERENCES devices (id)
      )
    `,
      `
      CREATE INDEX IF NOT EXISTS idx_email_aliases_user_id ON email_aliases(user_id);
      CREATE INDEX IF NOT EXISTS idx_emails_alias_id ON emails(alias_id);
      CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_sync_data_user_id ON sync_data(user_id);
    `,
    ];

    for (const schema of schemas) {
      try {
        this.localDb?.exec(schema);
      } catch (error) {
        // Ignore errors for "ALTER TABLE" if column already exists
        if (!schema.includes('ALTER TABLE') || !(error as Error).message.includes('duplicate column')) {
          console.error('Error initializing table with schema (local):', schema, error);
        }
      }
    }
  }

  // User operations
  async createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<void> {
    const sql = `
      INSERT INTO users (id, email, encryption_key, master_key_salt, is_admin)
      VALUES (?, ?, ?, ?, ?)
    `;
    await this._execute(sql, [user.id, user.email, user.encryptionKey, user.masterKeySalt, user.isAdmin ? 1 : 0], 'run');
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const row = await this._execute<any>(sql, [email], 'get');
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      encryptionKey: row.encryption_key,
      masterKeySalt: row.master_key_salt,
      isAdmin: row.is_admin === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const row = await this._execute<any>(sql, [id], 'get');
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      encryptionKey: row.encryption_key,
      masterKeySalt: row.master_key_salt,
      isAdmin: row.is_admin === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // Email alias operations
  async createAlias(alias: Omit<EmailAlias, 'createdAt' | 'updatedAt'>): Promise<void> {
    const sql = `
      INSERT INTO email_aliases (id, user_id, alias, description, forwarding_email, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await this._execute(sql, [
      alias.id,
      alias.userId,
      alias.alias,
      alias.description,
      alias.forwardingEmail,
      alias.isActive ? 1 : 0,
    ], 'run');
  }

  async getAliasesByUserId(userId: string): Promise<EmailAlias[]> {
    const sql = 'SELECT * FROM email_aliases WHERE user_id = ? ORDER BY created_at DESC';
    const rows = await this._execute<any>(sql, [userId], 'all') as any[];

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      alias: row.alias,
      description: row.description,
      forwardingEmail: row.forwarding_email,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  async updateAlias(id: string, updates: Partial<Pick<EmailAlias, 'description' | 'isActive'>>): Promise<void> {
    const sql = `
      UPDATE email_aliases
      SET description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await this._execute(sql, [updates.description, updates.isActive ? 1 : 0, id], 'run');
  }

  async deleteAlias(id: string): Promise<void> {
    // Delete associated emails first
    await this._execute('DELETE FROM emails WHERE alias_id = ?', [id], 'run');
    // Then delete the alias
    await this._execute('DELETE FROM email_aliases WHERE id = ?', [id], 'run');
  }

  // Email operations
  async createEmail(email: Omit<Email, 'receivedAt'>): Promise<void> {
    const sql = `
      INSERT INTO emails (id, alias_id, from_email, to_email, subject, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await this._execute(sql, [
      email.id,
      email.aliasId,
      email.from,
      email.to,
      email.subject,
      email.content,
    ], 'run');
  }

  async getEmailsByAliasId(aliasId: string): Promise<Email[]> {
    const sql = 'SELECT * FROM emails WHERE alias_id = ? ORDER BY received_at DESC';
    const rows = await this._execute<any>(sql, [aliasId], 'all') as any[];

    return rows.map(row => ({
      id: row.id,
      aliasId: row.alias_id,
      from: row.from_email,
      to: row.to_email,
      subject: row.subject,
      content: row.content,
      isRead: row.is_read === 1,
      receivedAt: new Date(row.received_at),
    }));
  }

  async markEmailAsRead(id: string): Promise<void> {
    const sql = 'UPDATE emails SET is_read = 1 WHERE id = ?';
    await this._execute(sql, [id], 'run');
  }

  // Device operations for cross-device sync
  async createDevice(device: Omit<Device, 'createdAt' | 'lastSync'>): Promise<void> {
    const sql = `
      INSERT INTO devices (id, user_id, device_name, device_key)
      VALUES (?, ?, ?, ?)
    `;
    await this._execute(sql, [device.id, device.userId, device.deviceName, device.deviceKey], 'run');
  }

  async getDevicesByUserId(userId: string): Promise<Device[]> {
    const sql = 'SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC';
    const rows = await this._execute<any>(sql, [userId], 'all') as any[];

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      deviceName: row.device_name,
      deviceKey: row.device_key,
      lastSync: new Date(row.last_sync),
      createdAt: new Date(row.created_at),
    }));
  }

  async updateDeviceLastSync(deviceId: string): Promise<void> {
    const sql = 'UPDATE devices SET last_sync = CURRENT_TIMESTAMP WHERE id = ?';
    await this._execute(sql, [deviceId], 'run');
  }

  // Sync operations
  async createSyncData(syncData: Omit<SyncData, 'timestamp'>): Promise<void> {
    const sql = `
      INSERT INTO sync_data (id, user_id, device_id, data_type, dat-id, encrypted_data, operation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await this._execute(sql, [
      syncData.id,
      syncData.userId,
      syncData.deviceId,
      syncData.dataType,
      syncData.dataId,
      syncData.encryptedData,
      syncData.operation,
    ], 'run');
  }

  async getSyncDataAfterTimestamp(userId: string, timestamp: Date): Promise<SyncData[]> {
    const sql = `
      SELECT * FROM sync_data
      WHERE user_id = ? AND timestamp > ?
      ORDER BY timestamp ASC
    `;
    const rows = await this._execute<any>(sql, [userId, timestamp.toISOString()], 'all') as any[];

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      deviceId: row.device_id,
      dataType: row.data_type,
      dataId: row.dat-id,
      encryptedData: row.encrypted_data,
      operation: row.operation,
      timestamp: new Date(row.timestamp),
    }));
  }

  close(): void {
    if (this.localDb) {
      this.localDb.close();
    }
    // D1 doesn't need explicit closing in the same way better-sqlite3 does
  }
}

// Singleton instance for local development
let dbInstance: DatabaseManager | null = null;

// This function will be called in API routes
export async function getDatabase(d1Instance?: D1Database): Promise<DatabaseManager> {
  if (d1Instance) {
    // If a D1 instance is provided, always return a new manager for it
    const manager = new DatabaseManager(d1Instance);
    await manager.initializeTablesAsync(); // Initialize D1 tables asynchronously
    return manager;
  }

  // For local development, use the singleton pattern
  if (!dbInstance) {
    dbInstance = new DatabaseManager();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}