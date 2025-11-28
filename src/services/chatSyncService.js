// Chat synchronization service for cross-device chat storage

class ChatSyncService {
  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    this.syncInterval = null;
    this.listeners = new Set();
  }

  // Add listener for sync events
  addSyncListener(callback) {
    this.listeners.add(callback);
  }

  // Remove listener
  removeSyncListener(callback) {
    this.listeners.delete(callback);
  }

  // Notify all listeners of sync events
  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // Get device ID
  getDeviceId() {
    if (typeof window === 'undefined') return 'server';

    let deviceId = localStorage.getItem('vtu-gpt-device-id');
    if (!deviceId) {
      deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('vtu-gpt-device-id', deviceId);
    }
    return deviceId;
  }

  // Fetch chats from server
  async fetchChats(userEmail) {
    // Skip server calls during SSR
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chats?userEmail=${encodeURIComponent(userEmail)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.notifyListeners({
          type: 'FETCH_SUCCESS',
          chats: data.chats,
          timestamp: data.timestamp
        });
        return data.chats;
      } else {
        throw new Error(data.error || 'Failed to fetch chats');
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      this.notifyListeners({
        type: 'FETCH_ERROR',
        error: error.message
      });

      // Fallback to localStorage
      return this.getLocalChats(userEmail);
    }
  }

  // Save chats to server
  async saveChats(userEmail, chats) {
    // Skip server calls during SSR
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          chats,
          deviceId: this.getDeviceId()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.notifyListeners({
          type: 'SAVE_SUCCESS',
          timestamp: data.timestamp,
          chatCount: data.chatCount
        });

        // Also save to localStorage as backup
        this.saveLocalChats(userEmail, chats);
        return true;
      } else {
        throw new Error(data.error || 'Failed to save chats');
      }
    } catch (error) {
      console.error('Error saving chats:', error);
      this.notifyListeners({
        type: 'SAVE_ERROR',
        error: error.message
      });

      // Fallback to localStorage
      this.saveLocalChats(userEmail, chats);
      return false;
    }
  }

  // Update specific chat
  async updateChat(userEmail, chatId, chatData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chats`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          chatId,
          chatData
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error updating chat:', error);
      return false;
    }
  }

  // Delete specific chat
  async deleteChat(userEmail, chatId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chats?userEmail=${encodeURIComponent(userEmail)}&chatId=${chatId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.notifyListeners({
          type: 'DELETE_SUCCESS',
          chatId,
          chatCount: data.chatCount
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
  }

  // Local storage fallback methods
  getLocalChats(userEmail) {
    // Skip localStorage during SSR
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const key = `vtu-gpt-chats-${userEmail}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error getting local chats:', error);
      return [];
    }
  }

  saveLocalChats(userEmail, chats) {
    // Skip localStorage during SSR
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const key = `vtu-gpt-chats-${userEmail}`;
      localStorage.setItem(key, JSON.stringify(chats));
    } catch (error) {
      console.error('Error saving local chats:', error);
    }
  }

  // Start periodic sync (DISABLED - only manual sync now)
  startPeriodicSync(_userEmail, _callback) {
    // Periodic sync disabled - only manual sync available
    console.log('Periodic sync disabled. Use manual sync button.');
    return;
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Manual sync
  async manualSync(userEmail) {
    // Skip manual sync during SSR
    if (typeof window === 'undefined') {
      return [];
    }

    this.notifyListeners({ type: 'SYNC_START' });

    try {
      const chats = await this.fetchChats(userEmail);
      this.notifyListeners({
        type: 'SYNC_SUCCESS',
        chats,
        timestamp: Date.now()
      });
      return chats;
    } catch (error) {
      this.notifyListeners({
        type: 'SYNC_ERROR',
        error: error.message
      });
      throw error;
    }
  }
}

// Create singleton instance
const chatSyncService = new ChatSyncService();

export default chatSyncService;
