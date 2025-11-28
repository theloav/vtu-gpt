// lib/openai.js
import OpenAI from 'openai';

let openaiClient = null;

export function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.');
    }

    openaiClient = new OpenAI({
      apiKey: apiKey,
    });

    console.log('✅ OpenAI client initialized successfully');
  }

  return openaiClient;
}

/**
 * Generate embeddings for text using OpenAI
 */
export async function generateEmbeddings(texts) {
  try {
    const client = getOpenAIClient();

    // Ensure texts is an array
    const textArray = Array.isArray(texts) ? texts : [texts];

    console.log(`🔄 Generating embeddings for ${textArray.length} text(s)...`);

    const response = await client.embeddings.create({
      model: 'text-embedding-3-large', // 3072 dimensions, better performance, cheaper cost
      input: textArray,
      dimensions: 1536, // Reduce to 1536 to match existing Pinecone index
    });

    // Use full 1536 dimensions to match Pinecone index
    const embeddings = response.data.map(item => item.embedding);

    console.log(`✅ Generated ${embeddings.length} embeddings (${embeddings[0].length} dimensions each)`);

    return Array.isArray(texts) ? embeddings : embeddings[0];

  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    throw error;
  }
}

/**
 * Generate chat completion using OpenAI
 */
export async function generateChatResponse(messages, options = {}) {
  try {
    const client = getOpenAIClient();

    const {
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      maxTokens = 1000,
      ...otherOptions
    } = options;

    console.log(`🔄 Generating chat response with ${model}...`);

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...otherOptions
    });

    const reply = response.choices[0].message.content;

    console.log(`✅ Generated response (${reply.length} characters)`);

    return {
      content: reply,
      usage: response.usage,
      model: response.model
    };

  } catch (error) {
    console.error('❌ Error generating chat response:', error);
    throw error;
  }
}

/**
 * Test OpenAI connection
 */
export async function testOpenAIConnection() {
  try {
    console.log('🧪 Testing OpenAI connection...');

    // Test embeddings
    const testEmbedding = await generateEmbeddings('Hello, this is a test.');

    if (testEmbedding && testEmbedding.length === 1536) {
      console.log('✅ OpenAI embeddings working correctly (text-embedding-3-large with 1536 dimensions)');
    } else {
      throw new Error(`Invalid embedding response: expected 1536 dimensions, got ${testEmbedding?.length}`);
    }

    // Test chat completion
    const testChat = await generateChatResponse([
      { role: 'user', content: 'Say "OpenAI connection test successful" if you can read this.' }
    ], { maxTokens: 50 });

    if (testChat && testChat.content) {
      console.log('✅ OpenAI chat completion working correctly');
    } else {
      throw new Error('Invalid chat response');
    }

    return {
      success: true,
      message: 'OpenAI connection successful',
      embeddingDimensions: testEmbedding.length,
      chatModel: testChat.model
    };

  } catch (error) {
    console.error('❌ OpenAI connection test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'OpenAI connection failed'
    };
  }
}

const openaiExports = {
  getOpenAIClient,
  generateEmbeddings,
  generateChatResponse,
  testOpenAIConnection
};
export default openaiExports;
