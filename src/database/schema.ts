export interface User {
  id: string;
  email: string;
  encryptionKey: string; // Encrypted master key
  masterKeySalt: string; // Salt for master key encryption
  isAdmin: boolean; // Admin rights
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationCode {
  email: string;
  code: string;
  expiresAt: Date;
  purpose: 'register' | 'login';
}

export interface EmailAlias {
  id: string;
  userId: string;
  alias: string;
  description?: string;
  forwardingEmail: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Email {
  id: string;
  aliasId: string;
  from: string;
  to: string;
  subject: string;
  content: string; // Encrypted
  isRead: boolean;
  receivedAt: Date;
}

export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceKey: string; // For cross-device sync
  lastSync: Date;
  createdAt: Date;
}

export interface SyncData {
  id: string;
  userId: string;
  deviceId: string;
  dataType: 'alias' | 'email';
  dataId: string;
  encryptedData: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: Date;
}