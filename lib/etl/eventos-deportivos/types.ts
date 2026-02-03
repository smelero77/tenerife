/**
 * Type definitions for CKAN Eventos Deportivos ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanEventoRecord {
  evento_nombre?: string;
  evento_url?: string;
  evento_descripcion?: string;
  evento_lugar?: string;
  municipio_nombre?: string;
  evento_organizador?: string;
  evento_fecha_inicio?: string;
  evento_fecha_fin?: string;
  [key: string]: unknown; // Allow other fields
}

/**
 * Bronze layer record
 */
export interface BronzeEventoRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverEventoRecord {
  source_dataset_id: string;
  source_resource_id: string;
  evento_nombre: string;
  evento_url: string | null;
  evento_descripcion: string | null;
  evento_lugar: string | null;
  municipio_nombre: string;
  ine_code: string | null;
  evento_organizador: string | null;
  evento_fecha_inicio: string; // ISO 8601 timestamp
  evento_fecha_fin: string | null; // ISO 8601 timestamp
}

/**
 * Fact layer record (aggregated)
 */
export interface FactEventoRecord {
  ine_code: string;
  evento_mes: number;
  total_eventos: number;
}
