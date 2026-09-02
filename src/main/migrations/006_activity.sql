CREATE TABLE document_activity_next (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  document_id TEXT NOT NULL,
  action TEXT NOT NULL
) STRICT;

INSERT INTO document_activity_next(id, occurred_at, document_id, action)
SELECT id, occurred_at, document_id, action
FROM document_activity;

DROP TABLE document_activity;
ALTER TABLE document_activity_next RENAME TO document_activity;

CREATE TABLE concept_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  action TEXT NOT NULL
) STRICT;
