-- ============================================================================
-- Migration: 0025_bienes_interes_cultural.sql
-- Description: Add tables for Bienes de Interés Cultural (BIC) data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing objects if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_bic_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_bic CASCADE;
DROP TABLE IF EXISTS bronze_ckan_bic_raw CASCADE;
DROP INDEX IF EXISTS unique_bic_record CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_bic_municipio_agg() CASCADE;
DROP FUNCTION IF EXISTS upsert_bic_batch(p_records jsonb) CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_bic_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_bic_raw_resource_id ON bronze_ckan_bic_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_bic_raw_ingested_at ON bronze_ckan_bic_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_bic_raw_jsonb ON bronze_ckan_bic_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_bic_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_bic_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_bic_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_bic_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated BIC data
CREATE TABLE silver_bic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    bic_nombre TEXT NOT NULL,
    bic_categoria TEXT NOT NULL, -- e.g., "ZONA ARQUEOLÓGICA", "CONJUNTO HISTÓRICO", "MONUMENTO", etc.
    bic_entorno BOOLEAN, -- true if has entorno de protección
    municipio_nombre TEXT NOT NULL DEFAULT '',
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    bic_descripcion TEXT,
    boletin1_nombre TEXT,
    boletin1_url TEXT,
    boletin2_nombre TEXT,
    boletin2_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_bic_categoria CHECK (
        bic_categoria IN (
            'ZONA ARQUEOLÓGICA',
            'CONJUNTO HISTÓRICO',
            'MONUMENTO',
            'SITIO HISTÓRICO',
            'JARDÍN HISTÓRICO',
            'ZONA PALEONTOLÓGICA',
            'SITIO ETNOLÓGICO'
        )
    )
);

CREATE INDEX idx_silver_bic_ine_code ON silver_bic(ine_code);
CREATE INDEX idx_silver_bic_municipio_nombre ON silver_bic(municipio_nombre);
CREATE INDEX idx_silver_bic_categoria ON silver_bic(bic_categoria);
CREATE INDEX idx_silver_bic_entorno ON silver_bic(bic_entorno) WHERE bic_entorno IS NOT NULL;

-- Unique constraint: same BIC name can exist in different municipalities
-- Using functional unique index to handle NULLs properly
-- Note: We use municipio_nombre in the unique key, not ine_code, because ine_code can be updated
-- when municipality mapping is improved
CREATE UNIQUE INDEX unique_bic_record ON silver_bic (
    source_resource_id, 
    bic_nombre, 
    COALESCE(municipio_nombre, '')
);

COMMENT ON TABLE silver_bic IS 'Silver layer: Cleaned and validated Bienes de Interés Cultural data from CKAN.';
COMMENT ON COLUMN silver_bic.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_bic.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_bic.bic_nombre IS 'BIC name.';
COMMENT ON COLUMN silver_bic.bic_categoria IS 'BIC category (ZONA ARQUEOLÓGICA, CONJUNTO HISTÓRICO, MONUMENTO, etc.).';
COMMENT ON COLUMN silver_bic.bic_entorno IS 'Whether the BIC has entorno de protección (protection environment).';
COMMENT ON COLUMN silver_bic.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_bic.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_bic.bic_descripcion IS 'BIC description.';
COMMENT ON COLUMN silver_bic.boletin1_nombre IS 'First bulletin name.';
COMMENT ON COLUMN silver_bic.boletin1_url IS 'First bulletin URL.';
COMMENT ON COLUMN silver_bic.boletin2_nombre IS 'Second bulletin name (optional).';
COMMENT ON COLUMN silver_bic.boletin2_url IS 'Second bulletin URL (optional).';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated BIC counts by municipality and category
CREATE TABLE fact_bic_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    bic_categoria TEXT NOT NULL,
    total_bic INTEGER NOT NULL DEFAULT 0,
    total_bic_con_entorno INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, bic_categoria),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_categoria CHECK (
        bic_categoria IN (
            'ZONA ARQUEOLÓGICA',
            'CONJUNTO HISTÓRICO',
            'MONUMENTO',
            'SITIO HISTÓRICO',
            'JARDÍN HISTÓRICO',
            'ZONA PALEONTOLÓGICA',
            'SITIO ETNOLÓGICO'
        )
    ),
    CONSTRAINT valid_agg_totals CHECK (total_bic >= 0 AND total_bic_con_entorno >= 0 AND total_bic_con_entorno <= total_bic)
);

