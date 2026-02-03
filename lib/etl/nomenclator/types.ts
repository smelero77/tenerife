/**
 * Type definitions for INE Nomenclátor ETL pipeline
 */

/**
 * Raw CSV row structure
 */
export interface RawCsvRow {
  Provincia: string;
  Municipio: string;
  'Código Unidad Poblacional': string;
  'Unidad Poblacional': string;
  Tipo: 'M' | 'ES' | 'NUC' | 'DIS';
  Total: string;
  Hombres: string;
  Mujeres: string;
}

/**
 * Parsed and validated row after Tenerife filter
 */
export interface ParsedRow {
  prov_code: string; // 2 digits
  muni_code: string; // 3 digits (padded)
  ine_code: string; // 5 digits (prov_code + muni_code)
  unit_code: string; // Normalized (spaces removed)
  unit_name: string;
  tipo: 'M' | 'ES' | 'NUC' | 'DIS';
  population_total: number;
  population_male: number;
  population_female: number;
  year: number;
}

/**
 * Bronze layer record
 */
export interface BronzeRecord {
  source_file: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record
 */
export interface SilverRecord {
  prov_code: string;
  muni_code: string;
  ine_code: string;
  unit_code: string;
  unit_name: string;
  tipo: 'M' | 'ES' | 'NUC' | 'DIS';
  year: number;
  population_total: number;
  population_male: number;
  population_female: number;
}

/**
 * Municipality dimension record
 */
export interface MunicipioRecord {
  ine_code: string;
  municipio_name: string;
  island: string;
  province: string;
}

/**
 * Entidad Singular dimension record
 */
export interface EntidadSingularRecord {
  entidad_id: string; // ine_code + '-' + unit_code
  ine_code: string;
  unit_code: string;
  entidad_name: string;
}

/**
 * Localidad dimension record
 */
export interface LocalidadRecord {
  localidad_id: string; // ine_code + '-' + unit_code
  ine_code: string;
  unit_code: string;
  localidad_name: string;
  tipo: 'NUC' | 'DIS';
}

/**
 * Population fact record
 */
export interface PopulationFactRecord {
  localidad_id: string;
  year: number;
  population_total: number;
  population_male: number;
  population_female: number;
}

/**
 * Municipality snapshot record
 */
export interface MunicipioSnapshotRecord {
  snapshot_date: string; // YYYY-MM-DD
  ine_code: string;
  population_total_municipio: number;
  number_of_nuclei: number;
}
