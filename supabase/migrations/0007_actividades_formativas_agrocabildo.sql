-- ============================================================================
-- Migration: 0007_actividades_formativas_agrocabildo.sql
-- Description: Add tables for AgroCabildo training activities data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore
CREATE TABLE bronze_ckan_actividades_formativas_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_actividades_raw_resource_id ON bronze_ckan_actividades_formativas_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_actividades_raw_ingested_at ON bronze_ckan_actividades_formativas_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_actividades_raw_jsonb ON bronze_ckan_actividades_formativas_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_actividades_formativas_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_actividades_formativas_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_actividades_formativas_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_actividades_formativas_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Cleaned and validated training activities data
CREATE TABLE silver_actividad_formativa_agrocabildo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    actividad_id TEXT NOT NULL,
    actividad_titulo TEXT NOT NULL,
    actividad_tipo TEXT NOT NULL,
    agencia_nombre TEXT NOT NULL,
    lugar_nombre TEXT,
    municipio_nombre TEXT NOT NULL,
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    actividad_dias INTEGER,
    actividad_horas NUMERIC(5, 1),
    actividad_plazas INTEGER,
    actividad_horario TEXT,
    actividad_estado TEXT NOT NULL,
    actividad_inicio TIMESTAMPTZ,
    actividad_fin TIMESTAMPTZ,
    inscripcion_estado TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_actividad_dias CHECK (actividad_dias IS NULL OR actividad_dias > 0),
    CONSTRAINT valid_actividad_horas CHECK (actividad_horas IS NULL OR actividad_horas >= 0),
    CONSTRAINT valid_actividad_plazas CHECK (actividad_plazas IS NULL OR actividad_plazas >= 0),
    CONSTRAINT valid_actividad_fechas CHECK (
        actividad_inicio IS NULL OR 
        actividad_fin IS NULL OR 
        actividad_fin >= actividad_inicio
    ),
    
    -- Unique constraint to avoid duplicates
    CONSTRAINT unique_actividad_record UNIQUE (source_resource_id, actividad_id)
);

CREATE INDEX idx_silver_actividad_ine_code ON silver_actividad_formativa_agrocabildo(ine_code);
CREATE INDEX idx_silver_actividad_municipio_nombre ON silver_actividad_formativa_agrocabildo(municipio_nombre);
CREATE INDEX idx_silver_actividad_tipo ON silver_actividad_formativa_agrocabildo(actividad_tipo);
CREATE INDEX idx_silver_actividad_estado ON silver_actividad_formativa_agrocabildo(actividad_estado);
CREATE INDEX idx_silver_actividad_inicio ON silver_actividad_formativa_agrocabildo(actividad_inicio);
CREATE INDEX idx_silver_actividad_fin ON silver_actividad_formativa_agrocabildo(actividad_fin);
CREATE INDEX idx_silver_actividad_source_resource_id ON silver_actividad_formativa_agrocabildo(source_resource_id);
CREATE INDEX idx_silver_actividad_fecha_range ON silver_actividad_formativa_agrocabildo(actividad_inicio, actividad_fin) 
    WHERE actividad_inicio IS NOT NULL AND actividad_fin IS NOT NULL;

COMMENT ON TABLE silver_actividad_formativa_agrocabildo IS 'Silver layer: Cleaned and validated AgroCabildo training activities data from CKAN.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.source_dataset_id IS 'CKAN package/dataset ID for traceability.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.source_resource_id IS 'CKAN DataStore resource ID for traceability.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.actividad_id IS 'Activity unique identifier (e.g., "2026-001").';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.actividad_titulo IS 'Activity title/name.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.actividad_tipo IS 'Activity type (e.g., "Demostración", "Charla", "Cursos", "Jornadas").';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.agencia_nombre IS 'Agency/office name organizing the activity.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.lugar_nombre IS 'Place/location name where activity takes place.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.actividad_dias IS 'Number of days for the activity.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.actividad_horas IS 'Number of hours for the activity.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.actividad_plazas IS 'Number of available spots/places.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.actividad_horario IS 'Schedule/time information.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.actividad_estado IS 'Activity status (e.g., "Planificado", "En curso", "Finalizado").';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.actividad_inicio IS 'Activity start date and time.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.actividad_fin IS 'Activity end date and time.';
COMMENT ON COLUMN silver_actividad_formativa_agrocabildo.inscripcion_estado IS 'Registration status.';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated activity counts by municipality and type
CREATE TABLE fact_actividad_formativa_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    actividad_tipo TEXT NOT NULL,
    actividad_estado TEXT NOT NULL,
    total INTEGER NOT NULL DEFAULT 0,
    total_horas NUMERIC(10, 1) NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code, actividad_tipo, actividad_estado),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_total CHECK (total >= 0),
    CONSTRAINT valid_agg_total_horas CHECK (total_horas >= 0)
);

CREATE INDEX idx_fact_actividad_municipio_agg_tipo ON fact_actividad_formativa_municipio_agg(actividad_tipo);
CREATE INDEX idx_fact_actividad_municipio_agg_estado ON fact_actividad_formativa_municipio_agg(actividad_estado);
CREATE INDEX idx_fact_actividad_municipio_agg_last_refreshed ON fact_actividad_formativa_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_actividad_formativa_municipio_agg IS 'Fact layer: Aggregated activity counts by municipality, type, and status.';
COMMENT ON COLUMN fact_actividad_formativa_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_actividad_formativa_municipio_agg.actividad_tipo IS 'Activity type/category.';
COMMENT ON COLUMN fact_actividad_formativa_municipio_agg.actividad_estado IS 'Activity status.';
COMMENT ON COLUMN fact_actividad_formativa_municipio_agg.total IS 'Total count of activities of this type and status in the municipality.';
COMMENT ON COLUMN fact_actividad_formativa_municipio_agg.total_horas IS 'Total hours of activities of this type and status in the municipality.';
COMMENT ON COLUMN fact_actividad_formativa_municipio_agg.last_refreshed_at IS 'Last time this aggregation was refreshed.';
