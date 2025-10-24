import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  topic: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPrivate: {
    type: Boolean,
    default: true
  },
  maxParticipants: {
    type: Number,
    default: 50,
    min: 2,
    max: 100
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
roomSchema.index({ participants: 1 });
roomSchema.index({ createdBy: 1 });
roomSchema.index({ lastActivity: -1 });
roomSchema.index({ topic: 1 });
roomSchema.index({ isPrivate: 1 });

// Method to add a participant
roomSchema.methods.addParticipant = function(userId, role = 'member') {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      role: role,
      joinedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to remove a participant
roomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  return this.save();
};

// Method to check if user is participant
roomSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => p.user.toString() === userId.toString());
};

// Static method to find rooms for a user
roomSchema.statics.findByUser = function(userId) {
  return this.find({
    participants: { $elemMatch: { user: userId } }
  })
  .populate('participants.user', 'username avatar onlineStatus')
  .populate('createdBy', 'username avatar')
  .populate('lastMessage')
  .sort({ lastActivity: -1 });
};

// Static method to find or create private room between two users
roomSchema.statics.findOrCreatePrivateRoom = async function(user1Id, user2Id) {
  // First, try to find existing private room between these two users
  const existingRoom = await this.findOne({
    isPrivate: true,
    participants: {
      $all: [
        { $elemMatch: { user: user1Id } },
        { $elemMatch: { user: user2Id } }
      ]
    }
  }).populate('participants.user', 'username avatar onlineStatus');

  if (existingRoom) {
    return existingRoom;
  }

  // If no existing room, create a new one
  const room = new this({
    name: `Private Chat`,
    description: 'Private conversation',
    isPrivate: true,
    createdBy: user1Id,
    participants: [
      { user: user1Id, role: 'admin' },
      { user: user2Id, role: 'member' }
    ]
  });

  await room.save();
  return room.populate('participants.user', 'username avatar onlineStatus');
};

const Room = mongoose.model('Room', roomSchema);

export default Room;
