import { testPineconeConnection } from './lib/pinecone.js';

async function runTest() {
  console.log('Running Pinecone connection test...');
  try {
    const result = await testPineconeConnection();
    console.log('Test Result:', result);
    if (result.success) {
      console.log(`Pinecone index "${result.indexName}" is accessible.`);
      if (result.stats && result.stats.dimension && result.stats.namespaces) {
        console.log(`Index has ${result.stats.dimension} dimensions.`);
        const namespaceKeys = Object.keys(result.stats.namespaces);
        if (namespaceKeys.length > 0) {
          console.log('Namespaces found:');
          namespaceKeys.forEach(ns => {
            console.log(`- Namespace "${ns}": ${result.stats.namespaces[ns].vectorCount} vectors`);
          });
        } else {
          console.log('No namespaces (and thus no vectors) found in the index.');
        }
      } else {
        console.log('Could not retrieve detailed index stats.');
      }
    } else {
      console.error('Pinecone connection test failed:', result.error);
    }
  } catch (error) {
    console.error('An unexpected error occurred during Pinecone test:', error);
  }
}

runTest();
