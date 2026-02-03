-- ============================================================================
-- Migration: 0024_instalaciones_deportivas.sql
-- Description: Add tables for sports facilities census data from CKAN
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS fact_instalacion_deportiva_municipio_agg CASCADE;
DROP TABLE IF EXISTS silver_caracteristica_espacio_deportivo CASCADE;
DROP TABLE IF EXISTS silver_caracteristica_instalacion CASCADE;
DROP TABLE IF EXISTS silver_espacio_complementario CASCADE;
DROP TABLE IF EXISTS silver_espacio_deportivo CASCADE;
DROP TABLE IF EXISTS silver_instalacion_deportiva CASCADE;
DROP TABLE IF EXISTS bronze_ckan_instalaciones_deportivas_raw CASCADE;
DROP FUNCTION IF EXISTS refresh_fact_instalacion_deportiva_municipio_agg() CASCADE;
DROP FUNCTION IF EXISTS upsert_instalacion_deportiva_batch CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from CKAN DataStore for all resources
CREATE TABLE bronze_ckan_instalaciones_deportivas_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- 'instalaciones', 'espacios_deportivos', 'espacios_complementarios', 'caracteristicas_instalaciones', 'caracteristicas_espacios'
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_row JSONB NOT NULL
);

CREATE INDEX idx_bronze_ckan_instalaciones_deportivas_raw_resource_id ON bronze_ckan_instalaciones_deportivas_raw(source_resource_id);
CREATE INDEX idx_bronze_ckan_instalaciones_deportivas_raw_resource_type ON bronze_ckan_instalaciones_deportivas_raw(resource_type);
CREATE INDEX idx_bronze_ckan_instalaciones_deportivas_raw_ingested_at ON bronze_ckan_instalaciones_deportivas_raw(ingested_at DESC);
CREATE INDEX idx_bronze_ckan_instalaciones_deportivas_raw_jsonb ON bronze_ckan_instalaciones_deportivas_raw USING GIN (raw_row);

COMMENT ON TABLE bronze_ckan_instalaciones_deportivas_raw IS 'Bronze layer: Raw API responses from CKAN DataStore as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_ckan_instalaciones_deportivas_raw.source_dataset_id IS 'CKAN package/dataset ID.';
COMMENT ON COLUMN bronze_ckan_instalaciones_deportivas_raw.source_resource_id IS 'CKAN DataStore resource ID.';
COMMENT ON COLUMN bronze_ckan_instalaciones_deportivas_raw.resource_type IS 'Type of resource: instalaciones, espacios_deportivos, espacios_complementarios, caracteristicas_instalaciones, caracteristicas_espacios.';
COMMENT ON COLUMN bronze_ckan_instalaciones_deportivas_raw.raw_row IS 'Raw record from CKAN DataStore API as JSONB.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Main installations table
CREATE TABLE silver_instalacion_deportiva (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    instalacion_codigo VARCHAR(20) NOT NULL UNIQUE, -- e.g., "380012001"
    instalacion_nombre TEXT NOT NULL,
    municipio_nombre TEXT NOT NULL DEFAULT '',
    ine_code VARCHAR(5) REFERENCES dim_municipio(ine_code) ON DELETE SET NULL,
    codigo_postal VARCHAR(10),
    email TEXT,
    telefono_fijo TEXT,
    web TEXT,
    fax TEXT,
    propiedad TEXT, -- e.g., "Ayuntamiento", "Comunidad autónoma"
    tipo_gestion TEXT, -- e.g., "Pública", "Privada"
    observaciones TEXT,
    longitud NUMERIC,
    latitud NUMERIC,
    ultima_modificacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ine_code CHECK (ine_code IS NULL OR (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$')),
    CONSTRAINT valid_latitud CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    CONSTRAINT valid_longitud CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180)),
    CONSTRAINT valid_codigo_postal CHECK (codigo_postal IS NULL OR LENGTH(codigo_postal) <= 10),
    CONSTRAINT valid_instalacion_codigo CHECK (LENGTH(instalacion_codigo) > 0 AND LENGTH(instalacion_codigo) <= 20)
);

