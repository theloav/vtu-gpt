// lib/documentProcessor.mjs
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse'; // Import pdf-parse
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { extractDatesAndEvents } from './eventExtractor.js';
import { storeEvents } from './eventsDatabase.js';

/**
 * Clean and normalize extracted text
 */
function cleanText(text) {
  let cleaned = text;

  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  cleaned = cleaned.replace(/\f/g, '\n');
  cleaned = cleaned.replace(/Page \d+ of \d+/gi, '');
  cleaned = cleaned.replace(/^\d+\s*$/gm, '');

  cleaned = cleaned.replace(/^.*?©.*?$/gm, '');
  cleaned = cleaned.replace(/^.*?confidential.*?$/gmi, '');

  cleaned = cleaned.replace(/[\u2018\u2019]/g, "'");
  cleaned = cleaned.replace(/[\u201C\u201D]/g, '"');
  cleaned = cleaned.replace(/\u2013|\u2014/g, '-');
  cleaned = cleaned.replace(/\u2026/g, '...');

  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');

  // Trim the entire text at the end
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Extract text from different file types
 */
export async function extractTextFromFile(filePath, originalFilename) {
  try {
    const fileExtension = path.extname(originalFilename).toLowerCase();
    const fileBuffer = fs.readFileSync(filePath);

    let extractedText = '';

    switch (fileExtension) {
      case '.pdf':
        console.log('📄 Processing PDF file with pdf-parse...');
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text;
        break;

      case '.docx':
        console.log('📝 Processing DOCX file...');
        const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = docxResult.value;
        break;

      case '.txt':
        console.log('📃 Processing TXT file...');
        extractedText = fileBuffer.toString('utf-8');
        break;

      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the file');
    }

    console.log(`🧹 Cleaning and normalizing text...`);
    extractedText = cleanText(extractedText);

    console.log(`✅ Extracted and cleaned ${extractedText.length} characters from ${originalFilename}`);
    return extractedText;

  } catch (error) {
    console.error(`❌ Error extracting text from ${originalFilename}:`, error);
    throw error;
  }
}

/**
 * Split text into chunks
 */
export async function chunkText(text, originalFilename, options = {}) {
  try {
    const {
      chunkSize = 2000,
      chunkOverlap = 500,
      separators = ['\n\n\n', '\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ', '']
    } = options;

    console.log('✂️ Splitting text into chunks...');

    if (originalFilename === 'SCHOOLS.pdf') { // Assuming filename is passed in metadata
      console.log('📋 Detected SCHOOLS.pdf - using enhanced chunking strategy for schools');
      return chunkSchoolData(text);
    }

    if (text.includes('Faculty Cabin') || text.includes('Room No') || text.includes('Cabin ID')) {
      console.log('📋 Detected tabular faculty data - using enhanced chunking strategy');
      return chunkFacultyCabinData(text);
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators
    });

    const chunks = await textSplitter.splitText(text);

    console.log(`✅ Created ${chunks.length} chunks`);

    return chunks.map((chunk, index) => ({
      id: index,
      text: chunk.trim(),
      length: chunk.length
    }));

  } catch (error) {
    console.error('❌ Error chunking text:', error);
    throw error;
  }
}

/**
 * Faculty cabin data chunking
 */
function chunkSchoolData(text) {
  const chunks = [];
  let chunkIndex = 0;
  const lines = text.split('\n');

  // Regex to detect the start of a new school block (e.g., "School 1:", "School 2:", etc.)
  const schoolStartRegex = /^School\s*\d+\s*:\s*-?\s*Name of the School:\s*(.+)/i;
  // Regex to detect Dean and Associate Dean lines
  const deanRegex = /^(?:-?\s*)Dean:\s*(.+)/i;
  const assocDeanRegex = /^(?:-?\s*)Associate Dean:\s*(.+)/i;
  const deanProfileRegex = /^(?:-?\s*)Dean Profile:\s*(.+)/i;
  const assocDeanProfileRegex = /^(?:-?\s*)Associate Dean Profile:\s*(.+)/i;


  let currentSchoolBlockLines = [];
  let currentSchoolName = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const schoolMatch = line.match(schoolStartRegex);

    if (schoolMatch) {
      // If a previous school block exists, process it before starting a new one
      if (currentSchoolBlockLines.length > 0) {
        processSchoolBlock(currentSchoolBlockLines, currentSchoolName, chunks, chunkIndex);
        chunkIndex = chunks.length; // Update chunkIndex based on how many chunks were added
      }
      // Start new school block
      currentSchoolBlockLines = [line];
      currentSchoolName = schoolMatch[1].trim();
    } else if (currentSchoolBlockLines.length > 0) {
      // Continue adding lines to the current school block
      currentSchoolBlockLines.push(line);
    }
  }

  // Process the last school block
  if (currentSchoolBlockLines.length > 0) {
    processSchoolBlock(currentSchoolBlockLines, currentSchoolName, chunks, chunkIndex);
  }

  if (chunks.length === 0) {
    console.log('📋 Structured school chunking failed, using line-based chunking as fallback.');
    return chunkByLines(text);
  }

  console.log(`✅ Created ${chunks.length} chunks for school data`);
  return chunks;
}

