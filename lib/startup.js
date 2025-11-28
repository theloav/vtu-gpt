// lib/startup.js
import { initializeSyncScheduler } from './syncScheduler.js';

let initialized = false;

export function initializeApp() {
  if (!initialized) {
    console.log('🚀 Initializing VTU GPT application...');
    
    // Initialize Google Drive sync scheduler
    try {
      initializeSyncScheduler();
      console.log('✅ Application initialization complete');
    } catch (error) {
      console.error('❌ Application initialization failed:', error);
    }
    
    initialized = true;
  }
}

export default { initializeApp };
