import express from 'express';
import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Room from '../models/Room.js';

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

// Send a message to a room
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, roomId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required' });
    }

    // Check if user has access to room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.isParticipant(req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const message = new Message({
      content: content.trim(),
      user: req.user.userId,
      room: roomId
    });

    await message.save();
    await message.populate('user', 'username avatar onlineStatus');

    // Update room's last message and activity
    room.lastMessage = message._id;
    room.lastActivity = new Date();
    await room.save();

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get online users
router.get('/users/online', authenticateToken, async (req, res) => {
  try {
    const onlineUsers = await User.find({ onlineStatus: 'online' })
      .select('username avatar onlineStatus lastSeen');
    
    res.json(onlineUsers);
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
