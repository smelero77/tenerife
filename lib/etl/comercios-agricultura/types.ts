/**
 * Type definitions for CKAN Comercios de Agricultura ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanComercioAgriculturaRecord {
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
export interface BronzeComercioAgriculturaRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverComercioAgriculturaRecord {
  source_dataset_id: string;
  source_resource_id: string;
  comercio_nombre: string;
  comercio_tipo: string | null;
  comercio_telefono: string | null;
  comercio_email: string | null;
  comercio_web: string | null;
  comercio_direccion: string | null;
  comercio_codigo_postal: string | null;
  municipio_nombre: string; // NOT NULL, defaults to empty string
  ine_code: string | null;
  latitud: number | null;
  longitud: number | null;
  comercio_actividad: string | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactComercioAgriculturaRecord {
  ine_code: string;
  comercio_tipo: string;
  total_comercios: number;
}
