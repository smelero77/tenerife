-- ============================================================================
-- Migration: 0021_administraciones_servicios_publicos.sql
-- Description: Add tables for public administrations and services data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_administracion_servicio_publico_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_administracion_servicio_publico CASCADE;
DROP TABLE IF EXISTS bronze_ckan_administraciones_servicios_publicos_raw CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_administracion_servicio_publico_municipio_agg() CASCADE;
DROP FUNCTION IF EXISTS upsert_administracion_servicio_publico_batch CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_administraciones_servicios_publicos_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_administraciones_servicios_publicos_raw_resource_id ON bronze_ckan_administraciones_servicios_publicos_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_administraciones_servicios_publicos_raw_ingested_at ON bronze_ckan_administraciones_servicios_publicos_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_administraciones_servicios_publicos_raw_jsonb ON bronze_ckan_administraciones_servicios_publicos_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_administraciones_servicios_publicos_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_administraciones_servicios_publicos_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_administraciones_servicios_publicos_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_administraciones_servicios_publicos_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated public administrations and services data
CREATE TABLE silver_administracion_servicio_publico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    administracion_nombre TEXT NOT NULL,
    administracion_tipo TEXT, -- e.g., "administracion publica servicios tributarios", "servicios empleo", etc.
    administracion_telefono TEXT,
    administracion_email TEXT,
    administracion_web TEXT,
    administracion_direccion TEXT,
    administracion_codigo_postal VARCHAR(10),
    municipio_nombre TEXT NOT NULL DEFAULT '',
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    latitud NUMERIC,
    longitud NUMERIC,
    administracion_actividad TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_latitud CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    CONSTRAINT valid_longitud CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180)),
    CONSTRAINT valid_codigo_postal CHECK (administracion_codigo_postal IS NULL OR LENGTH(administracion_codigo_postal) <= 10)
);

CREATE INDEX idx_silver_administracion_servicio_publico_ine_code ON silver_administracion_servicio_publico(ine_code);
CREATE INDEX idx_silver_administracion_servicio_publico_municipio_nombre ON silver_administracion_servicio_publico(municipio_nombre);
CREATE INDEX idx_silver_administracion_servicio_publico_tipo ON silver_administracion_servicio_publico(administracion_tipo);
CREATE INDEX idx_silver_administracion_servicio_publico_actividad ON silver_administracion_servicio_publico(administracion_actividad);
CREATE INDEX idx_silver_administracion_servicio_publico_source_resource_id ON silver_administracion_servicio_publico(source_resource_id);
CREATE INDEX idx_silver_administracion_servicio_publico_coordinates ON silver_administracion_servicio_publico(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

-- Unique constraint to avoid duplicates
-- Uses: source_resource_id, nombre, ine_code, latitud, longitud
-- This allows multiple locations of the same administration/service in the same municipality
-- Note: Using functional unique index to handle NULLs properly
CREATE UNIQUE INDEX unique_administracion_servicio_publico_record ON silver_administracion_servicio_publico (
    source_resource_id, 
    administracion_nombre, 
    COALESCE(ine_code, ''),
    COALESCE(latitud::text, ''),
    COALESCE(longitud::text, '')
);

COMMENT ON TABLE silver_administracion_servicio_publico IS 'Silver layer: Cleaned and validated public administrations and services data from CKAN.';
COMMENT ON COLUMN silver_administracion_servicio_publico.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_administracion_servicio_publico.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_administracion_servicio_publico.administracion_nombre IS 'Administration/service name.';
COMMENT ON COLUMN silver_administracion_servicio_publico.administracion_tipo IS 'Administration/service type (e.g., "administracion publica servicios tributarios", "servicios empleo").';
COMMENT ON COLUMN silver_administracion_servicio_publico.administracion_telefono IS 'Phone number.';
COMMENT ON COLUMN silver_administracion_servicio_publico.administracion_email IS 'Email address.';
COMMENT ON COLUMN silver_administracion_servicio_publico.administracion_web IS 'Website URL.';
COMMENT ON COLUMN silver_administracion_servicio_publico.administracion_direccion IS 'Full address.';
COMMENT ON COLUMN silver_administracion_servicio_publico.administracion_codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_administracion_servicio_publico.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_administracion_servicio_publico.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_administracion_servicio_publico.latitud IS 'Latitude coordinate.';
COMMENT ON COLUMN silver_administracion_servicio_publico.longitud IS 'Longitude coordinate.';
COMMENT ON COLUMN silver_administracion_servicio_publico.administracion_actividad IS 'Administration/service activity/type.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated administration/service counts by municipality and type
CREATE TABLE fact_administracion_servicio_publico_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    administracion_tipo TEXT NOT NULL, -- Administration/service type
    total_administraciones INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, administracion_tipo),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_tipo CHECK (administracion_tipo IS NOT NULL AND LENGTH(administracion_tipo) > 0),
    CONSTRAINT valid_agg_total CHECK (total_administraciones >= 0)
);

