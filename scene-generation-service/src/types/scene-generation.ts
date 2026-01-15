/**
 * Types for Scene Generation Service
 * Based on ТЗ: Модуль генерации сцен
 */

export type SceneKind = 'banner' | 'video' | 'overlay' | 'pip' | 'transition' | 'blank';

export interface DetailedSceneRequest {
  goal?: string; // intro, explain, highlight, outro, etc.
  description: string; // текстовое объяснение, что должно происходить
  visualStyle?: string[]; // ["tech", "minimal", "blue"]
  layoutHint?: string; // "left_image_right_text", "side_panel_right", ...
  textContent?: string; // текст для баннера/титров
  imageHints?: string[]; // пожелания по картинкам
  audioStrategy?: string; // "keep", "mute", "bgm_under_voice", ...
  animationHints?: string[]; // ["fade-in", "typewriter", ...]
  [key: string]: any; // позволяем расширять
}

export interface TimelineItem {
  id: string;
  kind: SceneKind;
  durationSeconds?: number; // для баннерных сцен может быть только duration
  sourceVideoId?: string; // для видео-сцен
  fromSeconds?: number;
  toSeconds?: number;
  detailedRequest: DetailedSceneRequest;
}

export interface Scenario {
  timeline: TimelineItem[];
}

export interface VideoInput {
  id: string;
  path: string;
}

export interface ImageInput {
  id: string;
  path: string;
}

export interface ReferenceInput {
  id: string;
  pathOrUrl: string;
}

export interface GenerationRequest {
  prompt: string;
  videos?: VideoInput[];
  images?: ImageInput[];
  references?: ReferenceInput[];
  aspectRatio?: number; // целевое соотношение сторон (по умолчанию 5.83)
  reviewScenario?: boolean; // опциональный режим review
  reviewScenes?: boolean;
  taskId?: string; // опциональная связь с задачей
  publicationId?: string; // опциональная связь с публикацией
}

export interface EnrichedContext {
  prompt: string;
  videoTranscripts: Record<string, string>; // videoId → полный текст
  videoMetadata: Record<string, {
    duration: number;
    fps: number;
    width: number;
    height: number;
  }>;
  imageCaptions: Record<string, string>; // imageId → описательный текст
  referenceNotes: string; // агрегированный текст о стиле и референсах
}

export interface SceneProject {
  sceneId: string;
  kind: SceneKind;
  scenarioItem: TimelineItem; // исходный элемент таймлайна
  renderContext: {
    aspectRatio: number; // например 5.83
    width: number; // пиксели
    height: number; // пиксели
    fps: number; // кадры/сек
  };
  inputs: {
    video?: {
      id: string;
      fromSeconds: number;
      toSeconds: number;
    };
    images?: string[];
  };
  extra?: Record<string, any>; // дополнительные настройки под конкретные пайплайны
}

