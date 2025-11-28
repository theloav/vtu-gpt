// pages/verify-email.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import '@fortawesome/fontawesome-free/css/all.css';

const VerifyEmailPage = () => {
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  const { verifyEmail, resendVerification } = useAuth();
  const router = useRouter();
  const { token } = router.query;

  useEffect(() => {
    if (token) {
      handleVerification(token);
    }
  }, [token]);

  const handleVerification = async (verificationToken) => {
    try {
      const result = await verifyEmail(verificationToken);
      if (result.success) {
        setStatus('success');
        setMessage(result.message);
      } else {
        setStatus('error');
        setMessage(result.error);
      }
    } catch (error) {
      setStatus('error');
      setMessage('An unexpected error occurred during verification');
    }
  };

  const handleResendVerification = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage('Please enter your email address');
      return;
    }

    setResending(true);
    try {
      const result = await resendVerification(email);
      if (result.success) {
        setMessage(result.message);
      } else {
        setMessage(result.error);
      }
    } catch (error) {
      setMessage('Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="verify-page">
      <style jsx>{`
        .verify-page {
          font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .verify-container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 500px;
          text-align: center;
        }

        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .icon.verifying {
          color: #667eea;
          animation: spin 2s linear infinite;
        }

        .icon.success {
          color: #28a745;
        }

        .icon.error {
          color: #dc3545;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        h1 {
          color: #333;
          margin-bottom: 20px;
        }

        .message {
          color: #666;
          margin-bottom: 30px;
          line-height: 1.6;
        }

        .resend-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin-bottom: 20px;
        }

        .resend-section h3 {
          color: #333;
          margin-bottom: 15px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 5px;
          font-size: 16px;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          margin: 5px;
          transition: transform 0.2s ease;
        }

        .btn:hover {
          transform: translateY(-2px);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .actions {
          margin-top: 30px;
        }
      `}</style>

      <div className="verify-container">
        {status === 'verifying' && (
          <>
            <div className="icon verifying">
              <i className="fas fa-spinner"></i>
            </div>
            <h1>Verifying Your Email</h1>
            <div className="message">
              Please wait while we verify your email address...
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="icon success">
              <i className="fas fa-check-circle"></i>
            </div>
            <h1>Email Verified Successfully!</h1>
            <div className="message">
              {message}
            </div>
            <div className="actions">
              <button
                className="btn btn-primary"
                onClick={() => window.location.href = '/auth'}
              >
                Go to Login
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="icon error">
              <i className="fas fa-times-circle"></i>
            </div>
            <h1>Verification Failed</h1>
            <div className="message">
              {message}
            </div>

            <div className="resend-section">
              <h3>Resend Verification Email</h3>
              <form onSubmit={handleResendVerification}>
                <div className="form-group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resending}
                >
                  {resending ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Sending...
                    </>
                  ) : (
                    'Resend Verification Email'
                  )}
                </button>
              </form>
            </div>

            <div className="actions">
              <button
                className="btn btn-secondary"
                onClick={() => window.location.href = '/auth'}
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