CREATE INDEX idx_fact_administracion_servicio_publico_municipio_agg_tipo ON fact_administracion_servicio_publico_municipio_agg(administracion_tipo);
CREATE INDEX idx_fact_administracion_servicio_publico_municipio_agg_last_refreshed ON fact_administracion_servicio_publico_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_administracion_servicio_publico_municipio_agg IS 'Fact layer: Aggregated administration/service counts by municipality and type.';
COMMENT ON COLUMN fact_administracion_servicio_publico_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_administracion_servicio_publico_municipio_agg.administracion_tipo IS 'Administration/service type.';
COMMENT ON COLUMN fact_administracion_servicio_publico_municipio_agg.total_administraciones IS 'Total count of administrations/services in this municipality and type.';
COMMENT ON COLUMN fact_administracion_servicio_publico_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_administracion_servicio_publico_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_administracion_servicio_publico_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_administracion_servicio_publico_municipio_agg (
        ine_code,
        administracion_tipo,
        total_administraciones
    )
    SELECT
        ine_code,
        COALESCE(administracion_tipo, 'Sin tipo') as administracion_tipo,
        COUNT(*) as total_administraciones
    FROM silver_administracion_servicio_publico
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, COALESCE(administracion_tipo, 'Sin tipo');
END;
$$ LANGUAGE plpgsql;

-- Function to upsert administracion servicio publico records using the functional unique index
CREATE OR REPLACE FUNCTION upsert_administracion_servicio_publico_batch(p_records jsonb)
RETURNS void AS $$
DECLARE
    rec jsonb;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO silver_administracion_servicio_publico (
            source_dataset_id,
            source_resource_id,
            administracion_nombre,
            administracion_tipo,
            administracion_telefono,
            administracion_email,
            administracion_web,
            administracion_direccion,
            administracion_codigo_postal,
            municipio_nombre,
            ine_code,
            latitud,
            longitud,
            administracion_actividad
        ) VALUES (
            rec->>'source_dataset_id',
            rec->>'source_resource_id',
            rec->>'administracion_nombre',
            NULLIF(rec->>'administracion_tipo', '')::text,
            NULLIF(rec->>'administracion_telefono', '')::text,
            NULLIF(rec->>'administracion_email', '')::text,
            NULLIF(rec->>'administracion_web', '')::text,
            NULLIF(rec->>'administracion_direccion', '')::text,
            NULLIF(rec->>'administracion_codigo_postal', '')::varchar(10),
            rec->>'municipio_nombre',
            NULLIF(rec->>'ine_code', '')::varchar(5),
            NULLIF(rec->>'latitud', '')::numeric,
            NULLIF(rec->>'longitud', '')::numeric,
            NULLIF(rec->>'administracion_actividad', '')::text
        )
        ON CONFLICT (source_resource_id, administracion_nombre, COALESCE(ine_code, ''), COALESCE(latitud::text, ''), COALESCE(longitud::text, ''))
        DO UPDATE SET
            administracion_tipo = EXCLUDED.administracion_tipo,
            administracion_telefono = EXCLUDED.administracion_telefono,
            administracion_email = EXCLUDED.administracion_email,
            administracion_web = EXCLUDED.administracion_web,
            administracion_direccion = EXCLUDED.administracion_direccion,
            administracion_codigo_postal = EXCLUDED.administracion_codigo_postal,
            administracion_actividad = EXCLUDED.administracion_actividad,
            created_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;
