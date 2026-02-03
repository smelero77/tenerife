-- ============================================================================
-- Migration: 0015_alojamientos_agencias_viajes.sql
-- Description: Add tables for tourist accommodations and travel agencies data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- Note: This is different from 0009_alojamientos_turisticos.sql which only had accommodations
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_alojamiento_agencia_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_alojamiento_agencia_viaje CASCADE;
DROP TABLE IF EXISTS bronze_ckan_alojamientos_agencias_viajes_raw CASCADE;
DROP INDEX IF EXISTS unique_alojamiento_agencia_record CASCADE;
DROP FUNCTION IF EXISTS upsert_alojamiento_agencia_viaje_batch(p_records jsonb) CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_alojamiento_agencia_municipio_agg() CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_alojamientos_agencias_viajes_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_alojamientos_agencias_viajes_raw_resource_id ON bronze_ckan_alojamientos_agencias_viajes_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_alojamientos_agencias_viajes_raw_ingested_at ON bronze_ckan_alojamientos_agencias_viajes_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_alojamientos_agencias_viajes_raw_jsonb ON bronze_ckan_alojamientos_agencias_viajes_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_alojamientos_agencias_viajes_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_alojamientos_agencias_viajes_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_alojamientos_agencias_viajes_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_alojamientos_agencias_viajes_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated tourist accommodations and travel agencies data
CREATE TABLE silver_alojamiento_agencia_viaje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    establecimiento_nombre TEXT NOT NULL,
    establecimiento_tipo TEXT, -- e.g., "alojamiento hotelero", "alojamiento extrahotelero", "agencia de viajes"
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
    CONSTRAINT valid_codigo_postal CHECK (establecimiento_codigo_postal IS NULL OR LENGTH(establecimiento_codigo_postal) <= 10)
);

-- Unique constraint: same establishment can have multiple locations
-- Using functional unique index to handle NULLs and allow multiple locations
CREATE UNIQUE INDEX unique_alojamiento_agencia_record ON silver_alojamiento_agencia_viaje (
    source_resource_id, 
    establecimiento_nombre, 
    COALESCE(municipio_nombre, ''),
    COALESCE(latitud::text, ''),
    COALESCE(longitud::text, ''),
    COALESCE(establecimiento_direccion, '')
);

CREATE INDEX idx_silver_alojamiento_agencia_ine_code ON silver_alojamiento_agencia_viaje(ine_code);
CREATE INDEX idx_silver_alojamiento_agencia_municipio_nombre ON silver_alojamiento_agencia_viaje(municipio_nombre);
CREATE INDEX idx_silver_alojamiento_agencia_tipo ON silver_alojamiento_agencia_viaje(establecimiento_tipo);
CREATE INDEX idx_silver_alojamiento_agencia_actividad ON silver_alojamiento_agencia_viaje(establecimiento_actividad);
CREATE INDEX idx_silver_alojamiento_agencia_source_resource_id ON silver_alojamiento_agencia_viaje(source_resource_id);
CREATE INDEX idx_silver_alojamiento_agencia_coordinates ON silver_alojamiento_agencia_viaje(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

COMMENT ON TABLE silver_alojamiento_agencia_viaje IS 'Silver layer: Cleaned and validated tourist accommodations and travel agencies data from CKAN.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.establecimiento_nombre IS 'Establishment name.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.establecimiento_tipo IS 'Establishment type (e.g., "alojamiento hotelero", "alojamiento extrahotelero", "agencia de viajes").';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.establecimiento_telefono IS 'Phone number.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.establecimiento_email IS 'Email address.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.establecimiento_web IS 'Website URL.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.establecimiento_direccion IS 'Full address.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.establecimiento_codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.latitud IS 'Latitude coordinate.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.longitud IS 'Longitude coordinate.';
COMMENT ON COLUMN silver_alojamiento_agencia_viaje.establecimiento_actividad IS 'Establishment activity/type.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated establishment counts by municipality and type
CREATE TABLE fact_alojamiento_agencia_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    establecimiento_tipo TEXT NOT NULL, -- Establishment type
    total_establecimientos INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, establecimiento_tipo),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_tipo CHECK (establecimiento_tipo IS NOT NULL AND LENGTH(establecimiento_tipo) > 0),
    CONSTRAINT valid_agg_total CHECK (total_establecimientos >= 0)
);

