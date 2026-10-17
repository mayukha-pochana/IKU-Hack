-- CareFlow AI - Snowflake setup for the Snowflake side track.
-- Snowflake holds ONLY public ClinicalTrials.gov data. Never load patient data here.
--
-- Order:
--   1. Run sections 1-2 once (Snowsight worksheet, as a role that can create databases and warehouses).
--   2. Load trials:   cd backend && python -m scripts.sync_trials_snowflake asthma "type 2 diabetes"
--   3. Run sections 3-4 (summaries + search service). Re-run section 3 after later loads.
--   4. Set SNOWFLAKE_ACCOUNT_URL and SNOWFLAKE_PAT in backend/.env; /api/trials/matches then reports
--      X-Trials-Source: snowflake_cortex.
-- Check that Cortex Search and your chosen AI_COMPLETE model are available in your account's region.

-- 1. Warehouse, database, schema --------------------------------------------------------------------
CREATE WAREHOUSE IF NOT EXISTS CAREFLOW_WH
  WAREHOUSE_SIZE = 'XSMALL' AUTO_SUSPEND = 60 AUTO_RESUME = TRUE INITIALLY_SUSPENDED = TRUE;
CREATE DATABASE IF NOT EXISTS CAREFLOW;
CREATE SCHEMA IF NOT EXISTS CAREFLOW.TRIALS;
USE WAREHOUSE CAREFLOW_WH;
USE SCHEMA CAREFLOW.TRIALS;

-- 2. Trial table (filled by backend/scripts/sync_trials_snowflake.py) --------------------------------
CREATE TABLE IF NOT EXISTS STUDIES (
  nct_id           VARCHAR PRIMARY KEY,
  title            VARCHAR,
  brief_summary    VARCHAR,
  conditions       VARCHAR,          -- "; "-separated
  interventions    VARCHAR,          -- "; "-separated
  phase            VARCHAR,          -- "; "-separated, e.g. PHASE2; PHASE3
  status           VARCHAR,          -- ClinicalTrials.gov overallStatus, e.g. RECRUITING
  min_age          VARCHAR,          -- as published, e.g. "18 Years"
  max_age          VARCHAR,
  eligibility_text VARCHAR,          -- inclusion + exclusion criteria
  ai_summary       VARCHAR,          -- filled by section 3
  loaded_at        TIMESTAMP_TZ DEFAULT CURRENT_TIMESTAMP()
);
-- Cortex Search refreshes incrementally from change tracking.
ALTER TABLE STUDIES SET CHANGE_TRACKING = TRUE;

-- 3. Patient-friendly one-line summaries, generated inside Snowflake --------------------------------
-- >>> CHANGE THIS: pick a model your account/region offers (Snowsight > AI & ML > Models). <<<
SET summary_model = 'llama3.1-8b';

UPDATE STUDIES
SET ai_summary = AI_COMPLETE(
      $summary_model,
      'In one plain-English sentence for a patient, say what this clinical trial is testing. '
      || 'Do not say who is eligible. Study title: ' || title
      || '. Summary: ' || LEFT(COALESCE(brief_summary, ''), 3000))
WHERE ai_summary IS NULL AND brief_summary IS NOT NULL;
-- Older accounts without AI_COMPLETE: use SNOWFLAKE.CORTEX.COMPLETE($summary_model, ...) instead.

-- 4. Cortex Search service queried by backend/app/services/trials/snowflake.py ----------------------
-- The backend requests columns nct_id, title, ai_summary, phase, status and filters on status,
-- so all five must be selected and status must be an ATTRIBUTE.
CREATE OR REPLACE CORTEX SEARCH SERVICE TRIAL_SEARCH
  ON search_text
  ATTRIBUTES status, phase
  WAREHOUSE = CAREFLOW_WH
  TARGET_LAG = '1 hour'
AS (
  SELECT
    nct_id, title, ai_summary, phase, status,
    title || '. Conditions: ' || COALESCE(conditions, '') || '. Interventions: ' || COALESCE(interventions, '')
      || '. ' || COALESCE(brief_summary, '') || ' Eligibility: ' || LEFT(COALESCE(eligibility_text, ''), 6000)
      AS search_text
  FROM STUDIES
);

-- Smoke test (should list recruiting asthma studies):
-- SELECT PARSE_JSON(SNOWFLAKE.CORTEX.SEARCH_PREVIEW('CAREFLOW.TRIALS.TRIAL_SEARCH',
--   '{"query": "adult asthma inhaler", "columns": ["nct_id", "title"], "filter": {"@eq": {"status": "RECRUITING"}}, "limit": 5}'
-- ))['results'];
