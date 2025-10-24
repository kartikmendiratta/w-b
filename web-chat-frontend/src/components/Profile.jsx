import React, { useState } from 'react';
import { Button, Card, Typography, Space, Modal, message, Divider, Avatar } from 'antd';
import { UserOutlined, DeleteOutlined, ArrowLeftOutlined, MailOutlined, CalendarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Profile = ({ user, onLogout, onBack }) => {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        message.success('Account deleted successfully');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onLogout();
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      message.error('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  const getAccountAge = () => {
    if (user.createdAt) {
      const created = new Date(user.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - created);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} days ago`;
    }
    return 'Unknown';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '24px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            style={{ marginBottom: '16px' }}
          >
            Back
          </Button>
          <Title level={2}>Profile</Title>
        </div>

        <Card>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
              <Avatar 
                size={80} 
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1890ff' }}
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Title level={3} style={{ margin: '0 0 8px 0' }}>{user.username}</Title>
                <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MailOutlined /> {user.email}
                </Text>
              </div>
            </div>

            <Divider />

            <div style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Account Created:</Text>
                <br />
                <Text>
                  <CalendarOutlined /> {getAccountAge()}
                </Text>
              </div>
              
              {user.topics && user.topics.length > 0 && (
                <div>
                  <Text strong>Interests:</Text>
                  <div style={{ marginTop: '8px' }}>
                    {user.topics.map((topic, index) => (
                      <span 
                        key={index} 
                        style={{ 
                          display: 'inline-block',
                          backgroundColor: '#f0f9ff',
                          color: '#0369a1',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          margin: '2px 4px 2px 0'
                        }}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Divider />

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                onClick={onLogout}
                style={{ width: '100%', height: '40px' }}
              >
                Logout
              </Button>
              
              <Button 
                danger
                icon={<DeleteOutlined />}
                onClick={() => setDeleteModalVisible(true)}
                style={{ width: '100%', height: '40px' }}
              >
                Delete Account
              </Button>
            </Space>
          </div>
        </Card>
      </div>

      <Modal
        title="Delete Account"
        open={deleteModalVisible}
        onOk={handleDeleteAccount}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Delete Account"
        cancelText="Cancel"
        okButtonProps={{ 
          danger: true, 
          loading: deleting 
        }}
      >
        <div>
          <Text strong>⚠️ Warning: This action cannot be undone!</Text>
          <br /><br />
          <Text>
            Deleting your account will permanently remove:
          </Text>
          <ul>
            <li>Your profile and personal information</li>
            <li>All your chat history</li>
            <li>All rooms you created</li>
            <li>Your account data from our servers</li>
          </ul>
          <Text strong>
            Are you sure you want to delete your account?
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
