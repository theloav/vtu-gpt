// Simple in-memory chat storage API for cross-device sync
// In production, this would use a proper database

let chatStorage = new Map(); // userEmail -> chats array

export default function handler(req, res) {
  const { method } = req;
  
  // Enable CORS for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  switch (method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'PUT':
      return handlePut(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

// Get chats for a user
function handleGet(req, res) {
  try {
    const { userEmail } = req.query;
    
    if (!userEmail) {
      return res.status(400).json({ error: 'userEmail is required' });
    }
    
    const userChats = chatStorage.get(userEmail) || [];
    
    // Clean up old chats (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const validChats = userChats.filter(chat => {
      const chatDate = new Date(chat.timestamp);
      return chatDate > thirtyDaysAgo && chat.messages && chat.messages.length > 0;
    });
    
    // Update storage if we cleaned up old chats
    if (validChats.length !== userChats.length) {
      chatStorage.set(userEmail, validChats);
    }
    
    res.status(200).json({
      success: true,
      chats: validChats,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error getting chats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Save/update chats for a user
function handlePost(req, res) {
  try {
    const { userEmail, chats, deviceId } = req.body;
    
    if (!userEmail || !chats) {
      return res.status(400).json({ error: 'userEmail and chats are required' });
    }
    
    // Validate chats array
    if (!Array.isArray(chats)) {
      return res.status(400).json({ error: 'chats must be an array' });
    }
    
    // Store chats with metadata
    const chatData = chats.map(chat => ({
      ...chat,
      lastModified: Date.now(),
      deviceId: deviceId || 'unknown'
    }));
    
    chatStorage.set(userEmail, chatData);
    
    res.status(200).json({
      success: true,
      message: 'Chats saved successfully',
      timestamp: Date.now(),
      chatCount: chatData.length
    });
    
  } catch (error) {
    console.error('Error saving chats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update specific chat
function handlePut(req, res) {
  try {
    const { userEmail, chatId, chatData } = req.body;
    
    if (!userEmail || !chatId || !chatData) {
      return res.status(400).json({ error: 'userEmail, chatId, and chatData are required' });
    }
    
    const userChats = chatStorage.get(userEmail) || [];
    const chatIndex = userChats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex === -1) {
      // Add new chat
      userChats.unshift({
        ...chatData,
        lastModified: Date.now()
      });
    } else {
      // Update existing chat
      userChats[chatIndex] = {
        ...chatData,
        lastModified: Date.now()
      };
    }
    
    // Keep only last 15 chats
    const limitedChats = userChats.slice(0, 15);
    chatStorage.set(userEmail, limitedChats);
    
    res.status(200).json({
      success: true,
      message: 'Chat updated successfully',
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Delete specific chat
function handleDelete(req, res) {
  try {
    const { userEmail, chatId } = req.query;
    
    if (!userEmail || !chatId) {
      return res.status(400).json({ error: 'userEmail and chatId are required' });
    }
    
    const userChats = chatStorage.get(userEmail) || [];
    const filteredChats = userChats.filter(chat => chat.id !== chatId);
    
    chatStorage.set(userEmail, filteredChats);
    
    res.status(200).json({
      success: true,
      message: 'Chat deleted successfully',
      timestamp: Date.now(),
      chatCount: filteredChats.length
    });
    
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
