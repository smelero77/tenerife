-- ============================================================================
-- Migration: 0012_instalaciones_residuos.sql
-- Description: Add tables for waste treatment facilities data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_instalacion_residuo_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_instalacion_residuo CASCADE;
DROP TABLE IF EXISTS bronze_ckan_instalaciones_residuos_raw CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_instalacion_residuo_municipio_agg() CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_instalaciones_residuos_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_instalaciones_residuos_raw_resource_id ON bronze_ckan_instalaciones_residuos_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_instalaciones_residuos_raw_ingested_at ON bronze_ckan_instalaciones_residuos_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_instalaciones_residuos_raw_jsonb ON bronze_ckan_instalaciones_residuos_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_instalaciones_residuos_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_instalaciones_residuos_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_instalaciones_residuos_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_instalaciones_residuos_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated waste treatment facilities data
CREATE TABLE silver_instalacion_residuo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    instalacion_nombre TEXT NOT NULL,
    latitud NUMERIC,
    longitud NUMERIC,
    titular TEXT,
    gestiona TEXT,
    telefono TEXT,
    descripcion TEXT,
    direccion TEXT,
    direccion_tipo_via TEXT,
    direccion_nombre_via TEXT,
    direccion_numero TEXT,
    direccion_codigo_postal VARCHAR(10),
    municipio_nombre TEXT NOT NULL DEFAULT '',
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    horario_1 TEXT,
    horario_2 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_latitud CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    CONSTRAINT valid_longitud CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180)),
    CONSTRAINT valid_codigo_postal CHECK (direccion_codigo_postal IS NULL OR LENGTH(direccion_codigo_postal) <= 10),
    
    -- Unique constraint to avoid duplicates (based on resource, name, and municipality)
    -- Note: municipio_nombre is normalized to empty string if NULL in application layer
    CONSTRAINT unique_instalacion_record UNIQUE (source_resource_id, instalacion_nombre, municipio_nombre)
);

CREATE INDEX idx_silver_instalacion_ine_code ON silver_instalacion_residuo(ine_code);
CREATE INDEX idx_silver_instalacion_municipio_nombre ON silver_instalacion_residuo(municipio_nombre);
CREATE INDEX idx_silver_instalacion_titular ON silver_instalacion_residuo(titular);
CREATE INDEX idx_silver_instalacion_gestiona ON silver_instalacion_residuo(gestiona);
CREATE INDEX idx_silver_instalacion_source_resource_id ON silver_instalacion_residuo(source_resource_id);
CREATE INDEX idx_silver_instalacion_coordinates ON silver_instalacion_residuo(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

COMMENT ON TABLE silver_instalacion_residuo IS 'Silver layer: Cleaned and validated waste treatment facilities data from CKAN.';
COMMENT ON COLUMN silver_instalacion_residuo.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_instalacion_residuo.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_instalacion_residuo.instalacion_nombre IS 'Facility name.';
COMMENT ON COLUMN silver_instalacion_residuo.latitud IS 'Latitude coordinate.';
COMMENT ON COLUMN silver_instalacion_residuo.longitud IS 'Longitude coordinate.';
COMMENT ON COLUMN silver_instalacion_residuo.titular IS 'Facility owner/operator.';
COMMENT ON COLUMN silver_instalacion_residuo.gestiona IS 'Facility manager.';
COMMENT ON COLUMN silver_instalacion_residuo.telefono IS 'Phone number.';
COMMENT ON COLUMN silver_instalacion_residuo.descripcion IS 'Facility description/type.';
COMMENT ON COLUMN silver_instalacion_residuo.direccion IS 'Full address.';
COMMENT ON COLUMN silver_instalacion_residuo.direccion_tipo_via IS 'Street type (Calle, Carretera, etc.).';
COMMENT ON COLUMN silver_instalacion_residuo.direccion_nombre_via IS 'Street name.';
COMMENT ON COLUMN silver_instalacion_residuo.direccion_numero IS 'Street number.';
COMMENT ON COLUMN silver_instalacion_residuo.direccion_codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_instalacion_residuo.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_instalacion_residuo.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if code not found in dim_municipio.';
COMMENT ON COLUMN silver_instalacion_residuo.horario_1 IS 'Primary schedule.';
COMMENT ON COLUMN silver_instalacion_residuo.horario_2 IS 'Secondary schedule.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated facility counts by municipality and type
CREATE TABLE fact_instalacion_residuo_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    instalacion_tipo TEXT NOT NULL, -- Based on descripcion field (e.g., "Punto Limpio", "Planta Transferencia", etc.)
    total_instalaciones INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, instalacion_tipo),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_tipo CHECK (instalacion_tipo IS NOT NULL AND LENGTH(instalacion_tipo) > 0),
    CONSTRAINT valid_agg_total CHECK (total_instalaciones >= 0)
);

CREATE INDEX idx_fact_instalacion_municipio_agg_tipo ON fact_instalacion_residuo_municipio_agg(instalacion_tipo);
CREATE INDEX idx_fact_instalacion_municipio_agg_last_refreshed ON fact_instalacion_residuo_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_instalacion_residuo_municipio_agg IS 'Fact layer: Aggregated facility counts by municipality and type.';
COMMENT ON COLUMN fact_instalacion_residuo_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_instalacion_residuo_municipio_agg.instalacion_tipo IS 'Facility type (from descripcion field).';
COMMENT ON COLUMN fact_instalacion_residuo_municipio_agg.total_instalaciones IS 'Total count of facilities in this municipality and type.';
COMMENT ON COLUMN fact_instalacion_residuo_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_instalacion_residuo_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_instalacion_residuo_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_instalacion_residuo_municipio_agg (
        ine_code,
        instalacion_tipo,
        total_instalaciones
    )
    SELECT
        ine_code,
        COALESCE(descripcion, 'Sin descripción') as instalacion_tipo,
        COUNT(*) as total_instalaciones
    FROM silver_instalacion_residuo
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, COALESCE(descripcion, 'Sin descripción');
END;
$$ LANGUAGE plpgsql;
