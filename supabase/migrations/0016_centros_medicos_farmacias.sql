-- ============================================================================
-- Migration: 0016_centros_medicos_farmacias.sql
-- Description: Add tables for medical centers, pharmacies and health services data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_centro_medico_farmacia_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_centro_medico_farmacia CASCADE;
DROP TABLE IF EXISTS bronze_ckan_centros_medicos_farmacias_raw CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_centro_medico_farmacia_municipio_agg() CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_centros_medicos_farmacias_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_centros_medicos_farmacias_raw_resource_id ON bronze_ckan_centros_medicos_farmacias_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_centros_medicos_farmacias_raw_ingested_at ON bronze_ckan_centros_medicos_farmacias_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_centros_medicos_farmacias_raw_jsonb ON bronze_ckan_centros_medicos_farmacias_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_centros_medicos_farmacias_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_centros_medicos_farmacias_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_centros_medicos_farmacias_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_centros_medicos_farmacias_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated medical centers, pharmacies and health services data
CREATE TABLE silver_centro_medico_farmacia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    establecimiento_nombre TEXT NOT NULL,
    establecimiento_tipo TEXT, -- e.g., "farmacia", "centro de salud", "clinica dental", etc.
    establecimiento_telefono TEXT,
    establecimiento_email TEXT,
    establecimiento_web TEXT,
    establecimiento_direccion TEXT,
    establecimiento_codigo_postal VARCHAR(10),
    municipio_nombre TEXT NOT NULL DEFAULT '',
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    latitud NUMERIC,
    longitud NUMERIC,
    establecimiento_actividad TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_latitud CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    CONSTRAINT valid_longitud CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180)),
    CONSTRAINT valid_codigo_postal CHECK (establecimiento_codigo_postal IS NULL OR LENGTH(establecimiento_codigo_postal) <= 10),
    
    -- Unique constraint to avoid duplicates (based on resource, name, and municipality)
    CONSTRAINT unique_centro_medico_farmacia_record UNIQUE (source_resource_id, establecimiento_nombre, municipio_nombre)
);

CREATE INDEX idx_silver_centro_medico_farmacia_ine_code ON silver_centro_medico_farmacia(ine_code);
CREATE INDEX idx_silver_centro_medico_farmacia_municipio_nombre ON silver_centro_medico_farmacia(municipio_nombre);
CREATE INDEX idx_silver_centro_medico_farmacia_tipo ON silver_centro_medico_farmacia(establecimiento_tipo);
CREATE INDEX idx_silver_centro_medico_farmacia_actividad ON silver_centro_medico_farmacia(establecimiento_actividad);
CREATE INDEX idx_silver_centro_medico_farmacia_source_resource_id ON silver_centro_medico_farmacia(source_resource_id);
CREATE INDEX idx_silver_centro_medico_farmacia_coordinates ON silver_centro_medico_farmacia(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

COMMENT ON TABLE silver_centro_medico_farmacia IS 'Silver layer: Cleaned and validated medical centers, pharmacies and health services data from CKAN.';
COMMENT ON COLUMN silver_centro_medico_farmacia.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_centro_medico_farmacia.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_centro_medico_farmacia.establecimiento_nombre IS 'Establishment name.';
COMMENT ON COLUMN silver_centro_medico_farmacia.establecimiento_tipo IS 'Establishment type (e.g., "farmacia", "centro de salud", "clinica dental").';
COMMENT ON COLUMN silver_centro_medico_farmacia.establecimiento_telefono IS 'Phone number.';
COMMENT ON COLUMN silver_centro_medico_farmacia.establecimiento_email IS 'Email address.';
COMMENT ON COLUMN silver_centro_medico_farmacia.establecimiento_web IS 'Website URL.';
COMMENT ON COLUMN silver_centro_medico_farmacia.establecimiento_direccion IS 'Full address.';
COMMENT ON COLUMN silver_centro_medico_farmacia.establecimiento_codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_centro_medico_farmacia.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_centro_medico_farmacia.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_centro_medico_farmacia.latitud IS 'Latitude coordinate.';
COMMENT ON COLUMN silver_centro_medico_farmacia.longitud IS 'Longitude coordinate.';
COMMENT ON COLUMN silver_centro_medico_farmacia.establecimiento_actividad IS 'Establishment activity/type.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated establishment counts by municipality and type
CREATE TABLE fact_centro_medico_farmacia_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    establecimiento_tipo TEXT NOT NULL, -- Establishment type
    total_establecimientos INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, establecimiento_tipo),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_tipo CHECK (establecimiento_tipo IS NOT NULL AND LENGTH(establecimiento_tipo) > 0),
    CONSTRAINT valid_agg_total CHECK (total_establecimientos >= 0)
);

CREATE INDEX idx_fact_centro_medico_farmacia_municipio_agg_tipo ON fact_centro_medico_farmacia_municipio_agg(establecimiento_tipo);
CREATE INDEX idx_fact_centro_medico_farmacia_municipio_agg_last_refreshed ON fact_centro_medico_farmacia_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_centro_medico_farmacia_municipio_agg IS 'Fact layer: Aggregated establishment counts by municipality and type.';
COMMENT ON COLUMN fact_centro_medico_farmacia_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_centro_medico_farmacia_municipio_agg.establecimiento_tipo IS 'Establishment type.';
COMMENT ON COLUMN fact_centro_medico_farmacia_municipio_agg.total_establecimientos IS 'Total count of establishments in this municipality and type.';
COMMENT ON COLUMN fact_centro_medico_farmacia_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_centro_medico_farmacia_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_centro_medico_farmacia_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_centro_medico_farmacia_municipio_agg (
        ine_code,
        establecimiento_tipo,
        total_establecimientos
    )
    SELECT
        ine_code,
        COALESCE(establecimiento_tipo, 'Sin tipo') as establecimiento_tipo,
        COUNT(*) as total_establecimientos
    FROM silver_centro_medico_farmacia
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, COALESCE(establecimiento_tipo, 'Sin tipo');
END;
$$ LANGUAGE plpgsql;
