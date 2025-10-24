import express from 'express';
import jwt from 'jsonwebtoken';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Create a new public room
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name, description, topic, maxParticipants = 50 } = req.body;

    if (!name || !topic) {
      return res.status(400).json({ 
        message: 'Room name and topic are required' 
      });
    }

    // Check if room name already exists
    const existingRoom = await Room.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isPrivate: false 
    });

    if (existingRoom) {
      return res.status(400).json({ 
        message: 'Room name already exists' 
      });
    }

    // Create new room
    const room = new Room({
      name: name.trim(),
      description: description?.trim() || '',
      topic: topic,
      maxParticipants: maxParticipants,
      isPrivate: false,
      createdBy: req.user.userId,
      participants: [{
        user: req.user.userId,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    await room.save();
    await room.populate('participants.user', 'username avatar onlineStatus');
    await room.populate('createdBy', 'username avatar');

    res.status(201).json(room);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all public rooms
router.get('/public', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, topic } = req.query;
    const skip = (page - 1) * limit;

    let query = { isPrivate: false };
    if (topic) {
      query.topic = topic;
    }

    const rooms = await Room.find(query)
      .populate('participants.user', 'username avatar onlineStatus')
      .populate('createdBy', 'username avatar')
      .populate('lastMessage')
      .sort({ lastActivity: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Room.countDocuments(query);

    res.json({
      rooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get public rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a room
router.post('/:roomId/join', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.isPrivate) {
      return res.status(403).json({ message: 'Cannot join private room' });
    }

    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({ message: 'Room is full' });
    }

    // Check if user is already in the room
    if (room.isParticipant(req.user.userId)) {
      // User is already in the room, just return the room data
      await room.populate('participants.user', 'username avatar onlineStatus');
      return res.json({ message: 'Already in this room', room });
    }

    // Add user to room
    await room.addParticipant(req.user.userId, 'member');
    await room.populate('participants.user', 'username avatar onlineStatus');

    res.json({ message: 'Joined room successfully', room });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave a room
router.post('/:roomId/leave', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.isParticipant(req.user.userId)) {
      return res.status(400).json({ message: 'Not in this room' });
    }

    // Remove user from room
    await room.removeParticipant(req.user.userId);
    
    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room details
router.get('/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId)
      .populate('participants.user', 'username avatar onlineStatus')
      .populate('createdBy', 'username avatar')
      .populate('lastMessage');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user has access to room
    if (!room.isParticipant(req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room messages
router.get('/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user has access to room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.isParticipant(req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Room messages are stored in memory, not database
    // Use Socket.io to get messages instead of REST API
    res.json({ message: 'Use Socket.io to get room messages' });
  } catch (error) {
    console.error('Get room messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get popular topics for room creation (suggestions)
router.get('/topics/popular', authenticateToken, async (req, res) => {
  try {
    const popularTopics = [
      'Web Development', 'Machine Learning', 'Artificial Intelligence', 'Data Science', 
      'Mobile Development', 'DevOps', 'Cybersecurity', 'Blockchain', 'Gaming', 
      'Design', 'Startup', 'Career', 'General', 'Programming', 'Databases', 
      'Cloud Computing', 'React', 'JavaScript', 'Python', 'Node.js', 'Docker',
      'Kubernetes', 'AWS', 'Azure', 'Frontend', 'Backend', 'Full Stack',
      'UI/UX', 'Product Management', 'Marketing', 'Business', 'Finance',
      'Health', 'Fitness', 'Travel', 'Food', 'Music', 'Movies', 'Books',
      'Photography', 'Art', 'Sports', 'Technology', 'Science', 'Education'
    ];

    res.json({ topics: popularTopics });
  } catch (error) {
    console.error('Get popular topics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;