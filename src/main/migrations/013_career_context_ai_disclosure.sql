ALTER TABLE career_context
ADD COLUMN career_direction_external_ai_visible INTEGER NOT NULL DEFAULT 1
CHECK (career_direction_external_ai_visible IN (0, 1));

ALTER TABLE career_context
ADD COLUMN objectives_external_ai_visible INTEGER NOT NULL DEFAULT 1
CHECK (objectives_external_ai_visible IN (0, 1));

ALTER TABLE career_context
ADD COLUMN constraints_external_ai_visible INTEGER NOT NULL DEFAULT 1
CHECK (constraints_external_ai_visible IN (0, 1));

ALTER TABLE career_context
ADD COLUMN target_roles_external_ai_visible INTEGER NOT NULL DEFAULT 1
CHECK (target_roles_external_ai_visible IN (0, 1));

ALTER TABLE career_context
ADD COLUMN target_markets_locations_external_ai_visible INTEGER NOT NULL DEFAULT 1
CHECK (target_markets_locations_external_ai_visible IN (0, 1));

ALTER TABLE career_context
ADD COLUMN work_preferences_external_ai_visible INTEGER NOT NULL DEFAULT 1
CHECK (work_preferences_external_ai_visible IN (0, 1));

ALTER TABLE career_context
ADD COLUMN application_writing_preferences_external_ai_visible INTEGER NOT NULL DEFAULT 1
CHECK (application_writing_preferences_external_ai_visible IN (0, 1));
