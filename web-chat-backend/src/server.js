import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import User from './models/User.js';

const app = express();
const server = createServer(app);

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Connect to database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Multi-User Web Chat Backend Server is running!' });
});

// Debug route to check stored messages
app.get('/debug/messages', (req, res) => {
  const debugInfo = {};
  for (const [roomId, messages] of roomMessages.entries()) {
    debugInfo[roomId] = {
      messageCount: messages.length,
      messages: messages.map(m => ({
        id: m.id,
        content: m.content,
        username: m.user.username,
        timestamp: m.timestamp
      }))
    };
  }
  res.json({
    totalRooms: roomMessages.size,
    roomMessages: debugInfo
  });
});

// Store active users and waiting queue
const activeUsers = new Map();
const waitingQueue = [];
const activeChats = new Map();
const roomUsers = new Map(); // Track users in rooms
const roomMessages = new Map(); // Store room messages in memory
const roomCleanupTimers = new Map(); // Track cleanup timers for rooms

// Socket.io authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    socket.userId = user._id;
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.io connection handling
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.user.username}`);

  // Add user to active users
  activeUsers.set(socket.userId.toString(), {
    socketId: socket.id,
    user: socket.user,
    lastSeen: new Date(),
    status: 'online'
  });

  // Update user status in database
  await User.findByIdAndUpdate(socket.userId, {
    onlineStatus: 'online',
    lastSeen: new Date()
  });

  // Send current online users count
  socket.emit('online_count', activeUsers.size);

  // Handle finding a random chat partner
  socket.on('find_chat', (data) => {
    const { preferredTopics = [] } = data || {};
    
    // Remove user from waiting queue if already there
    const existingIndex = waitingQueue.findIndex(u => u.userId === socket.userId);
    if (existingIndex !== -1) {
      waitingQueue.splice(existingIndex, 1);
    }

    // Check if user is already in an active chat
    if (activeChats.has(socket.userId.toString())) {
      socket.emit('error', { message: 'You are already in a chat' });
      return;
    }

    // Add to waiting queue with preferred topics
    waitingQueue.push({
      userId: socket.userId,
      socketId: socket.id,
      user: socket.user,
      preferredTopics: preferredTopics
    });

    socket.emit('searching', { message: 'Looking for a chat partner...' });

    // Try to match with another user based on topics
    if (waitingQueue.length >= 2) {
      const currentUser = waitingQueue[waitingQueue.length - 1];
      
      // Find a user with matching topics
      let matchIndex = -1;
      for (let i = 0; i < waitingQueue.length - 1; i++) {
        const otherUser = waitingQueue[i];
        
        // Check if users have common topics
        const hasCommonTopics = currentUser.preferredTopics.length === 0 || 
          otherUser.preferredTopics.length === 0 ||
          currentUser.preferredTopics.some(topic => otherUser.preferredTopics.includes(topic)) ||
          otherUser.preferredTopics.some(topic => currentUser.preferredTopics.includes(topic));
        
        if (hasCommonTopics) {
          matchIndex = i;
          break;
        }
      }
      
      // If no topic match found, match with any user
      if (matchIndex === -1 && waitingQueue.length >= 2) {
        matchIndex = 0;
      }
      
      if (matchIndex !== -1) {
        const user1 = waitingQueue.splice(matchIndex, 1)[0];
        const user2 = waitingQueue.pop();

      // Create a chat room between two users
      const chatId = `chat_${user1.userId}_${user2.userId}`;
      
      // Store active chat
      activeChats.set(user1.userId.toString(), {
        partnerId: user2.userId.toString(),
        chatId: chatId
      });
      activeChats.set(user2.userId.toString(), {
        partnerId: user1.userId.toString(),
        chatId: chatId
      });

      // Join both users to the chat room
      user1.socketId && io.sockets.sockets.get(user1.socketId)?.join(chatId);
      user2.socketId && io.sockets.sockets.get(user2.socketId)?.join(chatId);

        // Notify both users about the match
        user1.socketId && io.to(user1.socketId).emit('chat_found', {
          partner: {
            id: user2.userId,
            username: user2.user.username,
            avatar: user2.user.avatar,
            topics: user2.user.topics
          },
          chatId: chatId,
          commonTopics: user1.preferredTopics.filter(topic => 
            user2.preferredTopics.includes(topic)
          )
        });

        user2.socketId && io.to(user2.socketId).emit('chat_found', {
          partner: {
            id: user1.userId,
            username: user1.user.username,
            avatar: user1.user.avatar,
            topics: user1.user.topics
          },
          chatId: chatId,
          commonTopics: user2.preferredTopics.filter(topic => 
            user1.preferredTopics.includes(topic)
          )
        });

        console.log(`Matched ${user1.user.username} with ${user2.user.username} on topics:`, 
          user1.preferredTopics.filter(topic => user2.preferredTopics.includes(topic)));
      }
    }
  });

  // Handle leaving chat
  socket.on('leave_chat', () => {
    const chatInfo = activeChats.get(socket.userId.toString());
    if (chatInfo) {
      // Notify partner
      const partnerSocket = activeUsers.get(chatInfo.partnerId);
      if (partnerSocket) {
        partnerSocket.socketId && io.to(partnerSocket.socketId).emit('partner_left');
      }

      // Remove from active chats
      activeChats.delete(socket.userId.toString());
      activeChats.delete(chatInfo.partnerId);

      // Leave the chat room
      socket.leave(chatInfo.chatId);
      partnerSocket?.socketId && io.sockets.sockets.get(partnerSocket.socketId)?.leave(chatInfo.chatId);

      console.log(`${socket.user.username} left chat`);
    }
  });

  // Handle sending messages
  socket.on('send_message', (data) => {
    const chatInfo = activeChats.get(socket.userId.toString());
    if (!chatInfo) {
      socket.emit('error', { message: 'You are not in a chat' });
      return;
    }

    const message = {
      id: Date.now(),
      content: data.content.trim(),
      user: {
        id: socket.userId,
        username: socket.user.username,
        avatar: socket.user.avatar
      },
      timestamp: new Date()
    };

    // Send message to chat room
    io.to(chatInfo.chatId).emit('new_message', message);
    console.log(`Message from ${socket.user.username}: ${data.content}`);
  });

  // Handle typing indicators
  socket.on('typing_start', () => {
    const chatInfo = activeChats.get(socket.userId.toString());
    if (chatInfo) {
      socket.to(chatInfo.chatId).emit('user_typing', {
        username: socket.user.username,
        id: socket.userId
      });
    }
  });

  socket.on('typing_stop', () => {
    const chatInfo = activeChats.get(socket.userId.toString());
    if (chatInfo) {
      socket.to(chatInfo.chatId).emit('user_stopped_typing', {
        username: socket.user.username,
        id: socket.userId
      });
    }
  });

  // Room chat events
  socket.on('join_room', async (data) => {
    try {
      const { roomId } = data;
      console.log(`User ${socket.user.username} attempting to join room ${roomId}`);
      
      // Join the socket room
      socket.join(roomId);
      
      // Track user in room
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set());
      }
      roomUsers.get(roomId).add(socket.userId.toString());
      
      // Clear cleanup timer if room becomes active again
      if (roomCleanupTimers.has(roomId)) {
        clearTimeout(roomCleanupTimers.get(roomId));
        roomCleanupTimers.delete(roomId);
        console.log(`Room ${roomId} became active again - cancelled cleanup timer`);
      }
      
      // Notify others in the room
      socket.to(roomId).emit('user_joined_room', {
        user: {
          id: socket.userId,
          username: socket.user.username,
          avatar: socket.user.avatar
        }
      });
      
      // Send current room users to the joining user
      const roomUserIds = Array.from(roomUsers.get(roomId) || []);
      console.log(`Room ${roomId} user IDs:`, roomUserIds);
      console.log(`Active users map:`, Array.from(activeUsers.keys()));
      
      const roomUsersList = roomUserIds
        .map(userId => {
          const user = activeUsers.get(userId);
          console.log(`Looking up user ${userId}:`, user);
          return user;
        })
        .filter(user => user)
        .map(user => ({
          id: user.user._id,
          username: user.user.username,
          avatar: user.user.avatar
        }));
      
      console.log(`Sending room_users to ${socket.user.username}:`, roomUsersList);
      socket.emit('room_users', roomUsersList);
      
      // Send confirmation that user successfully joined the room
      socket.emit('room_joined', { 
        roomId: roomId,
        message: `Successfully joined room ${roomId}` 
      });
      
      console.log(`${socket.user.username} joined room ${roomId}`);
      console.log(`Room users: ${roomUsersList.length}`);
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('leave_room', async (data) => {
    try {
      const { roomId } = data;
      
      // Leave the socket room
      socket.leave(roomId);
      
      // Remove user from room tracking
      if (roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(socket.userId.toString());
        
        // Check if this is the room creator leaving
        const { default: Room } = await import('./models/Room.js');
        const room = await Room.findById(roomId);
        
        if (room && room.createdBy.toString() === socket.userId.toString()) {
          // Room creator is leaving - clear all messages and delete room
          const messageCount = roomMessages.get(roomId)?.length || 0;
          roomMessages.delete(roomId);
          await Room.findByIdAndDelete(roomId);
          console.log(`Room ${roomId} deleted by creator ${socket.user.username}. Cleared ${messageCount} messages.`);
          
          // Notify all users that room is closed
          io.to(roomId).emit('room_closed', {
            message: 'Room has been closed by the creator'
          });
        } else {
          // Regular user leaving - only clean up if room is truly empty
          if (roomUsers.get(roomId).size === 0) {
            const messageCount = roomMessages.get(roomId)?.length || 0;
            roomUsers.delete(roomId);
            
            // Clear messages immediately when room becomes empty
            roomMessages.delete(roomId);
            console.log(`Room ${roomId} is empty. Cleared ${messageCount} messages immediately.`);
            
            // Notify any remaining users that room is empty and messages are cleared
            io.to(roomId).emit('room_cleared', {
              message: 'All users have left the room. Messages have been cleared.',
              roomId: roomId
            });
          }
        }
      }
      
      // Notify others in the room
      socket.to(roomId).emit('user_left_room', {
        user: {
          id: socket.userId,
          username: socket.user.username
        }
      });
      
      console.log(`${socket.user.username} left room ${roomId}`);
    } catch (error) {
      console.error('Leave room error:', error);
    }
  });

  socket.on('send_room_message', async (data) => {
    try {
      const { roomId, content } = data;
      
      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'Message content is required' });
        return;
      }

      // Create message object
      const messageObj = {
        id: Date.now() + Math.random(), // Generate unique ID
        content: content.trim(),
        user: {
          id: socket.userId,
          username: socket.user.username,
          avatar: socket.user.avatar
        },
        timestamp: new Date(),
        roomId: roomId
      };

      // Store message in memory
      if (!roomMessages.has(roomId)) {
        roomMessages.set(roomId, []);
      }
      roomMessages.get(roomId).push(messageObj);
      
      // Debug: Log message storage
      console.log(`Stored message in memory for room ${roomId}. Total messages: ${roomMessages.get(roomId).length}`);

      // Send message to all users in the room
      console.log(`Emitting new_room_message to room ${roomId} with message:`, messageObj);
      io.to(roomId).emit('new_room_message', messageObj);
      
      // Also send to the sender to confirm
      socket.emit('new_room_message', messageObj);
      
      // Update room's last activity
      const { default: Room } = await import('./models/Room.js');
      await Room.findByIdAndUpdate(roomId, {
        lastActivity: new Date()
      });
      
      console.log(`Room message from ${socket.user.username} in room ${roomId}: ${content}`);
    } catch (error) {
      console.error('Send room message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('room_typing_start', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('user_typing_room', {
      username: socket.user.username,
      id: socket.userId
    });
  });

  socket.on('room_typing_stop', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('user_stopped_typing_room', {
      username: socket.user.username,
      id: socket.userId
    });
  });

  socket.on('get_room_messages', (data) => {
    try {
      const { roomId } = data;
      console.log(`User ${socket.user.username} requesting messages for room ${roomId}`);
      
      // Get messages from memory
      const messages = roomMessages.get(roomId) || [];
      
      // Debug: Log message retrieval
      console.log(`Retrieved ${messages.length} messages from memory for room ${roomId}`);
      if (messages.length > 0) {
        console.log('Sample message:', messages[0]);
      }
      
      // Send messages to the requesting user
      socket.emit('room_messages', messages);
      
      console.log(`Sent ${messages.length} messages to user in room ${roomId}`);
    } catch (error) {
      console.error('Get room messages error:', error);
      socket.emit('error', { message: 'Failed to get messages' });
    }
  });

  // Test event handler
  socket.on('test_event', (data) => {
    console.log('Received test event from frontend:', data);
    socket.emit('test_response', { message: 'Hello from backend!' });
  });

  // WebRTC Video Call Signaling Events
  socket.on('video_call_offer', (data) => {
    const { targetUserId, offer } = data;
    const chatInfo = activeChats.get(socket.userId.toString());
    
    if (!chatInfo) {
      socket.emit('error', { message: 'You are not in a chat' });
      return;
    }

    // Find the target user's socket
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId && s.userId.toString() === targetUserId);

    if (targetSocket) {
      targetSocket.emit('video_call_offer', {
        fromUserId: socket.userId,
        fromUsername: socket.user.username,
        offer: offer
      });
      console.log(`Video call offer sent from ${socket.user.username} to ${targetSocket.user.username}`);
    } else {
      socket.emit('error', { message: 'Target user not found' });
    }
  });

  socket.on('video_call_answer', (data) => {
    const { targetUserId, answer } = data;
    const chatInfo = activeChats.get(socket.userId.toString());
    
    if (!chatInfo) {
      socket.emit('error', { message: 'You are not in a chat' });
      return;
    }

    // Find the target user's socket
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId && s.userId.toString() === targetUserId);

    if (targetSocket) {
      targetSocket.emit('video_call_answer', {
        fromUserId: socket.userId,
        fromUsername: socket.user.username,
        answer: answer
      });
      console.log(`Video call answer sent from ${socket.user.username} to ${targetSocket.user.username}`);
    } else {
      socket.emit('error', { message: 'Target user not found' });
    }
  });

  socket.on('video_call_ice_candidate', (data) => {
    const { targetUserId, candidate } = data;
    const chatInfo = activeChats.get(socket.userId.toString());
    
    if (!chatInfo) {
      socket.emit('error', { message: 'You are not in a chat' });
      return;
    }

    // Find the target user's socket
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId && s.userId.toString() === targetUserId);

    if (targetSocket) {
      targetSocket.emit('video_call_ice_candidate', {
        fromUserId: socket.userId,
        fromUsername: socket.user.username,
        candidate: candidate
      });
    } else {
      socket.emit('error', { message: 'Target user not found' });
    }
  });

  socket.on('video_call_end', (data) => {
    const { targetUserId } = data;
    const chatInfo = activeChats.get(socket.userId.toString());
    
    if (!chatInfo) {
      socket.emit('error', { message: 'You are not in a chat' });
      return;
    }

    // Find the target user's socket
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId && s.userId.toString() === targetUserId);

    if (targetSocket) {
      targetSocket.emit('video_call_end', {
        fromUserId: socket.userId,
        fromUsername: socket.user.username
      });
      console.log(`Video call ended by ${socket.user.username}`);
    }
  });

  socket.on('video_call_reject', (data) => {
    const { targetUserId } = data;
    const chatInfo = activeChats.get(socket.userId.toString());
    
    if (!chatInfo) {
      socket.emit('error', { message: 'You are not in a chat' });
      return;
    }

    // Find the target user's socket
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId && s.userId.toString() === targetUserId);

    if (targetSocket) {
      targetSocket.emit('video_call_reject', {
        fromUserId: socket.userId,
        fromUsername: socket.user.username
      });
      console.log(`Video call rejected by ${socket.user.username}`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      // Remove from waiting queue
      const waitingIndex = waitingQueue.findIndex(u => u.userId === socket.userId);
      if (waitingIndex !== -1) {
        waitingQueue.splice(waitingIndex, 1);
      }

      // Handle active chat
      const chatInfo = activeChats.get(socket.userId.toString());
      if (chatInfo) {
        // Notify partner
        const partnerSocket = activeUsers.get(chatInfo.partnerId);
        if (partnerSocket) {
          partnerSocket.socketId && io.to(partnerSocket.socketId).emit('partner_left');
        }

        // Remove from active chats
        activeChats.delete(socket.userId.toString());
        activeChats.delete(chatInfo.partnerId);
      }

      // Remove from active users
      activeUsers.delete(socket.userId.toString());
      
      // Remove from all rooms
      for (const [roomId, users] of roomUsers.entries()) {
        if (users.has(socket.userId.toString())) {
          users.delete(socket.userId.toString());
          console.log(`Removed ${socket.user.username} from room ${roomId}`);
          
          // Notify others in the room that user left
          socket.to(roomId).emit('user_left_room', {
            user: {
              id: socket.userId,
              username: socket.user.username
            }
          });
          
          // Clean up empty rooms
          if (users.size === 0) {
            const messageCount = roomMessages.get(roomId)?.length || 0;
            roomUsers.delete(roomId);
            roomMessages.delete(roomId);
            console.log(`Room ${roomId} is now empty, cleaned up ${messageCount} messages`);
            
            // Notify any remaining users that room is empty and messages are cleared
            socket.to(roomId).emit('room_cleared', {
              message: 'All users have left the room. Messages have been cleared.',
              roomId: roomId
            });
          }
        }
      }
      
      // Update user status to offline
      await User.findByIdAndUpdate(socket.userId, {
        onlineStatus: 'offline',
        lastSeen: new Date()
      });
      
      console.log(`${socket.user.username} disconnected`);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io server ready for connections`);
});     
    