-- ============================================================================
-- Migration: 0002_population_distributions.sql
-- Description: Add tables for population distributions by age group and sex
-- Scope: Tenerife island only (reuses existing dimensions)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- DOCUMENTATION: Migration Scope
-- ============================================================================
--
-- This migration implements population distributions for AGE and SEX.
--
-- Nationality distribution (national vs foreign) is implemented in
-- migration 0003_population_nationality.sql following the same
-- Bronze → Silver → Fact pattern, reusing dim_municipio and dim_localidad
-- and separating Tipo='M' vs ('NUC','DIS').
--
-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw CSV rows for age distribution
CREATE TABLE bronze_nomenclator_age_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_file TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_age_raw_source_file ON bronze_nomenclator_age_raw(source_file);
CREATE INDEX idx_bronze_age_raw_ingested_at ON bronze_nomenclator_age_raw(ingested_at DESC);
CREATE INDEX idx_bronze_age_raw_jsonb ON bronze_nomenclator_age_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_nomenclator_age_raw IS 'Bronze layer: Raw CSV rows for age distribution data as JSONB for traceability and reprocessing.';

-- Raw CSV rows for sex distribution
CREATE TABLE bronze_nomenclator_sex_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_file TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_sex_raw_source_file ON bronze_nomenclator_sex_raw(source_file);
CREATE INDEX idx_bronze_sex_raw_ingested_at ON bronze_nomenclator_sex_raw(ingested_at DESC);
CREATE INDEX idx_bronze_sex_raw_jsonb ON bronze_nomenclator_sex_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_nomenclator_sex_raw IS 'Bronze layer: Raw CSV rows for sex distribution data (Hombres/Mujeres) as JSONB for traceability and reprocessing.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Age distribution: normalized rows (one per unit x age_group x year)
-- Age groups: '0-15', '16-64', '65+'
CREATE TABLE silver_population_age (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ine_code VARCHAR(5) NOT NULL,
    unit_code VARCHAR(10) NOT NULL,
    tipo tipo_unidad_poblacional NOT NULL,
    year INTEGER NOT NULL,
    age_group TEXT NOT NULL CHECK (age_group IN ('0-15', '16-64', '65+')),
    population_total INTEGER NOT NULL CHECK (population_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_silver_age_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_silver_age_unit_code CHECK (unit_code ~ '^[0-9]+$'),
    CONSTRAINT valid_silver_age_year CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT unique_silver_age UNIQUE (ine_code, unit_code, tipo, year, age_group)
);

CREATE INDEX idx_silver_population_age_ine_code ON silver_population_age(ine_code);
CREATE INDEX idx_silver_population_age_year ON silver_population_age(year);
CREATE INDEX idx_silver_population_age_age_group ON silver_population_age(age_group);
CREATE INDEX idx_silver_population_age_unit_code ON silver_population_age(unit_code);
CREATE INDEX idx_silver_population_age_tipo ON silver_population_age(tipo);

COMMENT ON TABLE silver_population_age IS 'Silver layer: Cleaned and validated age distribution data. One row per unit x age_group x year. Age groups: 0-15, 16-64, 65+.';
COMMENT ON COLUMN silver_population_age.age_group IS 'Age group: 0-15 (Entre 0 y 15), 16-64 (Entre 16 y 64), 65+ (Más de 65).';
COMMENT ON COLUMN silver_population_age.population_total IS 'Total population for this age group (no sex breakdown available in source CSV).';

-- Sex distribution: normalized rows (one per unit x year)
-- Population breakdown by sex: Hombres (male) and Mujeres (female)
CREATE TABLE silver_population_sex (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ine_code VARCHAR(5) NOT NULL,
    unit_code VARCHAR(10) NOT NULL,
    tipo tipo_unidad_poblacional NOT NULL,
    year INTEGER NOT NULL,
    population_total INTEGER NOT NULL CHECK (population_total >= 0),
    population_male INTEGER NOT NULL CHECK (population_male >= 0),
    population_female INTEGER NOT NULL CHECK (population_female >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_silver_sex_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_silver_sex_unit_code CHECK (unit_code ~ '^[0-9]+$'),
    CONSTRAINT valid_silver_sex_year CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT valid_silver_sex_sum CHECK (population_male + population_female = population_total),
    CONSTRAINT unique_silver_sex UNIQUE (ine_code, unit_code, tipo, year)
);

CREATE INDEX idx_silver_population_sex_ine_code ON silver_population_sex(ine_code);
CREATE INDEX idx_silver_population_sex_year ON silver_population_sex(year);
CREATE INDEX idx_silver_population_sex_tipo ON silver_population_sex(tipo);
CREATE INDEX idx_silver_population_sex_unit_code ON silver_population_sex(unit_code);

COMMENT ON TABLE silver_population_sex IS 'Silver layer: Cleaned and validated sex distribution data (Hombres/Mujeres). One row per unit x year.';
COMMENT ON COLUMN silver_population_sex.population_male IS 'Male population (Hombres).';
COMMENT ON COLUMN silver_population_sex.population_female IS 'Female population (Mujeres).';

-- ============================================================================
-- FACT TABLES (UI-ready analytics)
-- ============================================================================

-- Age distribution facts at locality level (NUC/DIS only)
-- Note: Source CSV has no sex breakdown for age groups, so only population_total is stored
CREATE TABLE fact_population_age_localidad (
    localidad_id VARCHAR(15) NOT NULL REFERENCES dim_localidad(localidad_id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    age_group TEXT NOT NULL CHECK (age_group IN ('0-15', '16-64', '65+')),
    population_total INTEGER NOT NULL CHECK (population_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_fact_age_year CHECK (year >= 2000 AND year <= 2100),
    PRIMARY KEY (localidad_id, year, age_group)
);

CREATE INDEX idx_fact_population_age_localidad_year ON fact_population_age_localidad(year);
CREATE INDEX idx_fact_population_age_localidad_age_group ON fact_population_age_localidad(age_group);
CREATE INDEX idx_fact_population_age_localidad_localidad_id ON fact_population_age_localidad(localidad_id);

COMMENT ON TABLE fact_population_age_localidad IS 'Age distribution facts by locality (villages only: NUC/DIS). Links to dim_localidad. Source CSV provides no sex breakdown for age groups.';
COMMENT ON COLUMN fact_population_age_localidad.age_group IS 'Age group: 0-15, 16-64, or 65+.';
COMMENT ON COLUMN fact_population_age_localidad.population_total IS 'Total population for this age group (no sex breakdown available in source data).';

-- Sex distribution facts at locality level (NUC/DIS only)
CREATE TABLE fact_population_sex_localidad (
    localidad_id VARCHAR(15) NOT NULL REFERENCES dim_localidad(localidad_id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    population_total INTEGER NOT NULL CHECK (population_total >= 0),
    population_male INTEGER NOT NULL CHECK (population_male >= 0),
    population_female INTEGER NOT NULL CHECK (population_female >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_fact_sex_loc_year CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT valid_fact_sex_loc_sum CHECK (population_male + population_female = population_total),
    PRIMARY KEY (localidad_id, year)
);

CREATE INDEX idx_fact_population_sex_localidad_year ON fact_population_sex_localidad(year);
CREATE INDEX idx_fact_population_sex_localidad_localidad_id ON fact_population_sex_localidad(localidad_id);

COMMENT ON TABLE fact_population_sex_localidad IS 'Sex distribution facts by locality (villages only: NUC/DIS). Links to dim_localidad. Population breakdown by Hombres (male) and Mujeres (female).';
COMMENT ON COLUMN fact_population_sex_localidad.population_male IS 'Male population (Hombres).';
COMMENT ON COLUMN fact_population_sex_localidad.population_female IS 'Female population (Mujeres).';

-- ============================================================================
-- MUNICIPALITY-LEVEL FACTS (for Tipo='M' rows)
-- ============================================================================

-- Age distribution facts at municipality level (for Tipo='M' rows)
CREATE TABLE fact_population_age_municipio (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    age_group TEXT NOT NULL CHECK (age_group IN ('0-15', '16-64', '65+')),
    population_total INTEGER NOT NULL CHECK (population_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_fact_age_mun_year CHECK (year >= 2000 AND year <= 2100),
    PRIMARY KEY (ine_code, year, age_group)
);

CREATE INDEX idx_fact_population_age_municipio_year ON fact_population_age_municipio(year);
CREATE INDEX idx_fact_population_age_municipio_age_group ON fact_population_age_municipio(age_group);
CREATE INDEX idx_fact_population_age_municipio_ine_code ON fact_population_age_municipio(ine_code);

COMMENT ON TABLE fact_population_age_municipio IS 'Age distribution facts by municipality (Tipo=M rows). Source CSV provides no sex breakdown for age groups.';
COMMENT ON COLUMN fact_population_age_municipio.age_group IS 'Age group: 0-15, 16-64, or 65+.';

-- Sex distribution facts at municipality level (for Tipo='M' rows)
CREATE TABLE fact_population_sex_municipio (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    population_total INTEGER NOT NULL CHECK (population_total >= 0),
    population_male INTEGER NOT NULL CHECK (population_male >= 0),
    population_female INTEGER NOT NULL CHECK (population_female >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_fact_sex_mun_year CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT valid_fact_sex_mun_sum CHECK (population_male + population_female = population_total),
    PRIMARY KEY (ine_code, year)
);

CREATE INDEX idx_fact_population_sex_municipio_year ON fact_population_sex_municipio(year);
CREATE INDEX idx_fact_population_sex_municipio_ine_code ON fact_population_sex_municipio(ine_code);

COMMENT ON TABLE fact_population_sex_municipio IS 'Sex distribution facts by municipality (Tipo=M rows). Population breakdown by Hombres (male) and Mujeres (female).';
COMMENT ON COLUMN fact_population_sex_municipio.population_male IS 'Male population (Hombres).';
COMMENT ON COLUMN fact_population_sex_municipio.population_female IS 'Female population (Mujeres).';
