// scripts/clear-pinecone.js
require('dotenv').config({ path: '.env.local' });
const { Pinecone } = require('@pinecone-database/pinecone');

async function clearPineconeIndex() {
  try {
    console.log('🔄 Clearing Pinecone index...');
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME;
    const index = pinecone.index(indexName);
    
    // Clear all vectors
    await index.deleteAll();
    console.log('✅ Pinecone index cleared successfully!');
    console.log('');
    console.log('🔄 Now test with FIXED date standardization!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearPineconeIndex();
