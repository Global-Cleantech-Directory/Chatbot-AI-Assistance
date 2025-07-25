const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  response: {
    type: String
  },
  isBot: {
    type: Boolean,
    default: false
  },
  leadScore: {
    type: Number,
    default: 0
  },
  language: {
    type: String,
    default: 'en'
  },
  tone: {
    type: String,
    default: 'neutral'
  },
  listingPage: {
    type: String,
    default: 'chat'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;