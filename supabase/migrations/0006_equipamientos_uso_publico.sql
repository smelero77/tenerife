-- ============================================================================
-- Migration: 0006_equipamientos_uso_publico.sql
-- Description: Add tables for public use equipment data from CKAN (datos.tenerife.es)
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_equipamientos_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_equipamientos_raw_resource_id ON bronze_ckan_equipamientos_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_equipamientos_raw_ingested_at ON bronze_ckan_equipamientos_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_equipamientos_raw_jsonb ON bronze_ckan_equipamientos_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_equipamientos_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_equipamientos_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_equipamientos_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_equipamientos_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated equipment data
CREATE TABLE silver_equipamiento_uso_publico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    equipamiento_nombre TEXT NOT NULL,
    equipamiento_tipo TEXT NOT NULL,
    municipio_nombre TEXT NOT NULL,
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    espacio_natural_nombre TEXT,
    puntos_interes TEXT,
    latitud NUMERIC(10, 8),
    longitud NUMERIC(11, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_latitud CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    CONSTRAINT valid_longitud CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180)),
    
    -- Unique constraint to avoid duplicates
    CONSTRAINT unique_equipamiento_record UNIQUE (source_resource_id, equipamiento_nombre, municipio_nombre, equipamiento_tipo)
);

CREATE INDEX idx_silver_equipamiento_ine_code ON silver_equipamiento_uso_publico(ine_code);
CREATE INDEX idx_silver_equipamiento_municipio_nombre ON silver_equipamiento_uso_publico(municipio_nombre);
CREATE INDEX idx_silver_equipamiento_tipo ON silver_equipamiento_uso_publico(equipamiento_tipo);
CREATE INDEX idx_silver_equipamiento_source_resource_id ON silver_equipamiento_uso_publico(source_resource_id);
CREATE INDEX idx_silver_equipamiento_coordinates ON silver_equipamiento_uso_publico(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

COMMENT ON TABLE silver_equipamiento_uso_publico IS 'Silver layer: Cleaned and validated public use equipment data from CKAN.';
COMMENT ON COLUMN silver_equipamiento_uso_publico.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_equipamiento_uso_publico.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_equipamiento_uso_publico.equipamiento_nombre IS 'Equipment name.';
COMMENT ON COLUMN silver_equipamiento_uso_publico.equipamiento_tipo IS 'Equipment type/category.';
COMMENT ON COLUMN silver_equipamiento_uso_publico.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_equipamiento_uso_publico.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_equipamiento_uso_publico.espacio_natural_nombre IS 'Natural space name where equipment is located.';
COMMENT ON COLUMN silver_equipamiento_uso_publico.puntos_interes IS 'Points of interest description.';
COMMENT ON COLUMN silver_equipamiento_uso_publico.latitud IS 'Latitude in decimal degrees (WGS84).';
COMMENT ON COLUMN silver_equipamiento_uso_publico.longitud IS 'Longitude in decimal degrees (WGS84).';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated equipment counts by municipality and type
CREATE TABLE fact_equipamiento_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    equipamiento_tipo TEXT NOT NULL,
    total INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, equipamiento_tipo),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_total CHECK (total >= 0)
);

CREATE INDEX idx_fact_equipamiento_municipio_agg_tipo ON fact_equipamiento_municipio_agg(equipamiento_tipo);
CREATE INDEX idx_fact_equipamiento_municipio_agg_last_refreshed ON fact_equipamiento_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_equipamiento_municipio_agg IS 'Fact layer: Aggregated equipment counts by municipality and type.';
COMMENT ON COLUMN fact_equipamiento_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_equipamiento_municipio_agg.equipamiento_tipo IS 'Equipment type/category.';
COMMENT ON COLUMN fact_equipamiento_municipio_agg.total IS 'Total count of equipment of this type in the municipality.';
COMMENT ON COLUMN fact_equipamiento_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';
