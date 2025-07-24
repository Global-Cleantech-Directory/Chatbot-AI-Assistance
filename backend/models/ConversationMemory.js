const mongoose = require('mongoose');

const ConversationMemorySchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  // Structured conversation context
  context: {
    // What the user is looking for
    interests: {
      sectors: [String], // e.g., ["renewable energy", "water treatment"]
      technologies: [String], // e.g., ["solar panels", "AI optimization"]
      businessNeeds: [String], // e.g., ["suppliers", "partnerships", "funding"]
      location: String, // geographic focus
      companySize: String, // startup, SME, enterprise
      timeline: String // urgent, 6 months, planning phase
    },
    
    // Assistant's understanding of user
    userProfile: {
      role: String, // CEO, procurement manager, investor, etc.
      industry: String, // current industry they're in
      experienceLevel: String, // beginner, intermediate, expert
      communicationStyle: String, // formal, casual, technical
      preferredLanguage: String
    },
    
    // Conversation flow and outcomes
    conversationFlow: {
      mainTopics: [String], // key topics discussed
      questionsAsked: [String], // user's specific questions
      solutionsOffered: [String], // what assistant recommended
      followUpNeeds: [String], // what user needs next
      actionItems: [String], // concrete next steps identified
      unresolved: [String] // questions not fully answered
    },
    
    // Engagement metrics
    engagement: {
      messageCount: Number,
      sessionDuration: Number, // in minutes
      lastActiveAt: Date,
      engagementLevel: String, // high, medium, low
      satisfactionIndicators: [String] // positive/negative sentiment cues
    }
  },
  
  // Raw conversation for reference
  rawMessages: [{
    message: String,
    sender: String, // 'user' or 'assistant'
    timestamp: Date,
    language: String,
    sentiment: String, // positive, neutral, negative
    keyTopics: [String] // extracted topics from this message
  }],
  
  // Memory analysis
  analysis: {
    primaryIntent: String, // networking, sourcing, learning, etc.
    urgencyLevel: String, // high, medium, low
    businessStage: String, // research, evaluation, ready-to-buy
    decisionMaker: Boolean, // is this person likely a decision maker
    budgetIndicators: String, // mentions of budget/cost concerns
    competitiveContext: String, // mentions of competitors or alternatives
    painPoints: [String], // identified challenges user is facing
    successFactors: [String] // what would make them successful
  },
  
  // For follow-up personalization
  followUpContext: {
    personalizedGreeting: String, // how to address them in emails
    relevantTopics: [String], // topics to focus on in follow-ups
    avoidTopics: [String], // topics they weren't interested in
    preferredCommunicationTone: String,
    nextBestActions: [String], // recommended next steps for them
    customRecommendations: [String] // specific companies/solutions to highlight
  }
}, {
  timestamps: true
});

// Index for efficient querying
ConversationMemorySchema.index({ leadId: 1 });
ConversationMemorySchema.index({ 'context.engagement.lastActiveAt': 1 });

// Method to extract key insights for email personalization
ConversationMemorySchema.methods.getEmailPersonalization = function() {
  return {
    greeting: this.followUpContext.personalizedGreeting || 'Hello',
    mainInterests: this.context.interests.sectors.slice(0, 3), // top 3 interests
    businessNeeds: this.context.interests.businessNeeds,
    urgency: this.analysis.urgencyLevel,
    role: this.context.userProfile.role,
    painPoints: this.analysis.painPoints.slice(0, 2), // top 2 pain points
    recommendations: this.followUpContext.customRecommendations,
    nextActions: this.followUpContext.nextBestActions,
    communicationTone: this.followUpContext.preferredCommunicationTone || 'professional'
  };
};

// Method to update conversation context with new message
ConversationMemorySchema.methods.addMessage = function(message, sender, analysis = {}) {
  // Add to raw messages
  this.rawMessages.push({
    message,
    sender,
    timestamp: new Date(),
    language: analysis.language || 'en',
    sentiment: analysis.sentiment || 'neutral',
    keyTopics: analysis.keyTopics || []
  });
  
  // Update engagement metrics
  this.context.engagement.messageCount += 1;
  this.context.engagement.lastActiveAt = new Date();
  
  // Update conversation flow if it's from user
  if (sender === 'user' && analysis.topics) {
    this.context.conversationFlow.mainTopics = 
      [...new Set([...this.context.conversationFlow.mainTopics, ...analysis.topics])];
  }
  
  return this.save();
};

module.exports = mongoose.model('ConversationMemory', ConversationMemorySchema);
