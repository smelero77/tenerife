/**
 * Type definitions for CKAN Equipamientos ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanRecord {
  equipamiento_nombre?: string;
  equipamiento_tipo?: string;
  municipio_nombre?: string;
  espacio_natural_nombre?: string;
  puntos_interes?: string;
  latitud?: number | string;
  longitud?: number | string;
  [key: string]: unknown; // Allow other fields
}

/**
 * Bronze layer record
 */
export interface BronzeEquipamientoRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverEquipamientoRecord {
  source_dataset_id: string;
  source_resource_id: string;
  equipamiento_nombre: string;
  equipamiento_tipo: string;
  municipio_nombre: string;
  ine_code: string | null;
  espacio_natural_nombre: string | null;
  puntos_interes: string | null;
  latitud: number | null;
  longitud: number | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactEquipamientoRecord {
  ine_code: string;
  equipamiento_tipo: string;
  total: number;
}
