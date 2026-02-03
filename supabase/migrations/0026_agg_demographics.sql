-- ============================================================================
-- Migration: 0026_agg_demographics.sql
-- Description: Create aggregated demographics tables for fast queries
-- Scope: Pre-calculated demographics data for municipalities and localities
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS agg_demographics_localidad CASCADE;
DROP TABLE IF EXISTS agg_demographics_municipio CASCADE;
DROP FUNCTION IF EXISTS refresh_agg_demographics() CASCADE;

-- ============================================================================
-- AGGREGATED DEMOGRAPHICS TABLES
-- ============================================================================

-- Aggregated demographics for municipalities
CREATE TABLE agg_demographics_municipio (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    municipio_name TEXT NOT NULL,
    total INTEGER NOT NULL CHECK (total >= 0),
    mujeres INTEGER NOT NULL CHECK (mujeres >= 0),
    hombres INTEGER NOT NULL CHECK (hombres >= 0),
    espanoles INTEGER NOT NULL CHECK (espanoles >= 0),
    extranjeros INTEGER NOT NULL CHECK (extranjeros >= 0),
    age_0_14 INTEGER NOT NULL DEFAULT 0 CHECK (age_0_14 >= 0),
    age_15_64 INTEGER NOT NULL DEFAULT 0 CHECK (age_15_64 >= 0),
    age_65_plus INTEGER NOT NULL DEFAULT 0 CHECK (age_65_plus >= 0),
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, year),
    
    CONSTRAINT valid_agg_dem_mun_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_dem_mun_year CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT valid_agg_dem_mun_sex_sum CHECK (mujeres + hombres = total),
    CONSTRAINT valid_agg_dem_mun_nat_sum CHECK (espanoles + extranjeros = total),
    CONSTRAINT valid_agg_dem_mun_age_sum CHECK (age_0_14 + age_15_64 + age_65_plus = total)
);

CREATE INDEX idx_agg_demographics_municipio_year ON agg_demographics_municipio(year DESC);
CREATE INDEX idx_agg_demographics_municipio_ine_code ON agg_demographics_municipio(ine_code);
CREATE INDEX idx_agg_demographics_municipio_last_refreshed ON agg_demographics_municipio(last_refreshed_at DESC);

COMMENT ON TABLE agg_demographics_municipio IS 'Aggregated demographics data for municipalities. Pre-calculated from fact tables for fast queries.';
COMMENT ON COLUMN agg_demographics_municipio.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN agg_demographics_municipio.year IS 'Year of the demographic data.';
COMMENT ON COLUMN agg_demographics_municipio.municipio_name IS 'Municipality name from dim_municipio.';
COMMENT ON COLUMN agg_demographics_municipio.total IS 'Total population.';
COMMENT ON COLUMN agg_demographics_municipio.mujeres IS 'Female population.';
COMMENT ON COLUMN agg_demographics_municipio.hombres IS 'Male population.';
COMMENT ON COLUMN agg_demographics_municipio.espanoles IS 'Spanish population.';
COMMENT ON COLUMN agg_demographics_municipio.extranjeros IS 'Foreign population.';
COMMENT ON COLUMN agg_demographics_municipio.age_0_14 IS 'Population aged 0-14 (mapped from 0-15 group).';
COMMENT ON COLUMN agg_demographics_municipio.age_15_64 IS 'Population aged 15-64 (mapped from 16-64 group).';
COMMENT ON COLUMN agg_demographics_municipio.age_65_plus IS 'Population aged 65+ (mapped from 65+ group).';

-- Aggregated demographics for localities
CREATE TABLE agg_demographics_localidad (
    localidad_id VARCHAR(15) NOT NULL REFERENCES dim_localidad(localidad_id) ON DELETE CASCADE,
    localidad_name TEXT NOT NULL,
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    total INTEGER NOT NULL CHECK (total >= 0),
    mujeres INTEGER NOT NULL CHECK (mujeres >= 0),
    hombres INTEGER NOT NULL CHECK (hombres >= 0),
    espanoles INTEGER NOT NULL CHECK (espanoles >= 0),
    extranjeros INTEGER NOT NULL CHECK (extranjeros >= 0),
    age_0_14 INTEGER NOT NULL DEFAULT 0 CHECK (age_0_14 >= 0),
    age_15_64 INTEGER NOT NULL DEFAULT 0 CHECK (age_15_64 >= 0),
    age_65_plus INTEGER NOT NULL DEFAULT 0 CHECK (age_65_plus >= 0),
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (localidad_id, year),
    
    CONSTRAINT valid_agg_dem_loc_year CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT valid_agg_dem_loc_sex_sum CHECK (mujeres + hombres = total),
    CONSTRAINT valid_agg_dem_loc_nat_sum CHECK (espanoles + extranjeros = total),
    CONSTRAINT valid_agg_dem_loc_age_sum CHECK (age_0_14 + age_15_64 + age_65_plus = total)
);

CREATE INDEX idx_agg_demographics_localidad_year ON agg_demographics_localidad(year DESC);
CREATE INDEX idx_agg_demographics_localidad_ine_code ON agg_demographics_localidad(ine_code);
CREATE INDEX idx_agg_demographics_localidad_localidad_id ON agg_demographics_localidad(localidad_id);
CREATE INDEX idx_agg_demographics_localidad_last_refreshed ON agg_demographics_localidad(last_refreshed_at DESC);

