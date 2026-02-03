/**
 * Type definitions for CKAN Alojamientos Turísticos ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanAlojamientoRecord {
  municipio?: string;
  modalidad?: string;
  tipo?: string;
  nombre?: string;
  direccion?: string;
  codigo_postal?: number | string;
  categoria?: string;
  unidades_alojativas?: number | string;
  plazas_alojativas?: number | string;
  [key: string]: unknown; // Allow other fields
}

/**
 * Bronze layer record
 */
export interface BronzeAlojamientoRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverAlojamientoRecord {
  source_dataset_id: string;
  source_resource_id: string;
  municipio_nombre: string;
  ine_code: string | null;
  modalidad: string;
  tipo: string;
  nombre: string;
  direccion: string | null;
  codigo_postal: string | null;
  categoria: string | null;
  unidades_alojativas: number | null;
  plazas_alojativas: number | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactAlojamientoRecord {
  ine_code: string;
  modalidad: string;
  tipo: string;
  total: number;
  total_unidades_alojativas: number;
  total_plazas_alojativas: number;
}
