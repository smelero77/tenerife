-- ============================================================================
-- Migration: 0022_empresas_servicios.sql
-- Description: Add tables for service companies data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_empresa_servicio_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_empresa_servicio CASCADE;
DROP TABLE IF EXISTS bronze_ckan_empresas_servicios_raw CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_empresa_servicio_municipio_agg() CASCADE;
DROP FUNCTION IF EXISTS upsert_empresa_servicio_batch CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_empresas_servicios_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_empresas_servicios_raw_resource_id ON bronze_ckan_empresas_servicios_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_empresas_servicios_raw_ingested_at ON bronze_ckan_empresas_servicios_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_empresas_servicios_raw_jsonb ON bronze_ckan_empresas_servicios_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_empresas_servicios_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_empresas_servicios_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_empresas_servicios_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_empresas_servicios_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated service companies data
CREATE TABLE silver_empresa_servicio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    empresa_nombre TEXT NOT NULL,
    empresa_tipo TEXT, -- e.g., "servicios informaticos", "servicios juridicos", etc.
    empresa_telefono TEXT,
    empresa_email TEXT,
    empresa_web TEXT,
    empresa_direccion TEXT,
    empresa_codigo_postal VARCHAR(10),
    municipio_nombre TEXT NOT NULL DEFAULT '',
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    latitud NUMERIC,
    longitud NUMERIC,
    empresa_actividad TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_latitud CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    CONSTRAINT valid_longitud CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180)),
    CONSTRAINT valid_codigo_postal CHECK (empresa_codigo_postal IS NULL OR LENGTH(empresa_codigo_postal) <= 10)
);

CREATE INDEX idx_silver_empresa_servicio_ine_code ON silver_empresa_servicio(ine_code);
CREATE INDEX idx_silver_empresa_servicio_municipio_nombre ON silver_empresa_servicio(municipio_nombre);
CREATE INDEX idx_silver_empresa_servicio_tipo ON silver_empresa_servicio(empresa_tipo);
CREATE INDEX idx_silver_empresa_servicio_actividad ON silver_empresa_servicio(empresa_actividad);
CREATE INDEX idx_silver_empresa_servicio_source_resource_id ON silver_empresa_servicio(source_resource_id);
CREATE INDEX idx_silver_empresa_servicio_coordinates ON silver_empresa_servicio(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

-- Unique constraint to avoid duplicates
-- Uses: source_resource_id, empresa_nombre, ine_code, latitud, longitud
-- This allows multiple locations of the same company in the same municipality
-- Note: Using functional unique index to handle NULLs properly
CREATE UNIQUE INDEX unique_empresa_servicio_record ON silver_empresa_servicio (
    source_resource_id, 
    empresa_nombre, 
    COALESCE(ine_code, ''),
    COALESCE(latitud::text, ''),
    COALESCE(longitud::text, '')
);

COMMENT ON TABLE silver_empresa_servicio IS 'Silver layer: Cleaned and validated service companies data from CKAN.';
COMMENT ON COLUMN silver_empresa_servicio.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_empresa_servicio.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_empresa_servicio.empresa_nombre IS 'Company name.';
COMMENT ON COLUMN silver_empresa_servicio.empresa_tipo IS 'Company type (e.g., "servicios informaticos", "servicios juridicos").';
COMMENT ON COLUMN silver_empresa_servicio.empresa_telefono IS 'Phone number.';
COMMENT ON COLUMN silver_empresa_servicio.empresa_email IS 'Email address.';
COMMENT ON COLUMN silver_empresa_servicio.empresa_web IS 'Website URL.';
COMMENT ON COLUMN silver_empresa_servicio.empresa_direccion IS 'Full address.';
COMMENT ON COLUMN silver_empresa_servicio.empresa_codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_empresa_servicio.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_empresa_servicio.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_empresa_servicio.latitud IS 'Latitude coordinate.';
COMMENT ON COLUMN silver_empresa_servicio.longitud IS 'Longitude coordinate.';
COMMENT ON COLUMN silver_empresa_servicio.empresa_actividad IS 'Company activity/type.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated company counts by municipality and type
CREATE TABLE fact_empresa_servicio_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    empresa_tipo TEXT NOT NULL, -- Company type
    total_empresas INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, empresa_tipo),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_tipo CHECK (empresa_tipo IS NOT NULL AND LENGTH(empresa_tipo) > 0),
    CONSTRAINT valid_agg_total CHECK (total_empresas >= 0)
);

CREATE INDEX idx_fact_empresa_servicio_municipio_agg_tipo ON fact_empresa_servicio_municipio_agg(empresa_tipo);
CREATE INDEX idx_fact_empresa_servicio_municipio_agg_last_refreshed ON fact_empresa_servicio_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_empresa_servicio_municipio_agg IS 'Fact layer: Aggregated company counts by municipality and type.';
COMMENT ON COLUMN fact_empresa_servicio_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_empresa_servicio_municipio_agg.empresa_tipo IS 'Company type.';
COMMENT ON COLUMN fact_empresa_servicio_municipio_agg.total_empresas IS 'Total count of companies in this municipality and type.';
COMMENT ON COLUMN fact_empresa_servicio_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_empresa_servicio_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_empresa_servicio_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_empresa_servicio_municipio_agg (
        ine_code,
        empresa_tipo,
        total_empresas
    )
    SELECT
        ine_code,
        COALESCE(empresa_tipo, 'Sin tipo') as empresa_tipo,
        COUNT(*) as total_empresas
    FROM silver_empresa_servicio
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, COALESCE(empresa_tipo, 'Sin tipo');
END;
$$ LANGUAGE plpgsql;

-- Function to upsert empresa servicio records using the functional unique index
CREATE OR REPLACE FUNCTION upsert_empresa_servicio_batch(p_records jsonb)
RETURNS void AS $$
DECLARE
    rec jsonb;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO silver_empresa_servicio (
            source_dataset_id,
            source_resource_id,
            empresa_nombre,
            empresa_tipo,
            empresa_telefono,
            empresa_email,
            empresa_web,
            empresa_direccion,
            empresa_codigo_postal,
            municipio_nombre,
            ine_code,
            latitud,
            longitud,
            empresa_actividad
        ) VALUES (
            rec->>'source_dataset_id',
            rec->>'source_resource_id',
            rec->>'empresa_nombre',
            NULLIF(rec->>'empresa_tipo', '')::text,
            NULLIF(rec->>'empresa_telefono', '')::text,
            NULLIF(rec->>'empresa_email', '')::text,
            NULLIF(rec->>'empresa_web', '')::text,
            NULLIF(rec->>'empresa_direccion', '')::text,
            NULLIF(rec->>'empresa_codigo_postal', '')::varchar(10),
            rec->>'municipio_nombre',
            NULLIF(rec->>'ine_code', '')::varchar(5),
            NULLIF(rec->>'latitud', '')::numeric,
            NULLIF(rec->>'longitud', '')::numeric,
            NULLIF(rec->>'empresa_actividad', '')::text
        )
        ON CONFLICT (source_resource_id, empresa_nombre, COALESCE(ine_code, ''), COALESCE(latitud::text, ''), COALESCE(longitud::text, ''))
        DO UPDATE SET
            empresa_tipo = EXCLUDED.empresa_tipo,
            empresa_telefono = EXCLUDED.empresa_telefono,
            empresa_email = EXCLUDED.empresa_email,
            empresa_web = EXCLUDED.empresa_web,
            empresa_direccion = EXCLUDED.empresa_direccion,
            empresa_codigo_postal = EXCLUDED.empresa_codigo_postal,
            empresa_actividad = EXCLUDED.empresa_actividad,
            created_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;