function processSchoolBlock(blockLines, schoolName, chunksArray, currentChunkIndex) {
  const fullSchoolText = blockLines.join('\n').trim();
  if (fullSchoolText.length > 0) {
    // Add a comprehensive chunk for the entire school
    chunksArray.push({
      id: currentChunkIndex++,
      text: `School: ${schoolName}\n${fullSchoolText}`,
      length: fullSchoolText.length,
      dataType: 'school_info',
      schoolName: schoolName
    });
  }

  // Now, extract specific Dean and Associate Dean chunks from this block
  let currentDeanName = '';
  let currentDeanProfile = [];
  let inDeanProfile = false;

  let currentAssocDeanName = '';
  let currentAssocDeanProfile = [];
  let inAssocDeanProfile = false;

  for (let i = 0; i < blockLines.length; i++) {
    const line = blockLines[i];

    const deanMatch = line.match(/^(?:-?\s*)Dean:\s*(.+)/i);
    const assocDeanMatch = line.match(/^(?:-?\s*)Associate Dean:\s*(.+)/i);
    const deanProfileMatch = line.match(/^(?:-?\s*)Dean Profile:\s*(.+)/i);
    const assocDeanProfileMatch = line.match(/^(?:-?\s*)Associate Dean Profile:\s*(.+)/i);

    if (deanMatch) {
      currentDeanName = deanMatch[1].trim();
      currentDeanProfile = []; // Reset for new dean
      inDeanProfile = false;
      inAssocDeanProfile = false; // Ensure other profile parsing stops
    } else if (assocDeanMatch) {
      currentAssocDeanName = assocDeanMatch[1].trim();
      currentAssocDeanProfile = []; // Reset for new assoc dean
      inAssocDeanProfile = false;
      inDeanProfile = false; // Ensure other profile parsing stops
    } else if (deanProfileMatch) {
      inDeanProfile = true;
      currentDeanProfile.push(deanProfileMatch[1].trim());
      inAssocDeanProfile = false;
    } else if (assocDeanProfileMatch) {
      inAssocDeanProfile = true;
      currentAssocDeanProfile.push(assocDeanProfileMatch[1].trim());
      inDeanProfile = false;
    } else if (inDeanProfile) {
      // Continue collecting dean profile lines until another "Dean" or "Associate Dean" or "School" header
      if (!line.match(/^(?:-?\s*)(Dean|Associate Dean|School \d+):/i)) {
        currentDeanProfile.push(line.trim());
      } else {
        inDeanProfile = false; // Stop collecting if a new section starts
      }
    } else if (inAssocDeanProfile) {
      // Continue collecting associate dean profile lines
      if (!line.match(/^(?:-?\s*)(Dean|Associate Dean|School \d+):/i)) {
        currentAssocDeanProfile.push(line.trim());
      } else {
        inAssocDeanProfile = false; // Stop collecting if a new section starts
      }
    }
  }

  // After iterating through the block, create chunks for the collected Dean/Associate Dean info
  if (currentDeanName) {
    const deanText = `School: ${schoolName}\nDean: ${currentDeanName}\nDean Profile: ${currentDeanProfile.join(' ').trim()}`;
    if (deanText.length > 0) {
      chunksArray.push({
        id: currentChunkIndex++,
        text: deanText,
        length: deanText.length,
        dataType: 'dean_info',
        schoolName: schoolName,
        deanName: currentDeanName
      });
    }
  }

  if (currentAssocDeanName) {
    const assocDeanText = `School: ${schoolName}\nAssociate Dean: ${currentAssocDeanName}\nAssociate Dean Profile: ${currentAssocDeanProfile.join(' ').trim()}`;
    if (assocDeanText.length > 0) {
      chunksArray.push({
        id: currentChunkIndex++,
        text: assocDeanText,
        length: assocDeanText.length,
        dataType: 'assoc_dean_info',
        schoolName: schoolName,
        associateDeanName: currentAssocDeanName
      });
    }
  }
}

/**
 * Special chunking strategy for faculty cabin allocation data
 * Creates multiple perspectives: by room AND by faculty member (TTS)
 */
