ALTER TABLE candidatures
ADD COLUMN opportunity_research_selected INTEGER NOT NULL DEFAULT 0
CHECK (opportunity_research_selected IN (0, 1));

CREATE UNIQUE INDEX candidatures_one_opportunity_research_selected
  ON candidatures(opportunity_research_selected)
  WHERE opportunity_research_selected = 1;

CREATE TRIGGER candidatures_opportunity_research_active_insert
BEFORE INSERT ON candidatures
WHEN NEW.opportunity_research_selected = 1 AND NEW.archived = 1
BEGIN
  SELECT RAISE(ABORT, 'Archived candidature cannot be selected for opportunity research');
END;

CREATE TRIGGER candidatures_opportunity_research_active_update
BEFORE UPDATE OF opportunity_research_selected, archived ON candidatures
WHEN NEW.opportunity_research_selected = 1 AND NEW.archived = 1
BEGIN
  SELECT RAISE(ABORT, 'Archived candidature cannot be selected for opportunity research');
END;
