CREATE TABLE profile_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (
    kind IN (
      'identity',
      'contact',
      'summary',
      'experience',
      'education',
      'project',
      'skill',
      'certification',
      'language',
      'link'
    )
  ),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  url TEXT,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(sort_order)
) STRICT;

CREATE TABLE profile_variants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  focus TEXT NOT NULL DEFAULT '',
  target_tags_json TEXT NOT NULL DEFAULT '[]',
  preferred_language TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE profile_variant_item_rules (
  variant_id TEXT NOT NULL REFERENCES profile_variants(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES profile_items(id) ON DELETE CASCADE,
  excluded INTEGER NOT NULL DEFAULT 0 CHECK (excluded IN (0, 1)),
  content_patch_json TEXT,
  order_rank INTEGER CHECK (order_rank IS NULL OR order_rank >= 0),
  PRIMARY KEY (variant_id, item_id),
  CHECK (
    excluded = 1 OR
    content_patch_json IS NOT NULL OR
    order_rank IS NOT NULL
  )
) STRICT;

CREATE TABLE profile_activity (
  id INTEGER PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL
) STRICT;
