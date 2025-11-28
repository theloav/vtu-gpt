// lib/driveSyncService.js
import { listFilesInFolder, downloadFile, isSupportedFileType } from './googleDriveService.js';
import { processUploadedFile } from './documentProcessor.mjs';
import { generateEmbeddings } from './openai.js';
import { getPineconeIndex } from './pinecone.js';
import fs from 'fs';
import path from 'path';

// In-memory tracking of processed files
let processedFiles = new Set();

/**
 * Sync files from Google Drive to Pinecone
 */
export async function syncGoogleDriveFiles() {
  try {
    console.log('🔄 Starting Google Drive sync...');
    
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID not configured');
    }
    
    // Get files from Google Drive
    const files = await listFilesInFolder(folderId);
    const supportedFiles = files.filter(isSupportedFileType);
    
    console.log(`📁 Found ${supportedFiles.length} supported files in Google Drive`);
    
    if (supportedFiles.length === 0) {
      console.log('ℹ️ No new files to process');
      return {
        success: true,
        message: 'No new files to process',
        processedCount: 0,
        skippedCount: 0,
        errorCount: 0
      };
    }
    
    const results = {
      success: true,
      processedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      details: []
    };
    
    const pineconeIndex = await getPineconeIndex();
    
    for (const file of supportedFiles) {
      try {
        // Skip if already processed (based on file ID and modified time)
        const fileKey = `${file.id}-${file.modifiedTime}`;
        if (processedFiles.has(fileKey)) {
          console.log(`⏭️ Skipping already processed file: ${file.name}`);
          results.skippedCount++;
          continue;
        }
        
        console.log(`\n🔄 Processing: ${file.name}`);
        
        // Download file
        const downloadPath = await downloadFile(file.id, file.name);
        
        // Process the file (extract text and chunk)
        const processedFile = await processUploadedFile(
          downloadPath,
          file.name,
          {
            source: 'google-drive',
            driveFileId: file.id,
            uploadedAt: new Date().toISOString(),
            modifiedTime: file.modifiedTime
          }
        );
        
        // Generate embeddings for all chunks
        console.log(`🔄 Generating embeddings for ${processedFile.chunks.length} chunks...`);
        const texts = processedFile.chunks.map(chunk => chunk.text);
        const embeddings = await generateEmbeddings(texts);
        
        // Prepare vectors for Pinecone
        const vectors = processedFile.chunks.map((chunk, index) => ({
          id: `gdrive-${file.id}-chunk-${chunk.id}-${Date.now()}`,
          values: embeddings[index],
          metadata: {
            ...chunk.metadata,
            text: chunk.text,
            chunkId: chunk.id,
            source: 'google-drive',
            driveFileId: file.id
          }
        }));
        
        // Store in Pinecone
        console.log(`🔄 Storing ${vectors.length} vectors in Pinecone...`);
        await pineconeIndex.upsert(vectors);
        
        // Clean up downloaded file
        fs.unlinkSync(downloadPath);
        
        // Mark as processed
        processedFiles.add(fileKey);
        
        results.processedCount++;
        results.details.push({
          fileName: file.name,
          status: 'success',
          chunksProcessed: processedFile.chunks.length,
          vectorsStored: vectors.length
        });
        
        console.log(`✅ Successfully processed: ${file.name}`);
        
      } catch (fileError) {
        console.error(`❌ Error processing ${file.name}:`, fileError);
        
        results.errorCount++;
        results.details.push({
          fileName: file.name,
          status: 'error',
          error: fileError.message
        });
      }
    }
    
    console.log(`\n✅ Google Drive sync complete:`);
    console.log(`   📊 Processed: ${results.processedCount}`);
    console.log(`   ⏭️ Skipped: ${results.skippedCount}`);
    console.log(`   ❌ Errors: ${results.errorCount}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Google Drive sync failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Google Drive sync failed'
    };
  }
}

/**
 * Get sync status and statistics
 */
export function getSyncStatus() {
  return {
    processedFilesCount: processedFiles.size,
    lastSyncTime: new Date().toISOString(),
    isRunning: false // TODO: Add actual running state tracking
  };
}

/**
 * Clear processed files cache (for testing)
 */
export function clearProcessedFilesCache() {
  processedFiles.clear();
  console.log('🗑️ Cleared processed files cache');
}

export default {
  syncGoogleDriveFiles,
  getSyncStatus,
  clearProcessedFilesCache
};