function chunkFacultyCabinData(text) {
  const chunks = [];
  let chunkIndex = 0;

  const lines = text.split('\n');

  // Strategy 1: Parse individual faculty entries (by TTS)
  let currentEntry = {};
  let entryLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for TTS number
    const ttsMatch = line.match(/TTS\s*No\s*:?\s*(\d+)/i);
    if (ttsMatch) {
      // Save previous entry if exists
      if (Object.keys(currentEntry).length > 0 && entryLines.length > 0) {
        const entryText = entryLines.join('\n');
        chunks.push({
          id: chunkIndex++,
          text: `Faculty Member Details:\n${entryText}`.trim(),
          length: entryText.length,
          tts: currentEntry.tts
        });
      }

      // Start new entry
      currentEntry = { tts: ttsMatch[1] };
      entryLines = [line];
    } else {
      // Add to current entry
      if (entryLines.length > 0) {
        entryLines.push(line);

        // Extract other details
        if (line.includes('Name:')) {
          currentEntry.name = line;
        }
        if (line.includes('Cabin ID:')) {
          currentEntry.cabin = line;
        }
      }
    }

    // If entry gets too large (>1500 chars), save it
    if (entryLines.join('\n').length > 1500 && Object.keys(currentEntry).length > 0) {
      const entryText = entryLines.join('\n');
      chunks.push({
        id: chunkIndex++,
        text: `Faculty Member Details:\n${entryText}`.trim(),
        length: entryText.length,
        tts: currentEntry.tts
      });
      currentEntry = {};
      entryLines = [];
    }
  }

  // Add last entry
  if (Object.keys(currentEntry).length > 0 && entryLines.length > 0) {
    const entryText = entryLines.join('\n');
    chunks.push({
      id: chunkIndex++,
      text: `Faculty Member Details:\n${entryText}`.trim(),
      length: entryText.length,
      tts: currentEntry.tts
    });
  }

  // Strategy 2: Also create room-based chunks for "where is room X" queries
  let currentChunk = '';
  let currentRoom = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for cabin/room ID
    const cabinMatch = line.match(/Cabin\s*ID\s*:?\s*([A-Z]\d+\/\d+)/i);
    if (cabinMatch) {
      // Save previous room chunk
      if (currentChunk && currentRoom) {
        chunks.push({
          id: chunkIndex++,
          text: `Room ${currentRoom} Information:\n${currentChunk}`.trim(),
          length: currentChunk.length,
          room: currentRoom
        });
      }

      // Start new room chunk
      currentRoom = cabinMatch[1];
      currentChunk = line + '\n';
    } else {
      if (currentRoom) {
        currentChunk += line + '\n';
      }
    }

    // If chunk gets too large, save it
    if (currentChunk.length > 1500 && currentRoom) {
      chunks.push({
        id: chunkIndex++,
        text: `Room ${currentRoom} Information:\n${currentChunk}`.trim(),
        length: currentChunk.length,
        room: currentRoom
      });
      currentChunk = '';
      currentRoom = '';
    }
  }

  // Add last room chunk
  if (currentChunk && currentRoom) {
    chunks.push({
      id: chunkIndex++,
      text: `Room ${currentRoom} Information:\n${currentChunk}`.trim(),
      length: currentChunk.length,
      room: currentRoom
    });
  }

  // Fallback: If no structured chunks were created, use line-based chunking
  if (chunks.length === 0) {
    console.log('📋 Structured chunking failed, using line-based chunking for tabular data');
    return chunkByLines(text);
  }

  console.log(`✅ Created ${chunks.length} chunks for faculty cabin data (${chunks.filter(c => c.tts).length} by TTS, ${chunks.filter(c => c.room).length} by room)`);
  return chunks;
}

/**
 * Special chunking strategy for mentor-mentee data
 * Ensures mentor details and their mentees are kept together.
 */
