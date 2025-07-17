require('dotenv').config();
const connectDB = require('./lib/db');
const express = require('express');
const cors = require('cors');
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();
const Message = require('./models/Message');
const Lead = require('./models/Lead');
const { Translate } = require('@google-cloud/translate').v2;

// Add email functionality imports
const { scheduleFollowUpEmails, cancelFollowUpEmails } = require('./lib/emailScheduler');
const EmailSchedule = require('./models/EmailSchedule');

const app = express();
const port = process.env.PORT || 5003;

// Initialize Google Cloud Translate with API key
const translate = new Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY
});

// Helper function for translation
async function translateText(text, targetLanguage) {
  try {
    // Map language detector output to Google Translate language codes
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
    return text; // Return original text if translation fails
  }
}

app.use(cors());
app.use(express.json());

// Sample responses for demonstration
const responses = {
  greeting: {
    en: "Hello! I'm your Cleantech Directory assistant. How can I help you today?",
    fr: "Bonjour! Je suis votre assistant Cleantech Directory. Comment puis-je vous aider aujourd'hui?",
    es: "¡Hola! Soy tu asistente de Cleantech Directory. ¿Cómo puedo ayudarte hoy?",
    de: "Hallo! Ich bin Ihr Cleantech Directory Assistent. Wie kann ich Ihnen heute helfen?",
    it: "Ciao! Sono il tuo assistente Cleantech Directory. Come posso aiutarti oggi?",
    pt: "Olá! Sou seu assistente do Cleantech Directory. Como posso ajudar você hoje?",
    nl: "Hallo! Ik ben uw Cleantech Directory assistent. Hoe kan ik u vandaag helpen?",
    ru: "Здравствуйте! Я ваш помощник Cleantech Directory. Как я могу помочь вам сегодня?",
    ja: "こんにちは！Cleantech Directoryアシスタントです。本日はどのようにお手伝いできますか？",
    zh: "你好！我是你的Cleantech Directory助手。今天我能为您做些什么？",
    ko: "안녕하세요! Cleantech Directory 도우미입니다. 오늘 어떻게 도와드릴까요?"
  },
  default: {
    en: "I'm a demo chatbot. In a real implementation, I would connect to a database of cleantech companies and provide specific information about sustainable solutions.",
    fr: "Je suis un chatbot de démonstration. Dans une implémentation réelle, je me connecterais à une base de données d'entreprises de technologies propres et fournirais des informations spécifiques sur des solutions durables.",
    es: "Soy un chatbot de demostración. En una implementación real, me conectaría a una base de datos de empresas de tecnología limpia y proporcionaría información específica sobre soluciones sostenibles.",
    de: "Ich bin ein Demo-Chatbot. In einer echten Implementierung würde ich mich mit einer Datenbank von Cleantech-Unternehmen verbinden und spezifische Informationen über nachhaltige Lösungen bereitstellen.",
    it: "Sono un chatbot dimostrativo. In un'implementazione reale, mi collegherei a un database di aziende cleantech e fornirrei informazioni specifiche sulle soluzioni sostenibili.",
    pt: "Sou um chatbot de demonstração. Em uma implementação real, eu me conectaria a um banco de dados de empresas de tecnologia limpa e forneceria informações específicas sobre soluções sustentáveis.",
    nl: "Ik ben een demo-chatbot. In een echte implementatie zou ik verbinding maken met een database van cleantech-bedrijven en specifieke informatie verstrekken over duurzame oplossingen.",
    ru: "Я демо-чатбот. В реальной реализации я бы подключился к базе данных компаний чистых технологий и предоставлял конкретную информацию об устойчивых решениях.",
    ja: "これはデモチャットボットです。実際の実装では、クリーンテック企業のデータベースに接続し、持続可能なソリューションに関する具体的な情報を提供します。",
    zh: "我是演示聊天机器人。在实际实施中，我将连接到清洁技术公司数据库并提供有关可持续解决方案的具体信息。",
    ko: "저는 데모 챗봇입니다. 실제 구현에서는 클린테크 기업 데이터베이스에 연결하여 지속 가능한 솔루션에 대한 구체적인 정보를 제공할 것입니다."
  },
  cleantech: {
    en: "The Global Cleantech Directory helps connect businesses with sustainable technology solutions. We can help you find companies specializing in renewable energy, waste management, water treatment, and more.",
    fr: "Le Global Cleantech Directory aide à connecter les entreprises avec des solutions technologiques durables. Nous pouvons vous aider à trouver des entreprises spécialisées dans l'énergie renouvelable, la gestion des déchets, le traitement de l'eau et plus encore.",
    es: "El Directorio Global de Cleantech ayuda a conectar empresas con soluciones tecnológicas sostenibles. Podemos ayudarte a encontrar empresas especializadas en energía renovable, gestión de residuos, tratamiento de agua y más.",
    de: "Das Global Cleantech Directory hilft Unternehmen, nachhaltige Technologielösungen zu finden. Wir können Ihnen helfen, Unternehmen zu finden, die sich auf erneuerbare Energien, Abfallwirtschaft, Wasseraufbereitung und mehr spezialisiert haben.",
    it: "La Global Cleantech Directory aiuta a connettere le imprese con soluzioni tecnologiche sostenibili. Possiamo aiutarti a trovare aziende specializzate in energia rinnovabile, gestione dei rifiuti, trattamento delle acque e altro ancora.",
    pt: "O Global Cleantech Directory ajuda a conectar empresas com soluções tecnológicas sustentáveis. Podemos ajudá-lo a encontrar empresas especializadas em energia renovável, gestão de resíduos, tratamento de água e muito mais.",
    nl: "De Global Cleantech Directory helpt bedrijven te verbinden met duurzame technologische oplossingen. We kunnen u helpen bij het vinden van bedrijven die gespecialiseerd zijn in hernieuwbare energie, afvalbeheer, waterbehandeling en meer.",
    ru: "Global Cleantech Directory помогает связать бизнес с устойчивыми технологическими решениями. Мы можем помочь вам найти компании, специализирующиеся на возобновляемой энергии, управлении отходами, очистке воды и многом другом.",
    ja: "Global Cleantech Directoryは、持続可能な技術ソリューションと企業をつなぐお手伝いをします。再生可能エネルギー、廃棄物管理、水処理などを専門とする企業を見つけるお手伝いができます。",
    zh: "全球清洁技术目录帮助企业对接可持续技术解决方案。我们可以帮助您找到专门从事可再生能源、废物管理、水处理等领域的公司。",
    ko: "Global Cleantech Directory는 기업과 지속 가능한 기술 솔루션을 연결하는 것을 돕습니다. 재생 에너지, 폐기물 관리, 수처리 등을 전문으로 하는 기업을 찾는 데 도움을 드릴 수 있습니다."
  },
  companies: {
    en: "We have a database of thousands of cleantech companies worldwide. Would you like to search by sector, location, or technology type?",
    fr: "Nous disposons d'une base de données de milliers d'entreprises cleantech dans le monde. Souhaitez-vous rechercher par secteur, emplacement ou type de technologie?",
    es: "Tenemos una base de datos de miles de empresas de tecnología limpia en todo el mundo. ¿Te gustaría buscar por sector, ubicación o tipo de tecnología?",
    de: "Wir verfügen über eine Datenbank mit tausenden von Cleantech-Unternehmen weltweit. Möchten Sie nach Sektor, Standort oder Technologietyp suchen?",
    it: "Abbiamo un database di migliaia di aziende cleantech in tutto il mondo. Desideri cercare per settore, posizione o tipo di tecnologia?",
    pt: "Temos um banco de dados com milhares de empresas de tecnologia limpa em todo o mundo. Gostaria de pesquisar por setor, localização ou tipo de tecnologia?",
    nl: "We hebben een database van duizenden cleantech-bedrijven wereldwijd. Wilt u zoeken op sector, locatie of technologietype?",
    ru: "У нас есть база данных тысяч компаний чистых технологий по всему миру. Хотите искать по сектору, местоположению или типу технологии?",
    ja: "世界中の何千ものクリーンテック企業のデータベースを持っています。セクター、場所、または技術タイプで検索しますか？",
    zh: "我们拥有全球数千家清洁技术公司的数据库。您想按行业、位置还是技术类型搜索？",
    ko: "우리는 전 세계 수천 개의 클린테크 기업 데이터베이스를 보유하고 있습니다. 부문, 위치 또는 기술 유형별로 검색하시겠습니까?"
  }
};

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Global Cleantech Directory API' });
})

