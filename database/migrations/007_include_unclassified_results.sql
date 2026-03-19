ALTER TABLE raw.session_results
    ALTER COLUMN position DROP NOT NULL;

ALTER TABLE analytics.session_classification
    ALTER COLUMN finishing_position DROP NOT NULL;
