const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Sample responses for demonstration
const responses = {
  greeting: "Hello! I'm your Cleantech Directory assistant. How can I help you today?",
  default: "I'm a demo chatbot. In a real implementation, I would connect to a database of cleantech companies and provide specific information about sustainable solutions.",
  cleantech: "The Global Cleantech Directory helps connect businesses with sustainable technology solutions. We can help you find companies specializing in renewable energy, waste management, water treatment, and more.",
  companies: "We have a database of thousands of cleantech companies worldwide. Would you like to search by sector, location, or technology type?",
};

app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  
  // Simple response logic
  let response = responses.default;
  
  if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    response = responses.greeting;
  } else if (message.toLowerCase().includes('cleantech')) {
    response = responses.cleantech;
  } else if (message.toLowerCase().includes('company') || message.toLowerCase().includes('companies')) {
    response = responses.companies;
  }
  
  // Simulate a slight delay to make it feel more natural
  setTimeout(() => {
    res.json({ response });
  }, 500);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 