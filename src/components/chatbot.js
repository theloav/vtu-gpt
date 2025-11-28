'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../contexts/AuthContext';
import chatSyncService from '../services/chatSyncService';
import ClientOnly from './ClientOnly';
import EventCalendar from '../../components/EventCalendar';


const Chatbot = () => {
  const [userQuery, setUserQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Loading state for chat queries
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Loading state for initial app load (splash screen)
  const [error, setError] = useState(null);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // For chat search/filter
  const [pinnedChats, setPinnedChats] = useState([]); // For pinning important chats
  const [archivedChats, setArchivedChats] = useState([]); // For archiving old conversations
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'success', 'error'
  const [isClient, setIsClient] = useState(false); // Track client-side mounting
  const [showCalendar, setShowCalendar] = useState(false); // Smart Academic Event Calendar
  const leftPanelRef = useRef(null); // Reference for the left panel
  const toggleButtonRef = useRef(null); // Reference for the toggle button
  const userMenuRef = useRef(null); // Reference for the user menu
  const chatContainerRef = useRef(null); // Reference for the chat container for auto-scrolling

  const { user, logout } = useAuth();

  // Close the left panel and user menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        showLeftPanel &&
        leftPanelRef.current &&
        toggleButtonRef.current &&
        !leftPanelRef.current.contains(event.target) &&
        !toggleButtonRef.current.contains(event.target)
      ) {
        setShowLeftPanel(false);
      }

      if (
        showUserMenu &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [showLeftPanel, showUserMenu]);

  // Migrate old chat data to new email-based storage
  const migrateOldChatData = (userEmail) => {
    try {
      // Check for old storage format (user ID based)
      const oldKeys = Object.keys(localStorage).filter(key =>
        key.startsWith('vtu-gpt-chats-') && !key.includes('@')
      );

      if (oldKeys.length > 0) {
        const newUserKey = `vtu-gpt-chats-${userEmail}`;
        const existingData = localStorage.getItem(newUserKey);

        if (!existingData) {
          // Migrate the most recent old data
          const oldKey = oldKeys[0];
          const oldData = localStorage.getItem(oldKey);
          if (oldData) {
            localStorage.setItem(newUserKey, oldData);
            console.log('Migrated chat data to new email-based storage');
          }
        }

        // Clean up old storage keys
        oldKeys.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Error migrating old chat data:', {
        message: error.message,
        name: error.name
      });
    }
  };



  // Client-side mounting effect
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load recent chats using new API-based sync service
  useEffect(() => {
    const loadRecentChats = async () => {
      try {
        if (!user?.email || !isClient) return;

        setIsSyncing(true);
        setSyncStatus('syncing');

        // Migrate old data if needed (only on client)
        if (typeof window !== 'undefined') {
          migrateOldChatData(user.email);
        }

        // Try to fetch from server first
        try {
          const serverChats = await chatSyncService.fetchChats(user.email);
          if (serverChats && serverChats.length > 0) {
            const validChats = validateAndCleanChats(serverChats);
            setRecentChats(validChats.filter(chat => !chat.isPinned && !chat.isArchived));
            setPinnedChats(validChats.filter(chat => chat.isPinned));
            setArchivedChats(validChats.filter(chat => chat.isArchived));
            setSyncStatus('success');
            console.log('Loaded chats from server');
          } else {
            // Fallback to localStorage
            const localChats = chatSyncService.getLocalChats(user.email);
            const validChats = validateAndCleanChats(localChats);
            setRecentChats(validChats.filter(chat => !chat.isPinned && !chat.isArchived));
            setPinnedChats(validChats.filter(chat => chat.isPinned));
            setArchivedChats(validChats.filter(chat => chat.isArchived));
            setSyncStatus('success');
            console.log('Loaded chats from local storage');
          }
        } catch (error) {
          console.error('Server fetch failed, using local storage:', error);
          // Fallback to localStorage
          const localChats = chatSyncService.getLocalChats(user.email);
          const validChats = validateAndCleanChats(localChats);
          setRecentChats(validChats.filter(chat => !chat.isPinned && !chat.isArchived));
          setPinnedChats(validChats.filter(chat => chat.isPinned));
          setArchivedChats(validChats.filter(chat => chat.isArchived));
          setSyncStatus('error');
        }

      } catch (error) {
        console.error('Error loading recent chats:', {
          message: error.message,
          name: error.name
        });
        setSyncStatus('error');
      } finally {
        setTimeout(() => {
          setIsSyncing(false);
          setSyncStatus('idle');
        }, 1000);
      }
    };

    if (user?.email && isClient) {
      loadRecentChats();
      // Note: Automatic periodic sync disabled - only manual sync available
    }

    return () => {
      // Cleanup if needed
      if (isClient) {
        chatSyncService.stopPeriodicSync();
      }
    };
  }, [user?.email, isClient]);

  // Auto-scroll to the bottom of the chat history
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]); // Scroll when chatHistory changes

  // Validate and clean chat data
  const validateAndCleanChats = (chats) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return chats.filter(chat => {
      const chatDate = new Date(chat.timestamp);
      return chatDate > thirtyDaysAgo && chat.messages && chat.messages.length > 0;
    });
  };

  // Manual sync function - now the only way to sync chats
  const manualSync = async () => {
    if (!user?.email) return;

    setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      console.log('Starting manual sync...');

      // Force sync from server
      const serverChats = await chatSyncService.manualSync(user.email);

      if (serverChats && serverChats.length >= 0) {
        const validChats = validateAndCleanChats(serverChats);

        // Check if there are any changes
        const allCurrentChats = [...recentChats, ...pinnedChats, ...archivedChats];
        const currentChatsString = JSON.stringify(allCurrentChats);
        const serverChatsString = JSON.stringify(validChats);

        if (currentChatsString !== serverChatsString) {
          setRecentChats(validChats.filter(chat => !chat.isPinned && !chat.isArchived));
          setPinnedChats(validChats.filter(chat => chat.isPinned));
          setArchivedChats(validChats.filter(chat => chat.isArchived));
          console.log(`Manual sync completed - ${validChats.length} chats synced from server`);
        } else {
          console.log('Manual sync completed - no changes detected');
        }

        setSyncStatus('success');
      } else {
        // Fallback to local storage
        const localChats = chatSyncService.getLocalChats(user.email);
        const validChats = validateAndCleanChats(localChats);
        setRecentChats(validChats.filter(chat => !chat.isPinned && !chat.isArchived));
        setPinnedChats(validChats.filter(chat => chat.isPinned));
        setArchivedChats(validChats.filter(chat => chat.isArchived));
        setSyncStatus('success');
        console.log('Manual sync completed from local storage');
      }

    } catch (error) {
      // Safe error logging to prevent circular structure errors
      console.error('Manual sync failed:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      setSyncStatus('error');

      // Try local storage as last resort
      try {
        const localChats = chatSyncService.getLocalChats(user.email);
        const validChats = validateAndCleanChats(localChats);
        setRecentChats(validChats.filter(chat => !chat.isPinned && !chat.isArchived));
        setPinnedChats(validChats.filter(chat => chat.isPinned));
        setArchivedChats(validChats.filter(chat => chat.isArchived));
        console.log('Fallback to local storage successful');
      } catch (localError) {
        console.error('Local storage fallback also failed:', {
          message: localError.message,
          name: localError.name
        });
      }
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncStatus('idle');
      }, 2000);
    }
  };

  // Helper to get all chats (recent, pinned, archived)
  const getAllChats = () => {
    return [...pinnedChats, ...recentChats, ...archivedChats];
  };

  // Save current chat using new API-based sync service
  const saveCurrentChat = async (isPinned = false, isArchived = false) => {
    if (chatHistory.length > 0 && user?.email) {
      try {
        const chatId = currentChatId || Date.now().toString();
        const firstUserMessage = chatHistory.find(msg => msg.sender === 'user')?.message;
        const chatData = {
          id: chatId,
          title: generateChatTitle(firstUserMessage),
          messages: chatHistory,
          timestamp: new Date().toISOString(),
          userEmail: user.email,
          deviceId: chatSyncService.getDeviceId(),
          lastModified: Date.now(),
          isPinned: isPinned,
          isArchived: isArchived,
        };

        const allChats = getAllChats().filter(chat => chat.id !== chatId);
        allChats.unshift(chatData);

        // Keep only last 15 non-pinned, non-archived chats
        const limitedRecentChats = allChats.filter(chat => !chat.isPinned && !chat.isArchived).slice(0, 15);
        const updatedPinnedChats = allChats.filter(chat => chat.isPinned);
        const updatedArchivedChats = allChats.filter(chat => chat.isArchived);

        setRecentChats(limitedRecentChats);
        setPinnedChats(updatedPinnedChats);
        setArchivedChats(updatedArchivedChats);
        setCurrentChatId(chatId);

        // Save all chats to server with fallback to local storage
        setIsSyncing(true);
        const success = await chatSyncService.saveChats(user.email, [...limitedRecentChats, ...updatedPinnedChats, ...updatedArchivedChats]);

        if (success) {
          console.log('Chat saved to server successfully');
        } else {
          console.log('Chat saved to local storage as fallback');
        }

        setTimeout(() => setIsSyncing(false), 500);

      } catch (error) {
        console.error('Error saving chat:', {
          message: error.message,
          name: error.name
        });
      }
    }
  };

  // Pin/Unpin a chat
  const togglePinChat = async (chatId) => {
    const chatToUpdate = getAllChats().find(chat => chat.id === chatId);
    if (!chatToUpdate) return;

    const updatedChat = { ...chatToUpdate, isPinned: !chatToUpdate.isPinned, isArchived: false }; // Unarchive if pinning
    await saveCurrentChat(updatedChat.isPinned, updatedChat.isArchived);
  };

  // Archive/Unarchive a chat
  const toggleArchiveChat = async (chatId) => {
    const chatToUpdate = getAllChats().find(chat => chat.id === chatId);
    if (!chatToUpdate) return;

    const updatedChat = { ...chatToUpdate, isArchived: !chatToUpdate.isArchived, isPinned: false }; // Unpin if archiving
    await saveCurrentChat(updatedChat.isPinned, updatedChat.isArchived);
  };

  // Load a recent chat
  const loadChat = (chatData) => {
    saveCurrentChat(chatData.isPinned, chatData.isArchived); // Save current chat before loading new one
    setChatHistory(chatData.messages);
    setCurrentChatId(chatData.id);
    setShowLeftPanel(false);
  };

  // Delete a recent chat using new API-based sync service
  const deleteChat = async (chatId) => {
    if (!user?.email) return;

    try {
      setIsSyncing(true);

      // Try to delete from server first
      const serverSuccess = await chatSyncService.deleteChat(user.email, chatId);

      // Update local state regardless of server success
      const updatedRecentChats = recentChats.filter(chat => chat.id !== chatId);
      const updatedPinnedChats = pinnedChats.filter(chat => chat.id !== chatId);
      const updatedArchivedChats = archivedChats.filter(chat => chat.id !== chatId);

      setRecentChats(updatedRecentChats);
      setPinnedChats(updatedPinnedChats);
      setArchivedChats(updatedArchivedChats);

      // Save updated list to server
      if (!serverSuccess) {
        await chatSyncService.saveChats(user.email, [...updatedRecentChats, ...updatedPinnedChats, ...updatedArchivedChats]);
      }

      if (currentChatId === chatId) {
        handleNewChat();
      }

      setTimeout(() => setIsSyncing(false), 500);
    } catch (error) {
      console.error('Error deleting chat:', {
        message: error.message,
        name: error.name
      });
      setIsSyncing(false);
    }
  };

  const handleNewChat = () => {
    saveCurrentChat(); // Save current chat before starting new one
    setChatHistory([]);
    setUserQuery('');
    setError(null);
    setCurrentChatId(null);
  };

  const handleInputChange = (e) => {
    setUserQuery(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredRecentChats = recentChats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPinnedChats = pinnedChats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArchivedChats = archivedChats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    document.body.classList.add('chatbot-page');

    const initializeApp = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate loading time
      setIsInitialLoading(false); // Set initial loading to false after app load
    };

    initializeApp();

    return () => {
      document.body.classList.remove('chatbot-page');
    };
  }, []);

  // Generate a concise chat title
  const generateChatTitle = (firstMessage) => {
    if (!firstMessage) return 'New Chat';

    // Remove common question words and clean up
    let title = firstMessage
      .replace(/^(what|how|when|where|why|who|tell me|can you|please|could you)\s+/i, '')
      .replace(/\?+$/, '')
      .trim();

    // Limit to 25 characters for better display
    if (title.length > 25) {
      title = title.substring(0, 22) + '...';
    }

    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
  };


  const handleToggle = () => {
    setShowLeftPanel((prev) => !prev);
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  const handleSendMessage = async (query) => {
    const message = query || userQuery; // Use query if provided, else use userQuery
    if (!message) return;

    // Ensure message is always a string
    const messageString = typeof message === 'string' ? message : String(message);

    setChatHistory((prev) => [...prev, { sender: 'user', message: messageString }]);
    setIsLoading(true);
    setUserQuery('');

    try {
      const response = await axios.post('/api/chat', { query: messageString }); // Use converted string
      const chatbotResponse = response.data.reply;

      // Ensure the response is a string
      const responseMessage = typeof chatbotResponse === 'string'
        ? chatbotResponse
        : 'Sorry, I received an invalid response. Please try again.';

      setChatHistory((prev) => [
        ...prev,
        { sender: 'chatbot', message: responseMessage },
      ]);
    } catch (err) {
      // Enhanced error logging with fallbacks
      const errorInfo = {
        message: err?.message || 'Unknown error',
        name: err?.name || 'Error',
        status: err?.response?.status || err?.status || 'No status',
        statusText: err?.response?.statusText || err?.statusText || 'No status text',
        data: err?.response?.data || err?.data || 'No response data',
        code: err?.code || 'No error code',
        type: typeof err,
        hasResponse: !!err?.response,
        isAxiosError: err?.isAxiosError || false
      };

      console.error('Chat API error:', errorInfo);
      console.error('Full error object keys:', Object.keys(err || {}));

      setError('Sorry, the chatbot is unavailable. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ClientOnly
      fallback={
        <div className="splash-screen">
          <Image src="/images/login-background.png" alt="VTU Logo" className="splash-logo" width={200} height={200} priority />
          <div className="splash-content">
            <div className="spinner">
              <i className="fas fa-spinner"></i>
            </div>
            <div className="loading-text">Initializing VTU GPT...</div>
          </div>
        </div>
      }
    >
      <div>
        {/* Animate Presence for Smooth Splash Transition */}
        <AnimatePresence>
          {(isInitialLoading && isClient) && ( // Only show splash if still initial loading and client-side
            <motion.div
              className="splash-screen"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.8 }}
            >
              <Image src="/images/login-background.png" alt="VTU Logo" className="splash-logo" width={200} height={200} priority />
              <div className="splash-content">
                {isInitialLoading ? (
                  <>
                    <div className="spinner">
                      <i className="fas fa-spinner"></i>
                    </div>
                    <div className="loading-text">Initializing VTU GPT...</div>
                  </>
                ) : (
                  <div className="welcome-text">Welcome to VTU GPT</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isInitialLoading && isClient && (
          <>
      {/* Overlay */}
      {showLeftPanel && <div className="overlay" onClick={() => setShowLeftPanel(false)}></div>}

      <header className="header">
        <div className="header-title">VTU GPT</div>
        <div className="header-actions">
          {/* Smart Academic Event Calendar Button */}
          <button
            className="calendar-button"
            onClick={() => setShowCalendar(true)}
            title="Academic Event Calendar"
            aria-label="Open Academic Event Calendar"
          >
            <i className="fas fa-calendar-alt" aria-hidden="true"></i>
          </button>
        </div>
        <div className="user-section" ref={userMenuRef}>
          <div
            className="user-info"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={user?.email}
            aria-label={`User menu for ${user?.email}`}
            aria-expanded={showUserMenu}
            role="button"
            tabIndex="0"
          >
            <span className="user-email">{user?.email}</span>
            <i className="fa fa-user-circle user-icon" aria-hidden="true"></i>
            <i className={`fa fa-chevron-${showUserMenu ? 'up' : 'down'} dropdown-icon`} aria-hidden="true"></i>
          </div>
          {showUserMenu && (
            <div className="user-menu" role="menu">
              <div className="user-menu-item user-email-display" role="menuitem">
                <i className="fa fa-envelope" aria-hidden="true"></i>
                <span>{user?.email}</span>
              </div>
              <div className="user-menu-divider"></div>
              <div className="user-menu-item" onClick={() => window.location.href = '/loginpage'} role="menuitem" tabIndex="0">
                <i className="fa fa-user-shield" aria-hidden="true"></i>
                <span>Admin Login</span>
              </div>
              <div className="user-menu-divider"></div>
              <div className="user-menu-item" onClick={handleLogout} role="menuitem" tabIndex="0">
                <i className="fa fa-sign-out-alt" aria-hidden="true"></i>
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="chatbot-container">
        {/* Toggle Button */}
        <button
          className="toggle-left-panel"
          onClick={handleToggle}
          ref={toggleButtonRef} // Reference the toggle button
          aria-label={showLeftPanel ? 'Close left panel' : 'Open left panel'}
        >
          {showLeftPanel ? (
            <i className="fas fa-times" title="Close Panel" aria-hidden="true"></i> // Exit icon
          ) : (
            <i className="fas fa-bars" title="Open Panel" aria-hidden="true"></i> // Menu icon
          )}
        </button>

        {/* Left Panel */}
        <div
          className={`left-panel ${showLeftPanel ? 'show' : 'hide'}`}
          ref={leftPanelRef} // Reference the left panel
          role="navigation"
          aria-label="Recent chats and navigation"
        >
          {/* Logo */}
          <div className="logo">
            <Image
              src="/images/veltech_logo(1).png"
              alt="VTU Logo"
              className="logo-img"
              width={100}
              height={100}
              priority
            />
          </div>

          {/* New Chat Button */}
          <button className="new-chat-btn" onClick={handleNewChat} aria-label="Start a new chat">
            <i className="fas fa-plus" aria-hidden="true"></i> New Chat
          </button>

          {/* Chat Search */}
          <div className="chat-search-bar">
            <label htmlFor="chat-search" className="sr-only">Search chats</label>
            <input
              id="chat-search"
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search recent, pinned, and archived chats"
            />
            <i className="fas fa-search search-icon" aria-hidden="true"></i>
          </div>

          {/* Recent Chats */}
          <div className="recent-chats-section" role="region" aria-label="Recent chats">
            <div className="recent-chats-header">
              <h3>Recent Chats</h3>
              <div className="sync-controls">
                {isSyncing ? (
                  <span className="sync-indicator" title="Syncing chats..." aria-live="polite">
                    <i className="fas fa-sync-alt fa-spin" aria-hidden="true"></i>
                  </span>
                ) : (
                  <button
                    className="manual-sync-btn"
                    onClick={manualSync}
                    title="Sync chats across devices"
                    aria-label="Manually sync chats"
                  >
                    <i className="fas fa-sync-alt" aria-hidden="true"></i>
                  </button>
                )}
                {syncStatus === 'success' && (
                  <span className="sync-success" title="Sync successful" aria-live="polite">
                    <i className="fas fa-check-circle" aria-hidden="true"></i>
                  </span>
                )}
                {syncStatus === 'error' && (
                  <span className="sync-error" title="Sync failed" aria-live="polite">
                    <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                  </span>
                )}
              </div>
            </div>

            {/* Pinned Chats List */}
            {filteredPinnedChats.length > 0 && (
              <div className="pinned-chats-list" role="group" aria-label="Pinned chats">
                <h4>Pinned</h4>
                {filteredPinnedChats.map((chat) => (
                  <div key={chat.id} className={`recent-chat-item ${currentChatId === chat.id ? 'active' : ''}`} role="listitem">
                    <div className="chat-item-content" onClick={() => loadChat(chat)} role="button" tabIndex="0" aria-label={`Load chat: ${chat.title}`}>
                      <div className="chat-title">{chat.title}</div>
                      <div className="chat-timestamp" suppressHydrationWarning={true}>
                        {new Date(chat.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="chat-item-actions">
                      <button
                        className="chat-action-btn"
                        onClick={(e) => { e.stopPropagation(); togglePinChat(chat.id); }}
                        title="Unpin chat"
                        aria-label={`Unpin chat: ${chat.title}`}
                      >
                        <i className="fas fa-thumbtack pinned" aria-hidden="true"></i>
                      </button>
                      <button
                        className="chat-action-btn"
                        onClick={(e) => { e.stopPropagation(); toggleArchiveChat(chat.id); }}
                        title="Archive chat"
                        aria-label={`Archive chat: ${chat.title}`}
                      >
                        <i className="fas fa-archive" aria-hidden="true"></i>
                      </button>
                      <button
                        className="chat-action-btn delete-chat-btn"
                        onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                        title="Delete chat"
                        aria-label={`Delete chat: ${chat.title}`}
                      >
                        <i className="fas fa-trash" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Regular Recent Chats List */}
            {filteredRecentChats.length > 0 ? (
              <div className="recent-chats-list" role="group" aria-label="Other recent chats">
                {filteredPinnedChats.length > 0 && <h4>Recent</h4>}
                {filteredRecentChats.map((chat) => (
                  <div key={chat.id} className={`recent-chat-item ${currentChatId === chat.id ? 'active' : ''}`} role="listitem">
                    <div className="chat-item-content" onClick={() => loadChat(chat)} role="button" tabIndex="0" aria-label={`Load chat: ${chat.title}`}>
                      <div className="chat-title">{chat.title}</div>
                      <div className="chat-timestamp" suppressHydrationWarning={true}>
                        {new Date(chat.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="chat-item-actions">
                      <button
                        className="chat-action-btn"
                        onClick={(e) => { e.stopPropagation(); togglePinChat(chat.id); }}
                        title="Pin chat"
                        aria-label={`Pin chat: ${chat.title}`}
                      >
                        <i className="fas fa-thumbtack" aria-hidden="true"></i>
                      </button>
                      <button
                        className="chat-action-btn"
                        onClick={(e) => { e.stopPropagation(); toggleArchiveChat(chat.id); }}
                        title="Archive chat"
                        aria-label={`Archive chat: ${chat.title}`}
                      >
                        <i className="fas fa-archive" aria-hidden="true"></i>
                      </button>
                      <button
                        className="chat-action-btn delete-chat-btn"
                        onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                        title="Delete chat"
                        aria-label={`Delete chat: ${chat.title}`}
                      >
                        <i className="fas fa-trash" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !searchQuery && filteredPinnedChats.length === 0 && (
                <div className="no-chats">
                  <p>No recent chats yet.</p>
                </div>
              )
            )}

            {/* Archived Chats List */}
            {filteredArchivedChats.length > 0 && (
              <div className="archived-chats-list" role="group" aria-label="Archived chats">
                <h4>Archived</h4>
                {filteredArchivedChats.map((chat) => (
                  <div key={chat.id} className={`recent-chat-item ${currentChatId === chat.id ? 'active' : ''}`} role="listitem">
                    <div className="chat-item-content" onClick={() => loadChat(chat)} role="button" tabIndex="0" aria-label={`Load chat: ${chat.title}`}>
                      <div className="chat-title">{chat.title}</div>
                      <div className="chat-timestamp" suppressHydrationWarning={true}>
                        {new Date(chat.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="chat-item-actions">
                      <button
                        className="chat-action-btn"
                        onClick={(e) => { e.stopPropagation(); toggleArchiveChat(chat.id); }}
                        title="Unarchive chat"
                        aria-label={`Unarchive chat: ${chat.title}`}
                      >
                        <i className="fas fa-box-open" aria-hidden="true"></i>
                      </button>
                      <button
                        className="chat-action-btn delete-chat-btn"
                        onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                        title="Delete chat"
                        aria-label={`Delete chat: ${chat.title}`}
                      >
                        <i className="fas fa-trash" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Section - Social Links Only */}
          <div className="left-panel-bottom">
            {/* Social Media Links */}
            <div className="social-media-links" role="region" aria-label="Follow us on social media">
              <h3>Follow Us</h3>
              <div className="social-icons">
                <a
                  href="https://facebook.com/veltechuniversityofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                  aria-label="Follow us on Facebook"
                >
                  <i className="fa-brands fa-facebook-f" aria-hidden="true"></i>
                </a>
                <a
                  href="https://twitter.com/veltechofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Twitter"
                  aria-label="Follow us on Twitter"
                >
                    <i className="fa-brands fa-x-twitter" aria-hidden="true"></i>
                </a>
                <a
                  href="https://www.linkedin.com/in/veltechuniversityofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="LinkedIn"
                  aria-label="Follow us on LinkedIn"
                >
                    <i className="fa-brands fa-linkedin-in" aria-hidden="true"></i>
                </a>
                <a
                  href="https://instagram.com/veltechuniversityofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                  aria-label="Follow us on Instagram"
                >
                  <i className="fa-brands fa-instagram" aria-hidden="true"></i>
                </a>
                <a
                  href="https://www.youtube.com/@veltechofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="YouTube"
                  aria-label="Follow us on YouTube"
                >
                  <i className="fa-brands fa-youtube" aria-hidden="true"></i>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot Panel */}
        <div className="chatbot-panel" role="main" aria-label="Chatbot conversation area">
          {chatHistory.length === 0 ? (
            <div className="welcome-container">
              <div className="welcome-header">
                <div className="welcome-icon" aria-hidden="true">
                  <i className="fas fa-robot"></i>
                </div>
                <h2>How can I help you today?</h2>
                <p>I&apos;m VTU GPT, your AI assistant for Veltech University. Ask me anything about VTU!</p>
              </div>

              <div className="suggestion-cards" role="group" aria-label="Suggested questions">
                <div className="suggestion-card" onClick={() => handleSendMessage('Tell me about VTU')} role="button" tabIndex="0" aria-label="Ask about VTU">
                  <div className="suggestion-icon" aria-hidden="true">
                    <i className="fas fa-university"></i>
                  </div>
                  <h4>About VTU</h4>
                  <p>Learn about Veltech University&apos;s history and mission</p>
                </div>

                <div className="suggestion-card" onClick={() => handleSendMessage('What courses are offered at VTU?')} role="button" tabIndex="0" aria-label="Ask about courses offered at VTU">
                  <div className="suggestion-icon" aria-hidden="true">
                    <i className="fas fa-graduation-cap"></i>
                  </div>
                  <h4>Courses & Programs</h4>
                  <p>Explore available academic programs and courses</p>
                </div>

                <div className="suggestion-card" onClick={() => handleSendMessage('VTU admission process')} role="button" tabIndex="0" aria-label="Ask about VTU admission process">
                  <div className="suggestion-icon" aria-hidden="true">
                    <i className="fas fa-file-alt"></i>
                  </div>
                  <h4>Admissions</h4>
                  <p>Get information about admission requirements</p>
                </div>

                <div className="suggestion-card" onClick={() => handleSendMessage('VTU campus facilities')} role="button" tabIndex="0" aria-label="Ask about VTU campus facilities">
                  <div className="suggestion-icon" aria-hidden="true">
                    <i className="fas fa-building"></i>
                  </div>
                  <h4>Campus & Facilities</h4>
                  <p>Discover our campus infrastructure and facilities</p>
                </div>

                <div className="suggestion-card" onClick={() => handleSendMessage('VTU achievements and rankings')} role="button" tabIndex="0" aria-label="Ask about VTU achievements and rankings">
                  <div className="suggestion-icon" aria-hidden="true">
                    <i className="fas fa-trophy"></i>
                  </div>
                  <h4>Achievements</h4>
                  <p>Learn about VTU&apos;s accomplishments and rankings</p>
                </div>

                <div className="suggestion-card" onClick={() => handleSendMessage('VTU contact information')} role="button" tabIndex="0" aria-label="Ask about VTU contact information">
                  <div className="suggestion-icon" aria-hidden="true">
                    <i className="fas fa-phone"></i>
                  </div>
                  <h4>Contact Info</h4>
                  <p>Get contact details and location information</p>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={chatContainerRef}
              className="chat-messages-container"
              role="log"
              aria-live="polite"
            >
              {chatHistory.map((msg, index) => {
                // Ensure message is always a string for rendering
                const displayMessage = typeof msg.message === 'string'
                  ? msg.message
                  : (msg.message ? String(msg.message) : 'Invalid message format');

                return (
                  <div
                    key={index}
                    className={`chat-message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}
                    role="group"
                    aria-label={`${msg.sender} message`}
                  >
                    {msg.sender === 'chatbot' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ ...props }) => <p className="whitespace-pre-wrap leading-relaxed" {...props} />,
                        }}
                      >
                        {displayMessage}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{displayMessage}</p>
                    )}
                    {msg.sender === 'chatbot' && (
                      <div className="feedback-buttons" role="group" aria-label="Chatbot response feedback">
                        <button className="feedback-btn" title="Helpful" aria-label="Mark response as helpful">
                          <i className="fas fa-thumbs-up" aria-hidden="true"></i> Helpful
                        </button>
                        <button className="feedback-btn" title="Not Helpful" aria-label="Mark response as not helpful">
                          <i className="fas fa-thumbs-down" aria-hidden="true"></i> Not Helpful
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && chatHistory.length > 0 && ( // Show loading spinner when sending message
                <div className="chat-message bot-message loading-message" role="status" aria-live="assertive">
                  <div className="spinner">
                    <i className="fas fa-spinner fa-spin"></i>
                  </div>
                  <span className="loading-text">Thinking...</span>
                </div>
              )}
            </div>
          )}

          <div className="input-area">
            {error && <p className="error" role="alert">{error}</p>}
            <label htmlFor="user-query" className="sr-only">Your question</label>
            <input
              id="user-query"
              type="text"
              value={userQuery}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault(); // Prevents line break in input
                  handleSendMessage();
                }
              }}
              placeholder="Ask a Question"
              aria-label="Type your question here"
              disabled={isLoading} // Disable input while loading
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
            />
            <button className="input-area-button px-4 py-3 rounded-xl shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200" onClick={()=>handleSendMessage()} aria-label="Send message" disabled={isLoading}>
              <i className="fa fa-paper-plane" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Smart Academic Event Calendar */}
      <EventCalendar
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        aria-label="Academic Event Calendar"
      />
          </>
        )}
      </div>
    </ClientOnly>
  );
};

export default Chatbot;
