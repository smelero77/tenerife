-- ============================================================================
-- Migration: 0010_oficinas_informacion_turistica.sql
-- Description: Add tables for tourist information offices data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_oficina_turismo_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_oficina_informacion_turistica CASCADE;
DROP TABLE IF EXISTS bronze_ckan_oficinas_turismo_raw CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_oficina_turismo_municipio_agg() CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_oficinas_turismo_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_oficinas_raw_resource_id ON bronze_ckan_oficinas_turismo_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_oficinas_raw_ingested_at ON bronze_ckan_oficinas_turismo_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_oficinas_raw_jsonb ON bronze_ckan_oficinas_turismo_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_oficinas_turismo_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_oficinas_turismo_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_oficinas_turismo_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_oficinas_turismo_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated tourist information offices data
CREATE TABLE silver_oficina_informacion_turistica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    oficina_nombre TEXT NOT NULL,
    oficina_horario TEXT,
    oficina_telefono VARCHAR(50),
    oficina_descripcion TEXT,
    oficina_ubicacion TEXT,
    oficina_zona TEXT,
    municipio_nombre TEXT NOT NULL,
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    oficina_codigo_postal VARCHAR(10),
    oficina_estado TEXT,
    latitud NUMERIC(10, 8),
    longitud NUMERIC(11, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_latitud CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    CONSTRAINT valid_longitud CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180)),
    CONSTRAINT valid_codigo_postal CHECK (oficina_codigo_postal IS NULL OR LENGTH(oficina_codigo_postal) <= 10),
    
    -- Unique constraint to avoid duplicates (based on name, municipality, and location)
    CONSTRAINT unique_oficina_record UNIQUE (source_resource_id, oficina_nombre, municipio_nombre, oficina_ubicacion)
);

CREATE INDEX idx_silver_oficina_ine_code ON silver_oficina_informacion_turistica(ine_code);
CREATE INDEX idx_silver_oficina_municipio_nombre ON silver_oficina_informacion_turistica(municipio_nombre);
CREATE INDEX idx_silver_oficina_zona ON silver_oficina_informacion_turistica(oficina_zona);
CREATE INDEX idx_silver_oficina_estado ON silver_oficina_informacion_turistica(oficina_estado);
CREATE INDEX idx_silver_oficina_codigo_postal ON silver_oficina_informacion_turistica(oficina_codigo_postal);
CREATE INDEX idx_silver_oficina_source_resource_id ON silver_oficina_informacion_turistica(source_resource_id);
CREATE INDEX idx_silver_oficina_coordinates ON silver_oficina_informacion_turistica(latitud, longitud) 
    WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

COMMENT ON TABLE silver_oficina_informacion_turistica IS 'Silver layer: Cleaned and validated tourist information offices data from CKAN.';
COMMENT ON COLUMN silver_oficina_informacion_turistica.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_oficina_informacion_turistica.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_oficina_informacion_turistica.oficina_nombre IS 'Office name.';
COMMENT ON COLUMN silver_oficina_informacion_turistica.oficina_horario IS 'Opening hours/schedule.';
COMMENT ON COLUMN silver_oficina_informacion_turistica.oficina_telefono IS 'Phone number.';
COMMENT ON COLUMN silver_oficina_informacion_turistica.oficina_descripcion IS 'Office description.';
COMMENT ON COLUMN silver_oficina_informacion_turistica.oficina_ubicacion IS 'Office location/address.';
COMMENT ON COLUMN silver_oficina_informacion_turistica.oficina_zona IS 'Zone/area (e.g., Norte, Sur, Metropolitana, Isla Baja).';
COMMENT ON COLUMN silver_oficina_informacion_turistica.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_oficina_informacion_turistica.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_oficina_informacion_turistica.oficina_codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_oficina_informacion_turistica.oficina_estado IS 'Office status (e.g., "Abierto", "Cerrado Temporal").';
COMMENT ON COLUMN silver_oficina_informacion_turistica.latitud IS 'Latitude in decimal degrees (WGS84).';
COMMENT ON COLUMN silver_oficina_informacion_turistica.longitud IS 'Longitude in decimal degrees (WGS84).';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated office counts by municipality and zone
CREATE TABLE fact_oficina_turismo_municipio_agg (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    oficina_zona TEXT,
    oficina_estado TEXT,
    total INTEGER NOT NULL DEFAULT 0,
    total_abiertas INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_total CHECK (total >= 0),
    CONSTRAINT valid_agg_total_abiertas CHECK (total_abiertas >= 0)
);

-- Create unique index with NULL handling using COALESCE
CREATE UNIQUE INDEX idx_fact_oficina_unique ON fact_oficina_turismo_municipio_agg (
    ine_code,
    COALESCE(oficina_zona, ''),
    COALESCE(oficina_estado, '')
);

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_oficina_turismo_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_oficina_turismo_municipio_agg WHERE id IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_oficina_turismo_municipio_agg (
        ine_code,
        oficina_zona,
        oficina_estado,
        total,
        total_abiertas
    )
    SELECT
        ine_code,
        oficina_zona,
        oficina_estado,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE UPPER(oficina_estado) = 'ABIERTO') as total_abiertas
    FROM silver_oficina_informacion_turistica
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, oficina_zona, oficina_estado;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX idx_fact_oficina_municipio_agg_zona ON fact_oficina_turismo_municipio_agg(oficina_zona);
CREATE INDEX idx_fact_oficina_municipio_agg_estado ON fact_oficina_turismo_municipio_agg(oficina_estado);
CREATE INDEX idx_fact_oficina_municipio_agg_last_refreshed ON fact_oficina_turismo_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_oficina_turismo_municipio_agg IS 'Fact layer: Aggregated office counts by municipality, zone, and status.';
COMMENT ON COLUMN fact_oficina_turismo_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_oficina_turismo_municipio_agg.oficina_zona IS 'Zone/area (e.g., Norte, Sur, Metropolitana, Isla Baja).';
COMMENT ON COLUMN fact_oficina_turismo_municipio_agg.oficina_estado IS 'Office status.';
COMMENT ON COLUMN fact_oficina_turismo_municipio_agg.total IS 'Total count of offices of this zone and status in the municipality.';
COMMENT ON COLUMN fact_oficina_turismo_municipio_agg.total_abiertas IS 'Count of open offices (where estado = "Abierto").';
COMMENT ON COLUMN fact_oficina_turismo_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';
