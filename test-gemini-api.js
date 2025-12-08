// Test script for Google Gemini API (Nano Banana Pro)
const API_KEY = 'AIzaSyCTbhsPOtRaoSkV5VBO73ZBmbQlJZx0Cc4';

async function testGeminiAPI(model) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing model: ${model}`);
  console.log('='.repeat(60));
  
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta';
  const requestUrl = `${apiUrl}/models/${model}:generateContent?key=${API_KEY}`;
  
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: 'a beautiful sunset over mountains, photorealistic, high quality',
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
    },
  };
  
  console.log('Request URL:', requestUrl.replace(API_KEY, '***'));
  
  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('❌ Request failed');
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error:', JSON.stringify(errorData, null, 2));
      } catch {
        console.error('Response:', responseText);
      }
      return false;
    }
    
    const data = JSON.parse(responseText);
    console.log('✅ Success!');
    
    if (data.candidates?.[0]?.content?.parts) {
      const imagePart = data.candidates[0].content.parts.find(p => p.inlineData);
      if (imagePart) {
        console.log('✅ Found image data!');
        console.log('Mime type:', imagePart.inlineData.mimeType);
        console.log('Image data length:', imagePart.inlineData.data.length);
        return true;
      }
    }
    
    console.log('Response structure:', JSON.stringify(data, null, 2));
    return false;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Testing Google Gemini API...');
  console.log('API Key:', API_KEY.substring(0, 20) + '...');
  
  const models = ['gemini-2.5-flash-image', 'gemini-3-pro-preview'];
  
  for (const model of models) {
    const success = await testGeminiAPI(model);
    if (success) {
      console.log(`\n✅ Model ${model} works!`);
      break;
    }
  }
}

runTests();
