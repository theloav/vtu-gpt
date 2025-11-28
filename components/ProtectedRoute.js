// components/ProtectedRoute.js
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Use window.location for navigation to pages directory
      window.location.href = '/auth';
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <img src="/images/login-background.png" alt="VTU Logo" className="splash-logo loading-logo" />
          <div className="spinner">
            <i className="fas fa-spinner"></i>
          </div>
          <div className="loading-text">Authenticating...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Router will redirect
  }

  return children;
};

export default ProtectedRoute;
