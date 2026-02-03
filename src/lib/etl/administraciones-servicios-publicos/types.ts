/**
 * Type definitions for CKAN Administraciones y Servicios Públicos ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanAdministracionServicioPublicoRecord {
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
export interface BronzeAdministracionServicioPublicoRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverAdministracionServicioPublicoRecord {
  source_dataset_id: string;
  source_resource_id: string;
  administracion_nombre: string;
  administracion_tipo: string | null;
  administracion_telefono: string | null;
  administracion_email: string | null;
  administracion_web: string | null;
  administracion_direccion: string | null;
  administracion_codigo_postal: string | null;
  municipio_nombre: string; // NOT NULL, defaults to empty string
  ine_code: string | null;
  latitud: number | null;
  longitud: number | null;
  administracion_actividad: string | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactAdministracionServicioPublicoRecord {
  ine_code: string;
  administracion_tipo: string;
  total_administraciones: number;
}
