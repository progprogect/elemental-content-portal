/**
 * Generates a knowledge test using Google Gemini API
 * Based on the presentation script from a training topic
 */

export async function generateTest(presentationScript: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.NANOBANANA_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY is not configured');
  }

  // Use Gemini 2.5 Flash model
  const model = 'gemini-2.5-flash';
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta';
  const requestUrl = `${apiUrl}/models/${model}:generateContent?key=${apiKey}`;
  
  // Build prompt for test generation
  const prompt = `Generate a short knowledge test based on the following presentation script. The test should include multiple choice questions, true/false questions, or short answer questions. Format the test clearly with questions and answers.

Presentation Script:
${presentationScript}

Please generate a comprehensive test that covers the key concepts from the script.`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };
  
  console.log('Calling Google Gemini API for test generation:', {
    url: requestUrl.replace(apiKey, '***'),
    model,
    promptLength: prompt.length,
  });
  
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (fetchError: any) {
    console.error('Fetch error:', fetchError);
    throw new Error(`Failed to connect to Google Gemini API: ${fetchError.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Google Gemini API error: ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
      console.error('Google Gemini API error response:', errorData);
    } catch {
      errorMessage = errorText || errorMessage;
      console.error('Google Gemini API error text:', errorText);
    }
    
    throw new Error(errorMessage);
  }

  let data: any;
  try {
    data = await response.json();
    console.log('Google Gemini API response received');
  } catch (parseError: any) {
    console.error('Failed to parse API response:', parseError);
    throw new Error(`Failed to parse Google Gemini API response: ${parseError.message}`);
  }
  
  // Extract text from response
  if (!data.candidates || data.candidates.length === 0) {
    console.error('No candidates in response:', JSON.stringify(data, null, 2));
    throw new Error('No candidates returned from Google Gemini API');
  }

  const candidate = data.candidates[0];
  
  // Check for finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error('Candidate finish reason:', candidate.finishReason);
    throw new Error(`Test generation finished with reason: ${candidate.finishReason}`);
  }

  if (!candidate.content || !candidate.content.parts) {
    console.error('Invalid response structure:', JSON.stringify(data, null, 2));
    throw new Error('Invalid response format from Google Gemini API - missing content.parts');
  }

  const parts = candidate.content.parts || [];
  const textPart = parts.find((part: any) => part.text);
  
  if (!textPart || !textPart.text) {
    console.error('No text data in response parts');
    console.error('Available parts:', JSON.stringify(parts, null, 2));
    throw new Error('No text data returned from Google Gemini API');
  }

  const testContent = textPart.text.trim();
  
  console.log('Test generated successfully, length:', testContent.length);

  return testContent;
}

