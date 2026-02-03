/**
 * Type definitions for CKAN Hostelería y Restauración ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanEstablecimientoRecord {
  municipio?: string;
  modalidad?: string;
  tipo?: string;
  nombre?: string;
  direccion?: string;
  codigo_postal?: number | string;
  aforo_interior?: number | string;
  aforo_terraza?: number | string;
  [key: string]: unknown; // Allow other fields
}

/**
 * Bronze layer record
 */
export interface BronzeEstablecimientoRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverEstablecimientoRecord {
  source_dataset_id: string;
  source_resource_id: string;
  municipio_nombre: string;
  ine_code: string | null;
  modalidad: string;
  tipo: string;
  nombre: string;
  direccion: string | null;
  codigo_postal: string | null;
  aforo_interior: number | null;
  aforo_terraza: number | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactEstablecimientoRecord {
  ine_code: string;
  modalidad: string;
  tipo: string;
  total: number;
  total_aforo_interior: number;
  total_aforo_terraza: number;
}
