// lib/eventExtractor.js
/**
 * Smart Academic Event Calendar - Event Extraction Module
 * Extracts dates and events from academic documents using NLP and regex patterns
 */

/**
 * Extract dates and events from text content
 * @param {string} text - The text content to analyze
 * @param {string} sourceFile - The source file name
 * @returns {Array} Array of extracted events
 */
export function extractDatesAndEvents(text, sourceFile) {
  try {
    console.log(`🔍 Extracting events from ${sourceFile}...`);
    
    const events = [];
    const lines = text.split('\n');
    
    // Academic event keywords and their types - EXPANDED
    const eventKeywords = {
      'exam': ['exam', 'examination', 'test', 'assessment', 'evaluation', 'conducted', 'scheduled', 'semester'],
      'registration': ['registration', 'register', 'enroll', 'enrollment', 'admission', 'complete', 'course'],
      'deadline': ['deadline', 'last date', 'due date', 'final date', 'closing date', 'due', 'by', 'must', 'submission'],
      'fee': ['fee', 'payment', 'tuition', 'charges', 'dues', 'paid', 'pay'],
      'holiday': ['holiday', 'vacation', 'break', 'closed', 'off', 'festival', 'celebration'],
      'workshop': ['workshop', 'seminar', 'conference', 'training', 'session', 'event', 'fair', 'symposium'],
      'result': ['result', 'results', 'marks', 'grades', 'score', 'published', 'declared'],
      'revaluation': ['revaluation', 'recheck', 'review', 'appeal'],
      'internship': ['internship', 'placement', 'job', 'career', 'recruitment', 'fair'],
      'project': ['project', 'thesis', 'dissertation', 'submission', 'submissions'],
      'academic': ['academic', 'calendar', 'schedule', 'important', 'dates', 'university']
    };
    
    // Date patterns (various formats) - More flexible patterns
    const datePatterns = [
      // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
      /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g,
      // DD Month YYYY, DD Month YY
      /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*,?\s*(\d{2,4})\b/gi,
      // Month DD, YYYY
      /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s*,?\s*(\d{4})\b/gi,
      // DD-Month-YYYY
      /\b(\d{1,2})[-\s]+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s]+(\d{4})\b/gi,
      // Simple YYYY-MM-DD format
      /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/g
    ];
    
    // Process each line for event detection
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 10) continue; // Skip very short lines
      
      // Check for event keywords OR any line with dates
      const detectedEventType = detectEventType(line, eventKeywords);

      // Also check if line contains any dates (more flexible approach)
      const hasDate = datePatterns.some(pattern => {
        pattern.lastIndex = 0; // Reset regex
        return pattern.test(line);
      });

      if (!detectedEventType && !hasDate) continue;

      const eventType = detectedEventType || 'academic';
      console.log(`🔍 Found potential event line: "${line}" (type: ${eventType}, hasDate: ${hasDate})`);
      
      // Extract dates from current line and surrounding lines
      const contextLines = [
        lines[i - 1] || '',
        line,
        lines[i + 1] || ''
      ].join(' ');
      
      const extractedDates = extractDatesFromText(contextLines, datePatterns);
      console.log(`📅 Extracted ${extractedDates.length} dates from context: "${contextLines.substring(0, 100)}..."`);

      // Create events for each detected date
      extractedDates.forEach(dateInfo => {
        const confidence = calculateConfidence(line, eventType, dateInfo);
        console.log(`🔍 Calculating confidence for: "${line.substring(0, 50)}..." -> ${confidence.toFixed(2)}`);

        const event = {
          title: cleanEventTitle(line),
          date: dateInfo.standardDate,
          sourceFile: sourceFile,
          eventType: eventType,
          description: line.length > 100 ? line.substring(0, 100) + '...' : line,
          confidence: confidence
        };

        // Only add medium-confidence events (lowered threshold)
        if (event.confidence > 0.4) {
          events.push(event);
          console.log(`📅 ✅ ADDED EVENT: ${event.title} on ${event.date} (confidence: ${event.confidence.toFixed(2)})`);
        } else {
          console.log(`📅 ❌ REJECTED EVENT: ${event.title} on ${event.date} (confidence: ${event.confidence.toFixed(2)} < 0.4)`);
        }
      });
    }
    
    // Remove duplicates and sort by date
    const uniqueEvents = removeDuplicateEvents(events);
    const sortedEvents = uniqueEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log(`✅ Extracted ${sortedEvents.length} events from ${sourceFile}`);
    return sortedEvents;
    
  } catch (error) {
    console.error(`❌ Error extracting events from ${sourceFile}:`, error);
    return [];
  }
}

/**
 * Detect event type based on keywords
 */
function detectEventType(text, eventKeywords) {
  const lowerText = text.toLowerCase();
  
  for (const [type, keywords] of Object.entries(eventKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return type;
    }
  }
  
  return null;
}

/**
 * Extract dates from text using multiple patterns
 */
function extractDatesFromText(text, datePatterns) {
  const dates = [];
  
  datePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const standardDate = standardizeDate(match);
      if (standardDate && isValidAcademicDate(standardDate)) {
        dates.push({
          originalText: match[0],
          standardDate: standardDate,
          position: match.index
        });
      }
    }
  });
  
  return dates;
}

