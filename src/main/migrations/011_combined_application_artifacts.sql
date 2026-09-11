CREATE TABLE application_artifacts_next (
  id TEXT PRIMARY KEY,
  candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  cv_document_id TEXT,
  cover_letter_document_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('cv', 'cover_letter', 'combined')),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  captured_at TEXT NOT NULL,
  CHECK (
    (kind = 'cv' AND cv_document_id IS NOT NULL AND cover_letter_document_id IS NULL)
    OR (kind = 'cover_letter' AND cv_document_id IS NULL AND cover_letter_document_id IS NOT NULL)
    OR (
      kind = 'combined'
      AND cv_document_id IS NOT NULL
      AND cover_letter_document_id IS NOT NULL
      AND cv_document_id <> cover_letter_document_id
    )
  )
) STRICT;

INSERT INTO application_artifacts_next(
  id,
  candidature_id,
  cv_document_id,
  cover_letter_document_id,
  kind,
  title,
  captured_at
)
SELECT
  id,
  candidature_id,
  CASE WHEN kind = 'cv' THEN document_id ELSE NULL END,
  CASE WHEN kind = 'cover_letter' THEN document_id ELSE NULL END,
  kind,
  title,
  captured_at
FROM application_artifacts;

DROP TABLE application_artifacts;
ALTER TABLE application_artifacts_next RENAME TO application_artifacts;
CREATE INDEX application_artifacts_candidature_idx ON application_artifacts(candidature_id, captured_at);
