import express from 'express';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { DataAPIClient } from '@datastax/astra-db-ts';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const router = express.Router();
const { 
  ASTRA_DB_NAMESPACE, 
  ASTRA_DB_COLLECTION, 
  ASTRA_DB_API_ENDPOINT, 
  ASTRA_DB_APPLICATION_TOKEN,
  GOOGLE_GEMINI_API_KEY,
  HUGGINGFACE_API_KEY
} = process.env;

// Validate required environment variables
const validateEnvVars = () => {
  const required = [
    'GOOGLE_GEMINI_API_KEY',
    'HUGGINGFACE_API_KEY',
    'ASTRA_DB_APPLICATION_TOKEN',
    'ASTRA_DB_API_ENDPOINT'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing);
    return false;
  }
  return true;
};

// Vector validation utility
const validateVector = (vector) => {
  if (!Array.isArray(vector)) {
    throw new Error(`Expected array, got ${typeof vector}`);
  }
  if (vector.length !== 1024) {
    throw new Error(`Expected 1024 dimensions, got ${vector.length}`);
  }
  vector.forEach((v, i) => {
    if (typeof v !== 'number' || isNaN(v)) {
      throw new Error(`Invalid value at position ${i}: ${v}`);
    }
  });
  return Array.from(vector); // Return a clean copy
};

// Initialize AI services with error handling
let ai, huggingFace, db;

try {
  if (!validateEnvVars()) {
    throw new Error('Missing required environment variables');
  }

  ai = new GoogleGenAI({ apiKey: GOOGLE_GEMINI_API_KEY });
  huggingFace = new HuggingFaceInferenceEmbeddings({
    model: "BAAI/bge-m3",
    apiKey: HUGGINGFACE_API_KEY,
    timeout: 10000 // 10 second timeout
  });

  // Initialize database connection
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  db = client.db(ASTRA_DB_API_ENDPOINT, { 
    keyspace: ASTRA_DB_NAMESPACE 
  });
  
  console.log('✅ Services initialized successfully');
} catch (error) {
  console.error('❌ Service initialization failed:', error);
}

/**
 * POST /chat - Handle chat requests with RAG capabilities
 */
