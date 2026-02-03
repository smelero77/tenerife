-- ============================================================================
-- Migration: 0004_fix_constraints_and_types.sql
-- Description: Fix inconsistencies: change VARCHAR(255) to TEXT, convert UNIQUE to PRIMARY KEY
-- ============================================================================

-- ============================================================================
-- FIX 1: Change source_file from VARCHAR(255) to TEXT for consistency
-- ============================================================================

ALTER TABLE bronze_nomenclator_raw 
ALTER COLUMN source_file TYPE TEXT;

-- ============================================================================
-- FIX 2: Convert UNIQUE constraints to PRIMARY KEYs in fact tables
-- ============================================================================

-- fact_population_localidad
ALTER TABLE fact_population_localidad
DROP CONSTRAINT IF EXISTS unique_localidad_year;

ALTER TABLE fact_population_localidad
ADD PRIMARY KEY (localidad_id, year);

-- fact_population_age_localidad
ALTER TABLE fact_population_age_localidad
DROP CONSTRAINT IF EXISTS unique_fact_age_localidad;

ALTER TABLE fact_population_age_localidad
ADD PRIMARY KEY (localidad_id, year, age_group);

-- fact_population_sex_localidad
ALTER TABLE fact_population_sex_localidad
DROP CONSTRAINT IF EXISTS unique_fact_sex_localidad;

ALTER TABLE fact_population_sex_localidad
ADD PRIMARY KEY (localidad_id, year);

-- fact_population_age_municipio
ALTER TABLE fact_population_age_municipio
DROP CONSTRAINT IF EXISTS unique_fact_age_municipio;

ALTER TABLE fact_population_age_municipio
ADD PRIMARY KEY (ine_code, year, age_group);

-- fact_population_sex_municipio
ALTER TABLE fact_population_sex_municipio
DROP CONSTRAINT IF EXISTS unique_fact_sex_municipio;

ALTER TABLE fact_population_sex_municipio
ADD PRIMARY KEY (ine_code, year);

-- agg_municipio_snapshot
ALTER TABLE agg_municipio_snapshot
DROP CONSTRAINT IF EXISTS unique_snapshot_municipio;

ALTER TABLE agg_municipio_snapshot
ADD PRIMARY KEY (snapshot_date, ine_code);

-- ============================================================================
-- FIX 3: Convert UNIQUE to PRIMARY KEY for nationality tables (if they exist)
-- ============================================================================

-- fact_population_nationality_localidad (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fact_population_nationality_localidad') THEN
        ALTER TABLE fact_population_nationality_localidad
        DROP CONSTRAINT IF EXISTS unique_fact_nationality_localidad;

        ALTER TABLE fact_population_nationality_localidad
        ADD PRIMARY KEY (localidad_id, year);
    END IF;
END $$;

-- fact_population_nationality_municipio (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fact_population_nationality_municipio') THEN
        ALTER TABLE fact_population_nationality_municipio
        DROP CONSTRAINT IF EXISTS unique_fact_nationality_municipio;

        ALTER TABLE fact_population_nationality_municipio
        ADD PRIMARY KEY (ine_code, year);
    END IF;
END $$;
