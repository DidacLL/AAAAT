CREATE TABLE career_context (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  career_direction TEXT NOT NULL DEFAULT '',
  objectives TEXT NOT NULL DEFAULT '',
  constraints_text TEXT NOT NULL DEFAULT '',
  target_roles TEXT NOT NULL DEFAULT '',
  target_markets_locations TEXT NOT NULL DEFAULT '',
  work_preferences TEXT NOT NULL DEFAULT '',
  application_writing_preferences TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
) STRICT;

INSERT INTO career_context(id) VALUES (1);

CREATE TABLE career_context_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  action TEXT NOT NULL
) STRICT;
