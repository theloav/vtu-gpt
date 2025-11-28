// lib/eventsDatabase.js
/**
 * Database operations for Smart Academic Event Calendar
 */

import { getDatabase } from './db.js';

/**
 * Store extracted events in the database
 * @param {Array} events - Array of event objects
 * @returns {Promise<Object>} Result object with success status and details
 */
export async function storeEvents(events) {
  try {
    if (!events || events.length === 0) {
      return { success: true, stored: 0, message: 'No events to store' };
    }

    console.log(`💾 Storing ${events.length} events in database...`);

    const db = await getDatabase();
    let storedCount = 0;
    let duplicateCount = 0;

    for (const event of events) {
      try {
        // Check if event already exists (prevent duplicates)
        const existing = await db.get(
          `SELECT id FROM events
           WHERE title = ? AND date = ? AND source_file = ?`,
          [event.title, event.date, event.sourceFile]
        );

        if (existing) {
          duplicateCount++;
          continue;
        }

        // Insert new event
        await db.run(
          `INSERT INTO events (title, date, source_file, event_type, description)
           VALUES (?, ?, ?, ?, ?)`,
          [
            event.title,
            event.date,
            event.sourceFile,
            event.eventType || 'general',
            event.description || ''
          ]
        );

        storedCount++;

      } catch (eventError) {
        console.error(`❌ Error storing event "${event.title}":`, eventError);
      }
    }

    console.log(`✅ Stored ${storedCount} new events (${duplicateCount} duplicates skipped)`);

    return {
      success: true,
      stored: storedCount,
      duplicates: duplicateCount,
      total: events.length,
      message: `Successfully stored ${storedCount} events`
    };

  } catch (error) {
    console.error('❌ Error storing events:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to store events'
    };
  }
}

/**
 * Get all active events from the database
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of events
 */
export async function getEvents(options = {}) {
  try {
    const db = await getDatabase();

    let query = `
      SELECT id, title, date, source_file, event_type, description, extracted_at
      FROM events
      WHERE is_active = 1
    `;

    const params = [];

    // Add date filtering
    if (options.fromDate) {
      query += ` AND date >= ?`;
      params.push(options.fromDate);
    }

    if (options.toDate) {
      query += ` AND date <= ?`;
      params.push(options.toDate);
    }

    // Add event type filtering
    if (options.eventType) {
      query += ` AND event_type = ?`;
      params.push(options.eventType);
    }

    // Add source file filtering
    if (options.sourceFile) {
      query += ` AND source_file = ?`;
      params.push(options.sourceFile);
    }

    // Add ordering
    query += ` ORDER BY date ASC, extracted_at DESC`;

    // Add limit
    if (options.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }

    const events = await db.all(query, params);

    console.log(`📅 Retrieved ${events.length} events from database`);
    return events;

  } catch (error) {
    console.error('❌ Error retrieving events:', error);
    return [];
  }
}

/**
 * Get upcoming events (next 30 days)
 * @returns {Promise<Array>} Array of upcoming events
 */
export async function getUpcomingEvents() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    return await getEvents({
      fromDate: today,
      toDate: thirtyDaysFromNow
    });

  } catch (error) {
    console.error('❌ Error getting upcoming events:', error);
    return [];
  }
}

/**
 * Get events by type
 * @param {string} eventType - Type of events to retrieve
 * @returns {Promise<Array>} Array of events
 */
export async function getEventsByType(eventType) {
  try {
    return await getEvents({ eventType });
  } catch (error) {
    console.error(`❌ Error getting ${eventType} events:`, error);
    return [];
  }
}

/**
 * Get events by source file
 * @param {string} sourceFile - Source file name
 * @returns {Promise<Array>} Array of events
 */
export async function getEventsBySource(sourceFile) {
  try {
    return await getEvents({ sourceFile });
  } catch (error) {
    console.error(`❌ Error getting events from ${sourceFile}:`, error);
    return [];
  }
}

/**
 * Delete events by source file (when file is removed)
 * @param {string} sourceFile - Source file name
 * @returns {Promise<Object>} Result object
 */
export async function deleteEventsBySource(sourceFile) {
  try {
    const db = await getDatabase();

    const result = await db.run(
      `UPDATE events SET is_active = 0 WHERE source_file = ?`,
      [sourceFile]
    );

    console.log(`🗑️ Deactivated ${result.changes} events from ${sourceFile}`);

    return {
      success: true,
      deactivated: result.changes,
      message: `Deactivated events from ${sourceFile}`
    };

  } catch (error) {
    console.error(`❌ Error deleting events from ${sourceFile}:`, error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to delete events'
    };
  }
}

/**
 * Get event statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getEventStatistics() {
  try {
    const db = await getDatabase();

    const stats = await db.get(`
      SELECT
        COUNT(*) as total_events,
        COUNT(CASE WHEN date >= date('now') THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN date < date('now') THEN 1 END) as past_events,
        COUNT(DISTINCT source_file) as source_files,
        COUNT(DISTINCT event_type) as event_types
      FROM events
      WHERE is_active = 1
    `);

    const eventTypeStats = await db.all(`
      SELECT event_type, COUNT(*) as count
      FROM events
      WHERE is_active = 1
      GROUP BY event_type
      ORDER BY count DESC
    `);

    return {
      ...stats,
      eventTypeBreakdown: eventTypeStats
    };

  } catch (error) {
    console.error('❌ Error getting event statistics:', error);
    return {
      total_events: 0,
      upcoming_events: 0,
      past_events: 0,
      source_files: 0,
      event_types: 0,
      eventTypeBreakdown: []
    };
  }
}

/**
 * Search events by title or description
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching events
 */
export async function searchEvents(searchTerm) {
  try {
    const db = await getDatabase();

    const events = await db.all(`
      SELECT id, title, date, source_file, event_type, description, extracted_at
      FROM events
      WHERE is_active = 1
        AND (title LIKE ? OR description LIKE ?)
      ORDER BY date ASC
    `, [`%${searchTerm}%`, `%${searchTerm}%`]);

    console.log(`🔍 Found ${events.length} events matching "${searchTerm}"`);
    return events;

  } catch (error) {
    console.error(`❌ Error searching events for "${searchTerm}":`, error);
    return [];
  }
}

export default {
  storeEvents,
  getEvents,
  getUpcomingEvents,
  getEventsByType,
  getEventsBySource,
  deleteEventsBySource,
  getEventStatistics,
  searchEvents
};
