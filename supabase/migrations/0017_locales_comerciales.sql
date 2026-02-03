-- ============================================================================
-- Migration: 0017_locales_comerciales.sql
-- Description: Add tables for commercial premises data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_local_comercial_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_local_comercial CASCADE;
DROP TABLE IF EXISTS bronze_ckan_locales_comerciales_raw CASCADE;
DROP INDEX IF EXISTS unique_local_comercial_record CASCADE;
DROP FUNCTION IF EXISTS upsert_local_comercial_batch(p_records jsonb) CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_local_comercial_municipio_agg() CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_locales_comerciales_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_locales_comerciales_raw_resource_id ON bronze_ckan_locales_comerciales_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_locales_comerciales_raw_ingested_at ON bronze_ckan_locales_comerciales_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_locales_comerciales_raw_jsonb ON bronze_ckan_locales_comerciales_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_locales_comerciales_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_locales_comerciales_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_locales_comerciales_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_locales_comerciales_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated commercial premises data
CREATE TABLE silver_local_comercial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    local_nombre TEXT NOT NULL,
    local_tipo TEXT, -- e.g., "comercio", "centro comercial", etc.
    local_telefono TEXT,
    local_email TEXT,
    local_web TEXT,
    local_direccion TEXT,
    local_codigo_postal VARCHAR(10),
    municipio_nombre TEXT NOT NULL DEFAULT '',
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    latitud NUMERIC,
    longitud NUMERIC,
    local_actividad TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_latitud CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    CONSTRAINT valid_longitud CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180)),
    CONSTRAINT valid_codigo_postal CHECK (local_codigo_postal IS NULL OR LENGTH(local_codigo_postal) <= 10)
);

-- Unique constraint: same commercial premises can have multiple locations
-- Using functional unique index to handle NULLs and allow multiple locations
CREATE UNIQUE INDEX unique_local_comercial_record ON silver_local_comercial (
    source_resource_id, 
    local_nombre, 
    COALESCE(municipio_nombre, ''),
    COALESCE(latitud::text, ''),
    COALESCE(longitud::text, ''),
    COALESCE(local_direccion, '')
);

CREATE INDEX idx_silver_local_comercial_ine_code ON silver_local_comercial(ine_code);
CREATE INDEX idx_silver_local_comercial_municipio_nombre ON silver_local_comercial(municipio_nombre);
CREATE INDEX idx_silver_local_comercial_tipo ON silver_local_comercial(local_tipo);
CREATE INDEX idx_silver_local_comercial_actividad ON silver_local_comercial(local_actividad);
CREATE INDEX idx_silver_local_comercial_source_resource_id ON silver_local_comercial(source_resource_id);
CREATE INDEX idx_silver_local_comercial_coordinates ON silver_local_comercial(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

COMMENT ON TABLE silver_local_comercial IS 'Silver layer: Cleaned and validated commercial premises data from CKAN.';
COMMENT ON COLUMN silver_local_comercial.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_local_comercial.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_local_comercial.local_nombre IS 'Commercial premises name.';
COMMENT ON COLUMN silver_local_comercial.local_tipo IS 'Commercial premises type (e.g., "comercio", "centro comercial").';
COMMENT ON COLUMN silver_local_comercial.local_telefono IS 'Phone number.';
COMMENT ON COLUMN silver_local_comercial.local_email IS 'Email address.';
COMMENT ON COLUMN silver_local_comercial.local_web IS 'Website URL.';
COMMENT ON COLUMN silver_local_comercial.local_direccion IS 'Full address.';
COMMENT ON COLUMN silver_local_comercial.local_codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_local_comercial.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_local_comercial.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_local_comercial.latitud IS 'Latitude coordinate.';
COMMENT ON COLUMN silver_local_comercial.longitud IS 'Longitude coordinate.';
COMMENT ON COLUMN silver_local_comercial.local_actividad IS 'Commercial premises activity/type.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated commercial premises counts by municipality and type
CREATE TABLE fact_local_comercial_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    local_tipo TEXT NOT NULL, -- Commercial premises type
    total_locales INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, local_tipo),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_tipo CHECK (local_tipo IS NOT NULL AND LENGTH(local_tipo) > 0),
    CONSTRAINT valid_agg_total CHECK (total_locales >= 0)
);