app.get('/api/chat', async (req, res) => {
  try {
    // Get all messages sorted by timestamp
    const messages = await Message.find({}).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // Find or create lead
    let lead = await Lead.findOne({ sessionId });
    if (!lead) {
      lead = new Lead({ sessionId });
    }

    // Analyze intent and update lead
    const intentAnalysis = lead.analyzeIntent(message);
    await lead.save();

    // Enhanced language detection for ALL languages
    let detectedLanguage = 'english';
    let targetLang = 'en';
    
    // Check for specific language patterns first (more reliable for non-Latin scripts)
    if (message.match(/[가-힣]/)) {
      // Korean characters
      detectedLanguage = 'korean';
      targetLang = 'ko';
    } else if (message.match(/[\u3040-\u309F]/)) {
      // Japanese hiragana
      detectedLanguage = 'japanese';
      targetLang = 'ja';
    } else if (message.match(/[\u30A0-\u30FF]/)) {
      // Japanese katakana
      detectedLanguage = 'japanese';
      targetLang = 'ja';
    } else if (message.match(/[\u4E00-\u9FAF]/)) {
      // Chinese characters (CJK Unified Ideographs)
      detectedLanguage = 'chinese';
      targetLang = 'zh';
    } else if (message.match(/[\u0900-\u097F]/)) {
      // Hindi/Devanagari
      detectedLanguage = 'hindi';
      targetLang = 'hi';
    } else if (message.match(/[\u0980-\u09FF]/)) {
      // Bengali
      detectedLanguage = 'bengali';
      targetLang = 'bn';
    } else if (message.match(/[\u0A00-\u0A7F]/)) {
      // Gujarati
      detectedLanguage = 'gujarati';
      targetLang = 'gu';
    } else if (message.match(/[\u0A80-\u0AFF]/)) {
      // Punjabi
      detectedLanguage = 'punjabi';
      targetLang = 'pa';
    } else if (message.match(/[\u0B00-\u0B7F]/)) {
      // Tamil
      detectedLanguage = 'tamil';
      targetLang = 'ta';
    } else if (message.match(/[\u0C00-\u0C7F]/)) {
      // Telugu
      detectedLanguage = 'telugu';
      targetLang = 'te';
    } else if (message.match(/[\u0600-\u06FF]/)) {
      // Arabic
      detectedLanguage = 'arabic';
      targetLang = 'ar';
    } else if (message.match(/[\u0590-\u05FF]/)) {
      // Hebrew
      detectedLanguage = 'hebrew';
      targetLang = 'he';
    } else if (message.match(/[\u0400-\u04FF]/)) {
      // Cyrillic (Russian, Ukrainian, Bulgarian, etc.)
      detectedLanguage = 'russian';
      targetLang = 'ru';
    } else if (message.match(/[\u0370-\u03FF]/)) {
      // Greek
      detectedLanguage = 'greek';
      targetLang = 'el';
    } else if (message.match(/[\u0E00-\u0E7F]/)) {
      // Thai
      detectedLanguage = 'thai';
      targetLang = 'th';
    } else if (message.match(/[\u1000-\u109F]/)) {
      // Myanmar/Burmese
      detectedLanguage = 'burmese';
      targetLang = 'my';
    } else if (message.match(/[\u1780-\u17FF]/)) {
      // Khmer/Cambodian
      detectedLanguage = 'khmer';
      targetLang = 'km';
    } else if (message.match(/[\u0E80-\u0EFF]/)) {
      // Lao
      detectedLanguage = 'lao';
      targetLang = 'lo';
    } else {
      // Fall back to languagedetect for Latin scripts (English, French, Spanish, etc.)
      const detectedLanguages = lngDetector.detect(message);
      if (detectedLanguages.length > 0) {
        detectedLanguage = detectedLanguages[0][0].toLowerCase();
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
          'korean': 'ko',
          'hindi': 'hi',
          'arabic': 'ar',
          'hebrew': 'he',
          'greek': 'el',
          'thai': 'th',
          'vietnamese': 'vi',
          'turkish': 'tr',
          'polish': 'pl',
          'czech': 'cs',
          'hungarian': 'hu',
          'finnish': 'fi',
          'swedish': 'sv',
          'norwegian': 'no',
          'danish': 'da'
        };
        targetLang = languageMap[detectedLanguage] || detectedLanguage;
      }
    }

    // Always start with English response
    let response;
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('hello') || messageLower.includes('hi') || 
        messageLower.includes('bonjour') || messageLower.includes('hola') || 
        messageLower.includes('ciao') || messageLower.includes('hallo') ||
        message.includes('안녕하세요') || message.includes('नमस्ते') ||
        message.includes('こんにちは') || message.includes('你好') ||
        message.includes('مرحبا') || message.includes('שלום') ||
        message.includes('Γεια σας') || message.includes('สวัสดี')) {
      response = responses.greeting.en;
    } else if (messageLower.includes('cleantech') || messageLower.includes('clean tech')) {
      response = responses.cleantech.en;
    } else if (messageLower.includes('company') || messageLower.includes('companies')) {
      response = responses.companies.en;
    } else {
      response = responses.default.en;
    }

    // Always translate to detected language if not English
    if (targetLang !== 'en') {
      response = await translateText(response, targetLang);
    }

    // Store messages
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

    // Check if we should prompt for membership
    let membershipPrompt = null;
    if (!lead.membershipPrompted && 
        (lead.status === 'interested' || lead.status === 'high_intent')) {
      membershipPrompt = {
        type: 'membership_prompt',
        message: "I notice you're interested in our services! Would you like to create a free account to access more features and connect with cleantech companies?",
        cta: {
          text: "Join Free",
          url: "/signup"
        }
      };
      lead.membershipPrompted = true;
      await lead.save();
    }

    // Add delay for natural feel
    setTimeout(() => {
      res.json({ 
        response,
        messageId: botMessage._id,
        detectedLanguage,
        membershipPrompt,
        leadStatus: lead.status,
        intentScore: lead.intentScore
      });
    }, 500);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      response: response 
    });
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

// Start email processor
require('./lib/emailProcessor');

app.listen(port, () => {
  // Call the connect function
  connectDB();
  console.log(`Server is running on port http://localhost:${port}`);
});