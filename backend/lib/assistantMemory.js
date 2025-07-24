const ConversationMemory = require('../models/ConversationMemory');
const Lead = require('../models/Lead');

class AssistantMemoryService {
  
  /**
   * Create or update conversation memory for a session
   */
  static async updateConversationMemory(sessionId, messageData, analysis = {}) {
    try {
      let memory = await ConversationMemory.findOne({ sessionId });
      
      if (!memory) {
        // Create new memory record
        const lead = await Lead.findOne({ sessionId });
        if (!lead) {
          throw new Error('Lead not found for session');
        }
        
        memory = new ConversationMemory({
          sessionId,
          leadId: lead._id,
          context: {
            interests: {
              sectors: [],
              technologies: [],
              businessNeeds: [],
              location: '',
              companySize: '',
              timeline: ''
            },
            userProfile: {
              role: '',
              industry: '',
              experienceLevel: '',
              communicationStyle: 'professional',
              preferredLanguage: 'en'
            },
            conversationFlow: {
              mainTopics: [],
              questionsAsked: [],
              solutionsOffered: [],
              followUpNeeds: [],
              actionItems: [],
              unresolved: []
            },
            engagement: {
              messageCount: 0,
              sessionDuration: 0,
              lastActiveAt: new Date(),
              engagementLevel: 'medium',
              satisfactionIndicators: []
            }
          },
          rawMessages: [],
          analysis: {
            primaryIntent: 'information',
            urgencyLevel: 'medium',
            businessStage: 'research',
            decisionMaker: false,
            budgetIndicators: '',
            competitiveContext: '',
            painPoints: [],
            successFactors: []
          },
          followUpContext: {
            personalizedGreeting: 'Hello',
            relevantTopics: [],
            avoidTopics: [],
            preferredCommunicationTone: 'professional',
            nextBestActions: [],
            customRecommendations: []
          }
        });
      }
      
      // Add the message
      await memory.addMessage(messageData.message, messageData.sender, analysis);
      
      // Update context based on analysis
      if (analysis.sectors) {
        memory.context.interests.sectors = [...new Set([...memory.context.interests.sectors, ...analysis.sectors])];
      }
      
      if (analysis.technologies) {
        memory.context.interests.technologies = [...new Set([...memory.context.interests.technologies, ...analysis.technologies])];
      }
      
      if (analysis.businessNeeds) {
        memory.context.interests.businessNeeds = [...new Set([...memory.context.interests.businessNeeds, ...analysis.businessNeeds])];
      }
      
      if (analysis.painPoints) {
        memory.analysis.painPoints = [...new Set([...memory.analysis.painPoints, ...analysis.painPoints])];
      }
      
      if (analysis.urgency) {
        memory.analysis.urgencyLevel = analysis.urgency;
      }
      
      if (analysis.role) {
        memory.context.userProfile.role = analysis.role;
      }
      
      // Update engagement level based on message count and sentiment
      const totalMessages = memory.context.engagement.messageCount;
      const recentSentiment = memory.rawMessages.slice(-3).map(m => m.sentiment);
      const positiveSentiment = recentSentiment.filter(s => s === 'positive').length;
      
      if (totalMessages > 10 && positiveSentiment >= 2) {
        memory.context.engagement.engagementLevel = 'high';
      } else if (totalMessages < 3 || positiveSentiment === 0) {
        memory.context.engagement.engagementLevel = 'low';
      }
      
      await memory.save();
      return memory;
      
    } catch (error) {
      console.error('Error updating conversation memory:', error);
      throw error;
    }
  }
  
  /**
   * Analyze message content to extract meaningful context
   */
  static analyzeMessage(message, sender = 'user') {
    const messageLower = message.toLowerCase();
    const analysis = {
      sentiment: 'neutral',
      topics: [],
      sectors: [],
      technologies: [],
      businessNeeds: [],
      painPoints: [],
      urgency: null,
      role: null
    };
    
    // Sentiment analysis (simple keyword-based)
    const positiveWords = ['great', 'excellent', 'perfect', 'amazing', 'helpful', 'thank you', 'thanks', 'good', 'yes', 'interested'];
    const negativeWords = ['bad', 'terrible', 'useless', 'disappointed', 'frustrated', 'no', 'not interested', 'waste'];
    
    const hasPositive = positiveWords.some(word => messageLower.includes(word));
    const hasNegative = negativeWords.some(word => messageLower.includes(word));
    
    if (hasPositive && !hasNegative) analysis.sentiment = 'positive';
    if (hasNegative && !hasPositive) analysis.sentiment = 'negative';
    
    // Sector identification
    const sectorKeywords = {
      'renewable energy': ['solar', 'wind', 'renewable', 'clean energy', 'green energy', 'photovoltaic', 'turbine'],
      'water treatment': ['water', 'wastewater', 'filtration', 'purification', 'desalination'],
      'waste management': ['waste', 'recycling', 'circular economy', 'disposal', 'composting'],
      'smart cities': ['smart city', 'iot', 'urban', 'infrastructure', 'sensors'],
      'agriculture': ['agriculture', 'farming', 'agtech', 'precision farming', 'crops'],
      'transportation': ['electric vehicle', 'ev', 'mobility', 'transportation', 'logistics']
    };
    
    for (const [sector, keywords] of Object.entries(sectorKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        analysis.sectors.push(sector);
      }
    }
    
    // Business needs identification
    const needsKeywords = {
      'suppliers': ['supplier', 'vendor', 'procurement', 'sourcing', 'buy', 'purchase'],
      'partnerships': ['partner', 'collaboration', 'joint venture', 'alliance', 'work together'],
      'funding': ['funding', 'investment', 'investor', 'capital', 'finance', 'money'],
      'technology': ['technology', 'solution', 'innovation', 'research', 'development'],
      'networking': ['network', 'connect', 'meet', 'contact', 'introduction']
    };
    
    for (const [need, keywords] of Object.entries(needsKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        analysis.businessNeeds.push(need);
      }
    }
    
    // Role identification
    const roleKeywords = {
      'CEO': ['ceo', 'chief executive', 'founder', 'president'],
      'CTO': ['cto', 'chief technology', 'technical director'],
      'Procurement Manager': ['procurement', 'purchasing', 'buyer', 'sourcing'],
      'Investor': ['investor', 'investment', 'fund', 'venture capital'],
      'Consultant': ['consultant', 'consulting', 'advisor'],
      'Engineer': ['engineer', 'technical', 'developer']
    };
    
    for (const [role, keywords] of Object.entries(roleKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        analysis.role = role;
        break;
      }
    }
    
    // Urgency detection
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'quickly', 'deadline', 'rush'];
    const timeKeywords = ['this week', 'this month', 'soon', 'within'];
    
