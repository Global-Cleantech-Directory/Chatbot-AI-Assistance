require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);  // Your Gemini API Key

async function testImage() {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Load image and convert to base64
  const imagePath = "test.jpg"; // Change this to your image file
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString("base64");

  // Send prompt with image
  const result = await model.generateContent([
    { text: "Describe this image in detail." },
    { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
  ]);

  console.log("Gemini Response:", result.response.text());
}

testImage().catch(console.error);
