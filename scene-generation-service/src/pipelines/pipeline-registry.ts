import { SceneProject, SceneKind } from '../types/scene-generation';
import { RenderedScene, RenderContext } from './video-pipeline';
import { VideoPipeline } from './video-pipeline';
import { BannerPipeline } from './banner-pipeline';
import { OverlayPipeline } from './overlay-pipeline';
import { PiPPipeline } from './pip-pipeline';

export interface ScenePipeline {
  canHandle(kind: SceneKind): Promise<boolean>;
  render(sceneProject: SceneProject, context: RenderContext): Promise<RenderedScene>;
}

/**
 * Pipeline Registry
 * Manages all scene pipelines and routes scenes to appropriate pipeline
 */
export class PipelineRegistry {
  private pipelines: ScenePipeline[] = [];

  constructor() {
    // Register default pipelines
    this.register(new VideoPipeline());
    this.register(new BannerPipeline());
    this.register(new OverlayPipeline());
    this.register(new PiPPipeline());
  }

  register(pipeline: ScenePipeline): void {
    this.pipelines.push(pipeline);
  }

  async render(sceneProject: SceneProject, context: RenderContext): Promise<RenderedScene> {
    const pipeline = await this.getPipeline(sceneProject.kind);
    if (!pipeline) {
      throw new Error(`No pipeline found for scene kind: ${sceneProject.kind}`);
    }
    return pipeline.render(sceneProject, context);
  }

  async getPipeline(kind: SceneKind): Promise<ScenePipeline | null> {
    for (const pipeline of this.pipelines) {
      if (await pipeline.canHandle(kind)) {
        return pipeline;
      }
    }
    return null;
  }
}

// Singleton instance
export const pipelineRegistry = new PipelineRegistry();

