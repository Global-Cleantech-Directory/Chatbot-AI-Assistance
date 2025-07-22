require('dotenv').config();
const connectDB = require('./lib/db');
const express = require('express');
const cors = require('cors');
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();
const Message = require('./models/Message');
const Lead = require('./models/Lead');
const { Translate } = require('@google-cloud/translate').v2;
const { GoogleGenAI } = require('@google/genai');  // Gemini AI
const textToSpeech = require('@google-cloud/text-to-speech');
const ttsClient = new textToSpeech.TextToSpeechClient();


// Add email functionality imports
const { scheduleFollowUpEmails, cancelFollowUpEmails } = require('./lib/emailScheduler');
const EmailSchedule = require('./models/EmailSchedule');

// Add assistant memory imports
const AssistantMemoryService = require('./lib/assistantMemory');
const ConversationMemory = require('./models/ConversationMemory');

const app = express();
const port = process.env.PORT || 5003;

// Initialize Google Cloud Translate with API key
const translate = new Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY
});

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY
});

// Helper function for translation
async function translateText(text, targetLanguage) {
  try {
    const languageMap = {
      'english': 'en',
      'french': 'fr',
      'spanish': 'es',
      'german': 'de',
      'italian': 'it',
      'portuguese': 'pt',
      'dutch': 'nl',
      'russian': 'ru',
      'japanese': 'ja',
      'chinese': 'zh',
      'korean': 'ko'
    };
    const targetLang = languageMap[targetLanguage.toLowerCase()] || targetLanguage;
    const [translation] = await translate.translate(text, targetLang);
    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

app.use(cors());
app.use(express.json());

// Sample responses
const responses = {
  greeting: { en: "Hello! I'm your Cleantech Directory assistant. How can I help you today?" },
  default: { en: "I'm a demo chatbot. In a real implementation, I would connect to a database of cleantech companies and provide specific information about sustainable solutions." },
  cleantech: { en: "The Global Cleantech Directory helps connect businesses with sustainable technology solutions." },
  companies: { en: "We have a database of thousands of cleantech companies worldwide. Would you like to search by sector, location, or technology type?" }
};

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Global Cleantech Directory API' });
});

app.get('/api/chat', async (req, res) => {
  try {
    const messages = await Message.find({}).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });

  try {
    let lead = await Lead.findOne({ sessionId });
    if (!lead) lead = new Lead({ sessionId });

    const intentAnalysis = lead.analyzeIntent(message);
    await lead.save();

    let detectedLanguage = 'english';
    let targetLang = 'en';
    const detectedLanguages = lngDetector.detect(message);
    if (detectedLanguages.length > 0) {
      detectedLanguage = detectedLanguages[0][0].toLowerCase();
      const languageMap = { english: 'en', french: 'fr', spanish: 'es', german: 'de', italian: 'it' };
      targetLang = languageMap[detectedLanguage] || detectedLanguage;
    }

    let response;
    const messageLower = message.toLowerCase();
    if (messageLower.includes('hello') || messageLower.includes('hi')) {
      response = responses.greeting.en;
    } else if (messageLower.includes('cleantech')) {
      response = responses.cleantech.en;
    } else if (messageLower.includes('company')) {
      response = responses.companies.en;
    } else {
      // Fallback to Gemini AI
      try {
        const aiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: message,
        });
        response = aiResponse.text || responses.default.en;
      } catch (e) {
        console.error("Gemini fallback error:", e);
        response = responses.default.en;
      }
    }

    if (targetLang !== 'en') {
      response = await translateText(response, targetLang);
    }

    const userMessage = await Message.create({
      message: message,
      isBot: false,
      language: detectedLanguage,
      leadScore: intentAnalysis.score
    });

    const botMessage = await Message.create({
      message: response,
      isBot: true,
      language: detectedLanguage
    });

    // Update assistant memory with conversation context
    try {
      const messageAnalysis = AssistantMemoryService.analyzeMessage(message, 'user');
      await AssistantMemoryService.updateConversationMemory(sessionId, {
        message: message,
        sender: 'user'
      }, messageAnalysis);
      
      // Also store the bot response
      await AssistantMemoryService.updateConversationMemory(sessionId, {
        message: response,
        sender: 'assistant'
      }, { language: detectedLanguage });
      
      console.log('✅ Assistant memory updated for session:', sessionId);
    } catch (memoryError) {
      console.log('⚠️  Could not update assistant memory:', memoryError.message);
      // Don't fail the request if memory update fails
    }

    res.json({ response, messageId: botMessage._id, detectedLanguage });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Gemini test endpoint
