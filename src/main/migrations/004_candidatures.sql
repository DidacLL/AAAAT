CREATE TABLE candidatures (
  id TEXT PRIMARY KEY,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

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