    if (urgentKeywords.some(keyword => messageLower.includes(keyword))) {
      analysis.urgency = 'high';
    } else if (timeKeywords.some(keyword => messageLower.includes(keyword))) {
      analysis.urgency = 'medium';
    }
    
    // Pain points identification
    const painPointKeywords = {
      'cost': ['expensive', 'cost', 'budget', 'affordable', 'price'],
      'complexity': ['complex', 'complicated', 'difficult', 'hard to understand'],
      'time': ['time-consuming', 'slow', 'takes too long', 'delay'],
      'reliability': ['unreliable', 'trust', 'proven', 'track record'],
      'scalability': ['scale', 'growth', 'expand', 'larger']
    };
    
    for (const [painPoint, keywords] of Object.entries(painPointKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        analysis.painPoints.push(painPoint);
      }
    }
    
    return analysis;
  }
  
  /**
   * Get conversation memory for email personalization
   */
  static async getMemoryForEmail(sessionId) {
    try {
      const memory = await ConversationMemory.findOne({ sessionId }).populate('leadId');
      
      if (!memory) {
        return null;
      }
      
      return memory.getEmailPersonalization();
      
    } catch (error) {
      console.error('Error retrieving memory for email:', error);
      return null;
    }
  }
  
  /**
   * Generate personalized email context based on conversation
   */
  static async generateEmailContext(sessionId, emailType) {
    try {
      const memory = await ConversationMemory.findOne({ sessionId });
      
      if (!memory) {
        return {
          greeting: 'Hello',
          personalizedContent: '',
          recommendations: [],
          tone: 'professional'
        };
      }
      
      const personalization = memory.getEmailPersonalization();
      
      // Generate content based on email type and conversation context
      let personalizedContent = '';
      
      switch (emailType) {
        case 'day3':
          personalizedContent = this.generateDay3Content(personalization);
          break;
        case 'day7':
          personalizedContent = this.generateDay7Content(personalization);
          break;
        case 'day14':
          personalizedContent = this.generateDay14Content(personalization);
          break;
      }
      
      return {
        greeting: personalization.greeting,
        personalizedContent,
        recommendations: personalization.recommendations,
        tone: personalization.communicationTone,
        interests: personalization.mainInterests,
        role: personalization.role,
        painPoints: personalization.painPoints
      };
      
    } catch (error) {
      console.error('Error generating email context:', error);
      return null;
    }
  }
  
  static generateDay3Content(personalization) {
    const interests = personalization.mainInterests.join(', ');
    const role = personalization.role || 'professional';
    
    return `
      I remember you were interested in ${interests} solutions. As a ${role}, you mentioned some specific needs around ${personalization.businessNeeds.join(' and ')}.
      
      I wanted to follow up and see if you'd like to continue exploring options in this space. Based on our conversation, I have some specific recommendations that might be exactly what you're looking for.
    `;
  }
  
  static generateDay7Content(personalization) {
    const interests = personalization.mainInterests.slice(0, 2).join(' and ');
    
    return `
      Since you're interested in ${interests}, I thought you'd find this week's industry updates particularly relevant. Here are some new developments and opportunities in your areas of interest.
    `;
  }
  
  static generateDay14Content(personalization) {
    const painPoints = personalization.painPoints.join(' and ');
    const nextActions = personalization.nextActions.join(', ');
    
    return `
      I wanted to reach out one final time about the ${personalization.mainInterests.join(' and ')} opportunities we discussed. 
      
      ${painPoints ? `I know you mentioned concerns about ${painPoints}, and I've found some solutions that specifically address these challenges.` : ''}
      
      ${nextActions ? `Your next steps could include: ${nextActions}` : ''}
    `;
  }
}

module.exports = AssistantMemoryService;
