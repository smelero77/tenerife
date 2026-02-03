-- ============================================================================
-- Migration: 0001_init.sql
-- Description: Initial data model for INE Nomenclátor hierarchical population units
-- Scope: Tenerife island only (MVP)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Population unit types
CREATE TYPE tipo_unidad_poblacional AS ENUM ('M', 'ES', 'NUC', 'DIS');

-- ETL status types
CREATE TYPE etl_status AS ENUM ('running', 'completed', 'failed', 'cancelled');

-- ============================================================================
-- ETL / TRACING TABLES
-- ============================================================================

-- ETL pipeline runs tracking
CREATE TABLE etl_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name VARCHAR(255) NOT NULL,
    status etl_status NOT NULL DEFAULT 'running',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    metadata JSONB,
    CONSTRAINT valid_ended_at CHECK (
        (status = 'running' AND ended_at IS NULL) OR
        (status != 'running' AND ended_at IS NOT NULL)
    )
);

CREATE INDEX idx_etl_runs_status ON etl_runs(status);
CREATE INDEX idx_etl_runs_started_at ON etl_runs(started_at DESC);

-- ETL run steps tracking
CREATE TABLE etl_run_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES etl_runs(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    status etl_status NOT NULL DEFAULT 'running',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    error_message TEXT,
    CONSTRAINT valid_step_ended_at CHECK (
        (status = 'running' AND ended_at IS NULL) OR
        (status != 'running' AND ended_at IS NOT NULL)
    )
);

CREATE INDEX idx_etl_run_steps_run_id ON etl_run_steps(run_id);
CREATE INDEX idx_etl_run_steps_status ON etl_run_steps(status);

-- ============================================================================
-- DIMENSION TABLES
-- ============================================================================

-- Municipalities dimension (INE municipalities)
CREATE TABLE dim_municipio (
    ine_code VARCHAR(5) PRIMARY KEY,
    municipio_name VARCHAR(255) NOT NULL,
    island VARCHAR(50) NOT NULL DEFAULT 'Tenerife',
    province VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')
);

