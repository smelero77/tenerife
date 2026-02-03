-- ============================================================================
-- Migration: 0013_asociaciones_ciudadanas.sql
-- Description: Add tables for citizen associations data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_asociacion_ciudadana_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_asociacion_ciudadana CASCADE;
DROP TABLE IF EXISTS bronze_ckan_asociaciones_ciudadanas_raw CASCADE;
DROP INDEX IF EXISTS unique_asociacion_record CASCADE;
DROP FUNCTION IF EXISTS upsert_asociacion_ciudadana_batch(p_records jsonb) CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_asociacion_ciudadana_municipio_agg() CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_asociaciones_ciudadanas_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_asociaciones_ciudadanas_raw_resource_id ON bronze_ckan_asociaciones_ciudadanas_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_asociaciones_ciudadanas_raw_ingested_at ON bronze_ckan_asociaciones_ciudadanas_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_asociaciones_ciudadanas_raw_jsonb ON bronze_ckan_asociaciones_ciudadanas_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_asociaciones_ciudadanas_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_asociaciones_ciudadanas_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_asociaciones_ciudadanas_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_asociaciones_ciudadanas_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated citizen associations data
CREATE TABLE silver_asociacion_ciudadana (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    asociacion_nombre TEXT NOT NULL,
    asociacion_siglas TEXT,
    asociacion_cif TEXT,
    asociacion_telefono TEXT,
    asociacion_email TEXT,
    asociacion_web TEXT,
    asociacion_direccion TEXT,
    asociacion_codigo_postal VARCHAR(10),
    municipio_nombre TEXT NOT NULL DEFAULT '',
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    latitud NUMERIC,
    longitud NUMERIC,
    asociacion_actividad TEXT,
    asociacion_ambito TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_latitud CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    CONSTRAINT valid_longitud CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180)),
    CONSTRAINT valid_codigo_postal CHECK (asociacion_codigo_postal IS NULL OR LENGTH(asociacion_codigo_postal) <= 10),
    CONSTRAINT valid_cif CHECK (asociacion_cif IS NULL OR LENGTH(asociacion_cif) <= 20)
);

-- Unique constraint: same association can have multiple locations
-- Using functional unique index to handle NULLs and allow multiple locations
CREATE UNIQUE INDEX unique_asociacion_record ON silver_asociacion_ciudadana (
    source_resource_id, 
    asociacion_nombre, 
    COALESCE(municipio_nombre, ''),
    COALESCE(latitud::text, ''),
    COALESCE(longitud::text, ''),
    COALESCE(asociacion_direccion, '')
);

CREATE INDEX idx_silver_asociacion_ine_code ON silver_asociacion_ciudadana(ine_code);
CREATE INDEX idx_silver_asociacion_municipio_nombre ON silver_asociacion_ciudadana(municipio_nombre);
CREATE INDEX idx_silver_asociacion_ambito ON silver_asociacion_ciudadana(asociacion_ambito);
CREATE INDEX idx_silver_asociacion_actividad ON silver_asociacion_ciudadana(asociacion_actividad);
CREATE INDEX idx_silver_asociacion_source_resource_id ON silver_asociacion_ciudadana(source_resource_id);
CREATE INDEX idx_silver_asociacion_coordinates ON silver_asociacion_ciudadana(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

COMMENT ON TABLE silver_asociacion_ciudadana IS 'Silver layer: Cleaned and validated citizen associations data from CKAN.';
COMMENT ON COLUMN silver_asociacion_ciudadana.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_asociacion_ciudadana.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_asociacion_ciudadana.asociacion_nombre IS 'Association name.';
COMMENT ON COLUMN silver_asociacion_ciudadana.asociacion_siglas IS 'Association acronyms/initials.';
COMMENT ON COLUMN silver_asociacion_ciudadana.asociacion_cif IS 'Association tax ID (CIF).';
COMMENT ON COLUMN silver_asociacion_ciudadana.asociacion_telefono IS 'Phone number.';
COMMENT ON COLUMN silver_asociacion_ciudadana.asociacion_email IS 'Email address.';
COMMENT ON COLUMN silver_asociacion_ciudadana.asociacion_web IS 'Website URL.';
COMMENT ON COLUMN silver_asociacion_ciudadana.asociacion_direccion IS 'Full address.';
COMMENT ON COLUMN silver_asociacion_ciudadana.asociacion_codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_asociacion_ciudadana.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_asociacion_ciudadana.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_asociacion_ciudadana.latitud IS 'Latitude coordinate.';
COMMENT ON COLUMN silver_asociacion_ciudadana.longitud IS 'Longitude coordinate.';
COMMENT ON COLUMN silver_asociacion_ciudadana.asociacion_actividad IS 'Association activity/type.';
COMMENT ON COLUMN silver_asociacion_ciudadana.asociacion_ambito IS 'Association scope/field.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated association counts by municipality and scope
CREATE TABLE fact_asociacion_ciudadana_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    asociacion_ambito TEXT NOT NULL, -- Association scope/field
    total_asociaciones INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, asociacion_ambito),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_ambito CHECK (asociacion_ambito IS NOT NULL AND LENGTH(asociacion_ambito) > 0),
    CONSTRAINT valid_agg_total CHECK (total_asociaciones >= 0)
);

