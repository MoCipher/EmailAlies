import { getDatabase, DatabaseManager } from '@/database/db';
import { ClientEncryption } from './encryption';
import { SyncData } from '@/database/schema';

export class SyncService {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Register a new device for the user
   */
  async registerDevice(userId: string, deviceName: string, db: DatabaseManager): Promise<string> {
    const deviceId = crypto.randomUUID();
    const deviceKey = await ClientEncryption.generateKey();
    const exportedDeviceKey = await ClientEncryption.exportKey(deviceKey);

    await db.createDevice({
      id: deviceId,
      userId,
      deviceName,
      deviceKey: exportedDeviceKey,
    });

    return deviceId;
  }

  /**
   * Synchronize data between devices
   */
  async syncDevice(
    userId: string,
    deviceId: string,
    userMasterKey: CryptoKey,
    lastSyncTimestamp?: Date,
    db?: DatabaseManager // Make db optional for local calls, required for API routes
  ): Promise<{
    aliases: any[];
    syncTimestamp: Date;
  }> {
    const effectiveDb = db || getDatabase(); // Use provided db or get local instance
    const syncTimestamp = new Date();

    // Get all changes since last sync
    const changes = await effectiveDb.getSyncDataAfterTimestamp(
      userId,
      lastSyncTimestamp || new Date(0)
    );

    // Process changes and apply to local state
    const aliases = await effectiveDb.getAliasesByUserId(userId);

    // Mark device as synced
    await effectiveDb.updateDeviceLastSync(deviceId);

    return {
      aliases,
      syncTimestamp,
    };
  }

  /**
   * Record a data change for synchronization
   */
  async recordChange(
    userId: string,
    deviceId: string,
    dataType: 'alias' | 'email',
    dataId: string,
    operation: 'create' | 'update' | 'delete',
    data?: any,
    encryptionKey?: CryptoKey,
    db?: DatabaseManager // Add db parameter
  ): Promise<void> {
    const effectiveDb = db || getDatabase();
    let encryptedData = '';

    if (data && encryptionKey) {
      const dataString = JSON.stringify(data);
      encryptedData = await ClientEncryption.encrypt(dataString, encryptionKey);
    }

    await effectiveDb.createSyncData({
      id: crypto.randomUUID(),
      userId,
      deviceId,
      dataType,
      dataId,
      encryptedData,
      operation,
    });
  }

  /**
   * Get pending sync data for a device
   */
  async getPendingSyncData(userId: string, deviceId: string, since: Date, db?: DatabaseManager): Promise<SyncData[]> {
    const effectiveDb = db || getDatabase();
    return await effectiveDb.getSyncDataAfterTimestamp(userId, since);
  }

  /**
   * Decrypt sync data
   */
  async decryptSyncData(syncData: SyncData, decryptionKey: CryptoKey): Promise<any> {
    if (!syncData.encryptedData) return null;

    try {
      const decryptedString = await ClientEncryption.decrypt(syncData.encryptedData, decryptionKey);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Failed to decrypt sync data:', error);
      return null;
    }
  }

  /**
   * Clean up old sync data (older than 30 days)
   */
  cleanupOldSyncData(): void {
    // In a real implementation, you'd add a cleanup method to the database
    // For now, this is a placeholder
  }

  /**
   * Get device info
   */
  async getDeviceInfo(userId: string, deviceId: string, db?: DatabaseManager) {
    const effectiveDb = db || getDatabase();
    const devices = await effectiveDb.getDevicesByUserId(userId); // This now correctly uses userId
    return devices.find(d => d.id === deviceId);
  }

  /**
   * Remove a device
   */
  removeDevice(deviceId: string, db?: DatabaseManager): void {
    // In a real implementation, you'd delete the device and its sync data
    // For now, this is a placeholder
  }
}

// Singleton instance for local development
let syncServiceInstance: SyncService | null = null;

export function getSyncService(db?: DatabaseManager): SyncService {
  if (db) {
    return new SyncService(db);
  }
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService(getDatabase()); // Local instance
  }
  return syncServiceInstance;
}