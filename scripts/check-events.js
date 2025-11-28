// scripts/check-events.js
const axios = require('axios');

async function checkEvents() {
  try {
    console.log('🔄 Checking events API...');
    
    const response = await axios.get('http://localhost:3001/api/events');
    
    console.log('✅ Events API response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.length > 0) {
      console.log(`\n🎉 SUCCESS! Found ${response.data.length} events!`);
      response.data.forEach((event, index) => {
        console.log(`\n📅 Event ${index + 1}:`);
        console.log(`   Title: ${event.title}`);
        console.log(`   Date: ${event.date}`);
        console.log(`   Type: ${event.eventType || 'N/A'}`);
        console.log(`   Source: ${event.source_document || 'N/A'}`);
      });
    } else {
      console.log('\n❌ No events found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking events:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

checkEvents();
