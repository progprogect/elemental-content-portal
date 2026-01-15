/**
 * Generates JSON content using OpenAI API with JSON mode
 * This ensures structured JSON output without parsing issues
 */

import { AIConfig } from './config';

export interface JSONGenerationOptions {
  prompt: string;
  model?: 'gpt-4o' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  temperature?: number;
  maxTokens?: number;
}

/**
 * Generates JSON content using OpenAI API with JSON mode
 * @param options JSON generation options
 * @param config Optional AI configuration. If not provided, reads from process.env
 * @returns Parsed JSON object
 */
export async function generateJSON<T = any>(
  options: JSONGenerationOptions,
  config?: AIConfig
): Promise<T> {
  const apiKey = config?.openaiApiKey || process.env.OPENAI_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Provide openaiApiKey in config or set OPENAI_KEY environment variable');
  }

  const model = options.model || 'gpt-4o';
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  
  const requestBody = {
    model,
    messages: [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant that generates valid JSON. Always return valid JSON objects without any markdown formatting, code blocks, or explanatory text.',
      },
      {
        role: 'user' as const,
        content: options.prompt,
      },
    ],
    response_format: {
      type: 'json_object' as const,
    },
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 4096,
  };
  
  console.log('Calling OpenAI API for JSON generation:', {
    model,
    promptLength: options.prompt.length,
    temperature: requestBody.temperature,
  });
  
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (fetchError: any) {
    console.error('Fetch error connecting to OpenAI API');
    throw new Error(`Failed to connect to OpenAI API: ${fetchError.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `OpenAI API error: ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
      console.error('OpenAI API error:', response.status, errorMessage);
    } catch {
      console.error('OpenAI API error:', response.status);
    }
    
    throw new Error(errorMessage);
  }

  let data: any;
  try {
    data = await response.json();
    console.log('OpenAI API response received');
  } catch (parseError: any) {
    console.error('Failed to parse API response:', parseError);
    throw new Error(`Failed to parse OpenAI API response: ${parseError.message}`);
  }
  
  // Extract JSON from response
  if (!data.choices || data.choices.length === 0) {
    console.error('No choices in response from OpenAI API');
    throw new Error('No choices returned from OpenAI API');
  }

  const choice = data.choices[0];
  
  // Check for finish reason
  if (choice.finish_reason && choice.finish_reason !== 'stop') {
    console.error('Choice finish reason:', choice.finish_reason);
    if (choice.finish_reason === 'length') {
      throw new Error('OpenAI response was truncated due to token limit');
    }
    throw new Error(`JSON generation finished with reason: ${choice.finish_reason}`);
  }

  if (!choice.message || !choice.message.content) {
    console.error('Invalid response structure from OpenAI API - missing message.content');
    throw new Error('Invalid response format from OpenAI API - missing message.content');
  }

  const jsonText = choice.message.content.trim();
  
  // Parse JSON (should be valid since we're using JSON mode)
  let jsonData: T;
  try {
    jsonData = JSON.parse(jsonText);
  } catch (parseError: any) {
    console.error('Failed to parse JSON from OpenAI response:', parseError);
    console.error('Response content:', jsonText.substring(0, 500));
    throw new Error(`Failed to parse JSON from OpenAI response: ${parseError.message}`);
  }
  
  console.log('JSON generated successfully');
  return jsonData;
}

