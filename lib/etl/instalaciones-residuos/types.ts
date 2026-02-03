/**
 * Type definitions for CKAN Instalaciones Residuos ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanInstalacionRecord {
  nombre?: string;
  latitud?: string | number;
  longitud?: string | number;
  titular?: string;
  gestiona?: string;
  telefono?: string;
  descripcion?: string;
  direccion?: string;
  direccion_tipo_via?: string;
  direccion_nombre_via?: string;
  direccion_numero?: string;
  direccion_codigo_postal?: string;
  municipio?: string;
  codigo_municipio?: string; // INE code
  horario_1?: string;
  horario_2?: string;
  [key: string]: unknown; // Allow other fields
}

/**
 * Bronze layer record
 */
export interface BronzeInstalacionRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverInstalacionRecord {
  source_dataset_id: string;
  source_resource_id: string;
  instalacion_nombre: string;
  latitud: number | null;
  longitud: number | null;
  titular: string | null;
  gestiona: string | null;
  telefono: string | null;
  descripcion: string | null;
  direccion: string | null;
  direccion_tipo_via: string | null;
  direccion_nombre_via: string | null;
  direccion_numero: string | null;
  direccion_codigo_postal: string | null;
  municipio_nombre: string; // NOT NULL, defaults to empty string
  ine_code: string | null;
  horario_1: string | null;
  horario_2: string | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactInstalacionRecord {
  ine_code: string;
  instalacion_tipo: string;
  total_instalaciones: number;
}
