// lib/documentProcessor.mjs
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { extractDatesAndEvents } from "./eventExtractor.js";
import { storeEvents } from "./eventsDatabase.js";

/**
 * Clean and normalize extracted text
 */
function cleanText(text) {
  let cleaned = text;

  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");

  cleaned = cleaned.replace(/\f/g, "\n");
  cleaned = cleaned.replace(/Page \d+ of \d+/gi, "");
  cleaned = cleaned.replace(/^\d+\s*$/gm, "");

  cleaned = cleaned.replace(/^.*?©.*?$/gm, "");
  cleaned = cleaned.replace(/^.*?confidential.*?$/gmi, "");

  cleaned = cleaned.replace(/[\u2018\u2019]/g, "'");
  cleaned = cleaned.replace(/[\u201C\u201D]/g, '"');
  cleaned = cleaned.replace(/\u2013|\u2014/g, "-");
  cleaned = cleaned.replace(/\u2026/g, "...");

  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");

  cleaned = cleaned.replace(/\r\n/g, "\n");
  cleaned = cleaned.replace(/\r/g, "\n");

  return cleaned.trim();
}

/**
 * Extract text from different file types
 */
export async function extractTextFromFile(filePath, originalFilename) {
  try {
    const fileExtension = path.extname(originalFilename).toLowerCase();
    const fileBuffer = fs.readFileSync(filePath);

    let extractedText = "";

    switch (fileExtension) {
      case ".pdf":
        console.log("📄 Extracting PDF using pdf-parse...");
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text;
        break;

      case ".docx":
        console.log("📝 Extracting DOCX...");
        const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = docxData.value;
        break;

      case ".txt":
        console.log("📃 Extracting TXT...");
        extractedText = fileBuffer.toString("utf8");
        break;

      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    if (!extractedText.trim()) {
      throw new Error("No text extracted from file.");
    }

    console.log("🧹 Cleaning extracted text...");
    return cleanText(extractedText);

  } catch (err) {
    console.error(`❌ PDF extraction error (${originalFilename}):`, err);
    throw err;
  }
}

/**
 * Split text into chunks
 */
export async function chunkText(text, originalFilename, options = {}) {
  const {
    chunkSize = 2000,
    chunkOverlap = 400,
    separators = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""]
  } = options;

  console.log("✂️ Splitting text...");

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators
  });

  const chunks = await splitter.splitText(text);

  return chunks.map((chunk, index) => ({
    id: index,
    text: chunk.trim(),
    length: chunk.length
  }));
}

/**
 * Process uploaded file
 */
export async function processUploadedFile(filePath, originalFilename, metadata = {}) {
  try {
    console.log(`🔄 Processing: ${originalFilename}`);

    const extractedText = await extractTextFromFile(filePath, originalFilename);
    const chunks = await chunkText(extractedText, originalFilename);

    const processedChunks = chunks.map(chunk => ({
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

    let events = [];
    try {
      events = extractDatesAndEvents(extractedText, originalFilename);
      if (events.length > 0) await storeEvents(events);
    } catch (eventErr) {
      console.warn("⚠️ Event extraction failed:", eventErr);
    }

    return {
      filename: originalFilename,
      totalChunks: chunks.length,
      totalCharacters: extractedText.length,
      chunks: processedChunks,
      events
    };
  } catch (err) {
    console.error(`❌ Error processing file: ${originalFilename}`, err);
    throw err;
  }
}

/**
 * Validate uploaded file
 */
export function validateFile(file, options = {}) {
  const { maxSizeBytes = 10 * 1024 * 1024, allowedExtensions = [".pdf", ".docx", ".txt"] } = options;

  const ext = path.extname(file.originalFilename).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  if (file.size > maxSizeBytes) {
    throw new Error(`File too large. Max allowed: ${maxSizeBytes / (1024 * 1024)}MB`);
  }

  return true;
}

export default {
  extractTextFromFile,
  chunkText,
  processUploadedFile,
  validateFile,
};
