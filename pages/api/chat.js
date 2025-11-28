import { generateEmbeddings, generateChatResponse } from '../../lib/openai.js';
import { getPineconeIndex } from '../../lib/pinecone.js';

/**
 * Check if query is related to Vel Tech University
 * Returns false if query is clearly off-topic
 */
function isVelTechRelated(query) {
  const queryLower = query.toLowerCase();

  // VTU/Academic keywords that indicate on-topic queries
  const onTopicKeywords = [
    'vtu', 'vel tech', 'veltech', 'university', 'college',
    'tts', 'faculty', 'professor', 'teacher', 'staff', 'cabin', 'room', 'block',
    'course', 'program', 'department', 'school', 'engineering', 'management',
    'admission', 'fee', 'exam', 'test', 'result', 'grade', 'marks',
    'hostel', 'library', 'lab', 'laboratory', 'campus',
    'dean', 'hod', 'head', 'registrar', 'principal', 'chancellor',
    'student', 'academic', 'curriculum', 'syllabus', 'semester',
    'placement', 'internship', 'project', 'research',
    'computer science', 'mechanical', 'electrical', 'civil', 'electronics',
    'information technology', 'artificial intelligence', 'data science',
    'mba', 'mca', 'btech', 'mtech', 'phd', 'degree', 'diploma',
    'schedule', 'timetable', 'calendar', 'event', 'workshop', 'seminar',
  ];

  // Off-topic keywords that clearly indicate non-academic queries
  const offTopicKeywords = [
    'recipe', 'cooking', 'food', 'restaurant', 'burger', 'pizza', 'cake',
    'movie', 'film', 'actor', 'actress', 'celebrity', 'music', 'song',
    'sports', 'football', 'cricket', 'basketball', 'game',
    'travel', 'vacation', 'hotel', 'flight', 'tourism',
    'shopping', 'product', 'buy', 'sell', 'price', 'amazon', 'flipkart',
    'weather', 'temperature', 'forecast',
    'politics', 'election', 'government', 'president', 'minister',
    'stock market', 'trading', 'investment', 'cryptocurrency', 'bitcoin',
    'dating', 'relationship', 'marriage', 'love',
    'health', 'medicine', 'doctor', 'hospital', 'disease',
  ];

  // Check for explicit off-topic keywords
  const hasOffTopicKeyword = offTopicKeywords.some(keyword =>
    queryLower.includes(keyword)
  );

  if (hasOffTopicKeyword) {
    return false; // Clearly off-topic
  }

  // Check for VTU-related keywords
  const hasOnTopicKeyword = onTopicKeywords.some(keyword =>
    queryLower.includes(keyword)
  );

  if (hasOnTopicKeyword) {
    return true; // Clearly on-topic
  }

  // For ambiguous queries (no clear keywords), allow them through
  // The system will check if there's relevant context in Pinecone
  return true;
}

/**
 * Detect if query contains specific IDs or numbers (like TTS numbers, room numbers, etc.)
 */
function hasSpecificIdentifier(query) {
  // Check for patterns like: TTS 1234, Room 101, ID: 5678, etc.
  const idPatterns = [
    /\b(tts|id|room|cabin|block|number|no\.?)\s*:?\s*\d+/i,
    /\b\d{4,5}\b/, // 4-5 digit numbers
  ];

  return idPatterns.some(pattern => pattern.test(query));
}

/**
 * Extract identifiers from query
 */
function extractIdentifiers(query) {
  const identifiers = [];

  // Extract TTS numbers
  const ttsMatch = query.match(/\b(tts|id)\s*:?\s*(\d+)/i);
  if (ttsMatch) {
    identifiers.push(ttsMatch[2]);
  }

  // Extract standalone numbers (4-5 digits)
  const numberMatches = query.match(/\b\d{4,5}\b/g);
  if (numberMatches) {
    identifiers.push(...numberMatches);
  }

  return identifiers;
}

/**
 * Preprocess and expand user query for better retrieval
 */