COMMENT ON TABLE agg_demographics_localidad IS 'Aggregated demographics data for localities. Pre-calculated from fact tables for fast queries.';
COMMENT ON COLUMN agg_demographics_localidad.localidad_id IS 'Locality ID.';
COMMENT ON COLUMN agg_demographics_localidad.localidad_name IS 'Locality name from dim_localidad.';
COMMENT ON COLUMN agg_demographics_localidad.ine_code IS 'INE municipality code (parent municipality).';
COMMENT ON COLUMN agg_demographics_localidad.year IS 'Year of the demographic data.';
COMMENT ON COLUMN agg_demographics_localidad.total IS 'Total population.';
COMMENT ON COLUMN agg_demographics_localidad.mujeres IS 'Female population.';
COMMENT ON COLUMN agg_demographics_localidad.hombres IS 'Male population.';
COMMENT ON COLUMN agg_demographics_localidad.espanoles IS 'Spanish population.';
COMMENT ON COLUMN agg_demographics_localidad.extranjeros IS 'Foreign population.';
COMMENT ON COLUMN agg_demographics_localidad.age_0_14 IS 'Population aged 0-14 (mapped from 0-15 group).';
COMMENT ON COLUMN agg_demographics_localidad.age_15_64 IS 'Population aged 15-64 (mapped from 16-64 group).';
COMMENT ON COLUMN agg_demographics_localidad.age_65_plus IS 'Population aged 65+ (mapped from 65+ group).';

-- ============================================================================
-- REFRESH FUNCTION
-- ============================================================================

-- Function to refresh aggregated demographics tables
CREATE OR REPLACE FUNCTION refresh_agg_demographics()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (with WHERE clause for safety)
    DELETE FROM agg_demographics_municipio WHERE ine_code IS NOT NULL;
    DELETE FROM agg_demographics_localidad WHERE localidad_id IS NOT NULL;
    
    -- Insert aggregated municipality demographics
    INSERT INTO agg_demographics_municipio (
        ine_code,
        year,
        municipio_name,
        total,
        mujeres,
        hombres,
        espanoles,
        extranjeros,
        age_0_14,
        age_15_64,
        age_65_plus
    )
    SELECT
        s.ine_code,
        s.year,
        m.municipio_name,
        s.population_total as total,
        s.population_female as mujeres,
        s.population_male as hombres,
        n.population_spanish as espanoles,
        n.population_foreign as extranjeros,
        COALESCE(MAX(CASE WHEN a.age_group = '0-15' THEN a.population_total END), 0) as age_0_14,
        COALESCE(MAX(CASE WHEN a.age_group = '16-64' THEN a.population_total END), 0) as age_15_64,
        COALESCE(MAX(CASE WHEN a.age_group = '65+' THEN a.population_total END), 0) as age_65_plus
    FROM fact_population_sex_municipio s
    INNER JOIN dim_municipio m ON m.ine_code = s.ine_code
    INNER JOIN fact_population_nationality_municipio n 
        ON n.ine_code = s.ine_code AND n.year = s.year
    LEFT JOIN fact_population_age_municipio a 
        ON a.ine_code = s.ine_code AND a.year = s.year
    GROUP BY s.ine_code, s.year, m.municipio_name, s.population_total, 
             s.population_female, s.population_male, 
             n.population_spanish, n.population_foreign;
    
    -- Insert aggregated locality demographics
    INSERT INTO agg_demographics_localidad (
        localidad_id,
        localidad_name,
        ine_code,
        year,
        total,
        mujeres,
        hombres,
        espanoles,
        extranjeros,
        age_0_14,
        age_15_64,
        age_65_plus
    )
    SELECT
        s.localidad_id,
        l.localidad_name,
        l.ine_code,
        s.year,
        s.population_total as total,
        s.population_female as mujeres,
        s.population_male as hombres,
        n.population_spanish as espanoles,
        n.population_foreign as extranjeros,
        COALESCE(MAX(CASE WHEN a.age_group = '0-15' THEN a.population_total END), 0) as age_0_14,
        COALESCE(MAX(CASE WHEN a.age_group = '16-64' THEN a.population_total END), 0) as age_15_64,
        COALESCE(MAX(CASE WHEN a.age_group = '65+' THEN a.population_total END), 0) as age_65_plus
    FROM fact_population_sex_localidad s
    INNER JOIN dim_localidad l ON l.localidad_id = s.localidad_id
    INNER JOIN fact_population_nationality_localidad n 
        ON n.localidad_id = s.localidad_id AND n.year = s.year
    LEFT JOIN fact_population_age_localidad a 
        ON a.localidad_id = s.localidad_id AND a.year = s.year
    GROUP BY s.localidad_id, l.localidad_name, l.ine_code, s.year, 
             s.population_total, s.population_female, s.population_male,
             n.population_spanish, n.population_foreign;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_agg_demographics() IS 'Refreshes aggregated demographics tables from fact tables. Calculates and combines sex, nationality, and age data for municipalities and localities.';
