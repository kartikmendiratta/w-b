import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Typography, Space, Tag, Modal, Form, message, Spin, Empty } from 'antd';
import { PlusOutlined, SearchOutlined, UserOutlined, LogoutOutlined, TeamOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import './Rooms.css';

const Rooms = ({ user, onLogout, onJoinRoom, onShowChat }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [popularTopics, setPopularTopics] = useState([]);

  const getTopicDisplayName = (topic) => {
    return topic; // Now topics are stored as display names
  };

  useEffect(() => {
    fetchRooms();
    fetchPopularTopics();
  }, [selectedTopic, searchQuery]);

  const fetchPopularTopics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/rooms/topics/popular', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPopularTopics(data.topics);
      }
    } catch (error) {
      console.error('Error fetching popular topics:', error);
    }
  };

  const fetchRooms = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (selectedTopic) params.append('topic', selectedTopic);
      
      const response = await fetch(`http://localhost:5000/api/rooms/public?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (formData) => {
    try {
      console.log('Creating room with data:', formData);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      console.log('Create room response status:', response.status);

      if (response.ok) {
        const newRoom = await response.json();
        console.log('Room created successfully:', newRoom);
        setRooms(prev => [newRoom, ...prev]);
        setShowCreateForm(false);
        message.success('Room created successfully!');
        // Auto-join the created room
        onJoinRoom(newRoom);
      } else {
        const error = await response.json();
        console.error('Create room error:', error);
        message.error(error.message);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      message.error('Failed to create room');
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      console.log('Attempting to join room:', roomId);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Join room response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Join room success:', data);
        onJoinRoom(data.room);
      } else {
        const error = await response.json();
        console.error('Join room error:', error);
        message.error(error.message);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      message.error('Failed to join room');
    }
  };

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="rooms-container">
      {/* Header */}
      <div className="rooms-header">
        <div className="header-content">
          <Space>
            <div className="user-avatar">
              <span className="avatar-text">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="user-details">
              <Typography.Title level={2} className="app-title">Chat Rooms</Typography.Title>
              <Typography.Text className="welcome-text">Join topic-based chat rooms worldwide</Typography.Text>
            </div>
          </Space>
          
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={onShowChat}
              className="back-to-chat-btn"
            >
              Back to Chat
            </Button>
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateForm(true)}
              className="create-room-btn"
            >
              Create Room
            </Button>
            <Button 
              icon={<LogoutOutlined />}
              onClick={onLogout}
              className="logout-btn"
            >
              Logout
            </Button>
          </Space>
        </div>
      </div>

      {/* Filters */}
      <div className="rooms-filters">
        <Input
          placeholder="Search rooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          prefix={<SearchOutlined />}
          className="search-input"
        />
        
        <Input
          placeholder="Filter by topic..."
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="topic-input"
          list="topic-suggestions"
        />
        <datalist id="topic-suggestions">
          {popularTopics.map(topic => (
            <option key={topic} value={topic} />
          ))}
        </datalist>
      </div>

      {/* Rooms List */}
      <div className="rooms-content">
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
            <Typography.Text>Loading rooms...</Typography.Text>
          </div>
        ) : filteredRooms.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Typography.Title level={4}>No rooms found</Typography.Title>
                <Typography.Text>Create a new room or try a different search</Typography.Text>
              </div>
            }
          />
        ) : (
          <div className="rooms-grid">
            {filteredRooms.map(room => (
              <Card key={room._id} className="room-card" hoverable>
                <div className="room-header">
                  <Typography.Title level={4} className="room-name">{room.name}</Typography.Title>
                  <Tag color="blue" className="room-topic">{getTopicDisplayName(room.topic)}</Tag>
                </div>
                
                <Typography.Text className="room-description">{room.description || 'No description'}</Typography.Text>
                
                <div className="room-stats">
                  <Space>
                    <Typography.Text className="participant-count">
                      <TeamOutlined /> {room.participants.length}/{room.maxParticipants}
                    </Typography.Text>
                    <Typography.Text className="room-created">
                      by {room.createdBy.username}
                    </Typography.Text>
                  </Space>
                </div>
                
                <Button
                  type="primary"
                  block
                  onClick={() => handleJoinRoom(room._id)}
                  className="join-room-btn"
                >
                  Join Room
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        visible={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onCreateRoom={handleCreateRoom}
        popularTopics={popularTopics}
        getTopicDisplayName={getTopicDisplayName}
      />
    </div>
  );
};

// Create Room Modal Component
const CreateRoomModal = ({ visible, onClose, onCreateRoom, popularTopics, getTopicDisplayName }) => {
  const [form] = Form.useForm();

  const handleSubmit = (values) => {
    onCreateRoom(values);
    form.resetFields();
  };

  return (
    <Modal
      title="Create New Room"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="create-room-form"
      >
        <Form.Item
          name="name"
          label="Room Name"
          rules={[{ required: true, message: 'Please enter room name' }]}
        >
          <Input
            placeholder="Enter room name"
            maxLength={50}
          />
        </Form.Item>
        
        <Form.Item
          name="description"
          label="Description"
        >
          <Input.TextArea
            placeholder="Describe what this room is about"
            rows={3}
            maxLength={200}
          />
        </Form.Item>
        
        <Form.Item
          name="topic"
          label="Topic"
          rules={[{ required: true, message: 'Please enter topic' }]}
        >
          <Input
            placeholder="Enter any topic (e.g., React, Cooking, Travel...)"
            maxLength={50}
            list="create-topic-suggestions"
          />
          <datalist id="create-topic-suggestions">
            {popularTopics.map(topic => (
              <option key={topic} value={topic} />
            ))}
          </datalist>
        </Form.Item>
        
        <Form.Item
          name="maxParticipants"
          label="Max Participants"
          initialValue={50}
        >
          <Input
            type="number"
            min={2}
            max={100}
          />
        </Form.Item>
        
        <Form.Item className="form-actions">
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Create Room
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default Rooms;
