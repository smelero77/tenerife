-- ============================================================================
-- Migration: 0014_centros_deportivos_ocio.sql
-- Description: Add tables for sports and leisure centers data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_centro_deportivo_ocio_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_centro_deportivo_ocio CASCADE;
DROP TABLE IF EXISTS bronze_ckan_centros_deportivos_ocio_raw CASCADE;
DROP INDEX IF EXISTS unique_centro_record CASCADE;
DROP FUNCTION IF EXISTS upsert_centro_deportivo_ocio_batch(p_records jsonb) CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_centro_deportivo_ocio_municipio_agg() CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_centros_deportivos_ocio_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_centros_deportivos_ocio_raw_resource_id ON bronze_ckan_centros_deportivos_ocio_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_centros_deportivos_ocio_raw_ingested_at ON bronze_ckan_centros_deportivos_ocio_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_centros_deportivos_ocio_raw_jsonb ON bronze_ckan_centros_deportivos_ocio_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_centros_deportivos_ocio_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_centros_deportivos_ocio_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_centros_deportivos_ocio_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_centros_deportivos_ocio_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated sports and leisure centers data
CREATE TABLE silver_centro_deportivo_ocio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    centro_nombre TEXT NOT NULL,
    centro_tipo TEXT,
    centro_telefono TEXT,
    centro_email TEXT,
    centro_web TEXT,
    centro_direccion TEXT,
    centro_codigo_postal VARCHAR(10),
    municipio_nombre TEXT NOT NULL DEFAULT '',
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    latitud NUMERIC,
    longitud NUMERIC,
    centro_actividad TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_latitud CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    CONSTRAINT valid_longitud CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180)),
    CONSTRAINT valid_codigo_postal CHECK (centro_codigo_postal IS NULL OR LENGTH(centro_codigo_postal) <= 10)
);

-- Unique constraint: same center can have multiple locations
-- Using functional unique index to handle NULLs and allow multiple locations
CREATE UNIQUE INDEX unique_centro_record ON silver_centro_deportivo_ocio (
    source_resource_id, 
    centro_nombre, 
    COALESCE(municipio_nombre, ''),
    COALESCE(latitud::text, ''),
    COALESCE(longitud::text, ''),
    COALESCE(centro_direccion, '')
);

CREATE INDEX idx_silver_centro_ine_code ON silver_centro_deportivo_ocio(ine_code);
CREATE INDEX idx_silver_centro_municipio_nombre ON silver_centro_deportivo_ocio(municipio_nombre);
CREATE INDEX idx_silver_centro_tipo ON silver_centro_deportivo_ocio(centro_tipo);
CREATE INDEX idx_silver_centro_actividad ON silver_centro_deportivo_ocio(centro_actividad);
CREATE INDEX idx_silver_centro_source_resource_id ON silver_centro_deportivo_ocio(source_resource_id);
CREATE INDEX idx_silver_centro_coordinates ON silver_centro_deportivo_ocio(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

COMMENT ON TABLE silver_centro_deportivo_ocio IS 'Silver layer: Cleaned and validated sports and leisure centers data from CKAN.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.centro_nombre IS 'Center name.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.centro_tipo IS 'Center type.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.centro_telefono IS 'Phone number.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.centro_email IS 'Email address.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.centro_web IS 'Website URL.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.centro_direccion IS 'Full address.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.centro_codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.latitud IS 'Latitude coordinate.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.longitud IS 'Longitude coordinate.';
COMMENT ON COLUMN silver_centro_deportivo_ocio.centro_actividad IS 'Center activity/type.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated center counts by municipality and type
CREATE TABLE fact_centro_deportivo_ocio_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    centro_tipo TEXT NOT NULL, -- Center type
    total_centros INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, centro_tipo),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_tipo CHECK (centro_tipo IS NOT NULL AND LENGTH(centro_tipo) > 0),
    CONSTRAINT valid_agg_total CHECK (total_centros >= 0)
);

CREATE INDEX idx_fact_centro_municipio_agg_tipo ON fact_centro_deportivo_ocio_municipio_agg(centro_tipo);
CREATE INDEX idx_fact_centro_municipio_agg_last_refreshed ON fact_centro_deportivo_ocio_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_centro_deportivo_ocio_municipio_agg IS 'Fact layer: Aggregated center counts by municipality and type.';
COMMENT ON COLUMN fact_centro_deportivo_ocio_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_centro_deportivo_ocio_municipio_agg.centro_tipo IS 'Center type.';
COMMENT ON COLUMN fact_centro_deportivo_ocio_municipio_agg.total_centros IS 'Total count of centers in this municipality and type.';
COMMENT ON COLUMN fact_centro_deportivo_ocio_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';

-- Function to upsert centros using the functional unique index
CREATE OR REPLACE FUNCTION upsert_centro_deportivo_ocio_batch(p_records jsonb)
RETURNS void AS $$
DECLARE
    rec jsonb;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO silver_centro_deportivo_ocio (
            source_dataset_id,
            source_resource_id,
            centro_nombre,
            centro_tipo,
            centro_telefono,
            centro_email,
            centro_web,
            centro_direccion,
            centro_codigo_postal,
            municipio_nombre,
            ine_code,
            latitud,
            longitud,
            centro_actividad
        ) VALUES (
            rec->>'source_dataset_id',
            rec->>'source_resource_id',
            rec->>'centro_nombre',
            NULLIF(rec->>'centro_tipo', '')::text,
            NULLIF(rec->>'centro_telefono', '')::text,
            NULLIF(rec->>'centro_email', '')::text,
            NULLIF(rec->>'centro_web', '')::text,
            NULLIF(rec->>'centro_direccion', '')::text,
            NULLIF(rec->>'centro_codigo_postal', '')::varchar(10),
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
            NULLIF(rec->>'centro_actividad', '')::text
        )
        ON CONFLICT (source_resource_id, centro_nombre, COALESCE(municipio_nombre, ''), COALESCE(latitud::text, ''), COALESCE(longitud::text, ''), COALESCE(centro_direccion, ''))
        DO UPDATE SET
            centro_tipo = EXCLUDED.centro_tipo,
            centro_telefono = EXCLUDED.centro_telefono,
            centro_email = EXCLUDED.centro_email,
            centro_web = EXCLUDED.centro_web,
            centro_direccion = EXCLUDED.centro_direccion,
            centro_codigo_postal = EXCLUDED.centro_codigo_postal,
            ine_code = CASE 
                WHEN EXCLUDED.ine_code IS NOT NULL THEN EXCLUDED.ine_code
                ELSE silver_centro_deportivo_ocio.ine_code
            END,
            latitud = EXCLUDED.latitud,
            longitud = EXCLUDED.longitud,
            centro_actividad = EXCLUDED.centro_actividad,
            created_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_centro_deportivo_ocio_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_centro_deportivo_ocio_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_centro_deportivo_ocio_municipio_agg (
        ine_code,
        centro_tipo,
        total_centros
    )
    SELECT
        ine_code,
        COALESCE(centro_tipo, 'Sin tipo') as centro_tipo,
        COUNT(*) as total_centros
    FROM silver_centro_deportivo_ocio
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, COALESCE(centro_tipo, 'Sin tipo');
END;
$$ LANGUAGE plpgsql;
