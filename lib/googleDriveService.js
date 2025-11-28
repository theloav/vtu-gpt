// lib/googleDriveService.js
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

let driveClient = null;

/**
 * Initialize Google Drive client
 */
export function getGoogleDriveClient() {
  if (!driveClient) {
    try {
      const credentialsPath = path.join(process.cwd(), 'credentials', 'google-service-account.json');
      
      if (!fs.existsSync(credentialsPath)) {
        throw new Error('Google service account credentials file not found');
      }
      
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly']
      });
      
      driveClient = google.drive({ version: 'v3', auth });
      console.log('✅ Google Drive client initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive client:', error);
      throw error;
    }
  }
  
  return driveClient;
}

/**
 * List files in the specified Google Drive folder
 */
export async function listFilesInFolder(folderId) {
  try {
    const drive = getGoogleDriveClient();
    
    console.log(`🔍 Listing files in Google Drive folder: ${folderId}`);
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime, size)',
      orderBy: 'modifiedTime desc'
    });
    
    const files = response.data.files || [];
    console.log(`📁 Found ${files.length} files in Google Drive folder`);
    
    return files;
    
  } catch (error) {
    console.error('❌ Error listing files from Google Drive:', error);
    throw error;
  }
}

/**
 * Download a file from Google Drive
 */
export async function downloadFile(fileId, fileName) {
  try {
    const drive = getGoogleDriveClient();
    
    console.log(`⬇️ Downloading file: ${fileName} (${fileId})`);
    
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'stream' });
    
    // Create downloads directory if it doesn't exist
    const downloadDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    const filePath = path.join(downloadDir, fileName);
    const writeStream = fs.createWriteStream(filePath);
    
    return new Promise((resolve, reject) => {
      response.data
        .on('error', reject)
        .pipe(writeStream)
        .on('error', reject)
        .on('finish', () => {
          console.log(`✅ Downloaded: ${fileName}`);
          resolve(filePath);
        });
    });
    
  } catch (error) {
    console.error(`❌ Error downloading file ${fileName}:`, error);
    throw error;
  }
}

/**
 * Check if file is supported for processing
 */
export function isSupportedFileType(file) {
  const supportedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  const supportedExtensions = ['.pdf', '.docx', '.txt'];
  const fileExtension = path.extname(file.name).toLowerCase();
  
  return supportedMimeTypes.includes(file.mimeType) || 
         supportedExtensions.includes(fileExtension);
}

/**
 * Get file metadata from Google Drive
 */
export async function getFileMetadata(fileId) {
  try {
    const drive = getGoogleDriveClient();
    
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, modifiedTime, createdTime'
    });
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ Error getting file metadata for ${fileId}:`, error);
    throw error;
  }
}

/**
 * Test Google Drive connection
 */
export async function testGoogleDriveConnection() {
  try {
    console.log('🧪 Testing Google Drive connection...');
    
    const drive = getGoogleDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is not set');
    }
    
    // Test by listing files in the folder
    const files = await listFilesInFolder(folderId);
    
    return {
      success: true,
      message: 'Google Drive connection successful',
      folderId,
      fileCount: files.length,
      supportedFiles: files.filter(isSupportedFileType).length
    };
    
  } catch (error) {
    console.error('❌ Google Drive connection test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Google Drive connection failed'
    };
  }
}

export default {
  getGoogleDriveClient,
  listFilesInFolder,
  downloadFile,
  isSupportedFileType,
  getFileMetadata,
  testGoogleDriveConnection
};
