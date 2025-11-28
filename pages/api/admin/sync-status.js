// pages/api/admin/sync-status.js
import { testGoogleDriveConnection } from '../../../lib/googleDriveService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test Google Drive connection and get status
    const driveStatus = await testGoogleDriveConnection();
    
    // Get Pinecone status
    const { getPineconeIndex } = await import('../../../lib/pinecone.js');
    const pineconeIndex = await getPineconeIndex();
    const pineconeStats = await pineconeIndex.describeIndexStats();
    
    res.status(200).json({
      success: true,
      googleDrive: driveStatus,
      pinecone: {
        vectorCount: pineconeStats.totalRecordCount || 0,
        indexFullness: pineconeStats.indexFullness || 0,
        dimensions: pineconeStats.dimension || 1536
      },
      sync: {
        lastChecked: new Date().toISOString(),
        status: 'ready'
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