function preprocessQuery(query) {
  // Clean the query
  let processedQuery = query.trim().toLowerCase();

  // Common academic synonyms and expansions
  const expansions = {
    'exam': ['exam', 'examination', 'test', 'assessment'],
    'schedule': ['schedule', 'timetable', 'calendar', 'timing'],
    'fee': ['fee', 'fees', 'payment', 'cost', 'tuition'],
    'admission': ['admission', 'admissions', 'enrollment', 'registration'],
    'course': ['course', 'subject', 'program', 'curriculum'],
    'faculty': ['faculty', 'teacher', 'professor', 'instructor', 'staff', 'member'],
    'hostel': ['hostel', 'accommodation', 'housing', 'residence'],
    'library': ['library', 'books', 'resources', 'study materials'],
    'result': ['result', 'results', 'marks', 'grades', 'scores'],
    'degree': ['degree', 'certificate', 'diploma', 'qualification'],
    'semester': ['semester', 'term', 'session', 'academic period'],
    'department': ['department', 'dept', 'faculty', 'school'],
    'staff': ['staff', 'faculty', 'employee', 'teacher', 'professor', 'member'],
    'tts': ['tts', 'teacher', 'faculty', 'staff', 'employee id', 'id'],
    'cabin': ['cabin', 'room', 'office', 'chamber', 'location'],
    'name': ['name', 'faculty name', 'staff name', 'person', 'individual'],
  };

  // Expand the query with synonyms
  let expandedTerms = [query]; // Keep original query

  for (const [key, synonyms] of Object.entries(expansions)) {
    if (processedQuery.includes(key)) {
      // Add top 2 most relevant synonyms
      expandedTerms.push(...synonyms.slice(0, 2));
    }
  }

  // Remove duplicates and join
  const uniqueTerms = [...new Set(expandedTerms)];
  const expandedQuery = uniqueTerms.join(' ');

  console.log(`🔍 Query expanded: "${query}" → "${expandedQuery}"`);

  return expandedQuery;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { query } = req.body;

    console.log('🔄 Chat API called with query:', query);

    // Validate input
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Query is required and cannot be empty'
      });
    }

    // Check if query is related to Vel Tech University
    if (!isVelTechRelated(query)) {
      console.log(`⚠️ Off-topic query detected: "${query}"`);
      return res.status(200).json({
        reply: `I apologize, but I'm VTU GPT, a specialized assistant for **Vel Tech University** only. I can only help with questions related to:

📚 **Academic Information**
- Courses, programs, and departments
- Faculty details and cabin locations
- Exam schedules and academic calendar
- Admission procedures and fees

🏛️ **Campus Information**
- Facilities and infrastructure
- Hostel and library services
- Events and activities

👥 **People & Contacts**
- Faculty and staff information
- Department heads and deans
- Administrative contacts

🎓 **Student Services**
- Placements and internships
- Research and projects
- Student support services

**Your query appears to be outside my scope of knowledge.**

Please ask me questions specifically about **Vel Tech University** and I'll be happy to help! For example:
- "What courses does VTU offer?"
- "Tell me about the Computer Science department"
- "Where is TTS 3797's cabin?"
- "What are the admission requirements?"

Thank you for understanding! 😊`,
        metadata: {
          offTopic: true,
          query: query
        }
      });
    }

    try {
      // Check if OpenAI API key is configured
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'your_openai_api_key_here') {
        console.log('OpenAI API key not configured, returning fallback response');
        return res.status(200).json({
          reply: 'Hello! I\'m VTU GPT. I\'m currently in demo mode as the OpenAI API key is not configured. Please contact the administrator to set up the API key for full functionality.'
        });
      }

      // Step 1: Preprocess and expand the query
      console.log('🔄 Preprocessing query...');
      const expandedQuery = preprocessQuery(query);

      // Step 2: Generate embedding for the expanded query
      console.log('🔄 Generating query embedding...');
      const queryEmbedding = await generateEmbeddings(expandedQuery);

      // Step 3: Check if query contains specific IDs/numbers (BEFORE Pinecone search)
      const hasIdentifier = hasSpecificIdentifier(query);
      const identifiers = hasIdentifier ? extractIdentifiers(query) : [];

      // Search for relevant documents in Pinecone
      console.log('🔍 Searching for relevant documents...');
      const pineconeIndex = await getPineconeIndex();

      const searchResults = await pineconeIndex.query({
        vector: queryEmbedding,
        topK: hasIdentifier ? 25 : 12, // Get more chunks for ID-based queries (25 vs 12)
        includeMetadata: true,
        includeValues: false
      });

      console.log(`📊 Found ${searchResults.matches.length} relevant document chunks`);

      // Step 4: Extract context from search results with smart assembly
      let context = '';
      const relevantChunks = [];
      const seenTexts = new Set(); // Track seen texts to avoid duplication

      // Use adaptive threshold based on query type
      let scoreThreshold = hasIdentifier ? 0.45 : 0.0; // ID queries: 0.45, Semantic queries: 0.55 (reduced from 0.60)
      console.log(`🎯 Using threshold: ${scoreThreshold} (${hasIdentifier ? 'ID-based query' : 'semantic query'})`);

      if (identifiers.length > 0) {
        console.log(`🔍 Looking for identifiers: ${identifiers.join(', ')}`);
      }

      // Check if we found any exact matches in initial results
      let foundExactMatch = false;

      if (searchResults.matches && searchResults.matches.length > 0) {
        // Sort matches by score (highest first)
        const sortedMatches = searchResults.matches.sort((a, b) => b.score - a.score);

        // Log top scores for debugging
        console.log(`📊 Top 5 match scores: ${sortedMatches.slice(0, 5).map(m => m.score.toFixed(3)).join(', ')}`);

        for (const match of sortedMatches) {
          const text = match.metadata.text;
          let shouldInclude = match.score > scoreThreshold;

          // FALLBACK: If query has specific IDs, check if text contains those IDs
          // even if similarity score is low
          if (!shouldInclude && identifiers.length > 0) {
            const textLower = text.toLowerCase();
            const hasIdentifierInText = identifiers.some(id => {
              // Check for various ID formats
              const patterns = [
                id,                          // Just the number: "3942"
                `tts ${id}`,                 // "tts 3942"
                `tts: ${id}`,                // "tts: 3942"
                `tts no: ${id}`,             // "tts no: 3942"
                `tts no : ${id}`,            // "tts no : 3942"
                `tts no. ${id}`,             // "tts no. 3942"
                `id: ${id}`,                 // "id: 3942"
                `id ${id}`,                  // "id 3942"
                `room ${id}`,                // "room 3942"
                `cabin ${id}`,               // "cabin 3942"
              ];

              return patterns.some(pattern => textLower.includes(pattern));
            });

            if (hasIdentifierInText) {
              shouldInclude = true;
              foundExactMatch = true;
              const preview = text.substring(0, 150).replace(/\n/g, ' ');
              console.log(`✅ Found exact match for identifier in text (score: ${match.score.toFixed(3)})`);
              console.log(`   Preview: "${preview}..."`);
            }
          }

          // Additional diagnostic: Log why chunks are rejected
          if (!shouldInclude && identifiers.length > 0) {
            const preview = text.substring(0, 100).replace(/\n/g, ' ');
            console.log(`❌ Rejected chunk (score: ${match.score.toFixed(3)}): "${preview}..."`);
          }

          if (shouldInclude) {
            // Check for duplicate or highly similar content
            const textPreview = text.substring(0, 100).toLowerCase();
            if (!seenTexts.has(textPreview)) {
              seenTexts.add(textPreview);

              // Add context with source reference
              context += `[Source: ${match.metadata.filename}]\n${text}\n\n`;
              console.log(`✅ INCLUDING CHUNK (score: ${match.score.toFixed(3)}) from ${match.metadata.filename}, chunkId: ${match.metadata.chunkId}`);
              console.log(`   Chunk Text Preview: "${text.substring(0, 200).replace(/\n/g, ' ')}..."`); // Log actual text

              relevantChunks.push({
                filename: match.metadata.filename,
                score: match.score,
                chunkId: match.metadata.chunkId
              });
            }
          }
        }

        // FALLBACK STRATEGY: If we have identifiers but found no exact matches, do a second search
        // This time, search with JUST the identifier number (more specific)
        // NOTE: We do this even if context exists, because that context might not contain our ID
        if (identifiers.length > 0 && !foundExactMatch) {
          console.log(`⚠️ No exact matches found in first search. Trying fallback search with just the ID...`);

          // Clear any wrong context from the first search
          if (context.trim().length > 0) {
            console.log(`⚠️ Discarding ${context.length} chars of non-matching context from first search`);
            context = '';
            relevantChunks.length = 0;
            seenTexts.clear();
          }

          try {
            // Create a simple query with just the ID
            const idOnlyQuery = identifiers[0]; // Just the number
            const idQueryEmbedding = await generateEmbeddings(idOnlyQuery);

            const fallbackResults = await pineconeIndex.query({
              vector: idQueryEmbedding,
              topK: 15,
              includeMetadata: true,
              includeValues: false
            });

            console.log(`🔄 Fallback search returned ${fallbackResults.matches.length} chunks`);

            // Check these results for exact ID match
            for (const match of fallbackResults.matches) {
              const text = match.metadata.text;
              const textLower = text.toLowerCase();

              const hasId = identifiers.some(id => {
                const patterns = [
                  id,
                  `tts ${id}`,
                  `tts: ${id}`,
                  `tts no: ${id}`,
                  `tts no : ${id}`,
                  `tts no. ${id}`,
                ];
                return patterns.some(pattern => textLower.includes(pattern));
              });

              if (hasId) {
                const textPreview = text.substring(0, 100).toLowerCase();
                if (!seenTexts.has(textPreview)) {
                  seenTexts.add(textPreview);
                  context += `[Source: ${match.metadata.filename}]\n${text}\n\n`;
                  relevantChunks.push({
                    filename: match.metadata.filename,
                    score: match.score,
                    chunkId: match.metadata.chunkId
                  });
                  console.log(`✅ FALLBACK: Found exact match (score: ${match.score.toFixed(3)})`);
                }
              }
            }
          } catch (fallbackError) {
            console.error(`⚠️ Fallback search failed:`, fallbackError.message);
          }
        }
      }

      // Step 5: Generate response using OpenAI with context
      let messages;

      if (context.trim().length > 0) {
        console.log(`🔄 Generating contextual response using ${context.length} characters of context from ${relevantChunks.length} sources...`);

        // Special prompt for structured/tabular data queries
        const isStructuredQuery = hasIdentifier || query.toLowerCase().includes('cabin') || query.toLowerCase().includes('room');
        const structuredDataInstructions = isStructuredQuery ? `

## SPECIAL INSTRUCTIONS for Structured Data:
- Extract EXACT information from the context (names, numbers, IDs, room numbers)
- Present data in a clear, organized format (use tables or lists if multiple items)
- If querying for a specific ID/number, find and extract ALL related information
- Don't paraphrase structured data - use exact values from the context
` : '';

        messages = [
          {
            role: 'system',
            content: `You are VTU GPT, an intelligent AI assistant for Vel Tech University (VTU). Your mission is to provide accurate, helpful information to students, faculty, and staff about VTU academics, procedures, policies, and campus life.

## Context from VTU Documents:
${context}

## Response Guidelines:
1. **Accuracy First**: Base your answer primarily on the provided context above
2. **Cite Sources**: When referencing information, mention the source document (e.g., "According to [document name]...")
3. **Be Comprehensive**: Provide detailed, well-structured answers with relevant examples
4. **Organize Information**: Use bullet points, numbered lists, or sections for clarity when appropriate
5. **Acknowledge Limitations**: If the context doesn't fully answer the question, clearly state what information is missing
6. **Be Helpful**: If multiple documents contain relevant info, synthesize them into a cohesive answer
7. **Professional Tone**: Maintain a friendly yet professional demeanor
8. **Actionable Advice**: When applicable, provide next steps or contact information
${structuredDataInstructions}
## What to Avoid:
- Don't make up information not in the context
- Don't be vague - be specific with dates, numbers, and procedures
- Don't ignore contradictions - if documents conflict, mention it

Remember: You're here to help the VTU community succeed!`
          },
          {
            role: 'user',
            content: query
          }
        ];
      } else {
        console.log('🔄 No relevant context found, generating general response...');

        messages = [
          {
            role: 'system',
            content: `You are VTU GPT, an intelligent AI assistant for Vel Tech University (VTU).

**Important**: No specific documents were found in the knowledge base for this query.

## Your Response Should:
1. **Acknowledge the limitation**: Explain that this specific information isn't in the current knowledge base
2. **Provide general guidance**: Share what you generally know about VTU (if applicable)
3. **Suggest alternatives**: Guide the user to:
   - Visit the official VTU website (www.veltechuniv.edu.in)
   - Contact their academic department directly
   - Reach out to student services
   - Ask an administrator to upload relevant documents to improve this system

4. **Be encouraging**: Apologize for not having the specific information and assure them you'd be happy to help once the documents are available

Maintain a friendly, helpful tone even when you can't provide the specific answer they're looking for.`
          },
          {
            role: 'user',
            content: query
          }
        ];
      }

      const response = await generateChatResponse(messages, {
        model: 'gpt-4o-mini',
        temperature: 0.6, // Slightly lower for more focused responses (from 0.7)
        maxTokens: 1500 // Increased from 500 for more comprehensive answers
      });

      console.log('✅ Generated response successfully');

      // Return response with metadata
      return res.status(200).json({
        reply: response.content,
        metadata: {
          hasContext: context.trim().length > 0,
          relevantChunks: relevantChunks,
          contextLength: context.length,
          model: response.model,
          usage: response.usage
        }
      });

    } catch (error) {
      console.error('❌ Error in chat API:', error);

      // Return a fallback response on error
      return res.status(500).json({
        reply: 'I apologize, but I encountered an error while processing your question. Please try again later or contact the administrator if the problem persists.',
        error: error.message
      });
    }
  } else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
}
