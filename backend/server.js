require('dotenv').config();
const express = require('express');
const cors = require('cors');
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();
const { Translate } = require('@google-cloud/translate').v2;

const app = express();
const port = process.env.PORT || 5003;

// Initialize Google Cloud Translate with API key
const translate = new Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY
});

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

app.post('/api/chat', async (req, res) => {
  const { message, language } = req.body;

  // Keyword-based language override
  const keywordLangMap = {
    namaste: 'hi',
    vanakkam: 'ta',
    hola: 'es',
    bonjour: 'fr',
    hallo: 'de',
    ciao: 'it',
    salut: 'fr',
    hej: 'sv',
    aloha: 'haw',
    salam: 'ar',
    merhaba: 'tr',
    olá: 'pt',
    privet: 'ru',
    konnichiwa: 'ja',
    annyeong: 'ko',
    xinchao: 'vi',
    sawasdee: 'th',
    shalom: 'he',
    nihao: 'zh',
    czesc: 'pl',
    tere: 'et',
    zdravo: 'hr',
    ahoj: 'cs',
    selamat: 'id',
    mabuhay: 'tl',
    jambo: 'sw',
    marhaba: 'ar',
    szia: 'hu',
    kumusta: 'tl',
    sawubona: 'zu',
    jambo: 'sw',
    goddag: 'da',
    hei: 'fi',
    sveiki: 'lv',
    labas: 'lt',
    bok: 'hr',
    zdravei: 'bg',
    zdravo: 'sr',
    ahoj: 'sk',
    hallo: 'nl',
    servus: 'de',
    tere: 'et',
    hei: 'no',
    hei: 'fi',
    hei: 'sv',
    hei: 'da',
    hei: 'is',
    hei: 'fo',
    hei: 'kl',
    hei: 'sm',
    hei: 'to',
    hei: 'ty',
    hei: 'mi',
    hei: 'mg',
    hei: 'rn',
    hei: 'rw',
    hei: 'so',
    hei: 'ss',
    hei: 'st',
    hei: 'tn',
    hei: 'ts',
    hei: 've',
    hei: 'xh',
    hei: 'zu',
  };

  let detectedLangCode = 'en';
  let detectedLanguage = 'english';

  // Check for keyword override
  const msgLower = message.trim().toLowerCase();
  if (keywordLangMap[msgLower]) {
    detectedLangCode = keywordLangMap[msgLower];
  } else if (!language || language === 'auto') {
    // Use Google Translate's detect method
    const [detection] = await translate.detect(message);
    detectedLangCode = Array.isArray(detection) ? detection[0].language : detection.language;
  } else {
    detectedLangCode = language;
  }

  // Map language code to language name
  const codeToLang = {
    en: 'english', fr: 'french', hi: 'hindi', es: 'spanish', de: 'german', zh: 'chinese', ja: 'japanese', ko: 'korean', ru: 'russian', pt: 'portuguese', it: 'italian', nl: 'dutch'
  };
  detectedLanguage = codeToLang[detectedLangCode] || detectedLangCode;

  const cannedResponse = "Hello! I'm your Cleantech Directory assistant. How can I help you today?";

  try {
    if (detectedLangCode === 'en') {
      res.json({
        response: cannedResponse,
        detectedLanguage
      });
    } else {
      const [translation] = await translate.translate(cannedResponse, detectedLangCode);
      res.json({
        response: translation,
        detectedLanguage
      });
    }
  } catch (error) {
    console.error('Google Translate error:', error.response?.data || error.message);
    res.status(500).json({
      response: "Sorry, I'm having trouble connecting to the translation service.",
      detectedLanguage
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});