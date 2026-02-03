-- ============================================================================
-- Migration: 0009_alojamientos_turisticos.sql
-- Description: Add tables for tourist accommodation establishments data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_alojamientos_turisticos_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_alojamientos_raw_resource_id ON bronze_ckan_alojamientos_turisticos_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_alojamientos_raw_ingested_at ON bronze_ckan_alojamientos_turisticos_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_alojamientos_raw_jsonb ON bronze_ckan_alojamientos_turisticos_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_alojamientos_turisticos_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_alojamientos_turisticos_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_alojamientos_turisticos_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_alojamientos_turisticos_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated tourist accommodation establishments data
CREATE TABLE silver_alojamiento_turistico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    municipio_nombre TEXT NOT NULL,
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    modalidad TEXT NOT NULL, -- EXTRAHOTELERA, HOTELERA
    tipo TEXT NOT NULL, -- APARTAMENTO, HOTEL, CASA RURAL, etc.
    nombre TEXT NOT NULL,
    direccion TEXT,
    codigo_postal VARCHAR(10),
    categoria TEXT, -- 3 LLAVES, 4 ESTRELLAS, CATEGORIA UNICA, etc.
    unidades_alojativas INTEGER,
    plazas_alojativas INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_modalidad CHECK (modalidad IN ('EXTRAHOTELERA', 'HOTELERA')),
    CONSTRAINT valid_unidades_alojativas CHECK (unidades_alojativas IS NULL OR unidades_alojativas >= 0),
    CONSTRAINT valid_plazas_alojativas CHECK (plazas_alojativas IS NULL OR plazas_alojativas >= 0),
    CONSTRAINT valid_codigo_postal CHECK (codigo_postal IS NULL OR LENGTH(codigo_postal) <= 10),
    
    -- Unique constraint to avoid duplicates (based on municipality, name, and address)
    CONSTRAINT unique_alojamiento_record UNIQUE (source_resource_id, municipio_nombre, nombre, direccion)
);

CREATE INDEX idx_silver_alojamiento_ine_code ON silver_alojamiento_turistico(ine_code);
CREATE INDEX idx_silver_alojamiento_municipio_nombre ON silver_alojamiento_turistico(municipio_nombre);
CREATE INDEX idx_silver_alojamiento_modalidad ON silver_alojamiento_turistico(modalidad);
CREATE INDEX idx_silver_alojamiento_tipo ON silver_alojamiento_turistico(tipo);
CREATE INDEX idx_silver_alojamiento_categoria ON silver_alojamiento_turistico(categoria);
CREATE INDEX idx_silver_alojamiento_codigo_postal ON silver_alojamiento_turistico(codigo_postal);
CREATE INDEX idx_silver_alojamiento_source_resource_id ON silver_alojamiento_turistico(source_resource_id);

COMMENT ON TABLE silver_alojamiento_turistico IS 'Silver layer: Cleaned and validated tourist accommodation establishments data from CKAN.';
COMMENT ON COLUMN silver_alojamiento_turistico.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_alojamiento_turistico.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_alojamiento_turistico.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_alojamiento_turistico.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_alojamiento_turistico.modalidad IS 'Establishment category: EXTRAHOTELERA or HOTELERA.';
COMMENT ON COLUMN silver_alojamiento_turistico.tipo IS 'Establishment type (e.g., APARTAMENTO, HOTEL, CASA RURAL, PENSION).';
COMMENT ON COLUMN silver_alojamiento_turistico.nombre IS 'Establishment name.';
COMMENT ON COLUMN silver_alojamiento_turistico.direccion IS 'Street address.';
COMMENT ON COLUMN silver_alojamiento_turistico.codigo_postal IS 'Postal code.';
COMMENT ON COLUMN silver_alojamiento_turistico.categoria IS 'Category/rating (e.g., "3 LLAVES", "4 ESTRELLAS", "CATEGORIA UNICA").';
COMMENT ON COLUMN silver_alojamiento_turistico.unidades_alojativas IS 'Number of accommodation units.';
COMMENT ON COLUMN silver_alojamiento_turistico.plazas_alojativas IS 'Number of accommodation places/beds.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated accommodation counts by municipality, modality, and type
CREATE TABLE fact_alojamiento_turistico_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    modalidad TEXT NOT NULL,
    tipo TEXT NOT NULL,
    total INTEGER NOT NULL DEFAULT 0,
    total_unidades_alojativas INTEGER NOT NULL DEFAULT 0,
    total_plazas_alojativas INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, modalidad, tipo),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_modalidad CHECK (modalidad IN ('EXTRAHOTELERA', 'HOTELERA')),
    CONSTRAINT valid_agg_total CHECK (total >= 0),
    CONSTRAINT valid_agg_total_unidades CHECK (total_unidades_alojativas >= 0),
    CONSTRAINT valid_agg_total_plazas CHECK (total_plazas_alojativas >= 0)
);

CREATE INDEX idx_fact_alojamiento_municipio_agg_modalidad ON fact_alojamiento_turistico_municipio_agg(modalidad);
CREATE INDEX idx_fact_alojamiento_municipio_agg_tipo ON fact_alojamiento_turistico_municipio_agg(tipo);
CREATE INDEX idx_fact_alojamiento_municipio_agg_last_refreshed ON fact_alojamiento_turistico_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_alojamiento_turistico_municipio_agg IS 'Fact layer: Aggregated accommodation counts by municipality, modality, and type.';
COMMENT ON COLUMN fact_alojamiento_turistico_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_alojamiento_turistico_municipio_agg.modalidad IS 'Establishment category: EXTRAHOTELERA or HOTELERA.';
COMMENT ON COLUMN fact_alojamiento_turistico_municipio_agg.tipo IS 'Establishment type.';
COMMENT ON COLUMN fact_alojamiento_turistico_municipio_agg.total IS 'Total count of accommodations of this modality and type in the municipality.';
COMMENT ON COLUMN fact_alojamiento_turistico_municipio_agg.total_unidades_alojativas IS 'Total accommodation units for establishments of this modality and type in the municipality.';
COMMENT ON COLUMN fact_alojamiento_turistico_municipio_agg.total_plazas_alojativas IS 'Total accommodation places/beds for establishments of this modality and type in the municipality.';
COMMENT ON COLUMN fact_alojamiento_turistico_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';
