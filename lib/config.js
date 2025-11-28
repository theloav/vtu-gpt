// lib/config.js
// Authentication Configuration

// Session timeout in hours - Change this value to modify session duration
export const SESSION_TIMEOUT_HOURS = 2;

// Convert to milliseconds for internal use
export const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_HOURS * 60 * 60 * 1000;

// Convert to seconds for cookie Max-Age
export const SESSION_TIMEOUT_SECONDS = SESSION_TIMEOUT_HOURS * 60 * 60;

// JWT expiration string
export const JWT_EXPIRATION = `${SESSION_TIMEOUT_HOURS}h`;
