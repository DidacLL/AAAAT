CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'normal',
  source TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  location TEXT DEFAULT '',
  remote_mode TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  call_signals TEXT DEFAULT '',
  technical_reading TEXT DEFAULT '',
  pitch TEXT DEFAULT '',
  smart_question TEXT DEFAULT '',
  risks_to_avoid TEXT DEFAULT '',
  prepare_first TEXT DEFAULT '',
  prepare_later TEXT DEFAULT '',
  offer_snapshot TEXT DEFAULT '',
  company_research TEXT DEFAULT '',
  form_answers TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS raw_intake (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS glossary_terms (
  term TEXT PRIMARY KEY,
  definition TEXT NOT NULL,
  category TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS application_keywords (
  application_id TEXT NOT NULL REFERENCES applications(id),
  term TEXT NOT NULL REFERENCES glossary_terms(term),
  PRIMARY KEY(application_id, term)
);

CREATE TABLE IF NOT EXISTS agent_suggestions (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id),
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  source_context TEXT DEFAULT '',
  agent_name TEXT DEFAULT '',
  agent_runtime TEXT DEFAULT '',
  review_state TEXT NOT NULL DEFAULT 'draft',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generated_artifacts (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id),
  artifact_type TEXT NOT NULL,
  path TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source_context TEXT NOT NULL DEFAULT '',
  agent_name TEXT DEFAULT '',
  agent_runtime TEXT DEFAULT '',
  model_provider TEXT DEFAULT '',
  review_state TEXT NOT NULL DEFAULT 'draft',
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS profile_variables (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  name TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  required_variables TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