router.post('/chat', async (req, res) => {
  console.log('Route received request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { message, sessionId, targetLang } = req.body;
    
    if (!message || typeof message !== 'string' || !message.trim()) {
      console.error('Invalid message received:', { message, type: typeof message });
      return res.status(400).json({ 
        error: "Valid message is required",
        response: "Please provide a valid message."
      });
    }

    console.log(`✅ Processing message: "${message.substring(0, 100)}..."`);

    // Service availability checks
    if (!ai) {
      console.error('❌ Gemini AI service not initialized');
      return res.status(500).json({ 
        error: "Gemini AI service not available",
        response: "I'm experiencing technical difficulties. Please try again."
      });
    }

    let docContext = "";
    let contextUsed = false;
    let ragDebug = {};

    // Try to get context from vector database
    try {
      if (ASTRA_DB_COLLECTION && db && huggingFace) {
        console.log('🔍 Generating embedding for query...');
        ragDebug.embeddingAttempt = true;
        
        const embedding = await huggingFace.embedQuery(message);
        console.log('✅ Embedding generated, validating dimensions...');
        
        // VALIDATE AND PREPARE VECTOR
        const queryVector = validateVector(embedding);
        ragDebug.embeddingSuccess = true;
        ragDebug.embeddingLength = queryVector.length;
        ragDebug.embeddingSample = queryVector.slice(0, 5);
        
        console.log('🔎 Querying database with validated vector...');
        const collection = await db.collection(ASTRA_DB_COLLECTION);
        const cursor = collection.find({}, {
          sort: { $vector: queryVector },
          limit: 10,
          includeSimilarity: true
        });

        const documents = await cursor.toArray();
        console.log(`📚 Found ${documents.length} relevant documents`);
        ragDebug.documentsFound = documents.length;
        ragDebug.documentSimilarities = documents.map(d => d.$similarity);
        
        if (documents.length > 0) {
          const relevantDocs = documents.filter(doc => doc.$similarity > 0.7);
          ragDebug.relevantDocsCount = relevantDocs.length;
          
          if (relevantDocs.length > 0) {
            docContext = relevantDocs
              .map(doc => doc.text)
              .join('\n---\n');
            contextUsed = true;
            console.log('📖 Using context from knowledge base');
            ragDebug.contextUsed = true;
            ragDebug.contextLength = docContext.length;
          } else {
            ragDebug.contextUsed = false;
            ragDebug.reason = 'No documents above similarity threshold (0.7)';
          }
        } else {
          ragDebug.contextUsed = false;
          ragDebug.reason = 'No documents found in vector search';
        }
      } else {
        console.log('⚠️ Skipping database query - missing services or config');
        ragDebug.skipped = true;
        ragDebug.reasons = {
          noCollection: !ASTRA_DB_COLLECTION,
          noDatabase: !db,
          noHuggingFace: !huggingFace
        };
      }
    } catch (dbError) {
      console.error("❌ Database query error:", {
        message: dbError.message,
        stack: dbError.stack,
        code: dbError.code
      });
      ragDebug.error = dbError.message;
    }

    // Construct the RAG prompt with better structure
    const systemPrompt = `You are an AI assistant for the Global Cleantech Directory, a platform that connects cleantech companies worldwide with opportunities for growth, partnerships, and investment.

Your role is to:
- Provide helpful information about clean technology solutions
- Guide users toward business opportunities on the platform
- Share insights about renewable energy, sustainability, and green innovation
- Connect users with relevant resources and contacts
- Maintain a professional yet approachable tone

Platform Benefits to Highlight:
- Global visibility for cleantech companies
- Partnership and collaboration opportunities  
- Access to investors and funding
- Market intelligence and industry insights
- Canadian roots with worldwide reach

Make sure to keep it consise and to the point. Do not include any additional information that is not relevant to the user's question.

Key Sectors: Solar, Wind, Energy Storage, Electric Vehicles, Green Buildings, Water Technology, Sustainable Agriculture, Waste Management`;

    const userPrompt = contextUsed && docContext ? 
      `Context from knowledge base:\n${docContext}\n\nUser Question: ${message}` :
      `User Question: ${message}`;

    console.log('🤖 Generating response with Gemini...');
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\n${userPrompt}`
    });

    const responseText = result.text || result.response?.text() || 
      "I understand you're interested in clean technology solutions. The Global Cleantech Directory can help connect you with innovative companies and opportunities in renewable energy, sustainability, and green innovation. Could you tell me more specifically what you're looking for?";

    res.json({
      response: responseText,
      context: contextUsed ? "Used relevant knowledge base" : "Generated from general knowledge",
      sessionId: sessionId || null,
      ragDebug: process.env.NODE_ENV === 'development' ? ragDebug : undefined
    });

  } catch (error) {
    console.error("❌ Chat endpoint error:", error);
    res.status(500).json({ 
      response: "I'm experiencing technical difficulties. Please try again later.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Debug endpoint with improved vector validation
router.post('/debug-rag', async (req, res) => {
  const { message = "solar energy" } = req.body;
  
  const debug = {
    message,
    timestamp: new Date().toISOString(),
    environmentVars: {
      hasHuggingFaceKey: !!HUGGINGFACE_API_KEY,
      hasAstraToken: !!ASTRA_DB_APPLICATION_TOKEN,
      hasAstraEndpoint: !!ASTRA_DB_API_ENDPOINT,
      hasNamespace: !!ASTRA_DB_NAMESPACE,
      hasCollection: !!ASTRA_DB_COLLECTION,
      namespace: ASTRA_DB_NAMESPACE,
      collection: ASTRA_DB_COLLECTION
    },
    services: {
      huggingFaceInitialized: !!huggingFace,
      databaseInitialized: !!db
    }
  };

  // Test 1: HuggingFace Embeddings
  try {
    if (huggingFace) {
      console.log('🔍 Testing HuggingFace embeddings...');
      const embedding = await huggingFace.embedQuery(message);
      debug.embedding = {
        success: true,
        length: embedding.length,
        sample: embedding.slice(0, 10),
        actualLengthCheck: `First: ${embedding[0]}, Last: ${embedding[embedding.length-1]}`,
        type: typeof embedding[0]
      };
    }
  } catch (error) {
    debug.embedding = { success: false, error: error.message };
  }

  // Test 2: Database Connection
  try {
    if (db) {
      const collections = await db.listCollections();
      debug.database = {
        success: true,
        collections: collections.map(c => c.name),
        targetCollection: ASTRA_DB_COLLECTION
      };
    }
  } catch (error) {
    debug.database = { success: false, error: error.message };
  }

  // Test 3: Vector Search
  if (debug.embedding.success && debug.database.success && ASTRA_DB_COLLECTION) {
    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION);
      const embedding = await huggingFace.embedQuery(message);
      const queryVector = validateVector(embedding);
      
      const searchResults = await collection.find({}, {
        sort: { $vector: queryVector },
        limit: 3,
        includeSimilarity: true
      }).toArray();
      
      debug.vectorSearch = {
        success: true,
        results: searchResults.map(doc => ({
          id: doc._id,
          similarity: doc.$similarity,
          textSample: doc.text?.substring(0, 100)
        }))
      };
    } catch (error) {
      debug.vectorSearch = { 
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  res.json(debug);
});

// Simple test endpoint to verify Gemini is working
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 Testing Gemini connection...');
    
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Say 'Hello from Gemini!' in a friendly way."
    });
    
    console.log('Raw Gemini result:', JSON.stringify(result, null, 2));
    const responseText = result.text || result.response?.text() || 'No text found';
    
    res.json({
      success: true,
      response: responseText,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Gemini test failed:', error);
    res.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint for the route
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      gemini: !!GOOGLE_GEMINI_API_KEY,
      huggingface: !!HUGGINGFACE_API_KEY,
      database: !!ASTRA_DB_APPLICATION_TOKEN
    }
  };

  try {
    // Test Gemini connection
    if (ai) {
      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
      const testResult = await model.generateContent("Hello");
      health.services.gemini = !!testResult.response.text();
    }
  } catch (error) {
    health.services.gemini = false;
    health.geminiError = error.message;
  }

  res.json(health);
});

export default router;