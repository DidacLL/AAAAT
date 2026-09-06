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
  document_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('cv', 'cover_letter')),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  captured_at TEXT NOT NULL
) STRICT;

CREATE INDEX application_artifacts_candidature_idx ON application_artifacts(candidature_id, captured_at);
