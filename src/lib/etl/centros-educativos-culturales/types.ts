/**
 * Type definitions for CKAN Centros Educativos y Culturales ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanCentroEducativoCulturalRecord {
  actividad_tipo?: string;
  nombre?: string;
  tipo_via_codigo?: string;
  tipo_via_descripcion?: string;
  direccion_nombre_via?: string;
  direccion_numero?: string;
  direccion_codigo_postal?: string | number;
  municipio_codigo?: string; // INE code
  municipio_nombre?: string;
  referencia?: string;
  web?: string;
  email?: string;
  telefono?: string | number;
  fax?: string | number;
  longitud?: string | number;
  latitud?: string | number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  [key: string]: unknown; // Allow other fields
}

/**
 * Bronze layer record
 */
export interface BronzeCentroEducativoCulturalRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverCentroEducativoCulturalRecord {
  source_dataset_id: string;
  source_resource_id: string;
  centro_nombre: string;
  centro_tipo: string | null;
  centro_telefono: string | null;
  centro_email: string | null;
  centro_web: string | null;
  centro_direccion: string | null;
  centro_codigo_postal: string | null;
  municipio_nombre: string; // NOT NULL, defaults to empty string
  ine_code: string | null;
  latitud: number | null;
  longitud: number | null;
  centro_actividad: string | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactCentroEducativoCulturalRecord {
  ine_code: string;
  centro_tipo: string;
  total_centros: number;
}
