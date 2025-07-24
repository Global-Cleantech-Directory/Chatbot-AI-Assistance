# Email Follow-up System

Automated email follow-up system that sends scheduled emails to leads based on their interaction with the chatbot.

## 🚀 Features

- ✅ **3-Day Follow-up**: "Still interested?" engagement email
- ✅ **7-Day Follow-up**: Industry updates and company browsing
- ✅ **14-Day Follow-up**: Final opportunity with urgency
- ✅ **Smart Filtering**: Only emails leads with intent score ≥ 30
- ✅ **HTML Templates**: Beautiful, responsive email designs
- ✅ **Automatic Processing**: Cron jobs send emails hourly
- ✅ **Error Handling**: Retry logic and failure management
- ✅ **Cleanup**: Auto-removes old email records

## 📋 Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Fill in your Mailgun credentials:
```env
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
```

### 2. Mailgun Configuration

1. Create account at https://app.mailgun.com
2. Get API key and domain from dashboard
3. For sandbox testing: Add authorized recipients
4. For production: Verify your custom domain

### 3. Install Dependencies

```bash
npm install mailgun.js node-cron form-data
```

## 🔌 API Endpoints

### Email Signup
```http
POST /api/email-signup
Content-Type: application/json

{
  "email": "user@example.com",
  "sessionId": "unique-session-id"
}
```

### Check Email Schedule
```http
GET /api/email-schedule/:sessionId
```

### Cancel Follow-ups
```http
POST /api/cancel-emails/:sessionId
```

## 🏗️ Architecture

```
lib/
├── emailService.js     # Mailgun integration & templates
├── emailScheduler.js   # Schedule 3/7/14-day emails  
└── emailProcessor.js   # Cron jobs for sending

models/
└── EmailSchedule.js    # Database model for schedules
```

## ⚡ How It Works

1. **Lead Interaction**: User chats with bot, intent score calculated
2. **Email Collection**: User provides email via signup endpoint
3. **Smart Scheduling**: If intent ≥ 30, schedule 3 follow-up emails
4. **Automatic Sending**: Hourly cron job processes scheduled emails
5. **Status Tracking**: Database tracks sent/pending status

## 🎯 Integration

The system automatically starts when your server runs. Email processor logs activity:

```bash
📨 Email processor started
⏰ Checking for emails every hour
🧹 Cleaning up old records daily at midnight
```

## 🔧 Production Notes

- Uses Mailgun free tier (300 emails/month)
- Emails marked as [SANDBOX] in subject for testing
- Rate limited to prevent spam (2-second delays)
- Skips converted leads automatically
- Cleans up records after 30 days

Ready for production use! 🚀
