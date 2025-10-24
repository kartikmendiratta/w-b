import React, { useState } from 'react';
import { Button, Input, Checkbox, Card, Typography, Space, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import './Login.css';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    topics: []
  });

  const availableTopics = [
    { value: 'webdev', label: 'Web Development' },
    { value: 'ml', label: 'Machine Learning' },
    { value: 'ai', label: 'Artificial Intelligence' },
    { value: 'data-science', label: 'Data Science' },
    { value: 'mobile-dev', label: 'Mobile Development' },
    { value: 'devops', label: 'DevOps' },
    { value: 'cybersecurity', label: 'Cybersecurity' },
    { value: 'blockchain', label: 'Blockchain' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'design', label: 'Design' },
    { value: 'startup', label: 'Startup' },
    { value: 'career', label: 'Career' },
    { value: 'general', label: 'General' },
    { value: 'programming', label: 'Programming' },
    { value: 'databases', label: 'Databases' },
    { value: 'cloud', label: 'Cloud' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTopicChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.includes(value) 
        ? prev.topics.filter(topic => topic !== value)
        : [...prev.topics, value]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const url = isLogin ? 'http://localhost:5000/api/auth/login' : 'http://localhost:5000/api/auth/register';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
        alert(isLogin ? 'Login successful!' : 'Registration successful!');
      } else {
        alert(data.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
  }

  if (showResetPassword) {
    return <ResetPassword token={resetToken} onBackToLogin={() => setShowResetPassword(false)} />;
  }

  return (
    <div className="login-container">
      <Card className="login-card" >
        <div className="login-header">
          <div className="login-icon">
            <img 
              src="/webchat-logo.svg" 
              alt="WebChat" 
              className="login-logo"
            />
          </div>
          <Typography.Title level={2} className="login-title">WebChat</Typography.Title>
          <Typography.Text className="login-subtitle">
            {isLogin ? 'Welcome back!' : 'Join the conversation!'}
          </Typography.Text>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {!isLogin && (
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                size="large"
              />
            )}

            <Input
              prefix={<MailOutlined />}
              type="email"
              placeholder="Enter your email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              size="large"
            />

            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              size="large"
            />

            {!isLogin && (
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm your password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                size="large"
              />
            )}

            {!isLogin && (
              <div className="topics-section">
                <Typography.Text strong>Interests (Select multiple)</Typography.Text>
                <div className="topics-grid">
                  {availableTopics.map(topic => (
                    <Checkbox
                      key={topic.value}
                      value={topic.value}
                      checked={formData.topics.includes(topic.value)}
                      onChange={handleTopicChange}
                    >
                      {topic.label}
                    </Checkbox>
                  ))}
                </div>
              </div>
            )}

            <Button 
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              className="submit-btn"
            >
              {isLogin ? 'Login' : 'Register'}
            </Button>
          </Space>
        </form>

        <Divider />
        
        <div className="login-footer">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button 
              type="link"
              onClick={() => setIsLogin(!isLogin)}
              className="toggle-btn"
            >
              {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
            </Button>
            
            {isLogin && (
              <Button 
                type="link"
                onClick={() => setShowForgotPassword(true)}
                className="forgot-btn"
              >
                Forgot Password?
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Login;