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
const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient();

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
app.use(express.json({ limit: '10mb' }));

// Enhanced responses for Global Clean Tech
const responses = {
  greeting: { 
    en: "Hello! I'm your Global Clean Tech assistant. How can I help you with sustainable technology and clean energy solutions today?" 
  },
  default: { 
    en: "I'm here to help you with clean technology, renewable energy, and sustainable living solutions. What specific area would you like to explore?" 
  },
  cleantech: { 
    en: "The Global Clean Tech Directory connects businesses with cutting-edge sustainable technology solutions. We specialize in solar energy, wind power, energy storage, and green building technologies." 
  },
  companies: { 
    en: "We have a comprehensive database of cleantech companies worldwide. Would you like to search by sector (solar, wind, energy storage), location, or specific technology type?" 
  },
  solar: {
    en: "Solar energy is one of the fastest-growing renewable energy sources. I can help you with solar panel installation, benefits, costs, and finding certified installers in your area."
  },
  recycling: {
    en: "Effective recycling is crucial for sustainability. I can provide guidance on proper recycling practices, waste reduction, and circular economy principles."
  },
  electric_vehicles: {
    en: "Electric vehicles are revolutionizing transportation. I can help you compare EV options, understand charging infrastructure, and calculate potential savings."
  },
  green_buildings: {
    en: "Sustainable building practices reduce environmental impact. I can guide you through green materials, energy-efficient designs, and certification programs like LEED."
  },
  energy_efficiency: {
    en: "Energy efficiency is the quickest way to reduce costs and environmental impact. I can provide personalized recommendations for your home or business."
  },
  carbon_footprint: {
    en: "Understanding and reducing your carbon footprint is essential for climate action. I can help you calculate emissions and develop reduction strategies."
  }
};

// Quick chat options mapping
const quickChatMapping = {
  'solar panel installation': 'solar',
  'recycling practices': 'recycling',
  'electric vehicle options': 'electric_vehicles',
  'sustainable building materials': 'green_buildings',
  'energy consumption': 'energy_efficiency',
  'carbon footprint': 'carbon_footprint'
};

app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Global Clean Tech Directory API',
    version: '2.0',
    features: ['Chat', 'Voice Chat', 'File Upload', 'Multi-language', 'Email Follow-ups', 'Assistant Memory']
  });
});

