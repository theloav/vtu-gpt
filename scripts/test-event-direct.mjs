// scripts/test-event-direct.mjs
import fs from 'fs';

// Simple date extraction test without importing the module
function testDatePatterns(text) {
  console.log('🔍 Testing date patterns on sample text...');

  const datePatterns = [
    // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g,
    // DD Month YYYY, DD Month YY
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*,?\s*(\d{2,4})\b/gi,
    // Month DD, YYYY
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*,?\s*(\d{4})\b/gi,
  ];

  const foundDates = [];

  datePatterns.forEach((pattern, index) => {
    console.log(`\n📅 Testing pattern ${index + 1}: ${pattern}`);
    let match;
    pattern.lastIndex = 0; // Reset regex

    while ((match = pattern.exec(text)) !== null) {
      console.log(`   ✅ Found match: "${match[0]}" at position ${match.index}`);
      console.log(`   📊 Groups: [${match[1]}, ${match[2]}, ${match[3]}]`);
      foundDates.push(match[0]);
    }
  });

  return foundDates;
}

async function testEventExtraction() {
  try {
    console.log('🔄 Testing date pattern matching...');

    // Read the sample document
    const text = fs.readFileSync('Sample-Academic-Calendar-Document.txt', 'utf8');
    console.log(`📄 Document length: ${text.length} characters`);
    console.log(`📄 First 200 characters: "${text.substring(0, 200)}..."`);

    // Test date patterns
    console.log('\n🔍 Testing date pattern matching...');
    const foundDates = testDatePatterns(text);

    console.log(`\n📊 Results:`);
    console.log(`   - Total dates found: ${foundDates.length}`);
    console.log(`   - Dates: ${foundDates.join(', ')}`);

    // Test keyword matching
    console.log('\n🔍 Testing keyword matching...');
    const lines = text.split('\n');
    const eventKeywords = {
      'exam': ['exam', 'examination', 'test', 'assessment', 'evaluation', 'conducted', 'scheduled', 'semester'],
      'registration': ['registration', 'register', 'enroll', 'enrollment', 'admission', 'complete', 'course'],
      'deadline': ['deadline', 'last date', 'due date', 'final date', 'closing date', 'due', 'by', 'must', 'submission'],
      'fee': ['fee', 'payment', 'tuition', 'charges', 'dues', 'paid', 'pay'],
      'holiday': ['holiday', 'vacation', 'break', 'closed', 'off', 'festival', 'celebration'],
      'workshop': ['workshop', 'seminar', 'conference', 'training', 'session', 'event', 'fair', 'symposium'],
    };

    let keywordMatches = 0;
    lines.forEach((line, index) => {
      if (line.trim().length < 10) return;

      const lowerLine = line.toLowerCase();
      for (const [type, keywords] of Object.entries(eventKeywords)) {
        if (keywords.some(keyword => lowerLine.includes(keyword))) {
          console.log(`   ✅ Line ${index + 1} matches "${type}": "${line.trim()}"`);
          keywordMatches++;
          break;
        }
      }
    });

    console.log(`\n📊 Keyword Results:`);
    console.log(`   - Lines with keywords: ${keywordMatches}`);

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testEventExtraction();