CREATE INDEX idx_silver_instalacion_deportiva_ine_code ON silver_instalacion_deportiva(ine_code);
CREATE INDEX idx_silver_instalacion_deportiva_municipio_nombre ON silver_instalacion_deportiva(municipio_nombre);
CREATE INDEX idx_silver_instalacion_deportiva_coordinates ON silver_instalacion_deportiva(latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

COMMENT ON TABLE silver_instalacion_deportiva IS 'Silver layer: Cleaned and validated sports facilities data from CKAN.';
COMMENT ON COLUMN silver_instalacion_deportiva.instalacion_codigo IS 'Unique installation code (e.g., "380012001").';
COMMENT ON COLUMN silver_instalacion_deportiva.instalacion_nombre IS 'Installation name.';
COMMENT ON COLUMN silver_instalacion_deportiva.municipio_nombre IS 'Municipality name as provided by CKAN.';
COMMENT ON COLUMN silver_instalacion_deportiva.ine_code IS 'INE municipality code (linked to dim_municipio). NULL if municipality not found.';

-- Sports spaces within installations
CREATE TABLE silver_espacio_deportivo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    instalacion_codigo VARCHAR(20) NOT NULL REFERENCES silver_instalacion_deportiva(instalacion_codigo) ON DELETE CASCADE,
    espacio_codigo VARCHAR(20) NOT NULL,
    espacio_nombre TEXT NOT NULL,
    espacio_tipo TEXT, -- e.g., "Pistas polideportivas"
    espacio_clase TEXT, -- e.g., "Campos"
    espacio_actividad_principal TEXT, -- e.g., "Fútbol sala", "Baloncesto"
    pavimento_tipo TEXT, -- e.g., "Hormigón", "Asfalto"
    pavimento_conservacion TEXT, -- e.g., "Permite la practica deportiva"
    espacio_cerramiento TEXT, -- e.g., "Recinto cerrado"
    espacio_estado_uso TEXT,
    espacio_calefaccion TEXT, -- e.g., "No"
    espacio_climatizacion TEXT, -- e.g., "No"
    espacio_iluminacion TEXT, -- e.g., "Permite el uso nocturno"
    ultima_modificacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: same space code can exist in different installations
    CONSTRAINT unique_espacio_deportivo UNIQUE (instalacion_codigo, espacio_codigo),
    CONSTRAINT valid_espacio_codigo CHECK (LENGTH(espacio_codigo) > 0 AND LENGTH(espacio_codigo) <= 20)
);

CREATE INDEX idx_silver_espacio_deportivo_instalacion_codigo ON silver_espacio_deportivo(instalacion_codigo);
CREATE INDEX idx_silver_espacio_deportivo_espacio_codigo ON silver_espacio_deportivo(espacio_codigo);
CREATE INDEX idx_silver_espacio_deportivo_actividad ON silver_espacio_deportivo(espacio_actividad_principal);

COMMENT ON TABLE silver_espacio_deportivo IS 'Silver layer: Sports spaces within installations.';
COMMENT ON COLUMN silver_espacio_deportivo.instalacion_codigo IS 'Installation code (FK to silver_instalacion_deportiva).';
COMMENT ON COLUMN silver_espacio_deportivo.espacio_codigo IS 'Space code (unique within installation).';

-- Complementary spaces within installations
CREATE TABLE silver_espacio_complementario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    instalacion_codigo VARCHAR(20) NOT NULL REFERENCES silver_instalacion_deportiva(instalacion_codigo) ON DELETE CASCADE,
    espacio_complementario_codigo VARCHAR(20) NOT NULL,
    espacio_complementario_nombre TEXT NOT NULL,
    espacio_complementario_tipo TEXT, -- e.g., "Almacén deportivo", "Vestuarios"
    espacio_complementario_clase TEXT, -- e.g., "Otros espacios complementarios"
    ultima_modificacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: same complementary space code can exist in different installations
    CONSTRAINT unique_espacio_complementario UNIQUE (instalacion_codigo, espacio_complementario_codigo),
    CONSTRAINT valid_espacio_complementario_codigo CHECK (LENGTH(espacio_complementario_codigo) > 0 AND LENGTH(espacio_complementario_codigo) <= 20)
);

