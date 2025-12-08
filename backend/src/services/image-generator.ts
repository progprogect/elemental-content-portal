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
  const response = await fetch(`${apiUrl}/api/text-to-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: finalPrompt,
      aspect_ratio: aspectRatio,
      model: model,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Nano Banana API error: ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const imageUrl = data.image_url || data.url;

  if (!imageUrl) {
    throw new Error('No image URL returned from Nano Banana API');
  }

  // Download image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();

  // Save to storage
  const storage = createStorageAdapter();
  const filename = `generated-${Date.now()}.png`;
  const storagePath = `images/${taskId}/${publicationId}`;
  
  const result = await storage.upload(
    Buffer.from(imageBuffer),
    filename,
    storagePath
  );

  return {
    assetUrl: result.url,
    assetPath: result.path,
  };
}

