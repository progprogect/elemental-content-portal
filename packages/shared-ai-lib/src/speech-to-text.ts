/**
 * Transcribes audio to text using OpenAI Whisper API
 */

import { AIConfig } from './config';

/**
 * Transcribes audio to text using OpenAI Whisper API
 * @param audioBuffer Audio file buffer
 * @param filename Audio filename
 * @param mimeType Audio MIME type (default: 'audio/webm')
 * @param config Optional AI configuration. If not provided, reads from process.env
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  mimeType: string = 'audio/webm',
  config?: AIConfig
): Promise<string> {
  // Get API key from config or environment variables
  const apiKey = config?.openaiApiKey || process.env.OPENAI_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Provide openaiApiKey in config or set OPENAI_KEY environment variable');
  }

  const apiUrl = 'https://api.openai.com/v1/audio/transcriptions';
  
  // Create FormData for multipart/form-data request
  // Using Node.js 18+ built-in FormData
  const formData = new FormData();
  
  // Create a Blob from Buffer - FormData in Node.js 18+ accepts Blob directly
  const audioBlob = new Blob([audioBuffer], { type: mimeType });
  
  // Append Blob to FormData - OpenAI API accepts Blob as file
  formData.append('file', audioBlob, filename);
  formData.append('model', 'whisper-1');
  formData.append('language', 'ru'); // Support Russian, can be made configurable later

  console.log('Calling OpenAI Whisper API for transcription:', {
    filename,
    audioSize: audioBuffer.length,
    mimeType,
  });
  
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // Don't set Content-Type header - FormData sets it automatically with boundary
      },
      body: formData,
    });
  } catch (fetchError: any) {
    console.error('Fetch error connecting to OpenAI Whisper API');
    throw new Error(`Failed to connect to OpenAI Whisper API: ${fetchError.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `OpenAI Whisper API error: ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
      console.error('OpenAI Whisper API error:', response.status, errorMessage);
    } catch {
      console.error('OpenAI Whisper API error:', response.status);
    }
    
    throw new Error(errorMessage);
  }

  let data: any;
  try {
    data = await response.json();
    console.log('OpenAI Whisper API response received');
  } catch (parseError: any) {
    console.error('Failed to parse API response:', parseError);
    throw new Error(`Failed to parse OpenAI Whisper API response: ${parseError.message}`);
  }
  
  // Extract text from response
  if (!data.text) {
    console.error('No text in response from OpenAI Whisper API');
    throw new Error('No text returned from OpenAI Whisper API');
  }

  const transcribedText = data.text.trim();
  
  console.log('Audio transcribed successfully, text length:', transcribedText.length);

  return transcribedText;
}

