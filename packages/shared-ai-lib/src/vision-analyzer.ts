import { AIConfig } from './config';

export interface VisionAnalysisResult {
  description: string;
  objects?: string[];
  style?: string[];
  colors?: string[];
}

/**
 * Analyze image using Gemini Vision API
 */
export async function analyzeImage(
  imageBuffer: Buffer,
  prompt: string = 'Describe this image in detail, including objects, style, colors, and composition.',
  config?: AIConfig
): Promise<VisionAnalysisResult> {
  const apiKey = config?.googleApiKey || process.env.GOOGLE_AI_API_KEY || process.env.NANOBANANA_API_KEY;

  if (!apiKey) {
    throw new Error('Google AI API key is not configured');
  }

  // Convert image buffer to base64
  const base64Image = imageBuffer.toString('base64');

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Image,
            },
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini Vision API error: ${response.status} ${errorData}`);
    }

    const data: any = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini Vision API');
    }

    const description = data.candidates[0].content.parts[0].text;

    // Try to extract structured information from description
    const result: VisionAnalysisResult = {
      description,
    };

    // Simple extraction of objects, style, colors from description
    // In a real implementation, you might use LLM to extract structured data
    const lowerDescription = description.toLowerCase();
    
    // Extract style hints
    const styleKeywords = ['minimal', 'tech', 'modern', 'vintage', 'colorful', 'dark', 'light', 'professional'];
    result.style = styleKeywords.filter(keyword => lowerDescription.includes(keyword));

    // Extract color hints
    const colorKeywords = ['blue', 'red', 'green', 'yellow', 'black', 'white', 'gray', 'purple', 'orange'];
    result.colors = colorKeywords.filter(keyword => lowerDescription.includes(keyword));

    return result;
  } catch (error: any) {
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}

