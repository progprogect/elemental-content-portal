import { ImageGenerationSettings, ImageGenerationResult } from '../types/prompt-settings';
import { createStorageAdapter } from '../storage';

/**
 * Downloads an image from URL and returns it as Buffer
 */
async function downloadImageFromUrl(url: string): Promise<Buffer> {
  try {
    // Check if URL is from our storage (check if it contains our storage paths)
    const storage = createStorageAdapter();
    
    // Try to extract path from URL to check if it's from our storage
    // For Cloudflare R2: URL format is https://public-url/path/to/file
    // For S3: URL format is https://bucket.s3.amazonaws.com/path/to/file
    // For Cloudinary: URL format is https://res.cloudinary.com/...
    
    // Try to download from our storage first if URL matches our storage pattern
    try {
      // Extract path from URL - this is a simple heuristic
      // In production, you might want to parse URL more carefully
      const urlObj = new URL(url);
      // Check for both /images/ and /uploads/ paths (our storage paths)
      const pathMatch = urlObj.pathname.match(/\/(images|uploads)\/.+/);
      
      if (pathMatch) {
        const path = pathMatch[0].substring(1); // Remove leading slash
        try {
          const buffer = await storage.download(path);
          return buffer;
        } catch {
          // If download from storage fails, fall through to fetch
        }
      }
    } catch {
      // If URL parsing fails, fall through to fetch
    }
    
    // Fallback to fetch for external URLs or if storage download failed
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    throw new Error(`Failed to download image from URL: ${error.message}`);
  }
}

/**
 * Builds final prompt from settings by combining prompt with style preset, custom style, and refinement prompt
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
  
  // Add refinement prompt if provided
  if (settings.refinementPrompt && settings.refinementPrompt.trim()) {
    prompt += `. ${settings.refinementPrompt.trim()}`;
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

  // Determine reference image URL
  const referenceImageUrl = request.referenceImageUrl;

  // Download reference image if provided
  let referenceImageBase64: string | null = null;
  let referenceImageMimeType: string | null = null;
  
  if (referenceImageUrl) {
    try {
      const referenceImageBuffer = await downloadImageFromUrl(referenceImageUrl);
      // Determine mime type from URL or default to jpeg
      const urlLower = referenceImageUrl.toLowerCase();
      if (urlLower.includes('.png')) {
        referenceImageMimeType = 'image/png';
      } else if (urlLower.includes('.webp')) {
        referenceImageMimeType = 'image/webp';
      } else {
        referenceImageMimeType = 'image/jpeg';
      }
      
      // Convert buffer to base64 for Gemini API
      referenceImageBase64 = referenceImageBuffer.toString('base64');
    } catch (error: any) {
      console.warn('Failed to download reference image, continuing without it:', error.message);
      // Continue without reference image if download fails
    }
  }

  // Use Gemini 2.5 Flash Image (Nano Banana) - Pro version may not be available in all regions
  // Try Pro first, fallback to standard if needed
  // Pro: gemini-3-pro-preview
  // Standard: gemini-2.5-flash-image
  const model = 'gemini-2.5-flash-image'; // Using standard as Pro is geo-restricted
  const aspectRatio = request.aspectRatio || '1:1';

  // Use Google Generative AI API endpoint
  // Documentation: https://ai.google.dev/gemini-api/docs/image-generation
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta';
  const requestUrl = `${apiUrl}/models/${model}:generateContent?key=${apiKey}`;
  
  // Build parts array for Gemini API request
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    {
      text: finalPrompt,
    },
  ];
  
  // Add reference image if available
  if (referenceImageBase64 && referenceImageMimeType) {
    parts.push({
      inlineData: {
        mimeType: referenceImageMimeType,
        data: referenceImageBase64,
      },
    });
  }
  
  // Format request according to Gemini API documentation
  const requestBody = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
      // Note: aspect ratio might need to be handled differently
      // Check if there's a specific parameter for aspect ratio
    },
  };
  
  console.log('Calling Google Gemini API for image generation:', {
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
  if (!data.candidates || data.candidates.length === 0) {
    console.error('No candidates in response from Google Gemini API');
    throw new Error('No candidates returned from Google Gemini API');
  }

  const candidate = data.candidates[0];
  
  // Check for finish reason (might indicate an error)
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error('Candidate finish reason:', candidate.finishReason);
    throw new Error(`Image generation finished with reason: ${candidate.finishReason}`);
  }

  if (!candidate.content || !candidate.content.parts) {
    console.error('Invalid response structure from Google Gemini API - missing content.parts');
    throw new Error('Invalid response format from Google Gemini API - missing content.parts');
  }

  const parts = candidate.content.parts || [];
  console.log('Parts found:', parts.length);
  console.log('Parts structure:', parts.map((p: any) => ({ 
    hasText: !!p.text, 
    hasInlineData: !!p.inlineData,
    hasTextContent: !!p.textContent 
  })));
  
  const imagePart = parts.find((part: any) => part.inlineData);
  
  if (!imagePart || !imagePart.inlineData) {
    console.error('No image data in response parts from Google Gemini API');
    throw new Error('No image data returned from Google Gemini API - check parts structure');
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

