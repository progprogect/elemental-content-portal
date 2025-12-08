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
 * Generates image using Nano Banana API and saves it to storage
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

  // Always use Pro version (Nano Banana 2)
  const model = 'Nano Banana 2';
  const aspectRatio = request.aspectRatio || '1:1';

  // Call Nano Banana API
  const apiUrl = process.env.NANOBANANA_API_URL || 'https://api.nanobanana.com';
  const requestUrl = `${apiUrl}/api/text-to-image`;
  const requestBody = {
    prompt: finalPrompt,
    aspect_ratio: aspectRatio,
    model: model,
  };
  
  console.log('Calling Nano Banana API:', {
    url: requestUrl,
    model,
    aspectRatio,
    promptLength: finalPrompt.length,
  });
  
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (fetchError: any) {
    console.error('Fetch error:', fetchError);
    throw new Error(`Failed to connect to Nano Banana API: ${fetchError.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Nano Banana API error: ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || errorMessage;
      console.error('Nano Banana API error response:', errorData);
    } catch {
      errorMessage = errorText || errorMessage;
      console.error('Nano Banana API error text:', errorText);
    }
    
    throw new Error(errorMessage);
  }

  let data: any;
  try {
    data = await response.json();
    console.log('Nano Banana API response:', { 
      hasImageUrl: !!data.image_url, 
      hasUrl: !!data.url,
      keys: Object.keys(data),
    });
  } catch (parseError: any) {
    console.error('Failed to parse API response:', parseError);
    throw new Error(`Failed to parse Nano Banana API response: ${parseError.message}`);
  }
  
  const imageUrl = data.image_url || data.url;

  if (!imageUrl) {
    console.error('No image URL in response:', data);
    throw new Error('No image URL returned from Nano Banana API');
  }

  console.log('Downloading image from:', imageUrl);

  // Download image
  let imageResponse: Response;
  try {
    imageResponse = await fetch(imageUrl);
  } catch (fetchError: any) {
    console.error('Failed to fetch image:', fetchError);
    throw new Error(`Failed to download image: ${fetchError.message}`);
  }
  
  if (!imageResponse.ok) {
    console.error('Image download failed:', imageResponse.status, imageResponse.statusText);
    throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
  }

  let imageBuffer: ArrayBuffer;
  try {
    imageBuffer = await imageResponse.arrayBuffer();
    console.log('Image downloaded, size:', imageBuffer.byteLength);
  } catch (bufferError: any) {
    console.error('Failed to read image buffer:', bufferError);
    throw new Error(`Failed to read image data: ${bufferError.message}`);
  }

  // Save to storage
  console.log('Saving to storage...');
  const storage = createStorageAdapter();
  const filename = `generated-${Date.now()}.png`;
  const storagePath = `images/${taskId}/${publicationId}`;
  
  let result;
  try {
    result = await storage.upload(
      Buffer.from(imageBuffer),
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

