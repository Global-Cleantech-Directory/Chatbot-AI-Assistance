const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  intentScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['info_only', 'interested', 'high_intent'],
    default: 'info_only'
  },
  interactions: [{
    message: String,
    timestamp: Date,
    intentKeywordsFound: [String]
  }],
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  membershipPrompted: {
    type: Boolean,
    default: false
  },
  totalInteractions: {
    type: Number,
    default: 0
  },
  email: {
    type: String,
    // required: true
  },
  emailFollowups: {
    threeDay: {
      sent: { type: Boolean, default: false },
      scheduledFor: Date
    },
    sevenDay: {
      sent: { type: Boolean, default: false },
      scheduledFor: Date
    },
    fourteenDay: {
      sent: { type: Boolean, default: false },
      scheduledFor: Date
    }
  },
  emailFollowupScheduled: {
    type: Boolean,
    default: false
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      default: undefined
    }
  }

});

// Add method to update intent score based on message content
leadSchema.methods.analyzeIntent = function(message) {
  const keywords = {
    high_intent: [
      'join', 'signup', 'register', 'price', 'cost', 
      'membership', 'interested', 'buy', 'purchase',
      'contact', 'quote', 'demo'
    ],
    interested: [
      'more info', 'learn', 'tell me', 'how does', 
      'what is', 'features', 'benefits', 'details'
    ],
    info_only: [
      'just looking', 'browsing', 'thanks', 'ok', 
      'got it', 'understand'
    ]
  };

  const messageLower = message.toLowerCase();
  let foundKeywords = [];
  let score = 0;

  // Check for high intent keywords (3 points each)
  keywords.high_intent.forEach(word => {
    if (messageLower.includes(word)) {
      score += 3;
      foundKeywords.push(word);
    }
  });

  // Check for interested keywords (2 points each)
  keywords.interested.forEach(word => {
    if (messageLower.includes(word)) {
      score += 2;
      foundKeywords.push(word);
    }
  });

  // Check for info_only keywords (0 points, but track them)
  keywords.info_only.forEach(word => {
    if (messageLower.includes(word)) {
      foundKeywords.push(word);
    }
  });

  // Update lead status based on cumulative score
  this.intentScore += score;
  if (this.intentScore >= 6) {
    this.status = 'high_intent';
  } else if (this.intentScore >= 3) {
    this.status = 'interested';
  }

  // Record the interaction
  this.interactions.push({
    message,
    timestamp: new Date(),
    intentKeywordsFound: foundKeywords
  });
  
  this.totalInteractions += 1;
  this.lastInteraction = new Date();

  return {
    score,
    status: this.status,
    foundKeywords
  };
};

module.exports = mongoose.model('Lead', leadSchema);