// pages/api/events.js
/**
 * Smart Academic Event Calendar API
 * Provides endpoints for retrieving academic events
 */

import { 
  getEvents, 
  getUpcomingEvents, 
  getEventsByType, 
  getEventStatistics,
  searchEvents 
} from '../../lib/eventsDatabase.js';

export default async function handler(req, res) {
  const { method, query } = req;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
    return;
  }

  try {
    console.log('📅 Events API called with query:', query);
    
    const {
      type,           // Filter by event type
      upcoming,       // Get upcoming events only
      search,         // Search term
      fromDate,       // Start date filter
      toDate,         // End date filter
      limit,          // Limit number of results
      stats           // Get statistics
    } = query;

    // Handle statistics request
    if (stats === 'true') {
      console.log('📊 Fetching event statistics...');
      const statistics = await getEventStatistics();
      
      return res.status(200).json({
        success: true,
        data: statistics,
        message: 'Event statistics retrieved successfully'
      });
    }

    // Handle search request
    if (search) {
      console.log(`🔍 Searching events for: "${search}"`);
      const searchResults = await searchEvents(search);
      
      return res.status(200).json({
        success: true,
        data: searchResults,
        count: searchResults.length,
        message: `Found ${searchResults.length} events matching "${search}"`
      });
    }

    // Handle upcoming events request
    if (upcoming === 'true') {
      console.log('📅 Fetching upcoming events...');
      const upcomingEvents = await getUpcomingEvents();
      
      return res.status(200).json({
        success: true,
        data: upcomingEvents,
        count: upcomingEvents.length,
        message: `Retrieved ${upcomingEvents.length} upcoming events`
      });
    }

    // Handle events by type
    if (type) {
      console.log(`📋 Fetching ${type} events...`);
      const typeEvents = await getEventsByType(type);
      
      return res.status(200).json({
        success: true,
        data: typeEvents,
        count: typeEvents.length,
        eventType: type,
        message: `Retrieved ${typeEvents.length} ${type} events`
      });
    }

    // Handle general events request with filters
    console.log('📅 Fetching events with filters...');
    const options = {};
    
    if (fromDate) options.fromDate = fromDate;
    if (toDate) options.toDate = toDate;
    if (limit) options.limit = parseInt(limit);
    
    const events = await getEvents(options);
    
    // Group events by month for calendar display
    const eventsByMonth = groupEventsByMonth(events);
    
    return res.status(200).json({
      success: true,
      data: events,
      groupedByMonth: eventsByMonth,
      count: events.length,
      filters: options,
      message: `Retrieved ${events.length} events`
    });

  } catch (error) {
    console.error('❌ Events API error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve events'
    });
  }
}

/**
 * Group events by month for calendar display
 */
function groupEventsByMonth(events) {
  const grouped = {};
  
  events.forEach(event => {
    const date = new Date(event.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        monthName: date.toLocaleString('default', { month: 'long' }),
        events: []
      };
    }
    
    grouped[monthKey].events.push({
      ...event,
      dayOfMonth: date.getDate(),
      dayOfWeek: date.toLocaleString('default', { weekday: 'long' })
    });
  });
  
  // Sort events within each month by date
  Object.values(grouped).forEach(month => {
    month.events.sort((a, b) => new Date(a.date) - new Date(b.date));
  });
  
  return grouped;
}
