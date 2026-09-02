CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('cv', 'cover_letter')),
  title TEXT NOT NULL,
  variant_id TEXT NOT NULL REFERENCES profile_variants(id) ON DELETE RESTRICT,
  language TEXT,
  engine TEXT NOT NULL DEFAULT 'pdflatex' CHECK (engine IN ('pdflatex', 'lualatex', 'xelatex')),
  recipient TEXT,
  subject TEXT,
  body_json TEXT NOT NULL DEFAULT '[]',
  closing TEXT,
  mode TEXT NOT NULL DEFAULT 'managed' CHECK (mode IN ('managed', 'manual')),
  source_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE document_item_rules (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES profile_items(id) ON DELETE CASCADE,
  excluded INTEGER NOT NULL DEFAULT 0 CHECK (excluded IN (0, 1)),
  content_patch_json TEXT,
  order_rank INTEGER CHECK (order_rank IS NULL OR order_rank >= 0),
  PRIMARY KEY (document_id, item_id),
  CHECK (
    excluded = 1 OR
    content_patch_json IS NOT NULL OR
    order_rank IS NOT NULL
  )
) STRICT;

CREATE TABLE document_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL
) STRICT;
