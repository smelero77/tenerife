/**
 * Type definitions for Wikimedia/Wikidata ETL pipeline
 */

/**
 * Raw Wikidata API response
 */
export interface WikidataApiResponse {
  entities: Record<string, WikidataEntity>;
}

export interface WikidataEntity {
  id: string; // Q-id
  type: string;
  claims?: Record<string, WikidataClaim[]>;
  sitelinks?: Record<string, { title: string; url: string }>;
  labels?: Record<string, { value: string; language: string }>;
}

export interface WikidataClaim {
  mainsnak: {
    snaktype: string;
    property: string;
    datavalue?: {
      type: string;
      value: unknown;
    };
  };
  rank: string;
}

/**
 * Bronze layer record
 */
export interface BronzeWikimediaRecord {
  ine_code: string;
  source_type: string;
  api_endpoint: string;
  raw_response: Record<string, unknown>;
  status: 'success' | 'not_found' | 'error';
  error_message?: string;
}

/**
 * Silver layer record
 */
export interface SilverWikimediaRecord {
  ine_code: string;
  coordinates_lat?: number;
  coordinates_lon?: number;
  surface_area_km2?: number;
  altitude_m?: number;
  postal_code?: string;
  mayor_name?: string;
  official_website?: string;
  foundation_date?: string; // ISO date string
  town_hall_address?: string;
  email?: string;
  phone_number?: string;
  cif?: string;
  image_url?: string;
  coat_of_arms_url?: string;
  flag_url?: string;
}
