CREATE TABLE candidatures (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  work_mode TEXT NOT NULL DEFAULT '',
  salary_text TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  source_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'saved' CHECK (
    status IN ('saved', 'applied', 'interview', 'offer', 'closed')
  ),
  application_date TEXT NOT NULL DEFAULT '',
  next_action TEXT NOT NULL DEFAULT '',
  next_action_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
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
