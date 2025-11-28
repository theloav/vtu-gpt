import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '../src/firebase'; // Ensure correct import path for the auth object
import '@fortawesome/fontawesome-free/css/all.css';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();

  useEffect(() => {
    // Prevent going back to the previous page
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => {
      router.push('/'); // Redirect to home when back button is pressed
    };
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') {
      setEmail(value);
    } else if (name === 'password') {
      setPassword(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/admindashboard');
      } catch (err) {
        setError('Invalid credentials.');
      }
    }
  };

  return (
    <div className="auth-page">
      <style jsx>{`
        .auth-page {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .auth-container {
          background: rgba(255, 255, 255, 0.95);
          padding: 2.5rem;
          border-radius: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          width: 100%;
          max-width: 420px;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .logo-section {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-section h1 {
          color: #1e293b;
          margin: 0.75rem 0;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.025em;
        }

        .logo-section p {
          color: #64748b;
          margin: 0;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #374151;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .form-group input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.75rem;
          font-size: 1rem;
          transition: all 0.2s ease;
          background: #f9fafb;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background: white;
        }

        .submit-btn {
          width: 100%;
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .error {
          background: #fef2f2;
          color: #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          text-align: center;
          font-size: 0.875rem;
          border: 1px solid #fecaca;
        }

        .back-link {
          text-align: center;
          margin-top: 1.5rem;
        }

        .back-link a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          transition: all 0.2s ease;
        }

        .back-link a:hover {
          background: rgba(59, 130, 246, 0.1);
        }
      `}</style>

      <div className="auth-container">
        <div className="logo-section">
          <h1>VTU GPT</h1>
          <p>Admin Portal</p>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              placeholder="admin@veltech.edu.in"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="submit-btn">
            Admin Login
          </button>
        </form>

        <div className="back-link">
          <a href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }}>
            <i className="fas fa-arrow-left"></i> Back to Home
          </a>
        </div>
      </div>
    </div>

  );
};

export default AuthPage;
