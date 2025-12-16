/**
 * Stock Media Services
 * Integration with Pexels, Unsplash, and Pixabay APIs
 */

import { createStorageAdapter } from '../storage';

export interface StockMediaItem {
  id: string
  source: 'pexels' | 'unsplash' | 'pixabay'
  type: 'photo' | 'video'
  url: string
  thumbnailUrl?: string
  downloadUrl: string
  width?: number
  height?: number
  photographer?: string
  photographerUrl?: string
  duration?: number // for videos
  tags?: string[]
  description?: string
}

export interface StockMediaSearchParams {
  query: string
  type?: 'photo' | 'video' | 'all'
  source?: 'pexels' | 'unsplash' | 'pixabay' | 'all'
  orientation?: 'landscape' | 'portrait' | 'square'
  size?: 'large' | 'medium' | 'small'
  color?: string
  page?: number
  perPage?: number
}

export interface StockMediaSearchResponse {
  items: StockMediaItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

/**
 * Search Pexels API
 * Documentation: https://www.pexels.com/api/documentation/
 */
export async function searchPexels(params: StockMediaSearchParams): Promise<StockMediaSearchResponse> {
  // Support both naming conventions
  const apiKey = process.env.PEXELS_API_KEY || process.env.Pexels_API_Key;
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY is not configured');
  }

  const { query, type = 'all', orientation, page = 1, perPage = 20 } = params;
  
  // Pexels supports both photos and videos
  const endpoint = type === 'video' 
    ? 'https://api.pexels.com/videos/search'
    : type === 'photo'
    ? 'https://api.pexels.com/v1/search'
    : 'https://api.pexels.com/v1/search'; // Default to photos for 'all'

  const url = new URL(endpoint);
  url.searchParams.append('query', query);
  url.searchParams.append('page', String(page));
  url.searchParams.append('per_page', String(Math.min(perPage, 80))); // Pexels max is 80
  if (orientation) {
    url.searchParams.append('orientation', orientation);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;

  if (type === 'video') {
    const items: StockMediaItem[] = (data.videos || []).map((video: any) => {
      // Find best quality video file (prefer HD, then SD)
      const videoFile = video.video_files?.find((f: any) => f.quality === 'hd') 
        || video.video_files?.find((f: any) => f.quality === 'sd')
        || video.video_files?.[0];
      
      return {
        id: `pexels-${video.id}`,
        source: 'pexels',
        type: 'video',
        url: video.url,
        thumbnailUrl: video.image,
        downloadUrl: videoFile?.link || video.url,
        width: video.width,
        height: video.height,
        duration: video.duration,
        photographer: video.user?.name,
        photographerUrl: video.user?.url,
      };
    });

    return {
      items,
      total: data.total_results || 0,
      page: data.page || 1,
      perPage: data.per_page || perPage,
      totalPages: Math.ceil((data.total_results || 0) / (data.per_page || perPage)),
    };
  } else {
    const items: StockMediaItem[] = (data.photos || []).map((photo: any) => ({
      id: `pexels-${photo.id}`,
      source: 'pexels',
      type: 'photo',
      url: photo.url,
      thumbnailUrl: photo.src?.medium || photo.src?.large,
      downloadUrl: photo.src?.original || photo.src?.large,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
    }));

    return {
      items,
      total: data.total_results || 0,
      page: data.page || 1,
      perPage: data.per_page || perPage,
      totalPages: Math.ceil((data.total_results || 0) / (data.per_page || perPage)),
    };
  }
}

/**
 * Search Unsplash API
 * Documentation: https://unsplash.com/documentation
 */
export async function searchUnsplash(params: StockMediaSearchParams): Promise<StockMediaSearchResponse> {
  // Try both naming conventions for compatibility
  const accessKey = process.env.Unsplash_Access_Key || process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw new Error('Unsplash_Access_Key or UNSPLASH_ACCESS_KEY is not configured');
  }

  const { query, orientation, color, page = 1, perPage = 20 } = params;
  