app.post('/api/ai', async (req, res) => {
  try {
    const userPrompt = req.body.prompt || "Explain how AI works in a few words";
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
    });
    res.json({ response: response.text });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

app.post("/api/location", async (req, res) => {
  const { sessionId, location } = req.body;

  if (!sessionId || !location) {
    return res.status(400).json({ error: 'Session ID and location are required' });
  }

  try {
    const lead = await Lead.findOne({ sessionId });
    
    if (!lead) {
      return res.status(404).json({ 
        error: 'Lead not found for this session ID' 
      });
    }

    // Update lead with location
    lead.location = location;
    await lead.save();

    res.json({ 
      message: 'Location updated successfully',
      coordinates: lead.location.coordinates
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Email signup endpoint
app.post('/api/email-signup', async (req, res) => {
  const { email, sessionId } = req.body;

  if (!email || !sessionId) {
    return res.status(400).json({ error: 'Email and session ID are required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Find the lead
    const lead = await Lead.findOne({ sessionId });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Update lead with email
    lead.email = email;
    lead.lastInteraction = new Date();
    await lead.save();

    // Schedule follow-up emails if not already scheduled
    if (!lead.emailFollowupScheduled) {
      const scheduledEmails = await scheduleFollowUpEmails(lead._id, email);
      console.log(`📧 Scheduled follow-up emails for ${email}:`, scheduledEmails);
    }

    res.json({ 
      message: 'Email saved and follow-ups scheduled successfully',
      leadStatus: lead.status,
      intentScore: lead.intentScore,
      emailScheduled: !lead.emailFollowupScheduled
    });
  } catch (error) {
    console.error('Error saving email:', error);
    res.status(500).json({ error: 'Failed to save email' });
  }
});

// Get email schedule status
app.get('/api/email-schedule/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const lead = await Lead.findOne({ sessionId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const schedules = await EmailSchedule.find({ leadId: lead._id }).sort({ scheduledFor: 1 });
    
    res.json({
      hasEmail: !!lead.email,
      email: lead.email,
      followupScheduled: lead.emailFollowupScheduled,
      schedules: schedules.map(s => ({
        type: s.scheduleType,
        scheduledFor: s.scheduledFor,
        sent: s.sent,
        sentAt: s.sentAt
      }))
    });
  } catch (error) {
    console.error('Error getting email schedule:', error);
    res.status(500).json({ error: 'Failed to get email schedule' });
  }
});

// Cancel follow-up emails
app.post('/api/cancel-emails/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const lead = await Lead.findOne({ sessionId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const result = await cancelFollowUpEmails(lead._id);
    
    res.json({ 
      message: 'Follow-up emails cancelled successfully',
      cancelledCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error cancelling emails:', error);
    res.status(500).json({ error: 'Failed to cancel emails' });
  }
});

// Assistant Memory API endpoints

// Get conversation memory for a session
app.get('/api/memory/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const memory = await ConversationMemory.findOne({ sessionId }).populate('leadId');
    
    if (!memory) {
      return res.status(404).json({ error: 'Conversation memory not found' });
    }

    res.json({
      sessionId: memory.sessionId,
      context: memory.context,
      analysis: memory.analysis,
      followUpContext: memory.followUpContext,
      messageCount: memory.rawMessages.length,
      lastActivity: memory.context.engagement.lastActiveAt,
      emailPersonalization: memory.getEmailPersonalization()
    });
  } catch (error) {
    console.error('Error getting conversation memory:', error);
    res.status(500).json({ error: 'Failed to get conversation memory' });
  }
});

// Generate personalized email preview
app.get('/api/email-preview/:sessionId/:emailType', async (req, res) => {
  const { sessionId, emailType } = req.params;

  try {
    const emailContext = await AssistantMemoryService.generateEmailContext(sessionId, emailType);
    
    if (!emailContext) {
      return res.status(404).json({ error: 'Could not generate email context' });
    }

    res.json({
      emailType,
      personalizedContext: emailContext,
      preview: {
        greeting: emailContext.greeting,
        tone: emailContext.tone,
        interests: emailContext.interests,
        recommendations: emailContext.recommendations
      }
    });
  } catch (error) {
    console.error('Error generating email preview:', error);
    res.status(500).json({ error: 'Failed to generate email preview' });
  }
});

// Start email processor
require('./lib/emailProcessor');

app.listen(port, () => {
  connectDB();
  console.log(`Server is running on http://localhost:${port}`);
});

