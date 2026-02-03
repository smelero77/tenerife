-- ============================================================================
-- Migration: 0003_population_nationality.sql
-- Description: Add tables for population distributions by nationality (Spanish vs Foreign)
-- Scope: Tenerife island only (reuses existing dimensions)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw CSV rows for nationality distribution
CREATE TABLE bronze_nomenclator_nationality_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_file TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_nationality_raw_source_file ON bronze_nomenclator_nationality_raw(source_file);
CREATE INDEX idx_bronze_nationality_raw_ingested_at ON bronze_nomenclator_nationality_raw(ingested_at DESC);
CREATE INDEX idx_bronze_nationality_raw_jsonb ON bronze_nomenclator_nationality_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_nomenclator_nationality_raw IS 'Bronze layer: Raw CSV rows for nationality distribution data (Españoles/Extranjeros) as JSONB for traceability and reprocessing.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Nationality distribution: normalized rows (one per unit x year)
-- Population breakdown by nationality: Españoles (Spanish) and Extranjeros (Foreign)
CREATE TABLE silver_population_nationality (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ine_code VARCHAR(5) NOT NULL,
    unit_code VARCHAR(10) NOT NULL,
    tipo tipo_unidad_poblacional NOT NULL,
    year INTEGER NOT NULL,
    population_total INTEGER NOT NULL CHECK (population_total >= 0),
    population_spanish INTEGER NOT NULL CHECK (population_spanish >= 0),
    population_foreign INTEGER NOT NULL CHECK (population_foreign >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_silver_nationality_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_silver_nationality_unit_code CHECK (unit_code ~ '^[0-9]+$'),
    CONSTRAINT valid_silver_nationality_year CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT valid_silver_nationality_sum CHECK (population_spanish + population_foreign = population_total),
    CONSTRAINT unique_silver_nationality UNIQUE (ine_code, unit_code, tipo, year)
);

CREATE INDEX idx_silver_population_nationality_ine_code ON silver_population_nationality(ine_code);
CREATE INDEX idx_silver_population_nationality_year ON silver_population_nationality(year);
CREATE INDEX idx_silver_population_nationality_tipo ON silver_population_nationality(tipo);
CREATE INDEX idx_silver_population_nationality_unit_code ON silver_population_nationality(unit_code);

COMMENT ON TABLE silver_population_nationality IS 'Silver layer: Cleaned and validated nationality distribution data (Españoles/Extranjeros). One row per unit x year.';
COMMENT ON COLUMN silver_population_nationality.population_spanish IS 'Spanish population (Españoles).';
COMMENT ON COLUMN silver_population_nationality.population_foreign IS 'Foreign population (Extranjeros).';

-- ============================================================================
-- FACT TABLES (UI-ready analytics)
-- ============================================================================

-- Nationality distribution facts at locality level (NUC/DIS only)
CREATE TABLE fact_population_nationality_localidad (
    localidad_id VARCHAR(15) NOT NULL REFERENCES dim_localidad(localidad_id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    population_total INTEGER NOT NULL CHECK (population_total >= 0),
    population_spanish INTEGER NOT NULL CHECK (population_spanish >= 0),
    population_foreign INTEGER NOT NULL CHECK (population_foreign >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_fact_nationality_loc_year CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT valid_fact_nationality_loc_sum CHECK (population_spanish + population_foreign = population_total),
    PRIMARY KEY (localidad_id, year)
);

CREATE INDEX idx_fact_population_nationality_localidad_year ON fact_population_nationality_localidad(year);
CREATE INDEX idx_fact_population_nationality_localidad_localidad_id ON fact_population_nationality_localidad(localidad_id);

COMMENT ON TABLE fact_population_nationality_localidad IS 'Nationality distribution facts by locality (villages only: NUC/DIS). Links to dim_localidad. Population breakdown by Españoles (Spanish) and Extranjeros (Foreign).';
COMMENT ON COLUMN fact_population_nationality_localidad.population_spanish IS 'Spanish population (Españoles).';
COMMENT ON COLUMN fact_population_nationality_localidad.population_foreign IS 'Foreign population (Extranjeros).';

-- ============================================================================
-- MUNICIPALITY-LEVEL FACTS (for Tipo='M' rows)
-- ============================================================================

-- Nationality distribution facts at municipality level (for Tipo='M' rows)
CREATE TABLE fact_population_nationality_municipio (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    population_total INTEGER NOT NULL CHECK (population_total >= 0),
    population_spanish INTEGER NOT NULL CHECK (population_spanish >= 0),
    population_foreign INTEGER NOT NULL CHECK (population_foreign >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_fact_nationality_mun_year CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT valid_fact_nationality_mun_sum CHECK (population_spanish + population_foreign = population_total),
    PRIMARY KEY (ine_code, year)
);

CREATE INDEX idx_fact_population_nationality_municipio_year ON fact_population_nationality_municipio(year);
CREATE INDEX idx_fact_population_nationality_municipio_ine_code ON fact_population_nationality_municipio(ine_code);

COMMENT ON TABLE fact_population_nationality_municipio IS 'Nationality distribution facts by municipality (Tipo=M rows). Population breakdown by Españoles (Spanish) and Extranjeros (Foreign).';
COMMENT ON COLUMN fact_population_nationality_municipio.population_spanish IS 'Spanish population (Españoles).';
COMMENT ON COLUMN fact_population_nationality_municipio.population_foreign IS 'Foreign population (Extranjeros).';
