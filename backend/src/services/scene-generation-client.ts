import { logger } from '../utils/logger';

const SCENE_GENERATION_SERVICE_URL =
  process.env.SCENE_GENERATION_SERVICE_URL || 'http://localhost:3001';
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
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, timeout = this.defaultTimeout } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
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
        throw new Error('Request timeout');
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
}

export const sceneGenerationClient = new SceneGenerationClient();

