/**
 * Type definitions for CKAN Asociaciones Ciudadanas ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanAsociacionRecord {
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
export interface BronzeAsociacionRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverAsociacionRecord {
  source_dataset_id: string;
  source_resource_id: string;
  asociacion_nombre: string;
  asociacion_siglas: string | null;
  asociacion_cif: string | null;
  asociacion_telefono: string | null;
  asociacion_email: string | null;
  asociacion_web: string | null;
  asociacion_direccion: string | null;
  asociacion_codigo_postal: string | null;
  municipio_nombre: string; // NOT NULL, defaults to empty string
  ine_code: string | null;
  latitud: number | null;
  longitud: number | null;
  asociacion_actividad: string | null;
  asociacion_ambito: string | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactAsociacionRecord {
  ine_code: string;
  asociacion_ambito: string;
  total_asociaciones: number;
}
