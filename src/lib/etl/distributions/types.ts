/**
 * Type definitions for population distribution ETL pipelines (age and sex)
 */

/**
 * Raw CSV row structure for age distribution (multi-year format)
 * Each row contains data for multiple years (2000-2025)
 * Age ranges vary by year (e.g., 2025: "Entre 0 y 15", 2024: "Entre 0 y 14")
 */
export interface RawAgeCsvRow {
  Provincia: string;
  Municipio: string;
  'Código Unidad Poblacional': string;
  'Unidad Poblacional': string;
  Tipo: 'M' | 'ES' | 'NUC' | 'DIS';
  // Year-specific data will be extracted during parsing
  yearData: Map<number, { Total: string; Rango1: string; Rango2: string; Rango3: string }>;
}

/**
 * Raw CSV row structure for sex distribution (multi-year format)
 * Each row contains data for multiple years (2000-2025)
 */
export interface RawSexCsvRow {
  Provincia: string;
  Municipio: string;
  'Código Unidad Poblacional': string;
  'Unidad Poblacional': string;
  Tipo: 'M' | 'ES' | 'NUC' | 'DIS';
  // Year-specific data will be extracted during parsing
  yearData: Map<number, { Total: string; Hombres: string; Mujeres: string }>;
}

/**
 * Parsed age row after Tenerife filter
 */
export interface ParsedAgeRow {
  prov_code: string;
  muni_code: string;
  ine_code: string;
  unit_code: string;
  unit_name: string;
  tipo: 'M' | 'ES' | 'NUC' | 'DIS';
  year: number;
  age_group: '0-15' | '16-64' | '65+';
  population_total: number;
}

/**
 * Parsed sex row after Tenerife filter
 */
export interface ParsedSexRow {
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
 * Bronze layer record for age
 */
export interface BronzeAgeRecord {
  source_file: string;
  raw_row: Record<string, unknown>;
}

/**
 * Bronze layer record for sex
 */
export interface BronzeSexRecord {
  source_file: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record for age
 */
export interface SilverAgeRecord {
  ine_code: string;
  unit_code: string;
  tipo: 'M' | 'ES' | 'NUC' | 'DIS';
  year: number;
  age_group: '0-15' | '16-64' | '65+';
  population_total: number;
}

/**
 * Silver layer record for sex
 */
export interface SilverSexRecord {
  ine_code: string;
  unit_code: string;
  tipo: 'M' | 'ES' | 'NUC' | 'DIS';
  year: number;
  population_total: number;
  population_male: number;
  population_female: number;
}

/**
 * Age fact record for locality
 */
export interface AgeFactLocalidadRecord {
  localidad_id: string;
  year: number;
  age_group: '0-15' | '16-64' | '65+';
  population_total: number;
}

/**
 * Age fact record for municipality
 */
export interface AgeFactMunicipioRecord {
  ine_code: string;
  year: number;
  age_group: '0-15' | '16-64' | '65+';
  population_total: number;
}

/**
 * Sex fact record for locality
 */
export interface SexFactLocalidadRecord {
  localidad_id: string;
  year: number;
  population_total: number;
  population_male: number;
  population_female: number;
}

/**
 * Sex fact record for municipality
 */
export interface SexFactMunicipioRecord {
  ine_code: string;
  year: number;
  population_total: number;
  population_male: number;
  population_female: number;
}

/**
 * Raw CSV row structure for nationality distribution (multi-year format)
 * Each row contains data for multiple years (2000-2025)
 * Note: Header may have incorrect labels, but data follows: Total, Españoles, Extranjeros
 */
export interface RawNationalityCsvRow {
  Provincia: string;
  Municipio: string;
  'Código Unidad Poblacional': string;
  'Unidad Poblacional': string;
  Tipo: 'M' | 'ES' | 'NUC' | 'DIS';
  // Year-specific data will be extracted during parsing
  yearData: Map<number, { Total: string; Españoles: string; Extranjeros: string }>;
}

/**
 * Parsed nationality row after Tenerife filter
 */
export interface ParsedNationalityRow {
  prov_code: string;
  muni_code: string;
  ine_code: string;
  unit_code: string;
  unit_name: string;
  tipo: 'M' | 'ES' | 'NUC' | 'DIS';
  year: number;
  population_total: number;
  population_spanish: number;
  population_foreign: number;
}

/**
 * Bronze layer record for nationality
 */
export interface BronzeNationalityRecord {
  source_file: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer record for nationality
 */
export interface SilverNationalityRecord {
  ine_code: string;
  unit_code: string;
  tipo: 'M' | 'ES' | 'NUC' | 'DIS';
  year: number;
  population_total: number;
  population_spanish: number;
  population_foreign: number;
}

/**
 * Nationality fact record for locality
 */
export interface NationalityFactLocalidadRecord {
  localidad_id: string;
  year: number;
  population_total: number;
  population_spanish: number;
  population_foreign: number;
}

/**
 * Nationality fact record for municipality
 */
export interface NationalityFactMunicipioRecord {
  ine_code: string;
  year: number;
  population_total: number;
  population_spanish: number;
  population_foreign: number;
}
