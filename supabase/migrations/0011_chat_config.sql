-- Migration 0011: Fix flow_type constraint + chat configuration columns

-- 1. Drop current CHECK on flow_type, re-add with quiz included
ALTER TABLE public.modules
  DROP CONSTRAINT IF EXISTS modules_flow_type_check;

ALTER TABLE public.modules
  ADD CONSTRAINT modules_flow_type_check
    CHECK (flow_type IN ('wizard', 'chat', 'hybrid', 'quiz'));

-- 2. Chat-specific intake configuration columns
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS require_organization boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_persona         text,          -- Name shown in UI, e.g. "Movexum AI"
  ADD COLUMN IF NOT EXISTS max_exchanges        integer NOT NULL DEFAULT 20
    CHECK (max_exchanges BETWEEN 4 AND 60);
