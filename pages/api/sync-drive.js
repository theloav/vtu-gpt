// pages/api/sync-drive.js
import { syncGoogleDriveFiles, getSyncStatus } from '../../lib/driveSyncService.js';
import { testGoogleDriveConnection } from '../../lib/googleDriveService.js';
import { initializeApp } from '../../lib/startup.js';

let isSyncing = false;

// Initialize app on first API call
initializeApp();

export default async function handler(req, res) {
  const { method } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (method) {
      case 'GET':
        return handleGetStatus(req, res);
      case 'POST':
        return handleTriggerSync(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('❌ Sync API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
}

/**
 * Get sync status and Google Drive connection info
 */
async function handleGetStatus(req, res) {
  try {
    console.log('📊 Getting Google Drive sync status...');

    // Test Google Drive connection
    const driveTest = await testGoogleDriveConnection();

    // Get sync status
    const syncStatus = getSyncStatus();

    res.status(200).json({
      success: true,
      googleDrive: driveTest,
      sync: {
        ...syncStatus,
        isRunning: isSyncing
      },
      message: 'Status retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get sync status'
    });
  }
}

/**
 * Trigger manual sync
 */
async function handleTriggerSync(req, res) {
  try {
    if (isSyncing) {
      return res.status(409).json({
        success: false,
        message: 'Sync is already in progress',
        isRunning: true
      });
    }

    console.log('🚀 Manual Google Drive sync triggered...');
    isSyncing = true;

    // Start sync (don't await to return immediately)
    const syncPromise = syncGoogleDriveFiles();

    // Return immediate response
    res.status(202).json({
      success: true,
      message: 'Google Drive sync started',
      isRunning: true
    });

    // Handle sync completion in background
    syncPromise
      .then(result => {
        isSyncing = false;
        console.log('✅ Background sync completed:', result);
      })
      .catch(error => {
        isSyncing = false;
        console.error('❌ Background sync failed:', error);
      });

  } catch (error) {
    isSyncing = false;
    console.error('❌ Error triggering sync:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to trigger sync'
    });
  }
}
