const cron = require('node-cron');
const EmailSchedule = require('../models/EmailSchedule');
const { sendEmail } = require('./emailService');

// Run every hour to check for emails to send
cron.schedule('0 * * * *', async () => {
  console.log('🕐 Checking for scheduled emails...', new Date().toISOString());
  
  try {
    const now = new Date();
    
    // Find emails that should be sent
    const emailsToSend = await EmailSchedule.find({
      scheduledFor: { $lte: now },
      sent: false
    }).populate('leadId');

    console.log(`📧 Found ${emailsToSend.length} emails to send`);

    if (emailsToSend.length === 0) {
      console.log('✅ No emails to send at this time');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const emailSchedule of emailsToSend) {
      try {
        // Check if lead is still eligible (not converted, not unsubscribed)
        if (emailSchedule.leadId.status === 'converted') {
          console.log(`⏭️  Lead already converted, skipping email to ${emailSchedule.email}`);
          emailSchedule.sent = true;
          emailSchedule.sentAt = new Date();
          await emailSchedule.save();
          continue;
        }

        // Check if lead has been inactive for too long (optional)
        const daysSinceLastUpdate = Math.floor((now - emailSchedule.leadId.updatedAt) / (1000 * 60 * 60 * 24));
        if (daysSinceLastUpdate > 30) {
          console.log(`⏭️  Lead inactive for ${daysSinceLastUpdate} days, skipping email to ${emailSchedule.email}`);
          emailSchedule.sent = true;
          emailSchedule.sentAt = new Date();
          await emailSchedule.save();
          continue;
        }

        console.log(`📤 Sending ${emailSchedule.scheduleType} email to ${emailSchedule.email}`);

        await sendEmail(
          emailSchedule.email,
          emailSchedule.scheduleType,
          {
            ...emailSchedule.leadId.toObject(),
            sessionId: emailSchedule.leadId.sessionId
          }
        );

        // Mark as sent
        emailSchedule.sent = true;
        emailSchedule.sentAt = new Date();
        await emailSchedule.save();

        console.log(`✅ Email sent successfully to ${emailSchedule.email}`);
        successCount++;
        
        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        
      } catch (error) {
        console.error(`❌ Error sending email to ${emailSchedule.email}:`, error.message);
        errorCount++;
        
        // Don't mark as sent if there was an error, will retry next hour
        // But limit retries to avoid infinite loops
        const retryCount = emailSchedule.retryCount || 0;
        if (retryCount >= 3) {
          console.log(`⛔ Max retries reached for ${emailSchedule.email}, marking as failed`);
          emailSchedule.sent = true;
          emailSchedule.sentAt = new Date();
          emailSchedule.error = error.message;
          await emailSchedule.save();
        } else {
          emailSchedule.retryCount = retryCount + 1;
          await emailSchedule.save();
        }
      }
    }

    console.log(`📊 Email processing complete: ${successCount} sent, ${errorCount} errors`);
    
  } catch (error) {
    console.error('💥 Error in email processor:', error);
  }
});

// Run every day at midnight to clean up old scheduled emails
cron.schedule('0 0 * * *', async () => {
  console.log('🧹 Cleaning up old email schedules...');
  
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await EmailSchedule.deleteMany({
      sent: true,
      sentAt: { $lt: thirtyDaysAgo }
    });
    
    console.log(`🗑️  Cleaned up ${result.deletedCount} old email records`);
  } catch (error) {
    console.error('Error cleaning up email schedules:', error);
  }
});

console.log('📨 Email processor started');
console.log('⏰ Checking for emails every hour');
console.log('🧹 Cleaning up old records daily at midnight');
