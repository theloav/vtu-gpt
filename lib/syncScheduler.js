// lib/syncScheduler.js
import { syncGoogleDriveFiles } from './driveSyncService.js';

let syncInterval = null;
let isRunning = false;

/**
 * Start automatic Google Drive sync
 */
export function startSyncScheduler() {
  if (syncInterval) {
    console.log('⚠️ Sync scheduler is already running');
    return;
  }
  
  const intervalMs = parseInt(process.env.GOOGLE_DRIVE_SYNC_INTERVAL) || 300000; // Default 5 minutes
  
  console.log(`🚀 Starting Google Drive sync scheduler (every ${intervalMs / 1000} seconds)`);
  
  // Run initial sync
  performScheduledSync();
  
  // Set up recurring sync
  syncInterval = setInterval(() => {
    performScheduledSync();
  }, intervalMs);
  
  console.log('✅ Google Drive sync scheduler started');
}

/**
 * Stop automatic sync
 */
export function stopSyncScheduler() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('🛑 Google Drive sync scheduler stopped');
  }
}

/**
 * Perform scheduled sync with error handling
 */
async function performScheduledSync() {
  if (isRunning) {
    console.log('⏭️ Skipping scheduled sync - already running');
    return;
  }
  
  try {
    isRunning = true;
    console.log('\n🔄 Starting scheduled Google Drive sync...');
    
    const result = await syncGoogleDriveFiles();
    
    if (result.success) {
      console.log(`✅ Scheduled sync completed: ${result.processedCount} processed, ${result.skippedCount} skipped, ${result.errorCount} errors`);
    } else {
      console.error('❌ Scheduled sync failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Scheduled sync error:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    isSchedulerRunning: syncInterval !== null,
    isSyncRunning: isRunning,
    intervalMs: parseInt(process.env.GOOGLE_DRIVE_SYNC_INTERVAL) || 300000
  };
}

/**
 * Initialize sync scheduler on server start
 */
export function initializeSyncScheduler() {
  // Only start in production or when explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_AUTO_SYNC === 'true') {
    startSyncScheduler();
  } else {
    console.log('ℹ️ Auto-sync disabled in development. Set ENABLE_AUTO_SYNC=true to enable.');
  }
}

const syncSchedulerExports = {
  startSyncScheduler,
  stopSyncScheduler,
  getSchedulerStatus,
  initializeSyncScheduler
};
export default syncSchedulerExports;