/**
 * Standardize date to YYYY-MM-DD format
 */
function standardizeDate(match) {
  try {
    console.log(`🔍 Trying to standardize date match:`, match);

    const monthNames = {
      'january': '01', 'jan': '01',
      'february': '02', 'feb': '02',
      'march': '03', 'mar': '03',
      'april': '04', 'apr': '04',
      'may': '05',
      'june': '06', 'jun': '06',
      'july': '07', 'jul': '07',
      'august': '08', 'aug': '08',
      'september': '09', 'sep': '09',
      'october': '10', 'oct': '10',
      'november': '11', 'nov': '11',
      'december': '12', 'dec': '12'
    };

    let day, month, year;

    // Handle different match patterns
    if (match[1] && match[2] && match[3]) {
      // Check if first group is a month name
      if (monthNames[match[1].toLowerCase()]) {
        // Format: "March 15, 2024"
        month = monthNames[match[1].toLowerCase()];
        day = match[2].padStart(2, '0');
        year = match[3].length === 2 ? '20' + match[3] : match[3];
        console.log(`📅 Parsed "Month Day, Year" format: ${match[1]} ${match[2]}, ${match[3]} -> ${year}-${month}-${day}`);
      } else if (monthNames[match[2].toLowerCase()]) {
        // Format: "15 March 2024"
        day = match[1].padStart(2, '0');
        month = monthNames[match[2].toLowerCase()];
        year = match[3].length === 2 ? '20' + match[3] : match[3];
        console.log(`📅 Parsed "Day Month Year" format: ${match[1]} ${match[2]} ${match[3]} -> ${year}-${month}-${day}`);
      } else if (!isNaN(match[1]) && !isNaN(match[2]) && !isNaN(match[3])) {
        // Numeric format (e.g., "15/03/2024" or "2024/03/15")
        if (match[1].length === 4) {
          // Format: "2024/03/15"
          year = match[1];
          month = match[2].padStart(2, '0');
          day = match[3].padStart(2, '0');
          console.log(`📅 Parsed "YYYY/MM/DD" format: ${match[1]}/${match[2]}/${match[3]} -> ${year}-${month}-${day}`);
        } else {
          // Format: "15/03/2024"
          day = match[1].padStart(2, '0');
          month = match[2].padStart(2, '0');
          year = match[3];
          console.log(`📅 Parsed "DD/MM/YYYY" format: ${match[1]}/${match[2]}/${match[3]} -> ${year}-${month}-${day}`);
        }
      }
    }

    if (!day || !month || !year) {
      console.log(`❌ Failed to parse date components: day=${day}, month=${month}, year=${year}`);
      return null;
    }

    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) {
      console.log(`❌ Invalid date created: ${year}-${month}-${day}`);
      return null;
    }

    const standardDate = `${year}-${month}-${day}`;
    console.log(`✅ Standardized date: ${standardDate}`);
    return standardDate;

  } catch (error) {
    console.log(`❌ Error in standardizeDate:`, error);
    return null;
  }
}

/**
 * Check if date is within reasonable academic timeframe
 */
function isValidAcademicDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  // Accept a wide, safe window to include current and recent past/future academic years
  const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1);
  const fiveYearsFromNow = new Date(now.getFullYear() + 5, 11, 31);
  return date >= fiveYearsAgo && date <= fiveYearsFromNow;
}

/**
 * Clean and format event title
 */
function cleanEventTitle(text) {
  // Remove excessive whitespace and special characters
  let title = text.replace(/\s+/g, ' ').trim();
  
  // Limit length
  if (title.length > 200) {
    title = title.substring(0, 200) + '...';
  }
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  return title;
}

/**
 * Calculate confidence score for extracted event
 */
function calculateConfidence(text, eventType, dateInfo) {
  let confidence = 0.5; // Base confidence
  
  // Boost confidence based on event type keywords
  const eventTypeKeywords = {
    'exam': 0.9,
    'deadline': 0.9,
    'registration': 0.8,
    'fee': 0.7,
    'result': 0.8,
    'revaluation': 0.8
  };
  
  confidence += (eventTypeKeywords[eventType] || 0.6) * 0.3;
  
  // Boost confidence if date is close to text
  if (dateInfo.position < 100) {
    confidence += 0.1;
  }
  
  // Boost confidence for specific phrases
  const highConfidencePhrases = [
    'last date', 'deadline', 'due date', 'final date',
    'exam schedule', 'registration', 'fee payment'
  ];
  
  if (highConfidencePhrases.some(phrase => text.toLowerCase().includes(phrase))) {
    confidence += 0.2;
  }
  
  return Math.min(confidence, 1.0);
}

/**
 * Remove duplicate events
 */
function removeDuplicateEvents(events) {
  const seen = new Set();
  return events.filter(event => {
    const key = `${event.title}-${event.date}-${event.eventType}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

const eventExtractorExports = {
  extractDatesAndEvents
};
export default eventExtractorExports;
