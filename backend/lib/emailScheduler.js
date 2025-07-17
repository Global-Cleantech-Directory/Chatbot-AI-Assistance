const EmailSchedule = require('../models/EmailSchedule');
const Lead = require('../models/Lead');

async function scheduleFollowUpEmails(leadId, email) {
  try {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    // Only schedule for leads with medium to high intent
    if (lead.intentScore < 30) {
      console.log(`Lead intent too low (${lead.intentScore}), skipping email scheduling`);
      return;
    }

    // Check if emails are already scheduled
    const existingSchedules = await EmailSchedule.findOne({ leadId: leadId });
    if (existingSchedules) {
      console.log('Emails already scheduled for this lead');
      return;
    }

    const now = new Date();
    
    // Schedule 3-day follow-up
    const day3Schedule = new EmailSchedule({
      leadId: leadId,
      email: email,
      scheduleType: 'day3',
      scheduledFor: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      leadStatus: lead.status,
      intentScore: lead.intentScore
    });

    // Schedule 7-day follow-up
    const day7Schedule = new EmailSchedule({
      leadId: leadId,
      email: email,
      scheduleType: 'day7',
      scheduledFor: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      leadStatus: lead.status,
      intentScore: lead.intentScore
    });

    // Schedule 14-day follow-up
    const day14Schedule = new EmailSchedule({
      leadId: leadId,
      email: email,
      scheduleType: 'day14',
      scheduledFor: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
      leadStatus: lead.status,
      intentScore: lead.intentScore
    });

    await Promise.all([
      day3Schedule.save(),
      day7Schedule.save(),
      day14Schedule.save()
    ]);

    // Update lead to mark emails as scheduled
    lead.emailFollowupScheduled = true;
    await lead.save();

    console.log(`Follow-up emails scheduled for lead ${leadId} (${email})`);
    console.log(`- 3-day follow-up: ${day3Schedule.scheduledFor}`);
    console.log(`- 7-day follow-up: ${day7Schedule.scheduledFor}`);
    console.log(`- 14-day follow-up: ${day14Schedule.scheduledFor}`);
    
    return {
      scheduled: true,
      count: 3,
      schedules: [
        { type: 'day3', scheduledFor: day3Schedule.scheduledFor },
        { type: 'day7', scheduledFor: day7Schedule.scheduledFor },
        { type: 'day14', scheduledFor: day14Schedule.scheduledFor }
      ]
    };
  } catch (error) {
    console.error('Error scheduling follow-up emails:', error);
    throw error;
  }
}

async function cancelFollowUpEmails(leadId) {
  try {
    const result = await EmailSchedule.updateMany(
      { leadId: leadId, sent: false },
      { sent: true, sentAt: new Date() }
    );
    
    console.log(`Cancelled ${result.modifiedCount} pending emails for lead ${leadId}`);
    return result;
  } catch (error) {
    console.error('Error cancelling follow-up emails:', error);
    throw error;
  }
}

module.exports = { 
  scheduleFollowUpEmails,
  cancelFollowUpEmails
};
