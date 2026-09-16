CREATE TABLE workspace_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;

CREATE TABLE profile_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (length(trim(kind)) BETWEEN 1 AND 80),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  url TEXT,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  ai_use_allowed INTEGER NOT NULL DEFAULT 1 CHECK (ai_use_allowed IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(sort_order)
) STRICT;

CREATE TABLE profile_variants (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES profile_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL COLLATE NOCASE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(item_id, name)
) STRICT;

CREATE INDEX profile_variants_item_idx ON profile_variants(item_id, name COLLATE NOCASE);

CREATE TABLE profile_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL
) STRICT;

CREATE TABLE candidatures (
  id TEXT PRIMARY KEY,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  opportunity_research_selected INTEGER NOT NULL DEFAULT 0 CHECK (opportunity_research_selected IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE UNIQUE INDEX candidatures_one_opportunity_research_selected
  ON candidatures(opportunity_research_selected)
  WHERE opportunity_research_selected = 1;

CREATE TRIGGER candidatures_opportunity_research_active_insert
BEFORE INSERT ON candidatures
WHEN NEW.opportunity_research_selected = 1 AND NEW.archived = 1
BEGIN
  SELECT RAISE(ABORT, 'Archived candidature cannot be selected for opportunity research');
END;

CREATE TRIGGER candidatures_opportunity_research_active_update
BEFORE UPDATE OF opportunity_research_selected, archived ON candidatures
WHEN NEW.opportunity_research_selected = 1 AND NEW.archived = 1
BEGIN
  SELECT RAISE(ABORT, 'Archived candidature cannot be selected for opportunity research');
END;

CREATE TABLE candidature_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  action TEXT NOT NULL
) STRICT;

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  definition TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  aliases_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE candidature_tags (
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (candidature_id, tag_id)
) STRICT;

CREATE TABLE tag_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  action TEXT NOT NULL
) STRICT;

CREATE TABLE career_context (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  career_direction TEXT NOT NULL DEFAULT '',
  objectives TEXT NOT NULL DEFAULT '',
  constraints_text TEXT NOT NULL DEFAULT '',
  target_roles TEXT NOT NULL DEFAULT '',
  target_markets_locations TEXT NOT NULL DEFAULT '',
  work_preferences TEXT NOT NULL DEFAULT '',
  application_writing_preferences TEXT NOT NULL DEFAULT '',
  career_direction_ai_use_allowed INTEGER NOT NULL DEFAULT 1 CHECK (career_direction_ai_use_allowed IN (0, 1)),
  objectives_ai_use_allowed INTEGER NOT NULL DEFAULT 1 CHECK (objectives_ai_use_allowed IN (0, 1)),
  constraints_ai_use_allowed INTEGER NOT NULL DEFAULT 1 CHECK (constraints_ai_use_allowed IN (0, 1)),
  target_roles_ai_use_allowed INTEGER NOT NULL DEFAULT 1 CHECK (target_roles_ai_use_allowed IN (0, 1)),
  target_markets_locations_ai_use_allowed INTEGER NOT NULL DEFAULT 1 CHECK (target_markets_locations_ai_use_allowed IN (0, 1)),
  work_preferences_ai_use_allowed INTEGER NOT NULL DEFAULT 1 CHECK (work_preferences_ai_use_allowed IN (0, 1)),
  application_writing_preferences_ai_use_allowed INTEGER NOT NULL DEFAULT 1 CHECK (application_writing_preferences_ai_use_allowed IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT ''
) STRICT;
INSERT INTO career_context(id) VALUES (1);

CREATE TABLE career_context_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  action TEXT NOT NULL
) STRICT;

CREATE TABLE candidature_sources (
  id TEXT PRIMARY KEY,
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('job_posting', 'recruiter_message', 'application_form', 'conversation', 'link', 'other')),
  title TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  source_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE INDEX candidature_sources_candidature_idx ON candidature_sources(candidature_id, created_at, id);

