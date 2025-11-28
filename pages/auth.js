// pages/auth.js
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '@fortawesome/fontawesome-free/css/all.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { login, register, isAuthenticated, loading: authLoading } = useAuth();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      window.location.replace('/');
    }
  }, [isAuthenticated, authLoading]);

  // Prevent back navigation to this page when authenticated
  useEffect(() => {
    const handlePopState = () => {
      if (isAuthenticated) {
        window.location.replace('/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="auth-page">
        <style jsx>{`
          .auth-page {
            font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .loading-content {
            text-align: center;
            color: white;
          }
          .spinner {
            font-size: 48px;
            animation: spin 2s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div className="loading-content">
          <div className="spinner">
            <i className="fas fa-spinner"></i>
          </div>
          <div>Checking authentication...</div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          window.location.replace('/');
        } else {
          setError(result.error);
          if (result.needsVerification) {
            setMessage('Please check your email and verify your account before logging in.');
          }
        }
      } else {
        const result = await register(email, password, confirmPassword);
        if (result.success) {
          setMessage(result.message);
          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
        } else {
          setError(result.error);
        }
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <style jsx>{`
        .auth-page {
          font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .auth-container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
        }

        .logo-section {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-section h1 {
          color: #333;
          margin: 10px 0;
          font-size: 28px;
        }

        .logo-section p {
          color: #666;
          margin: 0;
        }

        .auth-tabs {
          display: flex;
          margin-bottom: 30px;
          border-bottom: 1px solid #eee;
        }

        .tab {
          flex: 1;
          padding: 15px;
          text-align: center;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .tab.active {
          border-bottom-color: #667eea;
          color: #667eea;
          font-weight: bold;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          color: #333;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 5px;
          font-size: 16px;
          transition: border-color 0.3s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .submit-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .error {
          background: #fee;
          color: #c33;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 20px;
          text-align: center;
        }

        .message {
          background: #efe;
          color: #363;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 20px;
          text-align: center;
        }

        .back-link {
          text-align: center;
          margin-top: 20px;
        }

        .back-link a {
          color: #667eea;
          text-decoration: none;
        }

        .back-link a:hover {
          text-decoration: underline;
        }

        .admin-link {
          text-align: center;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }

        .admin-link a {
          color: #6c757d;
          text-decoration: none;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          transition: all 0.3s ease;
        }

        .admin-link a:hover {
          background-color: #f8f9fa;
          color: #495057;
          text-decoration: none;
        }

        .domain-info {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          text-align: center;
          font-size: 14px;
          color: #666;
        }
      `}</style>

      <div className="auth-container">
        <div className="logo-section">
          <h1>VTU GPT</h1>
          <p>Your AI Assistant for VTU</p>
        </div>

        <div className="auth-tabs">
          <div
            className={`tab ${isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(true);
              setError('');
              setMessage('');
            }}
          >
            Login
          </div>
          <div
            className={`tab ${!isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(false);
              setError('');
              setMessage('');
            }}
          >
            Sign Up
          </div>
        </div>

        {!isLogin && (
          <div className="domain-info">
            <i className="fas fa-info-circle"></i> Only @veltech.edu.in email addresses are allowed
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {message && <div className="message">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.name@veltech.edu.in"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {isLogin ? ' Logging in...' : ' Creating Account...'}
              </>
            ) : (
              isLogin ? 'Login' : 'Create Account'
            )}
          </button>
        </form>

        <div className="back-link">
          <a href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }}>
            <i className="fas fa-arrow-left"></i> Back to Home
          </a>
        </div>

        <div className="admin-link">
          <a href="/loginpage" onClick={(e) => { e.preventDefault(); window.location.href = '/loginpage'; }}>
            <i className="fas fa-user-shield"></i> Admin Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
