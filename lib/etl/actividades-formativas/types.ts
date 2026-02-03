/**
 * Type definitions for CKAN Actividades Formativas ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure
 */
export interface RawCkanActividadRecord {
  actividad_id?: string;
  actividad_titulo?: string;
  actividad_tipo?: string;
  agencia_nombre?: string;
  lugar_nombre?: string;
  municipio_nombre?: string;
  actividad_dias?: number | string;
  actividad_horas?: number | string;
  actividad_plazas?: number | string;
  actividad_horario?: string;
  actividad_estado?: string;
  actividad_inicio?: string;
  actividad_fin?: string;
  inscripcion_estado?: string;
  [key: string]: unknown; // Allow other fields
}

/**
 * Bronze layer record
 */
export interface BronzeActividadRecord {
  source_dataset_id: string;
  source_resource_id: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record (cleaned and validated)
 */
export interface SilverActividadRecord {
  source_dataset_id: string;
  source_resource_id: string;
  actividad_id: string;
  actividad_titulo: string;
  actividad_tipo: string;
  agencia_nombre: string;
  lugar_nombre: string | null;
  municipio_nombre: string;
  ine_code: string | null;
  actividad_dias: number | null;
  actividad_horas: number | null;
  actividad_plazas: number | null;
  actividad_horario: string | null;
  actividad_estado: string;
  actividad_inicio: string | null;
  actividad_fin: string | null;
  inscripcion_estado: string | null;
}

/**
 * Fact layer record (aggregated)
 */
export interface FactActividadRecord {
  ine_code: string;
  actividad_tipo: string;
  actividad_estado: string;
  total: number;
  total_horas: number;
}
