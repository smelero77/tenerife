-- ============================================================================
-- Migration: 0008_establecimientos_hosteleria_restauracion.sql
-- Description: Add tables for hospitality and restaurant establishments data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_hosteleria_restauracion_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_hosteleria_raw_resource_id ON bronze_ckan_hosteleria_restauracion_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_hosteleria_raw_ingested_at ON bronze_ckan_hosteleria_restauracion_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_hosteleria_raw_jsonb ON bronze_ckan_hosteleria_restauracion_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_hosteleria_restauracion_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_hosteleria_restauracion_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_hosteleria_restauracion_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_hosteleria_restauracion_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated hospitality and restaurant establishments data
CREATE TABLE silver_establecimiento_hosteleria_restauracion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    municipio_nombre TEXT NOT NULL,
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    modalidad TEXT NOT NULL, -- RESTAURACION, HOSTELERIA
    tipo TEXT NOT NULL, -- BAR, RESTAURANTE, etc.
    nombre TEXT NOT NULL,
    direccion TEXT,
    codigo_postal VARCHAR(10),
    aforo_interior INTEGER,
    aforo_terraza INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_modalidad CHECK (modalidad IN ('RESTAURACION', 'HOSTELERIA')),
    CONSTRAINT valid_aforo_interior CHECK (aforo_interior IS NULL OR aforo_interior >= 0),
    CONSTRAINT valid_aforo_terraza CHECK (aforo_terraza IS NULL OR aforo_terraza >= 0),
    CONSTRAINT valid_codigo_postal CHECK (codigo_postal IS NULL OR LENGTH(codigo_postal) <= 10),
    
    -- Unique constraint to avoid duplicates (based on municipality, name, and address)
    CONSTRAINT unique_establecimiento_record UNIQUE (source_resource_id, municipio_nombre, nombre, direccion)
);

CREATE INDEX idx_silver_establecimiento_ine_code ON silver_establecimiento_hosteleria_restauracion(ine_code);
CREATE INDEX idx_silver_establecimiento_municipio_nombre ON silver_establecimiento_hosteleria_restauracion(municipio_nombre);
CREATE INDEX idx_silver_establecimiento_modalidad ON silver_establecimiento_hosteleria_restauracion(modalidad);
CREATE INDEX idx_silver_establecimiento_tipo ON silver_establecimiento_hosteleria_restauracion(tipo);
CREATE INDEX idx_silver_establecimiento_codigo_postal ON silver_establecimiento_hosteleria_restauracion(codigo_postal);
CREATE INDEX idx_silver_establecimiento_source_resource_id ON silver_establecimiento_hosteleria_restauracion(source_resource_id);

COMMENT ON TABLE silver_establecimiento_hosteleria_restauracion IS 'Silver layer: Cleaned and validated hospitality and restaurant establishments data from CKAN.';
COMMENT ON COLUMN silver_establecimiento_hosteleria_restauracion.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_establecimiento_hosteleria_restauracion.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_establecimiento_hosteleria_restauracion.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_establecimiento_hosteleria_restauracion.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_establecimiento_hosteleria_restauracion.modalidad IS 'Establishment category: RESTAURACION or HOSTELERIA.';
COMMENT ON COLUMN silver_establecimiento_hosteleria_restauracion.tipo IS 'Establishment type (e.g., BAR, RESTAURANTE).';
COMMENT ON COLUMN silver_establecimiento_hosteleria_restauracion.nombre IS 'Establishment name.';
COMMENT ON COLUMN silver_establecimiento_hosteleria_restauracion.direccion IS 'Street address.';
COMMENT ON COLUMN silver_establecimiento_hosteleria_restauracion.codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_establecimiento_hosteleria_restauracion.aforo_interior IS 'Indoor capacity.';
COMMENT ON COLUMN silver_establecimiento_hosteleria_restauracion.aforo_terraza IS 'Terrace/outdoor capacity.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated establishment counts by municipality, modality, and type
CREATE TABLE fact_establecimiento_hosteleria_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    modalidad TEXT NOT NULL,
    tipo TEXT NOT NULL,
    total INTEGER NOT NULL DEFAULT 0,
    total_aforo_interior INTEGER NOT NULL DEFAULT 0,
    total_aforo_terraza INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, modalidad, tipo),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_modalidad CHECK (modalidad IN ('RESTAURACION', 'HOSTELERIA')),
    CONSTRAINT valid_agg_total CHECK (total >= 0),
    CONSTRAINT valid_agg_total_aforo_interior CHECK (total_aforo_interior >= 0),
    CONSTRAINT valid_agg_total_aforo_terraza CHECK (total_aforo_terraza >= 0)
);

CREATE INDEX idx_fact_establecimiento_municipio_agg_modalidad ON fact_establecimiento_hosteleria_municipio_agg(modalidad);
CREATE INDEX idx_fact_establecimiento_municipio_agg_tipo ON fact_establecimiento_hosteleria_municipio_agg(tipo);
CREATE INDEX idx_fact_establecimiento_municipio_agg_last_refreshed ON fact_establecimiento_hosteleria_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_establecimiento_hosteleria_municipio_agg IS 'Fact layer: Aggregated establishment counts by municipality, modality, and type.';
COMMENT ON COLUMN fact_establecimiento_hosteleria_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_establecimiento_hosteleria_municipio_agg.modalidad IS 'Establishment category: RESTAURACION or HOSTELERIA.';
COMMENT ON COLUMN fact_establecimiento_hosteleria_municipio_agg.tipo IS 'Establishment type.';
COMMENT ON COLUMN fact_establecimiento_hosteleria_municipio_agg.total IS 'Total count of establishments of this modality and type in the municipality.';
COMMENT ON COLUMN fact_establecimiento_hosteleria_municipio_agg.total_aforo_interior IS 'Total indoor capacity for establishments of this modality and type in the municipality.';
COMMENT ON COLUMN fact_establecimiento_hosteleria_municipio_agg.total_aforo_terraza IS 'Total terrace capacity for establishments of this modality and type in the municipality.';
COMMENT ON COLUMN fact_establecimiento_hosteleria_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';
