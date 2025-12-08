import { ImageGenerationSettings, ImageGenerationResult } from '../types/prompt-settings';
import { createStorageAdapter } from '../storage';

/**
 * Builds final prompt from settings by combining prompt with style preset and custom style
 */
function buildImagePrompt(settings: ImageGenerationSettings): string {
  let prompt = settings.prompt.trim();
  
  // Add style from preset
  if (settings.stylePreset) {
    // Get preset value from frontend presets config
    // For backend, we'll construct the style string based on preset ID
    const styleMap: Record<string, string> = {
      'photo-realistic': 'photorealistic, high quality, detailed, professional photography, realistic lighting, sharp focus',
      'artistic': 'artistic style, creative, expressive, vibrant colors, artistic composition',
      'digital-art': 'digital art, modern, sleek, contemporary design, digital illustration',
      'illustration': 'illustration style, hand-drawn, artistic illustration, detailed illustration',
      'sketch': 'sketch style, pencil drawing, artistic sketch, hand-drawn sketch',
      'vintage': 'vintage style, retro, classic, nostalgic, vintage photography',
      'modern': 'modern style, contemporary, clean, minimalist design, modern aesthetic',
      'minimalist': 'minimalist style, simple, clean, minimal design, minimalist composition',
    };
    
    const styleValue = styleMap[settings.stylePreset];
    if (styleValue) {
      prompt += `, ${styleValue}`;
    }
  }
  
  // Add custom style
  if (settings.customStyle && settings.customStyle.trim()) {
    prompt += `, ${settings.customStyle.trim()}`;
  }
  
  return prompt;
}

/**
 * Generates image using Google Gemini API (Nano Banana Pro)
 * Documentation: https://ai.google.dev/gemini-api/docs/image-generation
 */
export async function generateImage(
  request: ImageGenerationSettings,
  taskId: string,
  publicationId: string
): Promise<ImageGenerationResult> {
  const apiKey = process.env.NANOBANANA_API_KEY;
  
  if (!apiKey) {
    throw new Error('NANOBANANA_API_KEY is not configured');
  }

  // Build final prompt
  const finalPrompt = buildImagePrompt(request);

  // Use Gemini 3 Pro Preview (Nano Banana Pro) as requested
  // For standard version use: gemini-2.5-flash-image
  const model = 'gemini-3-pro-preview';
  const aspectRatio = request.aspectRatio || '1:1';

  // Use Google Generative AI API endpoint
  // Documentation: https://ai.google.dev/gemini-api/docs/image-generation
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta';
  const requestUrl = `${apiUrl}/models/${model}:generateContent?key=${apiKey}`;
  
  // Format request according to Gemini API documentation
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: finalPrompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
      // Note: aspect ratio might need to be handled differently
      // Check if there's a specific parameter for aspect ratio
    },
  };
  
  console.log('Calling Google Gemini API (Nano Banana Pro):', {
    url: requestUrl.replace(apiKey, '***'),
    model,
    aspectRatio,
    promptLength: finalPrompt.length,
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
    console.log('Google Gemini API response structure:', { 
      hasCandidates: !!data.candidates,
      keys: Object.keys(data),
    });
  } catch (parseError: any) {
    console.error('Failed to parse API response:', parseError);
    throw new Error(`Failed to parse Google Gemini API response: ${parseError.message}`);
  }
  
  // Extract image from response according to Gemini API format
  // Response format: { candidates: [{ content: { parts: [{ inlineData: { data: base64, mimeType: "image/png" } }] } }] }
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    console.error('Invalid response structure:', JSON.stringify(data, null, 2));
    throw new Error('Invalid response format from Google Gemini API');
  }

  const parts = data.candidates[0].content.parts || [];
  const imagePart = parts.find((part: any) => part.inlineData);
  
  if (!imagePart || !imagePart.inlineData) {
    console.error('No image data in response:', JSON.stringify(data, null, 2));
    throw new Error('No image data returned from Google Gemini API');
  }

  const base64Image = imagePart.inlineData.data;
  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  
  console.log('Image received, mimeType:', mimeType, 'size:', base64Image.length);

  // Convert base64 to buffer
  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(base64Image, 'base64');
    console.log('Image buffer created, size:', imageBuffer.length);
  } catch (bufferError: any) {
    console.error('Failed to decode base64 image:', bufferError);
    throw new Error(`Failed to decode image data: ${bufferError.message}`);
  }

  // Save to storage
  console.log('Saving to storage...');
  const storage = createStorageAdapter();
  const extension = mimeType.split('/')[1] || 'png';
  const filename = `generated-${Date.now()}.${extension}`;
  const storagePath = `images/${taskId}/${publicationId}`;
  
  let result;
  try {
    result = await storage.upload(
      imageBuffer,
      filename,
      storagePath
    );
    console.log('Image saved to storage:', result.path);
  } catch (storageError: any) {
    console.error('Storage upload failed:', storageError);
    throw new Error(`Failed to save image to storage: ${storageError.message}`);
  }

  return {
    assetUrl: result.url,
    assetPath: result.path,
  };
}

