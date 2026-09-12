CREATE TABLE workspace_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;

CREATE TABLE profile_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (length(trim(kind)) BETWEEN 1 AND 120),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  url TEXT,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  ai_context_mode TEXT NOT NULL DEFAULT 'expose' CHECK (ai_context_mode IN ('expose', 'omit', 'token')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(sort_order)
) STRICT;

CREATE TABLE profile_variants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  focus TEXT NOT NULL DEFAULT '',
  target_tags_json TEXT NOT NULL DEFAULT '[]',
  preferred_language TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE profile_variant_item_rules (
  variant_id TEXT NOT NULL REFERENCES profile_variants(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES profile_items(id) ON DELETE CASCADE,
  excluded INTEGER NOT NULL DEFAULT 0 CHECK (excluded IN (0, 1)),
  content_patch_json TEXT,
  order_rank INTEGER CHECK (order_rank IS NULL OR order_rank >= 0),
  PRIMARY KEY (variant_id, item_id),
  CHECK (excluded = 1 OR content_patch_json IS NOT NULL OR order_rank IS NOT NULL)
) STRICT;

CREATE TABLE profile_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL
) STRICT;

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('cv', 'cover_letter')),
  title TEXT NOT NULL,
  variant_id TEXT REFERENCES profile_variants(id) ON DELETE RESTRICT,
  language TEXT,
  engine TEXT NOT NULL DEFAULT 'pdflatex' CHECK (engine = 'pdflatex'),
  recipient TEXT,
  subject TEXT,
  body_json TEXT NOT NULL DEFAULT '[]',
  closing TEXT,
  mode TEXT NOT NULL DEFAULT 'managed' CHECK (mode IN ('managed', 'manual')),
  source_hash TEXT,
  ai_tags_json TEXT NOT NULL DEFAULT '[]',
  ai_notes TEXT,
  ai_content_visible INTEGER NOT NULL DEFAULT 0 CHECK (ai_content_visible IN (0, 1)),
  ai_render_allowed INTEGER NOT NULL DEFAULT 0 CHECK (ai_render_allowed IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (ai_content_visible = 0 OR kind = 'cv'),
  CHECK (ai_render_allowed = 0 OR (kind = 'cv' AND ai_content_visible = 1))
) STRICT;

CREATE UNIQUE INDEX documents_one_ai_content_visible_cv
  ON documents(ai_content_visible)
  WHERE ai_content_visible = 1;

CREATE TABLE document_item_rules (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES profile_items(id) ON DELETE CASCADE,
  excluded INTEGER NOT NULL DEFAULT 0 CHECK (excluded IN (0, 1)),
  content_patch_json TEXT,
  order_rank INTEGER CHECK (order_rank IS NULL OR order_rank >= 0),
  PRIMARY KEY (document_id, item_id),
  CHECK (excluded = 1 OR content_patch_json IS NOT NULL OR order_rank IS NOT NULL)
) STRICT;

CREATE TABLE document_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  document_id TEXT NOT NULL,
  action TEXT NOT NULL
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

CREATE TABLE candidature_documents (
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  PRIMARY KEY (candidature_id, document_id)
) STRICT;

CREATE TABLE candidature_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  action TEXT NOT NULL
) STRICT;

CREATE TABLE concepts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  definition TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  aliases_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE candidature_concepts (
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (candidature_id, concept_id)
) STRICT;

CREATE TABLE concept_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  concept_id TEXT NOT NULL,
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
  career_direction_external_ai_visible INTEGER NOT NULL DEFAULT 1 CHECK (career_direction_external_ai_visible IN (0, 1)),
  objectives_external_ai_visible INTEGER NOT NULL DEFAULT 1 CHECK (objectives_external_ai_visible IN (0, 1)),
  constraints_external_ai_visible INTEGER NOT NULL DEFAULT 1 CHECK (constraints_external_ai_visible IN (0, 1)),
  target_roles_external_ai_visible INTEGER NOT NULL DEFAULT 1 CHECK (target_roles_external_ai_visible IN (0, 1)),
  target_markets_locations_external_ai_visible INTEGER NOT NULL DEFAULT 1 CHECK (target_markets_locations_external_ai_visible IN (0, 1)),
  work_preferences_external_ai_visible INTEGER NOT NULL DEFAULT 1 CHECK (work_preferences_external_ai_visible IN (0, 1)),
  application_writing_preferences_external_ai_visible INTEGER NOT NULL DEFAULT 1 CHECK (application_writing_preferences_external_ai_visible IN (0, 1)),
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

CREATE INDEX candidature_sources_candidature_idx
ON candidature_sources(candidature_id, created_at, id);

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
  ai_discovery INTEGER NOT NULL DEFAULT 0 CHECK (ai_discovery IN (0, 1)),
  ai_context_mode TEXT NOT NULL DEFAULT 'omit' CHECK (ai_context_mode IN ('expose', 'omit', 'token'))
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

CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  candidature_id TEXT REFERENCES candidatures(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX todos_candidature_idx ON todos(candidature_id);

CREATE TABLE application_artifacts (
  id TEXT PRIMARY KEY,
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  cv_document_id TEXT,
  cover_letter_document_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('cv', 'cover_letter', 'combined')),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  captured_at TEXT NOT NULL,
  CHECK (
    (kind = 'cv' AND cv_document_id IS NOT NULL AND cover_letter_document_id IS NULL)
    OR (kind = 'cover_letter' AND cv_document_id IS NULL AND cover_letter_document_id IS NOT NULL)
    OR (kind = 'combined' AND cv_document_id IS NOT NULL AND cover_letter_document_id IS NOT NULL AND cv_document_id <> cover_letter_document_id)
  )
) STRICT;

CREATE INDEX application_artifacts_candidature_idx
ON application_artifacts(candidature_id, captured_at);
