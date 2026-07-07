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

CREATE TABLE IF NOT EXISTS candidature_details (
  application_id TEXT PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  description TEXT DEFAULT '',
  salary_expectation TEXT DEFAULT '',
  publication_date TEXT DEFAULT '',
  application_date TEXT DEFAULT '',
  raw_application_form TEXT DEFAULT '',
  cv_sent_artifact_id TEXT REFERENCES generated_artifacts(id),
  cover_letter_artifact_id TEXT REFERENCES generated_artifacts(id),
  strengths TEXT DEFAULT '',
  questions_to_ask TEXT DEFAULT '',
  tech_stack TEXT DEFAULT '',
  valuation INTEGER,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS variables (
  key TEXT PRIMARY KEY,
  placeholder TEXT NOT NULL,
  value TEXT DEFAULT '',
  is_sensitive INTEGER NOT NULL DEFAULT 1,
  exposure TEXT NOT NULL DEFAULT 'placeholder',
  summary TEXT DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_facts (
  id TEXT PRIMARY KEY,
  fact_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'private',
  exposure TEXT NOT NULL DEFAULT 'summarized',
  use_for_cv INTEGER NOT NULL DEFAULT 0,
  use_for_cover_letter INTEGER NOT NULL DEFAULT 0,
  use_for_agent_context INTEGER NOT NULL DEFAULT 0,
  use_for_market_research INTEGER NOT NULL DEFAULT 0,
  use_for_dashboard INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'user',
  review_state TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS text_blobs (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  blob_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  source_context TEXT DEFAULT '',
  review_state TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL DEFAULT 'user',
  agent_name TEXT DEFAULT '',
  agent_runtime TEXT DEFAULT '',
  model_provider TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'queued',
  priority TEXT NOT NULL DEFAULT 'normal',
  context_hint TEXT DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  agent_name TEXT DEFAULT '',
  agent_runtime TEXT DEFAULT '',
  result_blob_id TEXT REFERENCES text_blobs(id),
  artifact_id TEXT REFERENCES generated_artifacts(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  state TEXT NOT NULL DEFAULT 'open',
  pinned INTEGER NOT NULL DEFAULT 0,
  due_at TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS keyword_aliases (
  keyword TEXT NOT NULL REFERENCES glossary_terms(term) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(keyword, alias)
);

CREATE TABLE IF NOT EXISTS keyword_notes (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL REFERENCES glossary_terms(term) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
