import { logger } from '../utils/logger';

// Use localhost for internal communication when running on same server
const SCENE_GENERATION_SERVICE_URL =
  process.env.SCENE_GENERATION_SERVICE_URL || 
  (process.env.NODE_ENV === 'production' ? 'http://localhost:3001' : 'http://localhost:3001');
const SCENE_GENERATION_TIMEOUT = parseInt(
  process.env.SCENE_GENERATION_TIMEOUT || '30000',
  10
);

interface RequestOptions {
  method?: string;
  body?: any;
  timeout?: number;
}

class SceneGenerationClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = SCENE_GENERATION_SERVICE_URL, timeout: number = SCENE_GENERATION_TIMEOUT) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultTimeout = timeout;
  }

  private async request<T>(
    path: string,
    options: RequestOptions & { params?: Record<string, string> } = {}
  ): Promise<T> {
    const { method = 'GET', body, timeout = this.defaultTimeout, params } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let url = `${this.baseUrl}${path}`;
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Request': 'true', // Mark as internal request to skip rate limiting
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Scene Generation Service error: ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Ignore parse error
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Scene Generation Service request timeout');
      }

      // Check if it's a connection error
      if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
        logger.error({ error, path, baseUrl: this.baseUrl }, 'Scene Generation Service is not available');
        throw new Error('Scene Generation Service is not available. Please check if the service is running and SCENE_GENERATION_SERVICE_URL is configured correctly.');
      }

      logger.error({ error, path }, 'Scene Generation Service request failed');
      throw error;
    }
  }

  async generateScenes(data: {
    prompt: string;
    videos?: Array<{ id: string; path: string }>;
    images?: Array<{ id: string; path: string }>;
    references?: Array<{ id: string; pathOrUrl: string }>;
    aspectRatio?: number;
    reviewScenario?: boolean;
    reviewScenes?: boolean;
    taskId?: string;
    publicationId?: string;
  }) {
    return this.request('/api/v1/scenes/generate', {
      method: 'POST',
      body: data,
    });
  }

  async getGenerations(filters?: { status?: string; phase?: string }) {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.phase) params.phase = filters.phase;
    return this.request('/api/v1/scenes', { params });
  }

  async getGenerationStatus(generationId: string) {
    return this.request(`/api/v1/scenes/${generationId}`);
  }

  async getScenario(generationId: string) {
    return this.request(`/api/v1/scenes/${generationId}/scenario`);
  }

  async updateScenario(generationId: string, scenario: any) {
    return this.request(`/api/v1/scenes/${generationId}/scenario`, {
      method: 'PUT',
      body: { scenario },
    });
  }

  async cancelGeneration(generationId: string) {
    return this.request(`/api/v1/scenes/${generationId}`, {
      method: 'DELETE',
    });
  }

  async continueGeneration(generationId: string) {
    return this.request(`/api/v1/scenes/${generationId}/continue`, {
      method: 'POST',
    });
  }
}

export const sceneGenerationClient = new SceneGenerationClient();

