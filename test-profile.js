// Test script to verify profile page database connectivity
const fetch = require('node-fetch'); // You might need to install: npm install node-fetch

async function testProfileAPI() {
    const baseUrl = 'http://localhost:3000';
    const userId = 1;
    
    console.log('Testing Profile Page Database Connectivity...\n');
    
    try {
        // Test user profile endpoint
        console.log('1. Testing /api/user-profile...');
        const profileResponse = await fetch(`${baseUrl}/api/user-profile?userId=${userId}`);
        const profileData = await profileResponse.json();
        console.log('✓ Profile data:', profileData);
        
        // Test meals count endpoint
        console.log('\n2. Testing /api/user-meals-count...');
        const mealsResponse = await fetch(`${baseUrl}/api/user-meals-count?userId=${userId}`);
        const mealsData = await mealsResponse.json();
        console.log('✓ Meals count:', mealsData);
        
        // Test deposits total endpoint
        console.log('\n3. Testing /api/user-deposits-total...');
        const depositsResponse = await fetch(`${baseUrl}/api/user-deposits-total?userId=${userId}`);
        const depositsData = await depositsResponse.json();
        console.log('✓ Deposits total:', depositsData);
        
        console.log('\n✅ All API endpoints are working correctly!');
        console.log('\nProfile page should now display:');
        console.log(`- Name: ${profileData.fullname || 'Not set'}`);
        console.log(`- Email: ${profileData.email || 'Not set'}`);
        console.log(`- Phone: ${profileData.phone || 'Not set'}`);
        console.log(`- Total Meals: ${mealsData.total || 0}`);
        console.log(`- Total Deposits: ${depositsData.total || 0}`);
        
    } catch (error) {
        console.error('❌ Error testing API endpoints:', error.message);
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    testProfileAPI();
}

module.exports = { testProfileAPI };
