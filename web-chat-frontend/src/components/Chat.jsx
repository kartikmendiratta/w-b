import React, { useState } from 'react';
import { Button, Input, Card, Typography, Space, Tag, Dropdown, Menu, message } from 'antd';
import { VideoCameraOutlined, MoreOutlined, CloseOutlined, SendOutlined, SearchOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import VideoCall from './VideoCall';
import Navbar from './Navbar';
import { useSocket, useRandomChat, useMessages, useVideoCall } from '../hooks';
import './Chat.css';


const Chat = ({ user, onLogout, onShowRooms, onShowProfile }) => {
  const [inputMessage, setInputMessage] = useState('');
  
  // Custom hooks
  const { socket, isConnected } = useSocket(user);
  const {
    currentPartner,
    isSearching,
    selectedTopics,
    showTopicSelector,
    availableTopics,
    startRandomChat,
    handleTopicSelection,
    endRandomChat,
    toggleTopic,
    setShowTopicSelector
  } = useRandomChat(socket, user);
  const {
    messages,
    typingUsers,
    isTyping,
    messagesEndRef,
    handleTyping,
    handleStopTyping,
    clearMessages
  } = useMessages(socket, user, currentPartner);
  const {
    isVideoCallActive,
    startVideoCall,
    endVideoCall
  } = useVideoCall(socket, currentPartner);


  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket || !isConnected || !currentPartner) return;

    const messageData = {
      content: inputMessage.trim()
    };

    socket.emit('send_message', messageData);
    setInputMessage('');
    handleStopTyping();
  };

  // Chat actions functions
  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear all messages? This action cannot be undone.')) {
      clearMessages();
      message.success('Chat history cleared');
    }
  };

  const handleDownloadChat = () => {
    const chatData = {
      partner: currentPartner?.username,
      messages: messages,
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-${currentPartner?.username}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('Chat downloaded successfully');
  };

  const handlePartnerInfo = () => {
    message.info(`Partner: ${currentPartner?.username}\nStatus: Online\nConnected: ${new Date().toLocaleString()}`);
  };

  const handleBlockUser = () => {
    if (window.confirm(`Are you sure you want to block ${currentPartner?.username}? You won't be able to receive messages from them.`)) {
      endRandomChat();
      message.success(`${currentPartner?.username} has been blocked`);
    }
  };

  const chatMenu = (
    <Menu>
      <Menu.Item key="clear" onClick={handleClearChat}>
        Clear Chat History
      </Menu.Item>
      <Menu.Item key="download" onClick={handleDownloadChat}>
        Download Chat
      </Menu.Item>
      <Menu.Item key="info" onClick={handlePartnerInfo}>
        Partner Info
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="block" danger onClick={handleBlockUser}>
        Block User
      </Menu.Item>
    </Menu>
  );


  return (
    <div className="chat-container">
      {/* Navbar */}
      <Navbar 
        user={user}
        isConnected={isConnected}
        onShowRooms={onShowRooms}
        onLogout={onLogout}
        onShowProfile={onShowProfile}
      />

      {/* Main Content */}
      <div className="chat-main">
        {isSearching ? (
          <div className="searching-container">
            <Card className="searching-card">
              <div className="searching-content">
                <div className="searching-spinner">
                  <div className="loading-spinner"></div>
                </div>
                <Typography.Title level={3} className="searching-title">Finding a chat partner...</Typography.Title>
                <Typography.Text className="searching-text">Please wait while we match you with someone interesting!</Typography.Text>
                <Button 
                  onClick={endRandomChat}
                  className="cancel-search-btn"
                >
                  Cancel Search
                </Button>
              </div>
            </Card>
          </div>
        ) : !currentPartner ? (
          <div className="welcome-container">
            <Card className="welcome-card">
              <div className="welcome-content">
                <div className="welcome-icon">
                  <div className="chat-icon">💬</div>
                </div>
                <Typography.Title level={2} className="welcome-title">Welcome to Random Chat!</Typography.Title>
                <Typography.Text className="welcome-description">
                  Connect with random people from around the world. Share your interests, 
                  have meaningful conversations, and make new friends!
                </Typography.Text>
                
                <div className="topic-selection-section">
                  <Button 
                    onClick={() => setShowTopicSelector(!showTopicSelector)}
                    className="topic-toggle-btn"
                  >
                    {showTopicSelector ? 'Hide' : 'Select'} Topics of Interest
                  </Button>
                  
                  {showTopicSelector && (
                    <Card className="topic-selector">
                      <Typography.Text strong className="topic-selector-label">Choose topics you're interested in:</Typography.Text>
                      <div className="topic-categories">
                        <div className="topic-row">
                          {availableTopics.map(topic => (
                            <Tag.CheckableTag
                              key={topic}
                              checked={selectedTopics.includes(topic)}
                              onChange={() => toggleTopic(topic)}
                              className="topic-chip"
                            >
                              {topic}
                            </Tag.CheckableTag>
                          ))}
                        </div>
                      </div>
                      
                      {selectedTopics.length > 0 && (
                        <div className="selected-topics-summary">
                          <Typography.Text className="summary-text">
                            <strong>Selected topics:</strong> {selectedTopics.join(', ')}
                          </Typography.Text>
                        </div>
                      )}
                      
                      <div className="skip-topics-info">
                        <Typography.Text className="skip-text">
                          You can skip topic selection to chat with anyone randomly.
                        </Typography.Text>
                      </div>
                    </Card>
                  )}
                </div>
                
                <Button 
                  type="primary"
                  size="large"
                  icon={<SearchOutlined />}
                  onClick={startRandomChat}
                  disabled={!isConnected}
                  className="find-chat-btn"
                >
                  Find Random Chat
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="chat-split-container">
            {/* Video Call Section */}
            {isVideoCallActive && (
              <div className="video-section">
                <Card className="video-card" title={
                  <Space>
                    <VideoCameraOutlined />
                    Video Call with {currentPartner.username}
                  </Space>
                } extra={
                  <Button 
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={endVideoCall}
                    title="Close Video Call"
                  />
                }>
                  <VideoCall 
                    socket={socket}
                    currentPartner={currentPartner}
                    user={user}
                    onEndCall={endVideoCall}
                  />
                </Card>
              </div>
            )}

            {/* Messages Section */}
            <Card className="messages-section">
              <div className="chat-partner-header">
                <Space>
                  <div className="partner-avatar">
                    {currentPartner.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="partner-details">
                    <Typography.Text strong className="partner-name">{currentPartner.username}</Typography.Text>
                    <Typography.Text type="success" className="partner-status">Online</Typography.Text>
                  </div>
                </Space>
                <Space>
                  <Button 
                    icon={<VideoCameraOutlined />}
                    onClick={startVideoCall}
                    title="Start Video Call"
                  />
                  
                  <Dropdown overlay={chatMenu} trigger={['click']}>
                    <Button 
                      icon={<MoreOutlined />}
                      title="Chat Actions"
                    />
                  </Dropdown>
                  
                  <Button 
                    danger
                    icon={<CloseOutlined />}
                    onClick={endRandomChat}
                    title="End Chat"
                  >
                    End Chat
                  </Button>
                </Space>
              </div>

              {/* Messages Area */}
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="empty-messages">
                    <div className="empty-icon">💬</div>
                    <Typography.Text>No messages yet. Start a conversation!</Typography.Text>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`message ${message.user.id === user.id ? 'own-message' : 'other-message'}`}
                    >
                      <div className="message-bubble">
                        <div className="message-content">
                          {message.content}
                        </div>
                        <div className="message-time">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Typing Indicators */}
                {typingUsers.length > 0 && (
                  <div className="typing-indicator">
                    <div className="typing-bubble">
                      <Typography.Text className="typing-text">
                        {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </Typography.Text>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="message-input-container">
                <Input.Group compact>
                  <Input
                    className="message-input"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onFocus={handleTyping}
                    onBlur={handleStopTyping}
                    placeholder="Type a message..."
                    onPressEnter={handleSendMessage}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || !isConnected}
                    className="send-btn"
                  >
                    Send
                  </Button>
                </Input.Group>
              </div>
            </Card>
          </div>
        )}
      </div>

    </div>
  );
};

export default Chat;