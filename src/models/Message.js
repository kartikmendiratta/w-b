import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
messageSchema.index({ room: 1, timestamp: -1 });
messageSchema.index({ user: 1 });
messageSchema.index({ timestamp: -1 });

// Static method to find messages by room
messageSchema.statics.findByRoom = function(roomId, limit = 50, skip = 0) {
  return this.find({ room: roomId })
    .populate('user', 'username avatar onlineStatus')
    .populate('sender', 'username avatar onlineStatus')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

const Message = mongoose.model('Message', messageSchema);

export default Message;
