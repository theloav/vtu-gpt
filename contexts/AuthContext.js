// contexts/AuthContext.js
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { SESSION_TIMEOUT_MS } from '../lib/config.js';

const AuthContext = createContext();

// Throttle function to limit how often a function can be called
const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();

    // Set up session expiration check
    const checkSessionExpiration = () => {
      const expirationTime = localStorage.getItem('tokenExpiration');
      if (expirationTime && Date.now() > parseInt(expirationTime)) {
        console.log('Session expired, logging out...');
        logout();
      }
    };

    // Check session every minute
    const sessionInterval = setInterval(checkSessionExpiration, 60000);

    return () => clearInterval(sessionInterval);
  }, []);

  // Extend session on user activity
  useEffect(() => {
    const extendSession = () => {
      const token = localStorage.getItem('token');
      if (token && user) {
        const expirationTime = Date.now() + SESSION_TIMEOUT_MS;
        localStorage.setItem('tokenExpiration', expirationTime.toString());
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const throttledExtendSession = throttle(extendSession, 60000); // Extend at most once per minute

    events.forEach(event => {
      document.addEventListener(event, throttledExtendSession, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledExtendSession, true);
      });
    };
  }, [user]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Verify token with backend
        const response = await axios.get('/api/auth/me');
        setUser(response.data.user);

        // Set token expiration check
        const expirationTime = Date.now() + SESSION_TIMEOUT_MS;
        localStorage.setItem('tokenExpiration', expirationTime.toString());
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiration');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      // Set token expiration
      const expirationTime = Date.now() + SESSION_TIMEOUT_MS;
      localStorage.setItem('tokenExpiration', expirationTime.toString());

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
        needsVerification: error.response?.data?.needsVerification
      };
    }
  };

  const register = async (email, password, confirmPassword) => {
    try {
      const response = await axios.post('/api/auth/register', {
        email,
        password,
        confirmPassword
      });

      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiration');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await axios.post('/api/auth/verify-email', { token });
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Verification failed'
      };
    }
  };

  const resendVerification = async (email) => {
    try {
      const response = await axios.post('/api/auth/resend-verification', { email });
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to resend verification'
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    verifyEmail,
    resendVerification,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
