CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_meta(key, value) VALUES ('schema_version', '1');

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'normal',
  source_url TEXT DEFAULT '',
  location TEXT DEFAULT '',
  remote_mode TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  call_signals TEXT DEFAULT '',
  pitch TEXT DEFAULT '',
  smart_question TEXT DEFAULT '',
  risks_to_avoid TEXT DEFAULT '',
  offer_snapshot TEXT DEFAULT '',
  company_research TEXT DEFAULT '',
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

CREATE TABLE IF NOT EXISTS artifact_events (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL REFERENCES generated_artifacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  notes TEXT NOT NULL DEFAULT ''
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
  form_answers TEXT DEFAULT '',
  cv_sent_artifact_id TEXT REFERENCES generated_artifacts(id),
  cover_letter_artifact_id TEXT REFERENCES generated_artifacts(id),
  strengths TEXT DEFAULT '',
  questions_to_ask TEXT DEFAULT '',
  tech_stack TEXT DEFAULT '',
  valuation INTEGER,
  candidature_evaluation TEXT DEFAULT '',
  role_strategy TEXT DEFAULT '',
  cv_material TEXT DEFAULT '',
  cover_letter_material TEXT DEFAULT '',
  recruiter_material TEXT DEFAULT '',
  material_sent_notes TEXT DEFAULT '',
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
  use_for_desktop INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'user',
  review_state TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS career_plans (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL DEFAULT '',
  objectives TEXT NOT NULL DEFAULT '[]',
  constraints TEXT NOT NULL DEFAULT '[]',
  target_markets TEXT NOT NULL DEFAULT '[]',
  target_roles TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'user',
  review_state TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS text_blobs (
  id TEXT PRIMARY KEY,
  blob_type TEXT NOT NULL,
  application_id TEXT REFERENCES applications(id),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  source_context TEXT NOT NULL DEFAULT '',
  review_state TEXT NOT NULL DEFAULT 'current',
  created_by TEXT NOT NULL DEFAULT 'user',
  agent_name TEXT NOT NULL DEFAULT '',
  agent_runtime TEXT NOT NULL DEFAULT '',
  model_provider TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id),
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'queued',
  priority TEXT NOT NULL DEFAULT 'normal',
  context_hint TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  agent_name TEXT NOT NULL DEFAULT '',
  agent_runtime TEXT NOT NULL DEFAULT '',
  result_blob_id TEXT REFERENCES text_blobs(id),
  artifact_id TEXT REFERENCES generated_artifacts(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS agent_task_capabilities (
  capability TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_task_progress (
  task_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  phase TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  percent INTEGER,
  created_at TEXT NOT NULL,
  PRIMARY KEY(task_id, sequence),
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id),
  note_type TEXT NOT NULL DEFAULT 'note',
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'open',
  pinned INTEGER NOT NULL DEFAULT 0,
  due_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS keyword_aliases (
  keyword TEXT NOT NULL REFERENCES glossary_terms(term) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(keyword, alias)
);

CREATE TABLE IF NOT EXISTS keyword_notes (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL REFERENCES glossary_terms(term) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
