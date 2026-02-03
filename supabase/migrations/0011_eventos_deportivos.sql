-- ============================================================================
-- Migration: 0011_eventos_deportivos.sql
-- Description: Add tables for sports events data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- Filter: Only events from year 2026, with valid municipio_nombre
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_evento_deportivo_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_evento_deportivo CASCADE;
DROP TABLE IF EXISTS bronze_ckan_eventos_deportivos_raw CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_evento_deportivo_municipio_agg() CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_eventos_deportivos_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_eventos_deportivos_raw_resource_id ON bronze_ckan_eventos_deportivos_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_eventos_deportivos_raw_ingested_at ON bronze_ckan_eventos_deportivos_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_eventos_deportivos_raw_jsonb ON bronze_ckan_eventos_deportivos_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_eventos_deportivos_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_eventos_deportivos_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_eventos_deportivos_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_eventos_deportivos_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated sports events data (only 2026, with valid municipio_nombre)
CREATE TABLE silver_evento_deportivo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    evento_nombre TEXT NOT NULL,
    evento_url TEXT,
    evento_descripcion TEXT,
    evento_lugar TEXT,
    municipio_nombre TEXT NOT NULL,
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    evento_organizador TEXT,
    evento_fecha_inicio TIMESTAMPTZ NOT NULL,
    evento_fecha_fin TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_fecha_inicio CHECK (evento_fecha_inicio >= '2026-01-01' AND evento_fecha_inicio < '2027-01-01'),
    CONSTRAINT valid_fecha_fin CHECK (evento_fecha_fin IS NULL OR (evento_fecha_fin >= '2026-01-01' AND evento_fecha_fin < '2027-01-01')),
    CONSTRAINT valid_fecha_range CHECK (evento_fecha_fin IS NULL OR evento_fecha_fin >= evento_fecha_inicio),
    
    -- Unique constraint to avoid duplicates (based on name, municipality, and start date)
    CONSTRAINT unique_evento_record UNIQUE (source_resource_id, evento_nombre, municipio_nombre, evento_fecha_inicio)
);

CREATE INDEX idx_silver_evento_ine_code ON silver_evento_deportivo(ine_code);
CREATE INDEX idx_silver_evento_municipio_nombre ON silver_evento_deportivo(municipio_nombre);
CREATE INDEX idx_silver_evento_fecha_inicio ON silver_evento_deportivo(evento_fecha_inicio);
CREATE INDEX idx_silver_evento_fecha_fin ON silver_evento_deportivo(evento_fecha_fin);
CREATE INDEX idx_silver_evento_organizador ON silver_evento_deportivo(evento_organizador);
CREATE INDEX idx_silver_evento_source_resource_id ON silver_evento_deportivo(source_resource_id);
-- Note: No index on year needed - idx_silver_evento_fecha_inicio allows efficient date range queries

COMMENT ON TABLE silver_evento_deportivo IS 'Silver layer: Cleaned and validated sports events data from CKAN. Only events from 2026 with valid municipio_nombre.';
COMMENT ON COLUMN silver_evento_deportivo.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_evento_deportivo.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_evento_deportivo.evento_nombre IS 'Event name.';
COMMENT ON COLUMN silver_evento_deportivo.evento_url IS 'Event URL.';
COMMENT ON COLUMN silver_evento_deportivo.evento_descripcion IS 'Event description.';
COMMENT ON COLUMN silver_evento_deportivo.evento_lugar IS 'Event location/venue.';
COMMENT ON COLUMN silver_evento_deportivo.municipio_nombre IS 'Municipality name as provided by CKAN. Required (NOT NULL).';
COMMENT ON COLUMN silver_evento_deportivo.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_evento_deportivo.evento_organizador IS 'Event organizer.';
COMMENT ON COLUMN silver_evento_deportivo.evento_fecha_inicio IS 'Event start date and time. Must be in 2026.';
COMMENT ON COLUMN silver_evento_deportivo.evento_fecha_fin IS 'Event end date and time. Must be in 2026 if provided.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated event counts by municipality and month
CREATE TABLE fact_evento_deportivo_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    evento_mes INTEGER NOT NULL, -- 1-12 (month of evento_fecha_inicio)
    total_eventos INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, evento_mes),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_mes CHECK (evento_mes >= 1 AND evento_mes <= 12),
    CONSTRAINT valid_agg_total CHECK (total_eventos >= 0)
);

CREATE INDEX idx_fact_evento_municipio_agg_mes ON fact_evento_deportivo_municipio_agg(evento_mes);
CREATE INDEX idx_fact_evento_municipio_agg_last_refreshed ON fact_evento_deportivo_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_evento_deportivo_municipio_agg IS 'Fact layer: Aggregated event counts by municipality and month (2026 only).';
COMMENT ON COLUMN fact_evento_deportivo_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_evento_deportivo_municipio_agg.evento_mes IS 'Month of event start date (1-12).';
COMMENT ON COLUMN fact_evento_deportivo_municipio_agg.total_eventos IS 'Total count of events in this municipality and month.';
COMMENT ON COLUMN fact_evento_deportivo_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_evento_deportivo_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_evento_deportivo_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_evento_deportivo_municipio_agg (
        ine_code,
        evento_mes,
        total_eventos
    )
    SELECT
        ine_code,
        EXTRACT(MONTH FROM evento_fecha_inicio)::INTEGER as evento_mes,
        COUNT(*) as total_eventos
    FROM silver_evento_deportivo
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, EXTRACT(MONTH FROM evento_fecha_inicio);
END;
$$ LANGUAGE plpgsql;
