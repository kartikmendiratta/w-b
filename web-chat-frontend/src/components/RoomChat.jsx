import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, Typography, Space, Tag, message, Spin } from 'antd';
import { ArrowLeftOutlined, LogoutOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import io from 'socket.io-client';
import './RoomChat.css';

const RoomChat = ({ user, room, onLeaveRoom }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      onLeaveRoom();
      return;
    }

    // Initialize socket connection
    const newSocket = io('http://localhost:5000', {
      auth: { token: token },
      forceNew: true // Force new connection to avoid conflicts
    });
    setSocket(newSocket);

    // Ensure loading is cleared after connection
    const connectionTimeout = setTimeout(() => {
      console.log('Connection timeout - clearing loading state');
      setLoading(false);
    }, 5000);

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server with socket ID:', newSocket.id);
      
      // Join room immediately after connection
      console.log('Joining room after connection:', room._id);
      newSocket.emit('join_room', { roomId: room._id });
      
      // Load existing messages
      console.log('Requesting room messages for:', room._id);
      newSocket.emit('get_room_messages', { roomId: room._id });
    });

    // Reconnect event
    newSocket.on('reconnect', () => {
      console.log('Reconnected to server, rejoining room:', room._id);
      setIsConnected(true);
      newSocket.emit('join_room', { roomId: room._id });
      newSocket.emit('get_room_messages', { roomId: room._id });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      if (error.message.includes('Authentication error')) {
        onLeaveRoom();
      }
    });

    // Debug: Log all socket events
    newSocket.onAny((eventName, ...args) => {
      console.log('Socket event received:', eventName, args);
      if (eventName === 'new_room_message') {
        console.log('NEW ROOM MESSAGE EVENT RECEIVED!', args);
        console.log('Current socket connected:', newSocket.connected);
        console.log('Current socket ID:', newSocket.id);
      }
    });

    // Room events
    newSocket.on('user_joined_room', (data) => {
      setRoomUsers(prev => [...prev, data.user]);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${data.user.username} joined the room`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('user_left_room', (data) => {
      setRoomUsers(prev => prev.filter(u => u.id !== data.user.id));
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${data.user.username} left the room`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('room_users', (users) => {
      console.log('Received room users:', users);
      console.log('Number of room users:', users.length);
      setRoomUsers(users);
    });

    newSocket.on('room_messages', (messages) => {
      console.log('Loaded room messages from memory:', messages);
      setMessages(messages);
      setLoading(false);
    });

    // Debug: Log when room is joined
    newSocket.on('user_joined_room', (data) => {
      console.log('User joined room:', data);
      setRoomUsers(prev => {
        // Check if user already exists to avoid duplicates
        const userExists = prev.some(user => user.id === data.user.id);
        if (userExists) {
          console.log('User already in room, skipping duplicate');
          return prev;
        }
        console.log('Adding user to room list:', data.user);
        return [...prev, data.user];
      });
      
      // Add system message for user joining
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${data.user.username} joined the room`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('user_left_room', (data) => {
      console.log('User left room:', data);
      setRoomUsers(prev => prev.filter(user => user.id !== data.user.id));
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${data.user.username} left the room`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('room_joined', (data) => {
      console.log('Successfully joined room:', data);
      setLoading(false);
    });

    newSocket.on('new_room_message', (message) => {
      console.log('Received room message:', message);
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const messageExists = prev.some(msg => 
          msg.id === message.id || 
          (msg.content === message.content && 
           msg.user?.id === message.user?.id && 
           Math.abs(new Date(msg.timestamp) - new Date(message.timestamp)) < 1000)
        );
        
        if (messageExists) {
          console.log('Message already exists, skipping duplicate');
          return prev;
        }
        
        console.log('Adding new message to list:', message);
        return [...prev, message];
      });
    });

    newSocket.on('user_typing_room', (data) => {
      setTypingUsers(prev => {
        if (!prev.find(u => u.id === data.id)) {
          return [...prev, data];
        }
        return prev;
      });
    });

    newSocket.on('user_stopped_typing_room', (data) => {
      setTypingUsers(prev => prev.filter(u => u.id !== data.id));
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      message.error(error.message);
    });

    newSocket.on('room_closed', (data) => {
      console.log('Room closed:', data.message);
      message.warning(data.message);
      onLeaveRoom(); // Navigate back to rooms
    });

    newSocket.on('room_cleared', (data) => {
      console.log('Room cleared:', data.message);
      message.info(data.message);
      // Clear all messages and users from the room
      setMessages([]);
      setRoomUsers([]);
    });

    newSocket.on('test_response', (data) => {
      console.log('Received test response from backend:', data);
    });

    // Room joining and message loading is now handled in the 'connect' event

    // Periodic room status check and rejoin
    const statusInterval = setInterval(() => {
      console.log('Room status check:');
      console.log('- Socket connected:', newSocket.connected);
      console.log('- Socket ID:', newSocket.id);
      console.log('- Room ID:', room._id);
      console.log('- Current messages count:', messages.length);
      console.log('- Current room users count:', roomUsers.length);
      
      // Rejoin room every 30 seconds to ensure we're still in the room
      if (newSocket.connected) {
        console.log('Rejoining room to maintain connection...');
        newSocket.emit('join_room', { roomId: room._id });
      }
    }, 30000);

    // Set loading to false after a short delay to allow room joining
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached - setting loading to false');
      setLoading(false);
    }, 2000);

    // Fallback: Force load messages after 3 seconds if no messages received
    const fallbackTimeout = setTimeout(() => {
      console.log('Fallback: Manually requesting messages again');
      newSocket.emit('get_room_messages', { roomId: room._id });
    }, 3000);

    // Also set loading to false when we receive any room event
    const clearLoading = () => {
      clearTimeout(loadingTimeout);
      clearTimeout(fallbackTimeout);
      setLoading(false);
    };

    // Clear loading on any room-related event
    newSocket.on('room_users', clearLoading);
    newSocket.on('room_messages', clearLoading);
    newSocket.on('user_joined_room', clearLoading);

    return () => {
      clearTimeout(connectionTimeout);
      clearTimeout(loadingTimeout);
      clearTimeout(fallbackTimeout);
      clearInterval(statusInterval);
      newSocket.emit('leave_room', { roomId: room._id });
      newSocket.close();
    };
  }, [room._id, onLeaveRoom]);


  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket) return;

    const messageContent = inputMessage.trim();
    console.log('Sending room message:', {
      roomId: room._id,
      content: messageContent
    });

    // Clear input immediately
    setInputMessage('');

    // Send message to server - it will be added when received back
    socket.emit('send_room_message', {
      roomId: room._id,
      content: messageContent
    });

    // Fallback: If no message received within 3 seconds, request refresh
    setTimeout(() => {
      console.log('Fallback: Requesting message refresh after send');
      socket.emit('get_room_messages', { roomId: room._id });
    }, 3000);
  };

  const handleTyping = () => {
    if (!socket) return;

    socket.emit('room_typing_start', { roomId: room._id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('room_typing_stop', { roomId: room._id });
    }, 1000);
  };

  const getTopicDisplayName = (topic) => {
    return topic; // Topics are now stored as display names
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="room-chat-container">
        <div className="loading-container">
          <Spin size="large" />
          <Typography.Text>Loading room...</Typography.Text>
        </div>
      </div>
    );
  }

  return (
    <div className="room-chat-container">
      {/* Header */}
      <div className="room-header">
        <div className="room-info">
          <Space>
            <Typography.Title level={2} className="room-name">
              {room.name}
              {room.createdBy._id === user.id && <Tag color="orange" className="creator-badge">Creator</Tag>}
            </Typography.Title>
          </Space>
          <div className="room-meta">
            <Space>
              <Tag color="blue" className="room-topic">{getTopicDisplayName(room.topic)}</Tag>
              <Typography.Text className="participant-count">
                <UserOutlined /> {roomUsers.length}/{room.maxParticipants}
              </Typography.Text>
            </Space>
          </div>
        </div>
        
        <Space>
          <div className="connection-status">
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
            <Typography.Text>{isConnected ? 'Connected' : 'Disconnected'}</Typography.Text>
          </div>
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={onLeaveRoom} 
            className="back-to-rooms-btn"
          >
            Back to Rooms
          </Button>
          <Button 
            danger
            icon={<LogoutOutlined />}
            onClick={onLeaveRoom} 
            className="leave-room-btn"
          >
            Leave Room
          </Button>
        </Space>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {/* Messages */}
        <div className="messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type === 'system' ? 'system-message' : ''}`}>
              {message.type !== 'system' && (
                <div className="message-avatar">
                  <span className="avatar-text">
                    {message.user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div className="message-content">
                {message.type !== 'system' && (
                  <div className="message-header">
                    <Typography.Text strong className="message-username">{message.user.username}</Typography.Text>
                    <Typography.Text className="message-time">{formatTime(message.timestamp)}</Typography.Text>
                  </div>
                )}
                <div className="message-text">{message.content}</div>
              </div>
            </div>
          ))}
          
          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              <Typography.Text>
                {typingUsers.map(u => u.username).join(', ')} 
                {typingUsers.length === 1 ? ' is' : ' are'} typing...
              </Typography.Text>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="message-form">
          <Input.Group compact>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleTyping}
              placeholder="Type a message..."
              className="message-input"
              disabled={!isConnected}
              onPressEnter={handleSendMessage}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !isConnected}
              className="send-button"
            >
              Send
            </Button>
          </Input.Group>
        </div>
      </div>

      {/* Sidebar - Room Users */}
      <Card className="room-sidebar" title={`Online Users (${roomUsers.length})`}>
        <div className="users-list">
          {roomUsers.map(user => (
            <div key={user.id} className="user-item">
              <div className="user-avatar">
                <span className="avatar-text">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <Typography.Text className="user-name">{user.username}</Typography.Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default RoomChat;
