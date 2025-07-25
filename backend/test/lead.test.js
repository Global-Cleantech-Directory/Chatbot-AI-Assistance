const Lead = require('../models/Lead');

async function testLeadIntent() {
  try {
    // Create a new lead
    const lead = new Lead({
      sessionId: 'test-session-' + Date.now()
    });

    // Test different types of messages
    console.log('\n=== Testing Lead Intent Analysis ===\n');

    // Test info_only message
    let result = lead.analyzeIntent("I'm just browsing around");
    console.log('Info only message:');
    console.log('Message: "I\'m just browsing around"');
    console.log('Result:', result);
    console.log('Current lead status:', lead.status);
    console.log('Current intent score:', lead.intentScore);
    console.log('-------------------');

    // Test interested message
    result = lead.analyzeIntent("I'd like to learn more about your features");
    console.log('Interested message:');
    console.log('Message: "I\'d like to learn more about your features"');
    console.log('Result:', result);
    console.log('Current lead status:', lead.status);
    console.log('Current intent score:', lead.intentScore);
    console.log('-------------------');

    // Test high intent message
    result = lead.analyzeIntent("I want to join and get a price quote for membership");
    console.log('High intent message:');
    console.log('Message: "I want to join and get a price quote for membership"');
    console.log('Result:', result);
    console.log('Current lead status:', lead.status);
    console.log('Current intent score:', lead.intentScore);
    console.log('-------------------');

    // Show final lead state
    console.log('\nFinal lead state:');
    console.log('Total interactions:', lead.totalInteractions);
    console.log('All interactions:', lead.interactions);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testLeadIntent();