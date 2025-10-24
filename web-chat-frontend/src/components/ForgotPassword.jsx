import React, { useState } from 'react';
import './ForgotPassword.css';

const ForgotPassword = ({ onBackToLogin, onShowResetPassword }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <h2>Forgot Password?</h2>
          <p>Enter your email address and we'll send you a password reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <button 
            type="submit" 
            className="forgot-password-btn"
            disabled={isLoading || !email}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="forgot-password-footer">
          <button 
            type="button" 
            className="back-to-login-btn"
            onClick={onBackToLogin}
          >
            Back to Login
          </button>
          
          {message && (
            <div className="email-instructions">
              <p>📧 Check your email for the password reset link!</p>
              <p>If you don't see it, check your spam folder.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
