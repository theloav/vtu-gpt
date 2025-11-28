// lib/pinecone.js
import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient = null;

export async function getPineconeClient() {
  if (!pineconeClient) {
    try {
      pineconeClient = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
      
      console.log('✅ Pinecone client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Pinecone client:', error);
      throw error;
    }
  }
  
  return pineconeClient;
}

export async function getPineconeIndex() {
  try {
    const client = await getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME;
    
    if (!indexName) {
      throw new Error('PINECONE_INDEX_NAME environment variable is not set');
    }
    
    const index = client.index(indexName);
    console.log(`✅ Connected to Pinecone index: ${indexName}`);
    
    return index;
  } catch (error) {
    console.error('❌ Failed to get Pinecone index:', error);
    throw error;
  }
}

// Test Pinecone connection
export async function testPineconeConnection() {
  try {
    const client = await getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME;
    
    // List indexes to verify connection
    const indexes = await client.listIndexes();
    console.log('📋 Available indexes:', indexes);
    
    // Check if our index exists
    const indexExists = indexes.indexes?.some(idx => idx.name === indexName);
    
    if (indexExists) {
      console.log(`✅ Index "${indexName}" found and accessible`);
      
      // Get index stats
      const index = await getPineconeIndex();
      const stats = await index.describeIndexStats();
      console.log('📊 Index stats:', stats);
      
      return {
        success: true,
        indexName,
        stats,
        message: 'Pinecone connection successful'
      };
    } else {
      throw new Error(`Index "${indexName}" not found`);
    }
    
  } catch (error) {
    console.error('❌ Pinecone connection test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Pinecone connection failed'
    };
  }
}

export default {
  getPineconeClient,
  getPineconeIndex,
  testPineconeConnection
};
