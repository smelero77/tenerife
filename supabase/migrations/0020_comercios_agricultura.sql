-- ============================================================================
-- Migration: 0020_comercios_agricultura.sql
-- Description: Add tables for agricultural commerce data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_comercio_agricultura_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_comercio_agricultura CASCADE;
DROP TABLE IF EXISTS bronze_ckan_comercios_agricultura_raw CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_comercio_agricultura_municipio_agg() CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_comercios_agricultura_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_comercios_agricultura_raw_resource_id ON bronze_ckan_comercios_agricultura_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_comercios_agricultura_raw_ingested_at ON bronze_ckan_comercios_agricultura_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_comercios_agricultura_raw_jsonb ON bronze_ckan_comercios_agricultura_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_comercios_agricultura_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_comercios_agricultura_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_comercios_agricultura_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_comercios_agricultura_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated agricultural commerce data
CREATE TABLE silver_comercio_agricultura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    comercio_nombre TEXT NOT NULL,
    comercio_tipo TEXT, -- e.g., "agricultura suministros", "agricultura cooperativas", "agricultura ganaderia piensos", etc.
    comercio_telefono TEXT,
    comercio_email TEXT,
    comercio_web TEXT,
    comercio_direccion TEXT,
    comercio_codigo_postal VARCHAR(10),
    municipio_nombre TEXT NOT NULL DEFAULT '',
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    latitud NUMERIC,
    longitud NUMERIC,
    comercio_actividad TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_latitud CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    CONSTRAINT valid_longitud CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180)),
    CONSTRAINT valid_codigo_postal CHECK (comercio_codigo_postal IS NULL OR LENGTH(comercio_codigo_postal) <= 10)
);

CREATE INDEX idx_silver_comercio_agricultura_ine_code ON silver_comercio_agricultura(ine_code);
CREATE INDEX idx_silver_comercio_agricultura_municipio_nombre ON silver_comercio_agricultura(municipio_nombre);
CREATE INDEX idx_silver_comercio_agricultura_tipo ON silver_comercio_agricultura(comercio_tipo);
CREATE INDEX idx_silver_comercio_agricultura_actividad ON silver_comercio_agricultura(comercio_actividad);
CREATE INDEX idx_silver_comercio_agricultura_source_resource_id ON silver_comercio_agricultura(source_resource_id);
CREATE INDEX idx_silver_comercio_agricultura_coordinates ON silver_comercio_agricultura(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

-- Unique constraint to avoid duplicates
-- Uses: source_resource_id, nombre, ine_code, latitud, longitud
-- This allows multiple locations of the same business in the same municipality
-- Note: Using functional unique index to handle NULLs properly
-- The constraint name will be used in the stored procedure for ON CONFLICT
CREATE UNIQUE INDEX unique_comercio_agricultura_record ON silver_comercio_agricultura (
    source_resource_id, 
    comercio_nombre, 
    COALESCE(ine_code, ''),
    COALESCE(latitud::text, ''),
    COALESCE(longitud::text, '')
);

COMMENT ON TABLE silver_comercio_agricultura IS 'Silver layer: Cleaned and validated agricultural commerce data from CKAN.';
COMMENT ON COLUMN silver_comercio_agricultura.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_comercio_agricultura.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_comercio_agricultura.comercio_nombre IS 'Store name.';
COMMENT ON COLUMN silver_comercio_agricultura.comercio_tipo IS 'Store type (e.g., "agricultura suministros", "agricultura cooperativas", "agricultura ganaderia piensos").';
COMMENT ON COLUMN silver_comercio_agricultura.comercio_telefono IS 'Phone number.';
COMMENT ON COLUMN silver_comercio_agricultura.comercio_email IS 'Email address.';
COMMENT ON COLUMN silver_comercio_agricultura.comercio_web IS 'Website URL.';
COMMENT ON COLUMN silver_comercio_agricultura.comercio_direccion IS 'Full address.';
COMMENT ON COLUMN silver_comercio_agricultura.comercio_codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_comercio_agricultura.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_comercio_agricultura.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_comercio_agricultura.latitud IS 'Latitude coordinate.';
COMMENT ON COLUMN silver_comercio_agricultura.longitud IS 'Longitude coordinate.';
COMMENT ON COLUMN silver_comercio_agricultura.comercio_actividad IS 'Store activity/type.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated store counts by municipality and type
CREATE TABLE fact_comercio_agricultura_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    comercio_tipo TEXT NOT NULL, -- Store type
    total_comercios INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, comercio_tipo),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_tipo CHECK (comercio_tipo IS NOT NULL AND LENGTH(comercio_tipo) > 0),
    CONSTRAINT valid_agg_total CHECK (total_comercios >= 0)
);

