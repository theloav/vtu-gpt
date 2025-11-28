import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { processUploadedFile, validateFile } from '../../lib/documentProcessor.mjs';
import { generateEmbeddings } from '../../lib/openai.js';
import { getPineconeIndex } from '../../lib/pinecone.js';

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
        uploadDir: './uploads', // Temporary directory for file processing
        keepExtensions: true,
        multiples: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        filename: (name, ext, part, form) => {
          return `${Date.now()}-${part.originalFilename}`;
        },
      });

      // Ensure upload directory exists
      const uploadDir = './uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

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
            try {
              console.log(`\n🔄 Processing: ${file.originalFilename}`);

              // Validate file
              validateFile(file);

              // Process the file (extract text and chunk)
              const processedFile = await processUploadedFile(
                file.filepath,
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
              fs.unlinkSync(file.filepath);

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
                fs.unlinkSync(file.filepath);
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
