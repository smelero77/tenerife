/**
 * Type definitions for CKAN Bienes de Interés Cultural ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanBicRecord {
  bic_nombre?: string;
  bic_categoria?: string;
  bic_entorno?: string; // "falso" or "verdadero" as string
  municipio_nombre?: string;
  bic_descripcion?: string;
  boletin1_nombre?: string;
  boletin1_url?: string;
  boletin2_nombre?: string;
  boletin2_url?: string;
  [key: string]: unknown; // Allow other fields
}

/**
 * Bronze layer record
 */
export interface BronzeBicRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverBicRecord {
  source_dataset_id: string;
  source_resource_id: string;
  bic_nombre: string;
  bic_categoria: string;
  bic_entorno: boolean | null;
  municipio_nombre: string; // NOT NULL, defaults to empty string
  ine_code: string | null;
  bic_descripcion: string | null;
  boletin1_nombre: string | null;
  boletin1_url: string | null;
  boletin2_nombre: string | null;
  boletin2_url: string | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactBicRecord {
  ine_code: string;
  bic_categoria: string;
  total_bic: number;
  total_bic_con_entorno: number;
}