CREATE INDEX idx_fact_bic_municipio_agg_categoria ON fact_bic_municipio_agg(bic_categoria);
CREATE INDEX idx_fact_bic_municipio_agg_last_refreshed ON fact_bic_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_bic_municipio_agg IS 'Fact layer: Aggregated BIC counts by municipality and category.';
COMMENT ON COLUMN fact_bic_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_bic_municipio_agg.bic_categoria IS 'BIC category.';
COMMENT ON COLUMN fact_bic_municipio_agg.total_bic IS 'Total count of BICs in this municipality and category.';
COMMENT ON COLUMN fact_bic_municipio_agg.total_bic_con_entorno IS 'Count of BICs with entorno de protección in this municipality and category.';
COMMENT ON COLUMN fact_bic_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_bic_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_bic_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_bic_municipio_agg (
        ine_code,
        bic_categoria,
        total_bic,
        total_bic_con_entorno
    )
    SELECT
        ine_code,
        bic_categoria,
        COUNT(*) as total_bic,
        COUNT(*) FILTER (WHERE bic_entorno = true) as total_bic_con_entorno
    FROM silver_bic
    WHERE ine_code IS NOT NULL
    GROUP BY ine_code, bic_categoria;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert BIC records using the functional unique index
CREATE OR REPLACE FUNCTION upsert_bic_batch(p_records jsonb)
RETURNS void AS $$
DECLARE
    rec jsonb;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO silver_bic (
            source_dataset_id,
            source_resource_id,
            bic_nombre,
            bic_categoria,
            bic_entorno,
            municipio_nombre,
            ine_code,
            bic_descripcion,
            boletin1_nombre,
            boletin1_url,
            boletin2_nombre,
            boletin2_url
        ) VALUES (
            rec->>'source_dataset_id',
            rec->>'source_resource_id',
            rec->>'bic_nombre',
            rec->>'bic_categoria',
            CASE 
                WHEN rec->>'bic_entorno' = 'true' OR rec->>'bic_entorno' = 'verdadero' THEN true
                WHEN rec->>'bic_entorno' = 'false' OR rec->>'bic_entorno' = 'falso' THEN false
                ELSE NULL
            END,
            rec->>'municipio_nombre',
            CASE 
                WHEN rec->>'ine_code' IS NULL OR rec->>'ine_code' = '' OR rec->>'ine_code' = 'null' THEN NULL
                ELSE (rec->>'ine_code')::varchar(5)
            END,
            NULLIF(rec->>'bic_descripcion', '')::text,
            NULLIF(rec->>'boletin1_nombre', '')::text,
            NULLIF(rec->>'boletin1_url', '')::text,
            NULLIF(rec->>'boletin2_nombre', '')::text,
            NULLIF(rec->>'boletin2_url', '')::text
        )
        ON CONFLICT (source_resource_id, bic_nombre, COALESCE(municipio_nombre, ''))
        DO UPDATE SET
            -- Always update ine_code: use new value if not null, otherwise keep existing
            -- This allows updating NULL ine_code when mapping is improved
            ine_code = CASE 
                WHEN EXCLUDED.ine_code IS NOT NULL THEN EXCLUDED.ine_code
                ELSE silver_bic.ine_code
            END,
            bic_categoria = EXCLUDED.bic_categoria,
            bic_entorno = EXCLUDED.bic_entorno,
            bic_descripcion = EXCLUDED.bic_descripcion,
            boletin1_nombre = EXCLUDED.boletin1_nombre,
            boletin1_url = EXCLUDED.boletin1_url,
            boletin2_nombre = EXCLUDED.boletin2_nombre,
            boletin2_url = EXCLUDED.boletin2_url,
            created_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;
