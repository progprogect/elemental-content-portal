// Test script for Nano Banana API
const API_KEY = 'AIzaSyCTbhsPOtRaoSkV5VBO73ZBmbQlJZx0Cc4';

async function testAPI() {
  console.log('Testing Nano Banana API...');
  console.log('API Key:', API_KEY.substring(0, 20) + '...');
  
  const requestBody = {
    prompt: 'a beautiful sunset over mountains',
    aspect_ratio: '1:1',
    model: 'Nano Banana 2'
  };
  
  console.log('\nRequest body:', JSON.stringify(requestBody, null, 2));
  
  const API_URL = 'https://api.nanobanana.com/api/text-to-image';
  console.log('\nURL:', API_URL);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('\nResponse body:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('\n✅ Success! Parsed response:', JSON.stringify(data, null, 2));
        return true;
      } catch (e) {
        console.log('\n✅ Success! Response is not JSON');
        return true;
      }
    } else {
      console.log('\n❌ Request failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.cause) {
      console.error('Cause code:', error.cause.code);
      console.error('Cause message:', error.cause.message);
    }
    
    // Try alternative header format
    console.log('\n' + '='.repeat(60));
    console.log('Trying alternative: X-Goog-Api-Key header...');
    console.log('='.repeat(60));
    
    try {
      const response2 = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Response status:', response2.status);
      const responseText2 = await response2.text();
      console.log('Response body:', responseText2);
      
      if (response2.ok) {
        console.log('✅ Success with X-Goog-Api-Key header!');
        return true;
      }
    } catch (error2) {
      console.error('❌ Alternative also failed:', error2.message);
    }
    
    return false;
  }
}

testAPI();
