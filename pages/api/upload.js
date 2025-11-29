import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream'; // Import PassThrough for streaming
import { processUploadedFile, validateFile } from '../../lib/documentProcessor.mjs';
import { generateEmbeddings } from '../../lib/openai.js';
import { getPineconeIndex } from '../../lib/pinecone.js';
// import { getSupabaseClient } from '../../lib/supabaseClient.js'; // Supabase client for storage if needed, not directly for temporary local storage

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser to use formidable
  },
};

const handler = async (req, res) => {
  if (req.method === 'POST') {
    try {
      console.log('🔄 Starting document upload and processing...');

      const form = formidable({
        // formidable will create temp files in system's default temp dir (often /tmp on Vercel)
        // No need for a custom uploadDir here, let it handle temporary local storage
        keepExtensions: true,
        multiples: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        // Let formidable handle the temporary directory. It uses `os.tmpdir()` by default.
        // We only provide the base filename.
        filename: (name, ext, part, form) => {
          return `${Date.now()}-${part.originalFilename}`;
        },
      });

      // Parse the form data
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('❌ File parsing error:', err);
          return res.status(500).json({
            message: 'Error during file parsing',
            error: err.message
          });
        }

        try {
          // Check if files exist
          if (!files.files) {
            return res.status(400).json({ message: 'No files were uploaded' });
          }

          const uploadedFiles = Array.isArray(files.files) ? files.files : [files.files];
          console.log(`📁 Processing ${uploadedFiles.length} file(s)...`);

          const results = [];
          const pineconeIndex = await getPineconeIndex();

          for (const file of uploadedFiles) {
            let tempFilePath = file.filepath; // Formidable automatically saves to a temp path

            try {
              console.log(`\n🔄 Processing: ${file.originalFilename}`);
              console.log(`📝 Temporary file path: ${tempFilePath}`);

              // Validate file
              validateFile(file);

              // Process the file (extract text and chunk)
              const processedFile = await processUploadedFile(
                tempFilePath, // Use the temporary file path for processing
                file.originalFilename,
                {
                  uploadedBy: 'admin', // TODO: Get from auth context
                  uploadedAt: new Date().toISOString()
                }
              );

              // Generate embeddings for all chunks
              console.log(`🔄 Generating embeddings for ${processedFile.chunks.length} chunks...`);
              const texts = processedFile.chunks.map(chunk => chunk.text);
              const embeddings = await generateEmbeddings(texts);

              // Prepare vectors for Pinecone
              const vectors = processedFile.chunks.map((chunk, index) => ({
                id: `${file.originalFilename}-chunk-${chunk.id}-${Date.now()}`,
                values: embeddings[index],
                metadata: {
                  ...chunk.metadata,
                  text: chunk.text,
                  chunkId: chunk.id
                }
              }));

              // Store in Pinecone with batch processing
              console.log(`🔄 Storing ${vectors.length} vectors in Pinecone...`);

              // Process in smaller batches to avoid size limits
              const batchSize = 50; // Reduced batch size
              for (let i = 0; i < vectors.length; i += batchSize) {
                const batch = vectors.slice(i, i + batchSize);
                await pineconeIndex.upsert(batch);
                console.log(`📤 Uploaded batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectors.length/batchSize)} (${batch.length} vectors)`);
              }

              // Clean up temporary file
              fs.unlinkSync(tempFilePath);
              console.log(`🗑️ Cleaned up temporary file: ${tempFilePath}`);

              results.push({
                filename: file.originalFilename,
                status: 'success',
                chunksProcessed: processedFile.chunks.length,
                vectorsStored: vectors.length,
                totalCharacters: processedFile.totalCharacters
              });

              console.log(`✅ Successfully processed: ${file.originalFilename}`);

            } catch (fileError) {
              console.error(`❌ Error processing ${file.originalFilename}:`, fileError);

              // Clean up temporary file on error
              try {
                fs.unlinkSync(tempFilePath); // Ensure cleanup even on error
                console.log(`🗑️ Cleaned up temporary file (on error): ${tempFilePath}`);
              } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
              }

              results.push({
                filename: file.originalFilename,
                status: 'error',
                error: fileError.message
              });
            }
          }

          // Return results
          const successCount = results.filter(r => r.status === 'success').length;
          const totalVectors = results
            .filter(r => r.status === 'success')
            .reduce((sum, r) => sum + r.vectorsStored, 0);

          console.log(`\n✅ Upload complete: ${successCount}/${uploadedFiles.length} files processed`);

          return res.status(200).json({
            message: `Successfully processed ${successCount} of ${uploadedFiles.length} files`,
            results,
            summary: {
              totalFiles: uploadedFiles.length,
              successfulFiles: successCount,
              totalVectorsStored: totalVectors,
              failedFiles: uploadedFiles.length - successCount
            }
          });

        } catch (processingError) {
          console.error('❌ Processing error:', processingError);
          return res.status(500).json({
            message: 'Error processing files',
            error: processingError.message
          });
        }
      });

    } catch (error) {
      console.error('❌ Upload handler error:', error);
      res.status(500).json({
        message: 'Error during file upload',
        error: error.message
      });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
};

export default handler;
