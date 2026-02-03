-- ============================================================================
-- Migration: 0005_wikimedia.sql
-- Description: Add tables for Wikimedia/Wikidata data enrichment for municipalities
-- Scope: Tenerife island only (reuses existing dim_municipio)
-- ============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for idempotent execution)
DROP TABLE IF EXISTS silver_wikimedia_municipio CASCADE;
DROP TABLE IF EXISTS bronze_wikimedia_raw CASCADE;

-- ============================================================================
-- BRONZE LAYER (Raw ingestion)
-- ============================================================================

-- Raw API responses from Wikimedia/Wikidata
CREATE TABLE bronze_wikimedia_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ine_code VARCHAR(5) NOT NULL REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, -- 'wikidata', 'wikimedia_commons'
    api_endpoint TEXT NOT NULL,
    raw_response JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'success', -- 'success', 'not_found', 'error'
    error_message TEXT
);

CREATE INDEX idx_bronze_wikimedia_raw_ine_code ON bronze_wikimedia_raw(ine_code);
CREATE INDEX idx_bronze_wikimedia_raw_source_type ON bronze_wikimedia_raw(source_type);
CREATE INDEX idx_bronze_wikimedia_raw_fetched_at ON bronze_wikimedia_raw(fetched_at DESC);
CREATE INDEX idx_bronze_wikimedia_raw_status ON bronze_wikimedia_raw(status);
CREATE INDEX idx_bronze_wikimedia_raw_jsonb ON bronze_wikimedia_raw USING GIN (raw_response);

COMMENT ON TABLE bronze_wikimedia_raw IS 'Bronze layer: Raw API responses from Wikimedia/Wikidata as JSONB for traceability and reprocessing.';
COMMENT ON COLUMN bronze_wikimedia_raw.source_type IS 'Source API type: wikidata, wikimedia_commons, etc.';
COMMENT ON COLUMN bronze_wikimedia_raw.status IS 'Fetch status: success, not_found, error.';

-- ============================================================================
-- SILVER LAYER (Cleaned and validated)
-- ============================================================================

-- Wikimedia/Wikidata data for municipalities (one row per municipality)
CREATE TABLE silver_wikimedia_municipio (
    ine_code VARCHAR(5) PRIMARY KEY REFERENCES dim_municipio(ine_code) ON DELETE CASCADE,
    
    -- Geographic data (static)
    coordinates_lat DECIMAL(10, 8),
    coordinates_lon DECIMAL(11, 8),
    surface_area_km2 DECIMAL(10, 2),
    altitude_m INTEGER,
    postal_code VARCHAR(50), -- May contain ranges or multiple codes
    
    -- Administrative data (changes infrequently)
    mayor_name VARCHAR(255),
    official_website TEXT,
    foundation_date DATE,
    
    -- Contact information
    town_hall_address TEXT, -- Dirección del ayuntamiento (from P159 headquarters)
    email VARCHAR(255), -- Email (P968)
    phone_number VARCHAR(50), -- Teléfono (P1329)
    cif VARCHAR(20), -- CIF (Código de Identificación Fiscal) - P3608 or P2139
    
    -- Symbols and images (changes rarely)
    image_url TEXT, -- Main image URL
    coat_of_arms_url TEXT, -- Escudo de armas URL
    flag_url TEXT, -- Bandera URL
    
    -- Metadata
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_wikimedia_ine_code CHECK (LENGTH(ine_code) = 5 AND ine_code ~ '^[0-9]{5}$'),
    CONSTRAINT valid_wikimedia_coordinates_lat CHECK (coordinates_lat IS NULL OR (coordinates_lat >= -90 AND coordinates_lat <= 90)),
    CONSTRAINT valid_wikimedia_coordinates_lon CHECK (coordinates_lon IS NULL OR (coordinates_lon >= -180 AND coordinates_lon <= 180)),
    CONSTRAINT valid_wikimedia_surface_area CHECK (surface_area_km2 IS NULL OR surface_area_km2 >= 0),
    CONSTRAINT valid_wikimedia_altitude CHECK (altitude_m IS NULL OR altitude_m >= -500 AND altitude_m <= 9000),
    CONSTRAINT valid_wikimedia_postal_code CHECK (postal_code IS NULL OR LENGTH(postal_code) <= 50),
    CONSTRAINT valid_wikimedia_foundation_date CHECK (foundation_date IS NULL OR (foundation_date >= '1000-01-01' AND foundation_date <= '2100-12-31')),
    CONSTRAINT valid_wikimedia_cif CHECK (cif IS NULL OR LENGTH(cif) <= 20)
);

CREATE INDEX idx_silver_wikimedia_municipio_last_updated ON silver_wikimedia_municipio(last_updated DESC);

COMMENT ON TABLE silver_wikimedia_municipio IS 'Silver layer: Cleaned and validated Wikimedia/Wikidata data for municipalities. One row per municipality.';
COMMENT ON COLUMN silver_wikimedia_municipio.coordinates_lat IS 'Latitude in decimal degrees (WGS84).';
COMMENT ON COLUMN silver_wikimedia_municipio.coordinates_lon IS 'Longitude in decimal degrees (WGS84).';
COMMENT ON COLUMN silver_wikimedia_municipio.surface_area_km2 IS 'Surface area in square kilometers.';
COMMENT ON COLUMN silver_wikimedia_municipio.altitude_m IS 'Elevation/altitude in meters above sea level.';
COMMENT ON COLUMN silver_wikimedia_municipio.postal_code IS 'Postal code (may contain ranges like "38000-38099" or multiple codes).';
COMMENT ON COLUMN silver_wikimedia_municipio.mayor_name IS 'Current mayor name.';
COMMENT ON COLUMN silver_wikimedia_municipio.official_website IS 'Official municipality website URL.';
COMMENT ON COLUMN silver_wikimedia_municipio.foundation_date IS 'Municipality foundation/creation date.';
COMMENT ON COLUMN silver_wikimedia_municipio.town_hall_address IS 'Town hall address (from P159 headquarters).';
COMMENT ON COLUMN silver_wikimedia_municipio.email IS 'Contact email (P968).';
COMMENT ON COLUMN silver_wikimedia_municipio.phone_number IS 'Contact phone number (P1329).';
COMMENT ON COLUMN silver_wikimedia_municipio.cif IS 'CIF (Código de Identificación Fiscal) - Tax identification number (P3608 or P2139).';
COMMENT ON COLUMN silver_wikimedia_municipio.image_url IS 'Main image URL (usually from Wikimedia Commons).';
COMMENT ON COLUMN silver_wikimedia_municipio.coat_of_arms_url IS 'Coat of arms (escudo de armas) image URL.';
COMMENT ON COLUMN silver_wikimedia_municipio.flag_url IS 'Flag (bandera) image URL.';

-- Trigger to update last_updated timestamp
-- Note: The function update_updated_at_column() updates a column named 'updated_at'
-- Since our column is named 'last_updated', we need to create a custom trigger function
CREATE OR REPLACE FUNCTION update_silver_wikimedia_municipio_last_updated()
RETURNS TRIGGER AS $trigger$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$trigger$ LANGUAGE plpgsql;

CREATE TRIGGER update_silver_wikimedia_municipio_updated_at
    BEFORE UPDATE ON silver_wikimedia_municipio
    FOR EACH ROW
    EXECUTE FUNCTION update_silver_wikimedia_municipio_last_updated();
