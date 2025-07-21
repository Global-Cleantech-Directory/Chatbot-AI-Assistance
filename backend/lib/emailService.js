const formData = require('form-data');
const Mailgun = require('mailgun.js');
const AssistantMemoryService = require('./assistantMemory');

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

const emailTemplates = {
  day3: {
    subject: 'Follow up: Cleantech Directory - Still interested?',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Hi there!</h2>
        <p>We noticed you were exploring our Cleantech Directory a few days ago. Are you still looking for sustainable technology solutions?</p>
        <p>We can help you connect with:</p>
        <ul style="color: #333;">
          <li>Renewable energy companies</li>
          <li>Waste management solutions</li>
          <li>Water treatment technologies</li>
          <li>Clean transportation solutions</li>
          <li>Green building technologies</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://your-domain.com/chat" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Continue Your Search</a>
        </div>
        <p style="color: #666; font-size: 14px;">Need help? Simply reply to this email or visit our website.</p>
      </div>
    `
  },
  day7: {
    subject: 'Cleantech Solutions: Weekly Industry Updates',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Weekly Cleantech Highlights</h2>
        <p>Here are some exciting developments in the cleantech industry this week:</p>
        <ul style="color: #333;">
          <li>🌞 New breakthrough in solar energy efficiency reaches 47%</li>
          <li>♻️ Innovative waste-to-energy solutions reducing landfill by 80%</li>
          <li>💧 Advanced water purification technology removes 99.9% of contaminants</li>
          <li>🌱 Carbon capture technology scales to industrial level</li>
        </ul>
        <p>Ready to explore cleantech companies in your area?</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://your-domain.com/companies" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Browse Companies</a>
        </div>
        <p style="color: #666; font-size: 14px;">Stay updated with the latest in clean technology innovations.</p>
      </div>
    `
  },
  day14: {
    subject: 'Last chance: Connect with Cleantech Leaders',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF5722;">Don't miss out on cleantech opportunities!</h2>
        <p>It's been two weeks since you visited our Cleantech Directory. The industry is moving fast, and new opportunities emerge daily.</p>
        <p><strong>Join thousands of businesses already connected through our platform:</strong></p>
        <ul style="color: #333;">
          <li>✅ Access to 500+ verified cleantech companies</li>
          <li>🤝 Direct connections with technology providers</li>
          <li>📊 Industry insights and market trends</li>
          <li>💡 Innovation spotlights and case studies</li>
          <li>🎯 Personalized recommendations</li>
        </ul>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #FF5722;">Limited Time: Free premium access for early adopters!</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://your-domain.com/signup" style="background: #FF5722; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Join Now - Free</a>
        </div>
        <p style="color: #666; font-size: 12px; text-align: center;">
          This is our final follow-up. 
          <a href="https://your-domain.com/unsubscribe" style="color: #666;">Unsubscribe</a> | 
          <a href="https://your-domain.com/contact" style="color: #666;">Contact Support</a>
        </p>
      </div>
    `
  }
};

async function sendEmail(to, templateType, leadData = {}) {
  const template = emailTemplates[templateType];
  
  if (!template) {
    throw new Error(`Template ${templateType} not found`);
  }

  // Get personalized content from conversation memory
  let personalizedContext = null;
  if (leadData.sessionId) {
    try {
      personalizedContext = await AssistantMemoryService.generateEmailContext(leadData.sessionId, templateType);
    } catch (error) {
      console.log('Could not get personalized context, using default template:', error.message);
    }
  }

  // Create personalized email content
  let subject = template.subject;
  let htmlContent = template.html;
  
  if (personalizedContext) {
    // Personalize the subject line
    if (personalizedContext.interests && personalizedContext.interests.length > 0) {
      const mainInterest = personalizedContext.interests[0];
      subject = subject.replace('Cleantech Directory', `${mainInterest.charAt(0).toUpperCase() + mainInterest.slice(1)} Solutions`);
    }
    
    // Insert personalized content into the template
    htmlContent = htmlContent.replace(
      '<p>We noticed you were exploring',
      `<p>${personalizedContext.personalizedContent}</p><p>We noticed you were exploring`
    );
    
    // Update greeting if we know their role
    if (personalizedContext.role) {
      htmlContent = htmlContent.replace('Hi there!', `Hello ${personalizedContext.role}!`);
    }
  }

  const messageData = {
    from: 'Cleantech Directory <noreply@calvin.mydomain.com>',
    to: to,
    subject: subject,
    html: htmlContent,
    text: htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
  };

  try {
    const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, messageData);
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Function to create personalized email templates
function createPersonalizedTemplate(templateType, context) {
  const baseTemplate = emailTemplates[templateType];
  
  if (!context) return baseTemplate;
  
  let personalizedHtml = baseTemplate.html;
  
  // Replace placeholders with personalized content
  if (context.interests) {
    const interestList = context.interests.map(interest => 
      `<li>${interest.charAt(0).toUpperCase() + interest.slice(1)} solutions</li>`
    ).join('');
    
    personalizedHtml = personalizedHtml.replace(
      '<li>Renewable energy companies</li>',
      interestList || '<li>Renewable energy companies</li>'
    );
  }
  
  // Add personalized recommendations if available
  if (context.recommendations && context.recommendations.length > 0) {
    const recommendationSection = `
      <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h3 style="color: #333; margin-top: 0;">Recommended for You:</h3>
        <ul>
          ${context.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    `;
    
    personalizedHtml = personalizedHtml.replace(
      '<div style="text-align: center; margin: 30px 0;">',
      recommendationSection + '<div style="text-align: center; margin: 30px 0;">'
    );
  }
  
  return {
    subject: baseTemplate.subject,
    html: personalizedHtml
  };
}

module.exports = { sendEmail, createPersonalizedTemplate };