function chunkMentorMenteeData(text) {
  const chunks = [];
  let chunkIndex = 0;
  const lines = text.split('\n');

  let currentMentorBlock = [];
  let currentMentorName = '';
  let currentTTSNumber = '';

  const processAndStoreChunk = (block, mentorName, ttsNumber) => {
    if (block.length === 0) return;
    const blockText = block.join('\n').trim();
    if (blockText.length === 0) return;

    chunks.push({
      id: chunkIndex++,
      text: `Mentor: ${mentorName} (TTS: ${ttsNumber})\n${blockText}`,
      length: blockText.length,
      mentorName: mentorName,
      ttsNumber: ttsNumber,
      dataType: 'mentor_mentee'
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect start of a new mentor block (e.g., "Mentor 1:", "Mentor Name:")
    const mentorHeaderMatch = line.match(/^Mentor\s*\d+\s*:/i);
    const mentorNameMatch = line.match(/Mentor\s*Name\s*:\s*(.+)/i);
    const ttsMatch = line.match(/TTS\s*Number\s*:\s*(TTS\d+)/i);

    if (mentorHeaderMatch || mentorNameMatch || ttsMatch) {
      // If we're starting a new mentor block, save the previous one
      if (currentMentorBlock.length > 0) {
        processAndStoreChunk(currentMentorBlock, currentMentorName, currentTTSNumber);
      }
      // Reset for the new mentor block
      currentMentorBlock = [line];
      currentMentorName = mentorNameMatch ? mentorNameMatch[1].trim() : '';
      currentTTSNumber = ttsMatch ? ttsMatch[1].trim() : '';
    } else {
      currentMentorBlock.push(line);
      // Keep updating mentor name and TTS if found in subsequent lines within the same block
      const subMentorNameMatch = line.match(/Mentor\s*Name\s*:\s*(.+)/i);
      const subTTSMatch = line.match(/TTS\s*Number\s*:\s*(TTS\d+)/i);
      if (subMentorNameMatch) currentMentorName = subMentorNameMatch[1].trim();
      if (subTTSMatch) currentTTSNumber = subTTSMatch[1].trim();
    }

    // If the current block gets too large, chunk it
    if (currentMentorBlock.join('\n').length > 1500) {
      processAndStoreChunk(currentMentorBlock, currentMentorName, currentTTSNumber);
      currentMentorBlock = []; // Start a new block after chunking
    }
  }

  // Process the last mentor block
  if (currentMentorBlock.length > 0) {
    processAndStoreChunk(currentMentorBlock, currentMentorName, currentTTSNumber);
  }

  if (chunks.length === 0) {
    console.log('📋 Structured mentor-mentee chunking failed, using line-based chunking as fallback.');
    return chunkByLines(text);
  }

  console.log(`✅ Created ${chunks.length} chunks for mentor-mentee data`);
  return chunks;
}


/**
 * Fallback chunking by lines for tabular data
 */
function chunkByLines(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const line of lines) {
    if (currentChunk.length + line.length > 1500) {
      if (currentChunk) {
        chunks.push({
          id: chunkIndex++,
          text: currentChunk.trim(),
          length: currentChunk.length
        });
      }
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }

  // Add the last chunk
  if (currentChunk) {
    chunks.push({
      id: chunkIndex++,
      text: currentChunk.trim(),
      length: currentChunk.length
    });
  }

  console.log(`✅ Created ${chunks.length} line-based chunks`);
  return chunks;
}

/**
 * Process uploaded file
 */
export async function processUploadedFile(filePath, originalFilename, metadata = {}) {
  try {
    console.log(`🔄 Processing file: ${originalFilename}`);

    const extractedText = await extractTextFromFile(filePath, originalFilename);
    const chunks = await chunkText(extractedText, originalFilename);

    const processed = chunks.map(chunk => ({
      ...chunk,
      metadata: {
        filename: originalFilename,
        fileType: path.extname(originalFilename),
        uploadDate: new Date().toISOString(),
        chunkIndex: chunk.id,
        totalChunks: chunks.length,
        ...metadata
      }
    }));

    let extractedEvents = [];
    let eventExtractionResult = null;

    try {
      extractedEvents = extractDatesAndEvents(extractedText, originalFilename);
      if (extractedEvents.length > 0) {
        eventExtractionResult = await storeEvents(extractedEvents);
      }
    } catch (err) {
      console.error('⚠️ Event extraction failed:', err);
    }

    return {
      filename: originalFilename,
      totalChunks: chunks.length,
      totalCharacters: extractedText.length,
      chunks: processed,
      events: {
        extracted: extractedEvents.length,
        stored: eventExtractionResult?.stored || 0,
        details: extractedEvents
      }
    };

  } catch (error) {
    console.error(`❌ Error processing file ${originalFilename}:`, error);
    throw error;
  }
}

/**
 * Validate uploaded file
 */
export function validateFile(file, options = {}) {
  const {
    maxSizeBytes = 10 * 1024 * 1024,
    allowedExtensions = ['.pdf', '.docx', '.txt']
  } = options;

  const extension = path.extname(file.originalFilename).toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    throw new Error(`File type ${extension} not supported.`);
  }

  if (file.size > maxSizeBytes) {
    throw new Error(`File too large. Max: ${maxSizeBytes / 1024 / 1024}MB`);
  }

  return true;
}

export default {
  extractTextFromFile,
  chunkText,
  processUploadedFile,
  validateFile
};
<environment_details>
# Visual Studio Code Visible Files
lib/documentProcessor.js

# Visual Studio Code Open Tabs
scripts/delete-temp-script.js
pages/api/chat.js
lib/documentProcessor.js
next.config.ts

# Current Time
11/28/2025, 11:58:11 AM (Asia/Calcutta, UTC+5.5:00)

# Context Window Usage
63,059 / 1,048.576K tokens used (6%)

# Current Mode
ACT MODE
</environment_details>
