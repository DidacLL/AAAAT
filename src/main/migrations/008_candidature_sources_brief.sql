ALTER TABLE candidatures
ADD COLUMN priority TEXT NOT NULL DEFAULT ''
CHECK (priority IN ('', 'low', 'medium', 'high'));

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

CREATE TABLE candidature_working_briefs (
  candidature_id TEXT PRIMARY KEY REFERENCES candidatures(id) ON DELETE CASCADE,
  fit_suitability TEXT NOT NULL DEFAULT '',
  strengths_evidence TEXT NOT NULL DEFAULT '',
  gaps_risks_constraints TEXT NOT NULL DEFAULT '',
  current_strategy TEXT NOT NULL DEFAULT '',
  company_role_context TEXT NOT NULL DEFAULT '',
  pitch TEXT NOT NULL DEFAULT '',
  questions TEXT NOT NULL DEFAULT '',
  recruiter_preparation TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
) STRICT;

INSERT INTO candidature_sources(
  id, candidature_id, kind, title, url, source_text, created_at, updated_at
)
SELECT
  id,
  id,
  'other',
  source,
  source_url,
  source_text,
  created_at,
  updated_at
FROM candidatures
WHERE source <> '' OR source_url <> '' OR source_text <> '';

INSERT INTO candidature_working_briefs(candidature_id)
SELECT id FROM candidatures;
