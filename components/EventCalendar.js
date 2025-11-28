// components/EventCalendar.js
/**
 * Smart Academic Event Calendar Component
 * Displays academic events in a calendar interface
 */

import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import axios from 'axios';

const EventCalendar = ({ isOpen, onClose }) => {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [filterType, setFilterType] = useState('all');

  // Load events when component mounts
  useEffect(() => {
    if (isOpen) {
      loadEvents();
      loadEventStats();
    }
  }, [isOpen, filterType]);

  // Load events from API
  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = '/api/events';
      if (filterType !== 'all') {
        url += `?type=${filterType}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data.success) {
        setEvents(response.data.data);
        console.log(`📅 Loaded ${response.data.data.length} events`);
      } else {
        throw new Error(response.data.message || 'Failed to load events');
      }
      
    } catch (err) {
      console.error('❌ Error loading events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load event statistics
  const loadEventStats = async () => {
    try {
      const response = await axios.get('/api/events?stats=true');
      if (response.data.success) {
        setEventStats(response.data.data);
      }
    } catch (err) {
      console.error('❌ Error loading event stats:', err);
    }
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateString);
  };

  // Handle date selection
  const handleDateChange = (date) => {
    setSelectedDate(date);
    const dayEvents = getEventsForDate(date);
    setSelectedEvents(dayEvents);
  };

  // Check if a date has events
  const hasEvents = (date) => {
    return getEventsForDate(date).length > 0;
  };

  // Get event type color
  const getEventTypeColor = (eventType) => {
    const colors = {
      'exam': '#ff4757',
      'deadline': '#ff6b6b',
      'registration': '#3742fa',
      'fee': '#2ed573',
      'holiday': '#ffa502',
      'workshop': '#5f27cd',
      'result': '#00d2d3',
      'revaluation': '#ff9ff3',
      'internship': '#54a0ff',
      'project': '#5f27cd',
      'general': '#747d8c'
    };
    return colors[eventType] || colors.general;
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="calendar-overlay">
      <div className="calendar-modal">
        {/* Header */}
        <div className="calendar-header">
          <h2>📅 Academic Event Calendar</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Statistics */}
        {eventStats && (
          <div className="event-stats">
            <div className="stat-item">
              <span className="stat-number">{eventStats.total_events}</span>
              <span className="stat-label">Total Events</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{eventStats.upcoming_events}</span>
              <span className="stat-label">Upcoming</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{eventStats.source_files}</span>
              <span className="stat-label">Documents</span>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="event-filter">
          <label>Filter by type:</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Events</option>
            <option value="exam">Exams</option>
            <option value="deadline">Deadlines</option>
            <option value="registration">Registration</option>
            <option value="fee">Fee Payments</option>
            <option value="holiday">Holidays</option>
            <option value="workshop">Workshops</option>
            <option value="result">Results</option>
          </select>
        </div>

        <div className="calendar-content">
          {/* Calendar */}
          <div className="calendar-section">
            {loading ? (
              <div className="loading">Loading events...</div>
            ) : error ? (
              <div className="error">Error: {error}</div>
            ) : (
              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                tileClassName={({ date }) => {
                  if (hasEvents(date)) {
                    return 'has-events';
                  }
                  return null;
                }}
                tileContent={({ date }) => {
                  const dayEvents = getEventsForDate(date);
                  if (dayEvents.length > 0) {
                    return (
                      <div className="event-indicators">
                        {dayEvents.slice(0, 3).map((event, index) => (
                          <div
                            key={index}
                            className="event-dot"
                            style={{ backgroundColor: getEventTypeColor(event.event_type) }}
                            title={event.title}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="event-more">+{dayEvents.length - 3}</div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
            )}
          </div>

          {/* Event Details */}
          <div className="event-details">
            <h3>{formatDate(selectedDate)}</h3>
            
            {selectedEvents.length > 0 ? (
              <div className="events-list">
                {selectedEvents.map((event, index) => (
                  <div key={index} className="event-item">
                    <div 
                      className="event-type-indicator"
                      style={{ backgroundColor: getEventTypeColor(event.event_type) }}
                    />
                    <div className="event-content">
                      <h4>{event.title}</h4>
                      <p className="event-type">{event.event_type.toUpperCase()}</p>
                      <p className="event-source">📄 {event.source_file}</p>
                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-events">
                <p>No events scheduled for this date</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="event-legend">
          <h4>Event Types:</h4>
          <div className="legend-items">
            {Object.entries({
              'exam': 'Exams',
              'deadline': 'Deadlines', 
              'registration': 'Registration',
              'fee': 'Fee Payments',
              'holiday': 'Holidays',
              'workshop': 'Workshops'
            }).map(([type, label]) => (
              <div key={type} className="legend-item">
                <div 
                  className="legend-color"
                  style={{ backgroundColor: getEventTypeColor(type) }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCalendar;
