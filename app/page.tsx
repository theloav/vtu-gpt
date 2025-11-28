// app/page.tsx
'use client';

import { FC } from 'react';
import dynamic from 'next/dynamic';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

// Dynamic import to prevent SSR issues
const Chatbot = dynamic(() => import('../src/components/chatbot.js'), {
  ssr: false,
  loading: () => (
    <div className="loading-container">
      <div className="loading-content">
        <img src="/images/login-background.png" alt="VTU Logo" className="splash-logo loading-logo" />
        <div className="spinner">
          <i className="fas fa-spinner"></i>
        </div>
        <div className="loading-text">Loading VTU GPT...</div>
      </div>
    </div>
  )
});

const Page: FC = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <Chatbot />
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default Page;
