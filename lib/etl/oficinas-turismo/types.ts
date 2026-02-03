/**
 * Type definitions for CKAN Oficinas de Información Turística ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanOficinaRecord {
  oficina_nombre?: string;
  oficina_horario?: string;
  oficina_telefono?: number | string;
  oficina_descripcion?: string;
  oficina_ubicacion?: string;
  oficina_zona?: string;
  municipio_nombre?: string;
  oficina_codigo_postal?: number | string;
  oficina_estado?: string;
  latitud?: number | string;
  longitud?: number | string;
  [key: string]: unknown; // Allow other fields
}

/**
 * Bronze layer record
 */
export interface BronzeOficinaRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverOficinaRecord {
  source_dataset_id: string;
  source_resource_id: string;
  oficina_nombre: string;
  oficina_horario: string | null;
  oficina_telefono: string | null;
  oficina_descripcion: string | null;
  oficina_ubicacion: string | null;
  oficina_zona: string | null;
  municipio_nombre: string;
  ine_code: string | null;
  oficina_codigo_postal: string | null;
  oficina_estado: string | null;
  latitud: number | null;
  longitud: number | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactOficinaRecord {
  ine_code: string;
  oficina_zona: string | null;
  oficina_estado: string | null;
  total: number;
  total_abiertas: number;
}