CREATE INDEX idx_fact_alojamiento_agencia_municipio_agg_tipo ON fact_alojamiento_agencia_municipio_agg(establecimiento_tipo);
CREATE INDEX idx_fact_alojamiento_agencia_municipio_agg_last_refreshed ON fact_alojamiento_agencia_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_alojamiento_agencia_municipio_agg IS 'Fact layer: Aggregated establishment counts by municipality and type.';
COMMENT ON COLUMN fact_alojamiento_agencia_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_alojamiento_agencia_municipio_agg.establecimiento_tipo IS 'Establishment type.';
COMMENT ON COLUMN fact_alojamiento_agencia_municipio_agg.total_establecimientos IS 'Total count of establishments in this municipality and type.';
COMMENT ON COLUMN fact_alojamiento_agencia_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';

-- Function to upsert alojamientos/agencias using the functional unique index
CREATE OR REPLACE FUNCTION upsert_alojamiento_agencia_viaje_batch(p_records jsonb)
RETURNS void AS $$
DECLARE
    rec jsonb;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO silver_alojamiento_agencia_viaje (
            source_dataset_id,
            source_resource_id,
            establecimiento_nombre,
            establecimiento_tipo,
            establecimiento_telefono,
            establecimiento_email,
            establecimiento_web,
            establecimiento_direccion,
            establecimiento_codigo_postal,
            municipio_nombre,
            ine_code,
            latitud,
            longitud,
            establecimiento_actividad
        ) VALUES (
            rec->>'source_dataset_id',
            rec->>'source_resource_id',
            rec->>'establecimiento_nombre',
            NULLIF(rec->>'establecimiento_tipo', '')::text,
            NULLIF(rec->>'establecimiento_telefono', '')::text,
            NULLIF(rec->>'establecimiento_email', '')::text,
            NULLIF(rec->>'establecimiento_web', '')::text,
            NULLIF(rec->>'establecimiento_direccion', '')::text,
            NULLIF(rec->>'establecimiento_codigo_postal', '')::varchar(10),
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
            NULLIF(rec->>'establecimiento_actividad', '')::text
        )
        ON CONFLICT (source_resource_id, establecimiento_nombre, COALESCE(municipio_nombre, ''), COALESCE(latitud::text, ''), COALESCE(longitud::text, ''), COALESCE(establecimiento_direccion, ''))
        DO UPDATE SET
            establecimiento_tipo = EXCLUDED.establecimiento_tipo,
            establecimiento_telefono = EXCLUDED.establecimiento_telefono,
            establecimiento_email = EXCLUDED.establecimiento_email,
            establecimiento_web = EXCLUDED.establecimiento_web,
            establecimiento_direccion = EXCLUDED.establecimiento_direccion,
            establecimiento_codigo_postal = EXCLUDED.establecimiento_codigo_postal,
            ine_code = CASE 
                WHEN EXCLUDED.ine_code IS NOT NULL THEN EXCLUDED.ine_code
                ELSE silver_alojamiento_agencia_viaje.ine_code
            END,
            latitud = EXCLUDED.latitud,
            longitud = EXCLUDED.longitud,
            establecimiento_actividad = EXCLUDED.establecimiento_actividad,
            created_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_alojamiento_agencia_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_alojamiento_agencia_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_alojamiento_agencia_municipio_agg (
        ine_code,
        establecimiento_tipo,
        total_establecimientos
    )
    SELECT
        ine_code,
        COALESCE(establecimiento_tipo, 'Sin tipo') as establecimiento_tipo,
        COUNT(*) as total_establecimientos
    FROM silver_alojamiento_agencia_viaje
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, COALESCE(establecimiento_tipo, 'Sin tipo');
END;
$$ LANGUAGE plpgsql;
