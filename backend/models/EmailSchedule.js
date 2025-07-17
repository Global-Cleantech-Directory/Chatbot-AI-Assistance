const mongoose = require('mongoose');

const EmailScheduleSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  scheduleType: {
    type: String,
    enum: ['day3', 'day7', 'day14'],
    required: true
  },
  scheduledFor: {
    type: Date,
    required: true
  },
  sent: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date
  },
  leadStatus: {
    type: String,
    required: true
  },
  intentScore: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
EmailScheduleSchema.index({ scheduledFor: 1, sent: 1 });

module.exports = mongoose.model('EmailSchedule', EmailScheduleSchema);
