/**
 * Type definitions for CKAN Empresas de Servicios ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanEmpresaServicioRecord {
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
export interface BronzeEmpresaServicioRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverEmpresaServicioRecord {
  source_dataset_id: string;
  source_resource_id: string;
  empresa_nombre: string;
  empresa_tipo: string | null;
  empresa_telefono: string | null;
  empresa_email: string | null;
  empresa_web: string | null;
  empresa_direccion: string | null;
  empresa_codigo_postal: string | null;
  municipio_nombre: string; // NOT NULL, defaults to empty string
  ine_code: string | null;
  latitud: number | null;
  longitud: number | null;
  empresa_actividad: string | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactEmpresaServicioRecord {
  ine_code: string;
  empresa_tipo: string;
  total_empresas: number;
}