CREATE INDEX idx_fact_comercio_agricultura_municipio_agg_tipo ON fact_comercio_agricultura_municipio_agg(comercio_tipo);
CREATE INDEX idx_fact_comercio_agricultura_municipio_agg_last_refreshed ON fact_comercio_agricultura_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_comercio_agricultura_municipio_agg IS 'Fact layer: Aggregated store counts by municipality and type.';
COMMENT ON COLUMN fact_comercio_agricultura_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_comercio_agricultura_municipio_agg.comercio_tipo IS 'Store type.';
COMMENT ON COLUMN fact_comercio_agricultura_municipio_agg.total_comercios IS 'Total count of stores in this municipality and type.';
COMMENT ON COLUMN fact_comercio_agricultura_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_comercio_agricultura_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_comercio_agricultura_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_comercio_agricultura_municipio_agg (
        ine_code,
        comercio_tipo,
        total_comercios
    )
    SELECT
        ine_code,
        COALESCE(comercio_tipo, 'Sin tipo') as comercio_tipo,
        COUNT(*) as total_comercios
    FROM silver_comercio_agricultura
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, COALESCE(comercio_tipo, 'Sin tipo');
END;
$$ LANGUAGE plpgsql;

-- Function to upsert comercio agricultura records using the functional unique index
CREATE OR REPLACE FUNCTION upsert_comercio_agricultura_batch(p_records jsonb)
RETURNS void AS $$
DECLARE
    rec jsonb;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO silver_comercio_agricultura (
            source_dataset_id,
            source_resource_id,
            comercio_nombre,
            comercio_tipo,
            comercio_telefono,
            comercio_email,
            comercio_web,
            comercio_direccion,
            comercio_codigo_postal,
            municipio_nombre,
            ine_code,
            latitud,
            longitud,
            comercio_actividad
        ) VALUES (
            rec->>'source_dataset_id',
            rec->>'source_resource_id',
            rec->>'comercio_nombre',
            NULLIF(rec->>'comercio_tipo', '')::text,
            NULLIF(rec->>'comercio_telefono', '')::text,
            NULLIF(rec->>'comercio_email', '')::text,
            NULLIF(rec->>'comercio_web', '')::text,
            NULLIF(rec->>'comercio_direccion', '')::text,
            NULLIF(rec->>'comercio_codigo_postal', '')::varchar(10),
            rec->>'municipio_nombre',
            NULLIF(rec->>'ine_code', '')::varchar(5),
            NULLIF(rec->>'latitud', '')::numeric,
            NULLIF(rec->>'longitud', '')::numeric,
            NULLIF(rec->>'comercio_actividad', '')::text
        )
        ON CONFLICT (source_resource_id, comercio_nombre, COALESCE(ine_code, ''), COALESCE(latitud::text, ''), COALESCE(longitud::text, ''))
        DO UPDATE SET
            comercio_tipo = EXCLUDED.comercio_tipo,
            comercio_telefono = EXCLUDED.comercio_telefono,
            comercio_email = EXCLUDED.comercio_email,
            comercio_web = EXCLUDED.comercio_web,
            comercio_direccion = EXCLUDED.comercio_direccion,
            comercio_codigo_postal = EXCLUDED.comercio_codigo_postal,
            comercio_actividad = EXCLUDED.comercio_actividad,
            created_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

