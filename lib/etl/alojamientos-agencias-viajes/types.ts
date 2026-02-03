/**
 * Type definitions for CKAN Alojamientos y Agencias de Viajes ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanAlojamientoAgenciaRecord {
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
export interface BronzeAlojamientoAgenciaRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverAlojamientoAgenciaRecord {
  source_dataset_id: string;
  source_resource_id: string;
  establecimiento_nombre: string;
  establecimiento_tipo: string | null;
  establecimiento_telefono: string | null;
  establecimiento_email: string | null;
  establecimiento_web: string | null;
  establecimiento_direccion: string | null;
  establecimiento_codigo_postal: string | null;
  municipio_nombre: string; // NOT NULL, defaults to empty string
  ine_code: string | null;
  latitud: number | null;
  longitud: number | null;
  establecimiento_actividad: string | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactAlojamientoAgenciaRecord {
  ine_code: string;
  establecimiento_tipo: string;
  total_establecimientos: number;
}
