ALTER TABLE profile_items
ADD COLUMN ai_context_mode TEXT NOT NULL DEFAULT 'expose'
CHECK (ai_context_mode IN ('expose', 'omit', 'token'));
