const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Simple encryption utilities for admin user creation
class MasterKeyManager {
  static generateMasterKey() {
    const masterKey = crypto.randomBytes(32);
    const salt = crypto.randomBytes(16);
    return { masterKey, salt };
  }

  static encryptMasterKey(masterKey, salt) {
    // Simple encryption for demo purposes - derive a key and encrypt
    const key = crypto.scryptSync('emailalies-service-key-2024', salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(masterKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return Buffer.concat([iv, encrypted]).toString('base64');
  }
}

const dbPath = path.join(process.cwd(), 'data', 'emailalies.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('Initializing admin users...');

const db = new Database(dbPath);

// Initialize tables if they don't exist
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
];

for (const schema of schemas) {
  try {
    db.exec(schema);
  } catch (error) {
    // Ignore errors for "ALTER TABLE" if column already exists
    if (!schema.includes('ALTER TABLE') || !error.message.includes('duplicate column')) {
      console.error('Error initializing table with schema:', schema, error);
    }
  }
}

// Check if admin users already exist
const existingUsers = db.prepare('SELECT email FROM users WHERE email IN (?, ?)').all(
  'spoass@icloud.com',
  'laila.torresanz@hotmail.com'
);

if (existingUsers.length > 0) {
  console.log('Admin users already exist. Skipping initialization.');
  db.close();
  process.exit(0);
}

// Generate master keys and create admin users
const adminEmails = ['spoass@icloud.com', 'laila.torresanz@hotmail.com'];

for (const email of adminEmails) {
  try {
    // Generate master key for the user
    const { masterKey, salt } = MasterKeyManager.generateMasterKey();
    const encryptedMasterKey = MasterKeyManager.encryptMasterKey(masterKey, salt);

    const userId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO users (id, email, encryption_key, master_key_salt, is_admin)
      VALUES (?, ?, ?, ?, 1)
    `).run(userId, email, encryptedMasterKey, salt);

    console.log(`✅ Created admin user: ${email} (${userId})`);
  } catch (error) {
    console.error(`❌ Failed to create admin user ${email}:`, error.message);
  }
}

db.close();
console.log('Admin users initialization completed.');