CREATE INDEX idx_silver_espacio_complementario_instalacion_codigo ON silver_espacio_complementario(instalacion_codigo);
CREATE INDEX idx_silver_espacio_complementario_codigo ON silver_espacio_complementario(espacio_complementario_codigo);
CREATE INDEX idx_silver_espacio_complementario_tipo ON silver_espacio_complementario(espacio_complementario_tipo);

COMMENT ON TABLE silver_espacio_complementario IS 'Silver layer: Complementary spaces within installations.';
COMMENT ON COLUMN silver_espacio_complementario.instalacion_codigo IS 'Installation code (FK to silver_instalacion_deportiva).';
COMMENT ON COLUMN silver_espacio_complementario.espacio_complementario_codigo IS 'Complementary space code (unique within installation).';

-- Installation characteristics
CREATE TABLE silver_caracteristica_instalacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    instalacion_codigo VARCHAR(20) NOT NULL REFERENCES silver_instalacion_deportiva(instalacion_codigo) ON DELETE CASCADE,
    instalacion_nombre TEXT NOT NULL,
    categoria TEXT NOT NULL, -- e.g., "Régimen de acceso", "Servicios auxiliares"
    subcategoria TEXT, -- e.g., "Restringido", "Movilidad"
    caracteristica TEXT NOT NULL, -- e.g., "Restringido", "Guagua", "Aseos"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_silver_caracteristica_instalacion_codigo ON silver_caracteristica_instalacion(instalacion_codigo);
CREATE INDEX idx_silver_caracteristica_instalacion_categoria ON silver_caracteristica_instalacion(categoria);

COMMENT ON TABLE silver_caracteristica_instalacion IS 'Silver layer: Characteristics of installations.';
COMMENT ON COLUMN silver_caracteristica_instalacion.instalacion_codigo IS 'Installation code (FK to silver_instalacion_deportiva).';

-- Sports space characteristics
CREATE TABLE silver_caracteristica_espacio_deportivo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    espacio_codigo VARCHAR(20) NOT NULL,
    espacio_nombre TEXT NOT NULL,
    categoria TEXT NOT NULL, -- e.g., "Actividad secundaria"
    caracteristica TEXT NOT NULL, -- e.g., "Fútbol sala", "Baloncesto"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_silver_caracteristica_espacio_deportivo_codigo ON silver_caracteristica_espacio_deportivo(espacio_codigo);
CREATE INDEX idx_silver_caracteristica_espacio_deportivo_categoria ON silver_caracteristica_espacio_deportivo(categoria);

COMMENT ON TABLE silver_caracteristica_espacio_deportivo IS 'Silver layer: Characteristics of sports spaces.';
COMMENT ON COLUMN silver_caracteristica_espacio_deportivo.espacio_codigo IS 'Space code (references espacio_codigo in silver_espacio_deportivo).';

-- ============================================================================
-- FACT LAYER (Aggregated facts)
-- ============================================================================

-- Aggregated installation counts by municipality
CREATE TABLE fact_instalacion_deportiva_municipio_agg (
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    total_instalaciones INTEGER NOT NULL DEFAULT 0,
    total_espacios_deportivos INTEGER NOT NULL DEFAULT 0,
    total_espacios_complementarios INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (ine_code),
    
    CONSTRAINT valid_agg_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_agg_totals CHECK (total_instalaciones >= 0 AND total_espacios_deportivos >= 0 AND total_espacios_complementarios >= 0)
);

CREATE INDEX idx_fact_instalacion_deportiva_municipio_agg_last_refreshed ON fact_instalacion_deportiva_municipio_agg(last_refreshed_at DESC);

COMMENT ON TABLE fact_instalacion_deportiva_municipio_agg IS 'Fact layer: Aggregated installation counts by municipality.';
COMMENT ON COLUMN fact_instalacion_deportiva_municipio_agg.ine_code IS 'INE municipality code.';
COMMENT ON COLUMN fact_instalacion_deportiva_municipio_agg.total_instalaciones IS 'Total count of installations in this municipality.';
COMMENT ON COLUMN fact_instalacion_deportiva_municipio_agg.total_espacios_deportivos IS 'Total count of sports spaces in this municipality.';
COMMENT ON COLUMN fact_instalacion_deportiva_municipio_agg.total_espacios_complementarios IS 'Total count of complementary spaces in this municipality.';