CREATE INDEX idx_dim_municipio_island ON dim_municipio(island);
CREATE INDEX idx_dim_municipio_province ON dim_municipio(province);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dim_municipio_updated_at
    BEFORE UPDATE ON dim_municipio
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Population units dimension (villages: NUC and DIS only)
-- This table stores actual "pueblos" (villages), NOT municipality totals (M) or ES
CREATE TABLE dim_localidad (
    localidad_id VARCHAR(15) PRIMARY KEY, -- Format: ine_code + '-' + unit_code (e.g., '38012-000203')
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    unit_code VARCHAR(10) NOT NULL, -- Normalized Código Unidad Poblacional without spaces (e.g., '000203')
    localidad_name VARCHAR(255) NOT NULL,
    tipo VARCHAR(3) NOT NULL CHECK (tipo IN ('NUC', 'DIS')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_localidad_id CHECK (localidad_id ~ '^[0-9]{5}-[0-9]+$'),
    CONSTRAINT valid_unit_code CHECK (unit_code ~ '^[0-9]+$'),
    CONSTRAINT unique_ine_unit_code_tipo UNIQUE (ine_code, unit_code, tipo)
);

CREATE INDEX idx_dim_localidad_ine_code ON dim_localidad(ine_code);
CREATE INDEX idx_dim_localidad_tipo ON dim_localidad(tipo);
CREATE INDEX idx_dim_localidad_name ON dim_localidad(localidad_name);

CREATE TRIGGER update_dim_localidad_updated_at
    BEFORE UPDATE ON dim_localidad
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Entidades Singulares dimension (optional intermediate aggregation level)
-- ES rows are NOT villages and must be stored separately
CREATE TABLE dim_entidad_singular (
    entidad_id VARCHAR(15) PRIMARY KEY, -- Format: ine_code + '-' + unit_code
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    unit_code VARCHAR(10) NOT NULL,
    entidad_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_entidad_id CHECK (entidad_id ~ '^[0-9]{5}-[0-9]+$'),
    CONSTRAINT valid_es_unit_code CHECK (unit_code ~ '^[0-9]+$'),
    CONSTRAINT unique_es_ine_unit_code UNIQUE (ine_code, unit_code)
);

CREATE INDEX idx_dim_entidad_singular_ine_code ON dim_entidad_singular(ine_code);

CREATE TRIGGER update_dim_entidad_singular_updated_at
    BEFORE UPDATE ON dim_entidad_singular
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FACT TABLES
-- ============================================================================

-- Population facts by locality (villages only: NUC/DIS)
CREATE TABLE fact_population_localidad (
    localidad_id VARCHAR(15) NOT NULL REFERENCES dim_localidad(localidad_id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    population_total INTEGER NOT NULL CHECK (population_total >= 0),
    population_male INTEGER NOT NULL CHECK (population_male >= 0),
    population_female INTEGER NOT NULL CHECK (population_female >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_year CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT valid_population_sum CHECK (population_male + population_female = population_total),
    PRIMARY KEY (localidad_id, year)
);

CREATE INDEX idx_fact_population_localidad_year ON fact_population_localidad(year);
CREATE INDEX idx_fact_population_localidad_localidad_id ON fact_population_localidad(localidad_id);

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw CSV rows storage
CREATE TABLE bronze_nomenclator_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_file TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_nomenclator_raw_source_file ON bronze_nomenclator_raw(source_file);
CREATE INDEX idx_bronze_nomenclator_raw_ingested_at ON bronze_nomenclator_raw(ingested_at DESC);
CREATE INDEX idx_bronze_nomenclator_raw_jsonb ON bronze_nomenclator_raw USING GIN (raw_row);

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated population units
CREATE TABLE silver_nomenclator_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prov_code VARCHAR(2) NOT NULL,
    muni_code VARCHAR(3) NOT NULL,
    ine_code VARCHAR(5) NOT NULL, -- Computed: prov_code + muni_code (with leading zeros)
    unit_code VARCHAR(10) NOT NULL, -- Normalized without spaces
    unit_name VARCHAR(255) NOT NULL,
    tipo tipo_unidad_poblacional NOT NULL,
    year INTEGER NOT NULL,
    population_total INTEGER NOT NULL CHECK (population_total >= 0),
    population_male INTEGER NOT NULL CHECK (population_male >= 0),
    population_female INTEGER NOT NULL CHECK (population_female >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_silver_year CHECK (year >= 2000 AND year <= 2100),
    CONSTRAINT valid_silver_population_sum CHECK (population_male + population_female = population_total),
    CONSTRAINT valid_silver_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_silver_unit_code CHECK (unit_code ~ '^[0-9]+$'),
    CONSTRAINT unique_silver_ine_unit_tipo_year UNIQUE (ine_code, unit_code, tipo, year)
);

CREATE INDEX idx_silver_nomenclator_units_ine_code ON silver_nomenclator_units(ine_code);
CREATE INDEX idx_silver_nomenclator_units_tipo ON silver_nomenclator_units(tipo);
CREATE INDEX idx_silver_nomenclator_units_year ON silver_nomenclator_units(year);
CREATE INDEX idx_silver_nomenclator_units_unit_code ON silver_nomenclator_units(unit_code);

-- ============================================================================
-- GOLD LAYER (Aggregated analytics)
-- ============================================================================

-- Municipality-level aggregated snapshots
CREATE TABLE agg_municipio_snapshot (
    snapshot_date DATE NOT NULL,
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    population_total_municipio INTEGER NOT NULL CHECK (population_total_municipio >= 0),
    number_of_nuclei INTEGER NOT NULL CHECK (number_of_nuclei >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (snapshot_date, ine_code),
    CONSTRAINT valid_snapshot_date CHECK (snapshot_date >= '2000-01-01' AND snapshot_date <= '2100-12-31')
);

CREATE INDEX idx_agg_municipio_snapshot_date ON agg_municipio_snapshot(snapshot_date DESC);
CREATE INDEX idx_agg_municipio_snapshot_ine_code ON agg_municipio_snapshot(ine_code);
CREATE INDEX idx_agg_municipio_snapshot_date_ine_code ON agg_municipio_snapshot(snapshot_date, ine_code);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE dim_municipio IS 'Municipalities dimension. INE code is the canonical identifier (5 digits: prov_code + muni_code).';
COMMENT ON TABLE dim_localidad IS 'Population units dimension (villages only: NUC and DIS). Municipality totals (M) and ES are excluded.';
COMMENT ON TABLE dim_entidad_singular IS 'Entidades Singulares dimension (intermediate aggregation level). Not treated as villages.';
COMMENT ON TABLE fact_population_localidad IS 'Population facts by locality (villages only). Links to dim_localidad.';
COMMENT ON TABLE bronze_nomenclator_raw IS 'Bronze layer: Raw CSV rows as JSONB for traceability and reprocessing.';
COMMENT ON TABLE silver_nomenclator_units IS 'Silver layer: Cleaned and validated population units from raw CSV.';
COMMENT ON TABLE agg_municipio_snapshot IS 'Gold layer: Aggregated municipality-level snapshots for analytics.';

COMMENT ON COLUMN dim_localidad.localidad_id IS 'Deterministic ID: ine_code + "-" + unit_code (e.g., "38012-000203")';
COMMENT ON COLUMN dim_localidad.tipo IS 'Population unit type: NUC (núcleo/village) or DIS (diseminado/dispersed). M and ES are excluded.';
COMMENT ON COLUMN silver_nomenclator_units.tipo IS 'All types allowed: M (municipality total), ES (entidad singular), NUC (núcleo), DIS (diseminado).';
COMMENT ON COLUMN agg_municipio_snapshot.number_of_nuclei IS 'Count of NUC units (villages) within the municipality for the snapshot date.';
