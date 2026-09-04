CREATE TABLE candidature_sources (
  id TEXT PRIMARY KEY,
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (
    kind IN ('job_posting', 'recruiter_message', 'application_form', 'conversation', 'link', 'other')
  ),
  title TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  source_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX candidature_sources_candidature_idx
ON candidature_sources(candidature_id, created_at, id);

CREATE TABLE candidature_fields (
  id TEXT PRIMARY KEY,
  system_key TEXT UNIQUE,
  label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '',
  value_type TEXT NOT NULL CHECK (
    value_type IN ('text', 'long_text', 'number', 'boolean', 'date', 'url', 'choice')
  ),
  cardinality TEXT NOT NULL DEFAULT 'one' CHECK (cardinality IN ('one', 'many')),
  options_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(options_json)),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE candidature_field_preferences (
  field_id TEXT PRIMARY KEY REFERENCES candidature_fields(id) ON DELETE CASCADE,
  focus_visible INTEGER NOT NULL DEFAULT 0 CHECK (focus_visible IN (0, 1)),
  focus_order INTEGER,
  focus_prominence TEXT NOT NULL DEFAULT 'normal' CHECK (
    focus_prominence IN ('compact', 'normal', 'wide')
  ),
  identity_order INTEGER,
  ai_discovery INTEGER NOT NULL DEFAULT 0 CHECK (ai_discovery IN (0, 1)),
  ai_context_mode TEXT NOT NULL DEFAULT 'omit' CHECK (
    ai_context_mode IN ('expose', 'omit', 'token')
  )
) STRICT;

CREATE TABLE candidature_field_values (
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL REFERENCES candidature_fields(id),
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (candidature_id, field_id)
) STRICT;

CREATE INDEX candidature_field_values_by_field
ON candidature_field_values(field_id, candidature_id);

INSERT INTO candidature_fields(
  id, system_key, label, description, value_type, cardinality, options_json, enabled, created_at, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000000101', 'candidature.organization', 'Organisation', 'Organisation, company or other entity offering the opportunity.', 'text', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000102', 'candidature.role', 'Role', 'Role, position or opportunity title.', 'text', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000103', 'candidature.location', 'Location', 'Relevant workplace, base or geographic location.', 'text', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000104', 'candidature.compensation', 'Compensation', 'Compensation, salary, rate or other remuneration information.', 'text', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000105', 'candidature.application_date', 'Application date', 'Date the user applied, when known and useful.', 'date', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000106', 'candidature.notes', 'Notes', 'Free-form user notes about the candidature.', 'long_text', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z');

INSERT INTO candidature_field_preferences(
  field_id, focus_visible, focus_order, focus_prominence, identity_order, ai_discovery, ai_context_mode
) VALUES
  ('00000000-0000-4000-8000-000000000101', 1, 0, 'normal', 0, 1, 'expose'),
  ('00000000-0000-4000-8000-000000000102', 1, 1, 'normal', 1, 1, 'expose'),
  ('00000000-0000-4000-8000-000000000103', 1, 2, 'compact', NULL, 1, 'expose'),
  ('00000000-0000-4000-8000-000000000104', 1, 3, 'compact', NULL, 1, 'expose'),
  ('00000000-0000-4000-8000-000000000105', 0, NULL, 'compact', NULL, 0, 'omit'),
  ('00000000-0000-4000-8000-000000000106', 0, NULL, 'wide', NULL, 0, 'omit');