CREATE TABLE candidature_fields (
  id TEXT PRIMARY KEY,
  system_key TEXT UNIQUE,
  label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '',
  value_type TEXT NOT NULL CHECK (value_type IN ('text', 'long_text', 'number', 'boolean', 'date', 'url', 'choice')),
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
  focus_prominence TEXT NOT NULL DEFAULT 'normal' CHECK (focus_prominence IN ('compact', 'normal', 'wide')),
  identity_order INTEGER,
  ai_use_allowed INTEGER NOT NULL DEFAULT 1 CHECK (ai_use_allowed IN (0, 1))
) STRICT;

CREATE TABLE candidature_field_values (
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL REFERENCES candidature_fields(id),
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (candidature_id, field_id)
) STRICT;
CREATE INDEX candidature_field_values_by_field ON candidature_field_values(field_id, candidature_id);

CREATE TABLE cv_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  language TEXT,
  composition_json TEXT NOT NULL CHECK (json_valid(composition_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE working_cvs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  language TEXT,
  source_template_id TEXT REFERENCES cv_templates(id) ON DELETE SET NULL,
  candidature_id TEXT REFERENCES candidatures(id) ON DELETE CASCADE,
  composition_json TEXT NOT NULL CHECK (json_valid(composition_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE INDEX working_cvs_candidature_idx ON working_cvs(candidature_id, updated_at);

CREATE TABLE cover_letters (
  id TEXT PRIMARY KEY,
  candidature_id TEXT REFERENCES candidatures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  language TEXT,
  recipient TEXT,
  subject TEXT,
  body_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(body_json)),
  closing TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE INDEX cover_letters_candidature_idx ON cover_letters(candidature_id, updated_at);

CREATE TABLE rendered_cvs (
  id TEXT PRIMARY KEY,
  working_cv_id TEXT REFERENCES working_cvs(id) ON DELETE SET NULL,
  source_template_id TEXT REFERENCES cv_templates(id) ON DELETE SET NULL,
  candidature_id TEXT REFERENCES candidatures(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  language TEXT,
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  project_relative_path TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX rendered_cvs_candidature_idx ON rendered_cvs(candidature_id, created_at);

CREATE TABLE application_packets (
  id TEXT PRIMARY KEY,
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  rendered_cv_id TEXT NOT NULL REFERENCES rendered_cvs(id) ON DELETE RESTRICT,
  cover_letter_id TEXT NOT NULL REFERENCES cover_letters(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  letter_snapshot_json TEXT NOT NULL CHECK (json_valid(letter_snapshot_json)),
  project_relative_path TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX application_packets_candidature_idx ON application_packets(candidature_id, created_at);

INSERT INTO candidature_fields(id, system_key, label, description, value_type, cardinality, options_json, enabled, created_at, updated_at) VALUES
  ('00000000-0000-4000-8000-000000000101', 'candidature.organization', 'Organisation', 'Organisation, company or other entity offering the opportunity.', 'text', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000102', 'candidature.role', 'Role', 'Role, position or opportunity title.', 'text', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000103', 'candidature.location', 'Location', 'Relevant workplace, base or geographic location.', 'text', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000104', 'candidature.compensation', 'Compensation', 'Compensation, salary, rate or other remuneration information.', 'text', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000105', 'candidature.application_date', 'Application date', 'Date the user applied, when known and useful.', 'date', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z'),
  ('00000000-0000-4000-8000-000000000106', 'candidature.notes', 'Notes', 'Free-form user notes about the candidature.', 'long_text', 'one', '[]', 1, '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z');

INSERT INTO candidature_field_preferences(field_id, focus_visible, focus_order, focus_prominence, identity_order, ai_use_allowed) VALUES
  ('00000000-0000-4000-8000-000000000101', 1, 0, 'normal', 0, 1),
  ('00000000-0000-4000-8000-000000000102', 1, 1, 'normal', 1, 1),
  ('00000000-0000-4000-8000-000000000103', 1, 2, 'compact', NULL, 1),
  ('00000000-0000-4000-8000-000000000104', 1, 3, 'compact', NULL, 1),
  ('00000000-0000-4000-8000-000000000105', 0, NULL, 'compact', NULL, 0),
  ('00000000-0000-4000-8000-000000000106', 0, NULL, 'wide', NULL, 0);
