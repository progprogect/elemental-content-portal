/**
 * Generates text content for publications using Google Gemini API
 * Based on the base prompt from task and publication context
 */

import { TextGenerationOptions } from './types';
import { AIConfig } from './config';

/**
 * Generates text content using Google Gemini API
 * @param options Text generation options
 * @param config Optional AI configuration. If not provided, reads from process.env
 * @returns Generated text content
 */
export async function generateText(
  options: TextGenerationOptions,
  config?: AIConfig
): Promise<string> {
  // Get API key from config or environment variables
  const apiKey = config?.googleApiKey || 
    process.env.GOOGLE_AI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    process.env.NANOBANANA_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google API key is not configured. Provide googleApiKey in config or set GOOGLE_AI_API_KEY, GEMINI_API_KEY, or NANOBANANA_API_KEY environment variable');
  }

  // Use Gemini 2.5 Flash model
  const model = 'gemini-2.5-flash';
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta';
  const requestUrl = `${apiUrl}/models/${model}:generateContent?key=${apiKey}`;
  
  // Build prompt for text generation
  let prompt = `Generate a well-formatted markdown text for social media publication.

IMPORTANT: Use markdown formatting:
- Headers: # for main title, ## for subtitles
- Bold: **text**
- Italic: *text*
- Lists: - for bullet points, 1. for numbered lists
- Links: [text](url)
- Line breaks: Use double line breaks for paragraphs

Base context:
${options.basePrompt}`;

  // Add additional instructions if provided
  if (options.additionalInstructions && options.additionalInstructions.trim().length > 0) {
    prompt += `\n\nAdditional instructions:\n${options.additionalInstructions.trim()}`;
  }

  // Add tone instruction if provided
  if (options.tone) {
    const toneDescriptions: Record<string, string> = {
      casual: 'Use a casual, friendly, and conversational tone',
      professional: 'Use a professional, formal, and business-appropriate tone',
      engaging: 'Use an engaging, enthusiastic, and attention-grabbing tone',
      formal: 'Use a formal, respectful, and official tone',
    };
    prompt += `\n\nTone: ${toneDescriptions[options.tone]}`;
  }

  // Add length instruction if provided
  if (options.length) {
    const lengthDescriptions: Record<string, string> = {
      short: 'Keep it concise - 1-2 short paragraphs or a few bullet points',
      medium: 'Medium length - 2-4 paragraphs or a detailed list',
      long: 'Comprehensive - 4+ paragraphs with detailed information',
    };
    prompt += `\n\nLength: ${lengthDescriptions[options.length]}`;
  }

  prompt += '\n\nGenerate the publication text now, using proper markdown formatting.';

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
      temperature: 0.3, // Lower temperature for more structured output
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      // Try to use responseSchema if the prompt indicates JSON output
      ...(options.basePrompt.toLowerCase().includes('json') || options.basePrompt.toLowerCase().includes('scenario') 
        ? { responseMimeType: 'application/json' as const }
        : {}),
    },
  };
  
  console.log('Calling Google Gemini API for text generation:', {
    model,
    promptLength: prompt.length,
    hasAdditionalInstructions: !!options.additionalInstructions,
    tone: options.tone,
    length: options.length,
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
    console.error('Fetch error connecting to Google Gemini API');
    throw new Error(`Failed to connect to Google Gemini API: ${fetchError.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Google Gemini API error: ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
      console.error('Google Gemini API error:', response.status, errorMessage);
    } catch {
      console.error('Google Gemini API error:', response.status);
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
    console.error('No candidates in response from Google Gemini API');
    throw new Error('No candidates returned from Google Gemini API');
  }

  const candidate = data.candidates[0];
  
  // Check for finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error('Candidate finish reason:', candidate.finishReason);
    throw new Error(`Text generation finished with reason: ${candidate.finishReason}`);
  }

  if (!candidate.content || !candidate.content.parts) {
    console.error('Invalid response structure from Google Gemini API - missing content.parts');
    throw new Error('Invalid response format from Google Gemini API - missing content.parts');
  }

  const parts = candidate.content.parts || [];
  const textPart = parts.find((part: any) => part.text);
  
  if (!textPart || !textPart.text) {
    console.error('No text data in response parts from Google Gemini API');
    throw new Error('No text data returned from Google Gemini API');
  }

  const generatedText = textPart.text.trim();
  
  console.log('Text generated successfully, length:', generatedText.length);

  return generatedText;
}

