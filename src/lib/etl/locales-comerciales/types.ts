/**
 * Type definitions for CKAN Locales Comerciales ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanLocalComercialRecord {
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
export interface BronzeLocalComercialRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverLocalComercialRecord {
  source_dataset_id: string;
  source_resource_id: string;
  local_nombre: string;
  local_tipo: string | null;
  local_telefono: string | null;
  local_email: string | null;
  local_web: string | null;
  local_direccion: string | null;
  local_codigo_postal: string | null;
  municipio_nombre: string; // NOT NULL, defaults to empty string
  ine_code: string | null;
  latitud: number | null;
  longitud: number | null;
  local_actividad: string | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactLocalComercialRecord {
  ine_code: string;
  local_tipo: string;
  total_locales: number;
}