CREATE INDEX idx_fact_local_comercial_municipio_agg_tipo ON fact_local_comercial_municipio_agg(local_tipo);
CREATE INDEX idx_fact_local_comercial_municipio_agg_last_refreshed ON fact_local_comercial_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_local_comercial_municipio_agg IS 'Fact layer: Aggregated commercial premises counts by municipality and type.';
COMMENT ON COLUMN fact_local_comercial_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_local_comercial_municipio_agg.local_tipo IS 'Commercial premises type.';
COMMENT ON COLUMN fact_local_comercial_municipio_agg.total_locales IS 'Total count of commercial premises in this municipality and type.';
COMMENT ON COLUMN fact_local_comercial_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';

-- Function to upsert locales comerciales using the functional unique index
CREATE OR REPLACE FUNCTION upsert_local_comercial_batch(p_records jsonb)
RETURNS void AS $$
DECLARE
    rec jsonb;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO silver_local_comercial (
            source_dataset_id,
            source_resource_id,
            local_nombre,
            local_tipo,
            local_telefono,
            local_email,
            local_web,
            local_direccion,
            local_codigo_postal,
            municipio_nombre,
            ine_code,
            latitud,
            longitud,
            local_actividad
        ) VALUES (
            rec->>'source_dataset_id',
            rec->>'source_resource_id',
            rec->>'local_nombre',
            NULLIF(rec->>'local_tipo', '')::text,
            NULLIF(rec->>'local_telefono', '')::text,
            NULLIF(rec->>'local_email', '')::text,
            NULLIF(rec->>'local_web', '')::text,
            NULLIF(rec->>'local_direccion', '')::text,
            NULLIF(rec->>'local_codigo_postal', '')::varchar(10),
            rec->>'municipio_nombre',
            CASE 
                WHEN rec->>'ine_code' IS NULL OR rec->>'ine_code' = '' OR rec->>'ine_code' = 'null' THEN NULL
                ELSE (rec->>'ine_code')::varchar(5)
            END,
            CASE 
                WHEN rec->>'latitud' IS NULL OR rec->>'latitud' = '' OR rec->>'latitud' = 'null' THEN NULL
                ELSE (rec->>'latitud')::numeric
            END,
            CASE 
                WHEN rec->>'longitud' IS NULL OR rec->>'longitud' = '' OR rec->>'longitud' = 'null' THEN NULL
                ELSE (rec->>'longitud')::numeric
            END,
            NULLIF(rec->>'local_actividad', '')::text
        )
        ON CONFLICT (source_resource_id, local_nombre, COALESCE(municipio_nombre, ''), COALESCE(latitud::text, ''), COALESCE(longitud::text, ''), COALESCE(local_direccion, ''))
        DO UPDATE SET
            local_tipo = EXCLUDED.local_tipo,
            local_telefono = EXCLUDED.local_telefono,
            local_email = EXCLUDED.local_email,
            local_web = EXCLUDED.local_web,
            local_direccion = EXCLUDED.local_direccion,
            local_codigo_postal = EXCLUDED.local_codigo_postal,
            ine_code = CASE 
                WHEN EXCLUDED.ine_code IS NOT NULL THEN EXCLUDED.ine_code
                ELSE silver_local_comercial.ine_code
            END,
            latitud = EXCLUDED.latitud,
            longitud = EXCLUDED.longitud,
            local_actividad = EXCLUDED.local_actividad,
            created_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_local_comercial_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_local_comercial_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_local_comercial_municipio_agg (
        ine_code,
        local_tipo,
        total_locales
    )
    SELECT
        ine_code,
        COALESCE(local_tipo, 'Sin tipo') as local_tipo,
        COUNT(*) as total_locales
    FROM silver_local_comercial
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, COALESCE(local_tipo, 'Sin tipo');
END;
$$ LANGUAGE plpgsql;
