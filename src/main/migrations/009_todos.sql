CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  candidature_id TEXT REFERENCES candidatures(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX todos_candidature_idx ON todos(candidature_id);
