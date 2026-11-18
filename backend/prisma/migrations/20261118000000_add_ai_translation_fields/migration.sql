-- Migration: add AI translation and resolution fields to complaints
-- Generated for: add_ai_translation_fields

ALTER TABLE "complaints"
  ADD COLUMN IF NOT EXISTS "translatedText" TEXT,
  ADD COLUMN IF NOT EXISTS "estimatedDays"  INTEGER,
  ADD COLUMN IF NOT EXISTS "detectedLang"   TEXT;