  // Unsplash only supports photos
  if (params.type === 'video') {
    return {
      items: [],
      total: 0,
      page: 1,
      perPage: perPage,
      totalPages: 0,
    };
  }

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.append('query', query);
  url.searchParams.append('page', String(page));
  url.searchParams.append('per_page', String(Math.min(perPage, 30))); // Unsplash max is 30
  if (orientation) {
    url.searchParams.append('orientation', orientation);
  }
  if (color) {
    url.searchParams.append('color', color);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Client-ID ${accessKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;

  const items: StockMediaItem[] = (data.results || []).map((photo: any) => ({
    id: `unsplash-${photo.id}`,
    source: 'unsplash',
    type: 'photo',
    url: photo.links?.html || photo.urls?.regular,
    thumbnailUrl: photo.urls?.thumb || photo.urls?.small,
    // Use full size URL for download (links.download is an API endpoint, not direct file)
    downloadUrl: photo.urls?.full || photo.urls?.raw || photo.urls?.regular,
    width: photo.width,
    height: photo.height,
    photographer: photo.user?.name,
    photographerUrl: photo.user?.links?.html,
    description: photo.description || photo.alt_description,
    tags: photo.tags?.map((tag: any) => tag.title),
  }));

  return {
    items,
    total: data.total || 0,
    page: data.page || 1,
    perPage: data.per_page || perPage,
    totalPages: Math.ceil((data.total || 0) / (data.per_page || perPage)),
  };
}

/**
 * Search Pixabay API
 * Documentation: https://pixabay.com/api/docs/
 */
export async function searchPixabay(params: StockMediaSearchParams): Promise<StockMediaSearchResponse> {
  // Try both naming conventions for compatibility
  const apiKey = process.env.Pixabay_API_KEY || process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    throw new Error('Pixabay_API_KEY or PIXABAY_API_KEY is not configured');
  }

  const { query, type = 'all', orientation, page = 1, perPage = 20 } = params;
  
  // Pixabay supports both photos and videos
  const endpoint = type === 'video'
    ? 'https://pixabay.com/api/videos/'
    : 'https://pixabay.com/api/';

  const url = new URL(endpoint);
  url.searchParams.append('key', apiKey);
  url.searchParams.append('q', query);
  url.searchParams.append('page', String(page));
  url.searchParams.append('per_page', String(Math.min(perPage, 200))); // Pixabay max is 200
  if (orientation) {
    url.searchParams.append('orientation', orientation);
  }
  if (params.color) {
    url.searchParams.append('colors', params.color);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Pixabay API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;

  if (type === 'video') {
    const items: StockMediaItem[] = (data.hits || []).map((video: any) => ({
      id: `pixabay-${video.id}`,
      source: 'pixabay',
      type: 'video',
      url: video.pageURL,
      thumbnailUrl: video.picture_id ? `https://i.vimeocdn.com/video/${video.picture_id}_640.jpg` : undefined,
      downloadUrl: video.videos?.large?.url || video.videos?.medium?.url || video.videos?.small?.url,
      width: video.width,
      height: video.height,
      duration: video.duration,
      tags: video.tags?.split(', '),
    }));

    return {
      items,
      total: data.totalHits || 0,
      page: data.page || 1,
      perPage: data.per_page || perPage,
      totalPages: Math.ceil((data.totalHits || 0) / (data.per_page || perPage)),
    };
  } else {
    const items: StockMediaItem[] = (data.hits || []).map((photo: any) => ({
      id: `pixabay-${photo.id}`,
      source: 'pixabay',
      type: 'photo',
      url: photo.pageURL,
      thumbnailUrl: photo.previewURL || photo.webformatURL,
      downloadUrl: photo.largeImageURL || photo.fullHDURL || photo.imageURL,
      width: photo.imageWidth,
      height: photo.imageHeight,
      tags: photo.tags?.split(', '),
    }));

    return {
      items,
      total: data.totalHits || 0,
      page: data.page || 1,
      perPage: data.per_page || perPage,
      totalPages: Math.ceil((data.totalHits || 0) / (data.per_page || perPage)),
    };
  }
}

/**
 * Unified search across all stock media sources
 */
export async function searchStockMedia(params: StockMediaSearchParams): Promise<StockMediaSearchResponse> {
  const { source = 'all' } = params;
  
  const sources: Array<'pexels' | 'unsplash' | 'pixabay'> = 
    source === 'all' ? ['pexels', 'unsplash', 'pixabay']
    : source === 'pexels' ? ['pexels']
    : source === 'unsplash' ? ['unsplash']
    : ['pixabay'];

  const results = await Promise.allSettled(
    sources.map(async (src) => {
      switch (src) {
        case 'pexels':
          return await searchPexels(params);
        case 'unsplash':
          return await searchUnsplash(params);
        case 'pixabay':
          return await searchPixabay(params);
      }
    })
  );

  // Combine results from all sources
  const allItems: StockMediaItem[] = [];
  let total = 0;

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items);
      total += result.value.total;
    } else {
      console.error('Stock media search error:', result.reason);
    }
  });

  // Sort by relevance (could be improved)
  // For now, just return as-is

  const { page = 1, perPage = 20 } = params;
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedItems = allItems.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    total,
    page,
    perPage,
    totalPages: Math.ceil(allItems.length / perPage),
  };
}

/**
 * Download media from stock source and return URL
 */
export async function downloadStockMedia(
  item: StockMediaItem
): Promise<{ url: string; path: string; filename: string }> {
  // Download the file
  const response = await fetch(item.downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Determine file extension based on type and URL
  const urlLower = item.downloadUrl.toLowerCase();
  let extension = item.type === 'video' ? 'mp4' : 'jpg'; // Default based on media type
  if (urlLower.includes('.png')) extension = 'png';
  else if (urlLower.includes('.webp')) extension = 'webp';
  else if (urlLower.includes('.mp4')) extension = 'mp4';
  else if (urlLower.includes('.mov')) extension = 'mov';
  else if (urlLower.includes('.webm')) extension = 'webm';
  else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) extension = 'jpg';

  // Generate filename
  const filename = `stock-${item.source}-${item.id}.${extension}`;
  const path = `stock-media/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${filename}`;

  // Upload to storage
  const storage = createStorageAdapter();
  const result = await storage.upload(buffer, filename, `stock-media/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`);

  return {
    url: result.url,
    path: result.path,
    filename,
  };
}

