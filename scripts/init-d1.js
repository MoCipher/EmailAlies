#!/usr/bin/env node

/**
 * Cloudflare D1 Database Initialization Script
 *
 * This script initializes the D1 database schema for EmailAlies.
 * Run this after creating your D1 database in Cloudflare.
 *
 * Usage:
 *   npx wrangler d1 execute myemailalies --file=scripts/init-d1.js
 */

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  encryption_key TEXT NOT NULL,
  master_key_salt TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Email aliases table
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
);

-- Emails table
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
);

-- Devices table for cross-device sync
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_key TEXT NOT NULL,
  last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Sync data table
CREATE TABLE IF NOT EXISTS sync_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  data_type TEXT NOT NULL,
  data_id TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  operation TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (device_id) REFERENCES devices (id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_aliases_user_id ON email_aliases(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_alias_id ON emails(alias_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_data_user_id ON sync_data(user_id);
`;

console.log('🚀 Initializing EmailAlies D1 Database...');
console.log('📋 Schema to be applied:');
console.log(schema);

// This script will be executed by Wrangler D1
// The schema above will be applied to your D1 database

export default schema;