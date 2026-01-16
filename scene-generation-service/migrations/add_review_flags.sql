-- Migration: Add reviewScenario and reviewScenes fields to scene_generations table
-- Also update status enum to include waiting_for_review and waiting_for_scene_review

-- Add review flags columns
ALTER TABLE scene_generations 
ADD COLUMN IF NOT EXISTS review_scenario BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS review_scenes BOOLEAN DEFAULT false;

-- Note: PostgreSQL doesn't have strict enums for status, so we just ensure the columns exist
-- The application will handle the status values: queued, processing, completed, failed, cancelled, waiting_for_review, waiting_for_scene_review