CREATE INDEX idx_fact_asociacion_municipio_agg_ambito ON fact_asociacion_ciudadana_municipio_agg(asociacion_ambito);
CREATE INDEX idx_fact_asociacion_municipio_agg_last_refreshed ON fact_asociacion_ciudadana_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_asociacion_ciudadana_municipio_agg IS 'Fact layer: Aggregated association counts by municipality and scope.';
COMMENT ON COLUMN fact_asociacion_ciudadana_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_asociacion_ciudadana_municipio_agg.asociacion_ambito IS 'Association scope/field.';
COMMENT ON COLUMN fact_asociacion_ciudadana_municipio_agg.total_asociaciones IS 'Total count of associations in this municipality and scope.';
COMMENT ON COLUMN fact_asociacion_ciudadana_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';

-- Function to upsert asociaciones using the functional unique index
CREATE OR REPLACE FUNCTION upsert_asociacion_ciudadana_batch(p_records jsonb)
RETURNS void AS $$
DECLARE
    rec jsonb;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO silver_asociacion_ciudadana (
            source_dataset_id,
            source_resource_id,
            asociacion_nombre,
            asociacion_siglas,
            asociacion_cif,
            asociacion_telefono,
            asociacion_email,
            asociacion_web,
            asociacion_direccion,
            asociacion_codigo_postal,
            municipio_nombre,
            ine_code,
            latitud,
            longitud,
            asociacion_actividad,
            asociacion_ambito
        ) VALUES (
            rec->>'source_dataset_id',
            rec->>'source_resource_id',
            rec->>'asociacion_nombre',
            NULLIF(rec->>'asociacion_siglas', '')::text,
            NULLIF(rec->>'asociacion_cif', '')::text,
            NULLIF(rec->>'asociacion_telefono', '')::text,
            NULLIF(rec->>'asociacion_email', '')::text,
            NULLIF(rec->>'asociacion_web', '')::text,
            NULLIF(rec->>'asociacion_direccion', '')::text,
            NULLIF(rec->>'asociacion_codigo_postal', '')::varchar(10),
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
            NULLIF(rec->>'asociacion_actividad', '')::text,
            NULLIF(rec->>'asociacion_ambito', '')::text
        )
        ON CONFLICT (source_resource_id, asociacion_nombre, COALESCE(municipio_nombre, ''), COALESCE(latitud::text, ''), COALESCE(longitud::text, ''), COALESCE(asociacion_direccion, ''))
        DO UPDATE SET
            asociacion_siglas = EXCLUDED.asociacion_siglas,
            asociacion_cif = EXCLUDED.asociacion_cif,
            asociacion_telefono = EXCLUDED.asociacion_telefono,
            asociacion_email = EXCLUDED.asociacion_email,
            asociacion_web = EXCLUDED.asociacion_web,
            asociacion_direccion = EXCLUDED.asociacion_direccion,
            asociacion_codigo_postal = EXCLUDED.asociacion_codigo_postal,
            ine_code = CASE 
                WHEN EXCLUDED.ine_code IS NOT NULL THEN EXCLUDED.ine_code
                ELSE silver_asociacion_ciudadana.ine_code
            END,
            latitud = EXCLUDED.latitud,
            longitud = EXCLUDED.longitud,
            asociacion_actividad = EXCLUDED.asociacion_actividad,
            asociacion_ambito = EXCLUDED.asociacion_ambito,
            created_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_asociacion_ciudadana_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_asociacion_ciudadana_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_asociacion_ciudadana_municipio_agg (
        ine_code,
        asociacion_ambito,
        total_asociaciones
    )
    SELECT
        ine_code,
        COALESCE(asociacion_ambito, 'Sin ámbito') as asociacion_ambito,
        COUNT(*) as total_asociaciones
    FROM silver_asociacion_ciudadana
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, COALESCE(asociacion_ambito, 'Sin ámbito');
END;
$$ LANGUAGE plpgsql;