-- Function to refresh facts (delete all and reinsert)
CREATE OR REPLACE FUNCTION refresh_fact_instalacion_deportiva_municipio_agg()
RETURNS void AS $$
BEGIN
    -- Delete all existing records (using WHERE clause for safety)
    DELETE FROM fact_instalacion_deportiva_municipio_agg WHERE ine_code IS NOT NULL;
    
    -- Insert aggregated data from silver layer
    INSERT INTO fact_instalacion_deportiva_municipio_agg (
        ine_code,
        total_instalaciones,
        total_espacios_deportivos,
        total_espacios_complementarios
    )
    SELECT
        i.ine_code,
        COUNT(DISTINCT i.instalacion_codigo) as total_instalaciones,
        COUNT(DISTINCT e.espacio_codigo) as total_espacios_deportivos,
        COUNT(DISTINCT ec.espacio_complementario_codigo) as total_espacios_complementarios
    FROM silver_instalacion_deportiva i
    LEFT JOIN silver_espacio_deportivo e ON e.instalacion_codigo = i.instalacion_codigo
    LEFT JOIN silver_espacio_complementario ec ON ec.instalacion_codigo = i.instalacion_codigo
    WHERE i.ine_code IS NOT NULL
    GROUP BY i.ine_code;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert instalacion deportiva records
CREATE OR REPLACE FUNCTION upsert_instalacion_deportiva_batch(p_records jsonb)
RETURNS void AS $$
DECLARE
    rec jsonb;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO silver_instalacion_deportiva (
            source_dataset_id,
            source_resource_id,
            instalacion_codigo,
            instalacion_nombre,
            municipio_nombre,
            ine_code,
            codigo_postal,
            email,
            telefono_fijo,
            web,
            fax,
            propiedad,
            tipo_gestion,
            observaciones,
            longitud,
            latitud,
            ultima_modificacion
        ) VALUES (
            rec->>'source_dataset_id',
            rec->>'source_resource_id',
            rec->>'instalacion_codigo',
            rec->>'instalacion_nombre',
            rec->>'municipio_nombre',
            NULLIF(rec->>'ine_code', '')::varchar(5),
            NULLIF(rec->>'codigo_postal', '')::varchar(10),
            NULLIF(rec->>'email', '')::text,
            NULLIF(rec->>'telefono_fijo', '')::text,
            NULLIF(rec->>'web', '')::text,
            NULLIF(rec->>'fax', '')::text,
            NULLIF(rec->>'propiedad', '')::text,
            NULLIF(rec->>'tipo_gestion', '')::text,
            NULLIF(rec->>'observaciones', '')::text,
            NULLIF(rec->>'longitud', '')::numeric,
            NULLIF(rec->>'latitud', '')::numeric,
            CASE 
                WHEN rec->>'ultima_modificacion' IS NULL OR rec->>'ultima_modificacion' = '' THEN NULL
                ELSE (rec->>'ultima_modificacion')::timestamptz
            END
        )
        ON CONFLICT (instalacion_codigo)
        DO UPDATE SET
            instalacion_nombre = EXCLUDED.instalacion_nombre,
            municipio_nombre = EXCLUDED.municipio_nombre,
            ine_code = EXCLUDED.ine_code,
            codigo_postal = EXCLUDED.codigo_postal,
            email = EXCLUDED.email,
            telefono_fijo = EXCLUDED.telefono_fijo,
            web = EXCLUDED.web,
            fax = EXCLUDED.fax,
            propiedad = EXCLUDED.propiedad,
            tipo_gestion = EXCLUDED.tipo_gestion,
            observaciones = EXCLUDED.observaciones,
            longitud = EXCLUDED.longitud,
            latitud = EXCLUDED.latitud,
            ultima_modificacion = EXCLUDED.ultima_modificacion,
            created_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;