// Get chat messages with enhanced filtering
app.get('/api/chat', async (req, res) => {
  try {
    const { sessionId, limit = 50 } = req.query;
    let query = {};
    
    if (sessionId) {
      // If sessionId provided, get messages for that session
      const lead = await Lead.findOne({ sessionId });
      if (lead) {
        query.leadId = lead._id;
      }
    }
    
    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('leadId', 'sessionId location');
      
    res.json({
      messages: messages.reverse(), // Reverse to show oldest first
      total: messages.length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Enhanced chat endpoint with better intent recognition
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });

  try {
    let lead = await Lead.findOne({ sessionId });
    if (!lead) {
      lead = new Lead({ 
        sessionId,
        firstInteraction: new Date(),
        lastInteraction: new Date()
      });
    } else {
      lead.lastInteraction = new Date();
    }

    const intentAnalysis = lead.analyzeIntent ? lead.analyzeIntent(message) : { score: 0 };
    await lead.save();

    let detectedLanguage = 'english';
    let targetLang = 'en';
    const detectedLanguages = lngDetector.detect(message);
    if (detectedLanguages.length > 0) {
      detectedLanguage = detectedLanguages[0][0].toLowerCase();
      const languageMap = { 
        english: 'en', french: 'fr', spanish: 'es', german: 'de', 
        italian: 'it', portuguese: 'pt', dutch: 'nl', russian: 'ru',
        japanese: 'ja', chinese: 'zh', korean: 'ko'
      };
      targetLang = languageMap[detectedLanguage] || detectedLanguage;
    }

    let response;
    const messageLower = message.toLowerCase();
    
    // Enhanced intent recognition
    if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
      response = responses.greeting.en;
    } else if (messageLower.includes('solar') || messageLower.includes('panel')) {
      response = responses.solar.en;
    } else if (messageLower.includes('recycl') || messageLower.includes('waste')) {
      response = responses.recycling.en;
    } else if (messageLower.includes('electric') && messageLower.includes('vehicle')) {
      response = responses.electric_vehicles.en;
    } else if (messageLower.includes('green') && (messageLower.includes('building') || messageLower.includes('material'))) {
      response = responses.green_buildings.en;
    } else if (messageLower.includes('energy') && messageLower.includes('efficiency')) {
      response = responses.energy_efficiency.en;
    } else if (messageLower.includes('carbon') && messageLower.includes('footprint')) {
      response = responses.carbon_footprint.en;
    } else if (messageLower.includes('cleantech') || messageLower.includes('clean tech')) {
      response = responses.cleantech.en;
    } else if (messageLower.includes('company') || messageLower.includes('companies')) {
      response = responses.companies.en;
    } else {
      // Enhanced Gemini AI with Clean Tech context
      try {
        const contextPrompt = `You are a Global Clean Tech assistant specializing in sustainable technology, renewable energy, and environmental solutions. 
        User question: ${message}
        
        Please provide a helpful response about clean technology, sustainability, or renewable energy. Keep responses concise and actionable.`;
        
        const aiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contextPrompt,
        });
        response = aiResponse.text || responses.default.en;
      } catch (e) {
        console.error("Gemini fallback error:", e);
        response = responses.default.en;
      }
    }

    // Translate if needed
    if (targetLang !== 'en') {
      response = await translateText(response, targetLang);
    }

    // Save messages to database
    const userMessage = await Message.create({
      message: message,
      isBot: false,
      language: detectedLanguage,
      leadScore: intentAnalysis.score,
      leadId: lead._id,
      sessionId: sessionId
    });

    const botMessage = await Message.create({
      message: response,
      isBot: true,
      language: detectedLanguage,
      leadId: lead._id,
      sessionId: sessionId
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
    }

    res.json({ 
      response, 
      messageId: botMessage._id, 
      detectedLanguage,
      intentScore: intentAnalysis.score,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Enhanced Gemini test endpoint
app.post('/api/ai', async (req, res) => {
  try {
    const userPrompt = req.body.prompt || "Explain how renewable energy works in a few words";
    const context = req.body.context || "clean technology and sustainability";
    
    const enhancedPrompt = `Context: ${context}\nUser question: ${userPrompt}\n\nProvide a helpful, accurate response.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: enhancedPrompt,
    });
    res.json({ 
      response: response.text,
      context: context
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

// Enhanced location endpoint
app.post("/api/location", async (req, res) => {
  const { sessionId, location, timezone } = req.body;

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

    // Update lead with location and timezone
    lead.location = location;
    if (timezone) lead.timezone = timezone;
    lead.lastInteraction = new Date();
    await lead.save();

    res.json({ 
      message: 'Location updated successfully',
      coordinates: lead.location.coordinates,
      timezone: lead.timezone || null
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Enhanced email signup endpoint
app.post('/api/email-signup', async (req, res) => {
  const { email, sessionId, preferences } = req.body;

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

    // Update lead with email and preferences
    lead.email = email;
    lead.lastInteraction = new Date();
    if (preferences) {
      lead.emailPreferences = preferences;
    }
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
      emailScheduled: !lead.emailFollowupScheduled,
      preferences: lead.emailPreferences || {}
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
      preferences: lead.emailPreferences || {},
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

// Chat history management endpoints
app.get('/api/chat-history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  try {
    const lead = await Lead.findOne({ sessionId });
    if (!lead) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = await Message.find({ leadId: lead._id })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalMessages = await Message.countDocuments({ leadId: lead._id });

    res.json({
      messages: messages.reverse(),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages: totalMessages
      }
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

app.delete('/api/chat-history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const lead = await Lead.findOne({ sessionId });
    if (!lead) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const result = await Message.deleteMany({ leadId: lead._id });
    
    // Also clear conversation memory
    await ConversationMemory.findOneAndDelete({ sessionId });

    res.json({ 
      message: 'Chat history cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// New chat session endpoint
app.post('/api/new-chat', async (req, res) => {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newLead = new Lead({
      sessionId,
      firstInteraction: new Date(),
      lastInteraction: new Date(),
      status: 'active'
    });
    
    await newLead.save();

    res.json({
      sessionId,
      message: 'New chat session created successfully'
    });
  } catch (error) {
    console.error('Error creating new chat session:', error);
    res.status(500).json({ error: 'Failed to create new chat session' });
  }
});

// Assistant Memory API endpoints
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

// File upload endpoint
app.post('/api/upload', async (req, res) => {
  try {
    const { file, sessionId, fileType } = req.body;
    
    if (!file || !sessionId) {
      return res.status(400).json({ error: 'File data and session ID are required' });
    }

    // Here you would typically save the file and process it
    // For now, we'll just acknowledge the upload
    
    const lead = await Lead.findOne({ sessionId });
    if (lead) {
      lead.lastInteraction = new Date();
      await lead.save();
    }

    res.json({
      message: 'File uploaded successfully',
      fileType: fileType || 'unknown',
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Enhanced Speech-to-Text endpoint
app.post('/api/stt', async (req, res) => {
  try {
    const { audio, sessionId } = req.body;
    if (!audio) return res.status(400).json({ error: 'Audio data is required' });

    const [response] = await speechClient.recognize({
      audio: { content: audio },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        alternativeLanguageCodes: ['es-ES', 'fr-FR', 'de-DE'],
      },
    });

    const transcript = response.results?.map(r => r.alternatives?.[0]?.transcript || '').join(' ').trim() || '';
    
    // Update lead interaction if sessionId provided
    if (sessionId) {
      const lead = await Lead.findOne({ sessionId });
      if (lead) {
        lead.lastInteraction = new Date();
        await lead.save();
      }
    }

    res.json({ 
      transcript,
      confidence: response.results?.[0]?.alternatives?.[0]?.confidence || 0
    });
  } catch (error) {
    console.error('STT error:', error);
    res.status(500).json({ error: 'Speech-to-Text failed' });
  }
});

// Enhanced Voice Chat Pipeline
app.post('/api/voice-chat', async (req, res) => {
  try {
    const { audio, sessionId } = req.body;
    if (!audio) return res.status(400).json({ error: 'Audio data is required' });
    if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });

    // 1. Speech-to-Text
    const [sttResponse] = await speechClient.recognize({
      audio: { content: audio },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        alternativeLanguageCodes: ['es-ES', 'fr-FR', 'de-DE'],
      },
    });
    const transcript = sttResponse.results?.map(r => r.alternatives?.[0]?.transcript || '').join(' ').trim() || '';

    if (!transcript) {
      return res.status(400).json({ error: 'Could not transcribe audio' });
    }

    // 2. Process through chat API
    const fetch = require('node-fetch');
    const chatResp = await fetch(`http://localhost:${port}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: transcript, sessionId }),
    });
    const chatJson = await chatResp.json();
    const botText = chatJson.response || 'I apologize, but I could not process your request.';

    // 3. Text-to-Speech
    const [ttsResponse] = await ttsClient.synthesizeSpeech({
      input: { text: botText },
      voice: { 
        languageCode: 'en-US', 
        name: 'en-US-Neural2-C',
        ssmlGender: 'FEMALE'
      },
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0
      },
    });
    const audioBase64 = ttsResponse.audioContent.toString('base64');

    res.json({ 
      transcript, 
      botText, 
      audioBase64,
      confidence: sttResponse.results?.[0]?.alternatives?.[0]?.confidence || 0
    });
  } catch (error) {
    console.error('Voice Chat error:', error);
    res.status(500).json({ error: 'Voice Chat failed' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await Message.countDocuments({});
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      messageCount: dbStatus,
      services: {
        geminiAI: !!process.env.GOOGLE_GEMINI_API_KEY,
        translation: !!process.env.GOOGLE_TRANSLATE_API_KEY,
        speechToText: true,
        textToSpeech: true
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Start email processor
require('./lib/emailProcessor');

// Start the server
app.listen(port, () => {
  connectDB();
  console.log(`🌱 Global Clean Tech Server is running on http://localhost:${port}`);
  console.log('📊 Available endpoints:');
  console.log('  - GET  /api/health - Health check');
  console.log('  - POST /api/chat - Main chat endpoint');
  console.log('  - POST /api/voice-chat - Voice chat pipeline');
  console.log('  - POST /api/email-signup - Email registration');
  console.log('  - GET  /api/memory/:sessionId - Conversation memory');
  console.log('  - POST /api/new-chat - Create new chat session');
});